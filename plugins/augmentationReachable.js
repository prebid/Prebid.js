/**
 * Checks that relative `declare module` augmentations can take effect.
 *
 * TypeScript resolves the module named by an augmentation, but does not add it to the program: the
 * augmentation only applies if the target is in the program for some other reason. There are two
 * ways for that to be true of every consumer:
 *
 *  - the target is in core's program, which every consumer has;
 *  - the augmenting module pulls the target in itself, so a consumer that imports the augmenting
 *    module gets the target with it.
 *
 * Anything else is inert for someone: a consumer whose program happens not to contain the target
 * never sees the types the augmentation declares. Asking instead whether *anything* in the tree
 * imports the target is a weaker question, and gives the wrong answer - the file it names may only
 * be pulled in by an unrelated module the consumer does not have.
 *
 * This is the policy shared by the `prebid/augmentation-reachable` lint rule (which runs on the
 * sources, rooted at `src/prebid.public.ts`) and `gulp check-declarations` (which runs on generated
 * declarations, rooted at their emitted core entry point, where the imports that survived
 * declaration emit can finally be seen).
 *
 * Written by a bot.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// only typed files contribute to the type program an augmentation needs its target to be part of
const TYPED_EXTENSIONS = ['.d.ts', '.ts'];

// used when no project is named; whether an augmentation applies depends on how the project
// resolves modules, so a project's own options are preferable
const RESOLUTION_OPTIONS = {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext
};

// options that describe emit, which this never does - inheriting them can only produce noise
const EMIT_OPTIONS = [
  'outDir', 'rootDir', 'declaration', 'declarationDir', 'emitDeclarationOnly',
  'composite', 'incremental', 'tsBuildInfoFile'
];

/**
 * The options to build and resolve with: a project's own, so that this answers the question that
 * project's compiler would. Its file selection is deliberately not used - the files a program
 * contains are the ones its entry point pulls in.
 */
function compilerOptionsFrom(project, cwd) {
  if (project == null) return RESOLUTION_OPTIONS;
  const configPath = path.resolve(cwd, project);
  const {options} = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic(diagnostic) {
      throw new Error(`cannot read ${configPath}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
    }
  });
  EMIT_OPTIONS.forEach(option => delete options[option]);
  return {...options, noEmit: true};
}

/**
 * Marks an augmentation that is meant to apply only when its target is independently imported -
 * for example, config options a control module adds under another module's configuration. Written
 * Only honoured in JSDoc: those are the comments that survive declaration emit, so the mark means
 * the same thing before and after it.
 */
const OPTIONAL_TAG = 'augmentationOptional';

function isMarkedOptional(jsdocComments) {
  return jsdocComments.some(comment => new RegExp(`@${OPTIONAL_TAG}\\b`).test(comment));
}

const MESSAGES = {
  unresolved: 'cannot resolve augmented module "{{specifier}}"',
  unreachable: 'augmenting "{{specifier}}", but neither core nor this file imports {{target}}, so ' +
    'the augmentation never applies. Import it (a side effect import, or a re-export, survives ' +
    'declaration emit).'
};

function formatMessage(messageId, data) {
  return Object.entries(data).reduce(
    (message, [key, value]) => message.replaceAll(`{{${key}}}`, value),
    MESSAGES[messageId]
  );
}

/**
 * The comments directly above a node. Read from the text rather than through `getJSDocTags`, which
 * needs a source file parsed with parent pointers.
 */
function leadingJSDoc(source, node) {
  return (ts.getLeadingCommentRanges(source.text, node.pos) ?? [])
    .map(range => source.text.slice(range.pos, range.end))
    // only JSDoc, so that the mark means the same thing before and after declaration emit, which
    // keeps JSDoc and drops every other kind of comment
    .filter(comment => comment.startsWith('/**'));
}

function listFiles(root, extensions = TYPED_EXTENSIONS, ignore = []) {
  const excluded = new Set(ignore.map(dir => path.resolve(dir)));
  const files = [];
  (function walk(dir) {
    if (!fs.existsSync(dir) || excluded.has(dir)) return;
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(entryPath);
      }
    }
  })(path.resolve(root));
  return files;
}

// every program shares its parsed files through this: a program rooted at one module overlaps
// almost entirely with core's, and re-parsing that overlap for each of them dominates the run
const documents = ts.createDocumentRegistry(ts.sys.useCaseSensitiveFileNames, ts.sys.getCurrentDirectory());

/**
 * A compiler host that hands out parsed files from the shared registry. Contents are read once:
 * nothing here edits a file, so one snapshot per file serves every program.
 */
function createHost(options) {
  const host = ts.createCompilerHost(options, false);
  const snapshots = new Map();
  host.getSourceFile = (fileName, languageVersionOrOptions) => {
    if (!snapshots.has(fileName)) {
      const text = host.readFile(fileName);
      snapshots.set(fileName, text == null ? null : ts.ScriptSnapshot.fromString(text));
    }
    const snapshot = snapshots.get(fileName);
    if (snapshot == null) return undefined;
    return documents.acquireDocument(
      fileName, options, snapshot, '1', undefined, languageVersionOrOptions
    );
  };
  return host;
}

const contextCache = new Map();

/**
 * The programs the checks run against: core's, and one per augmenting file, built on demand.
 * Cached, as core's program serves every file, and a file's own program serves every augmentation
 * in it.
 */
function getContext({coreEntry, ignore = [], project} = {}, cwd = process.cwd()) {
  const key = JSON.stringify([cwd, coreEntry, ignore, project]);
  if (!contextCache.has(key)) {
    if (coreEntry == null) {
      throw new Error('augmentation-reachable needs `coreEntry`: the entry point of core, whose program every consumer has');
    }
    const entry = path.resolve(cwd, coreEntry);
    if (!fs.existsSync(entry)) {
      throw new Error(`cannot find core entry point '${entry}'`);
    }
    const options = compilerOptionsFrom(project, cwd);
    const host = createHost(options);
    const context = {
      options,
      host,
      cache: ts.createModuleResolutionCache(cwd, fileName => host.getCanonicalFileName(fileName), options),
      ignored: ignore.map(dir => path.resolve(cwd, dir) + path.sep),
      formats: new Map(),
      programs: new Map()
    };
    context.core = ts.createProgram([entry], options, host);
    contextCache.set(key, context);
  }
  return contextCache.get(key);
}

/**
 * The program of a consumer that imports nothing but `file`.
 */
function programRootedAt(file, context) {
  if (!context.programs.has(file)) {
    context.programs.set(file, ts.createProgram([file], context.options, context.host));
  }
  return context.programs.get(file);
}

function contains(program, file) {
  return program.getSourceFile(file) != null;
}

/**
 * The module format of a file, which decides how the specifiers in it resolve - an extensionless
 * one does not resolve at all from an ES module. The compiler owns those rules; this is the same
 * answer it gives itself when it builds a program.
 */
function moduleFormat(file, context) {
  if (!context.formats.has(file)) {
    context.formats.set(file, ts.getImpliedNodeFormatForFile(
      file, context.cache.getPackageJsonInfoCache(), context.host, context.options
    ));
  }
  return context.formats.get(file);
}

/**
 * What a specifier resolves to, according to the compiler - which owns the rules for extensions,
 * and for the module format they imply.
 */
function resolveSpecifier(specifier, fromFile, context) {
  const containing = path.resolve(fromFile);
  const {resolvedModule} = ts.resolveModuleName(
    specifier,
    containing,
    context.options,
    context.host,
    context.cache,
    undefined,
    moduleFormat(containing, context)
  );
  return resolvedModule == null ? null : path.resolve(resolvedModule.resolvedFileName);
}

/**
 * Whether a file is one this does not speak for - test code, whose augmentations reach no consumer
 * either way.
 */
function isIgnored(file, context) {
  return context.ignored.some(dir => file.startsWith(dir));
}

/**
 * @return {{messageId: string, data: object}|null} the problem with augmenting `specifier` from
 * `filename`, if any.
 */
function checkAugmentation(specifier, filename, options, cwd = process.cwd()) {
  if (!specifier.startsWith('.')) return null;
  const context = getContext(options, cwd);
  const file = path.resolve(cwd, filename);
  if (isIgnored(file, context)) return null;
  const target = resolveSpecifier(specifier, file, context);
  if (target == null) {
    return {messageId: 'unresolved', data: {specifier}};
  }
  // in core's program, so in the program of every consumer
  if (contains(context.core, target)) return null;
  // or pulled in by the augmenting file itself, so in the program of anyone who imports it
  if (contains(programRootedAt(file, context), target)) return null;
  return {messageId: 'unreachable', data: {specifier, target: path.relative(cwd, target)}};
}

/**
 * The syntax of a file, on its own: what the augmentations in it are and where they are does not
 * depend on any program, and a file to check is usually in none of them.
 */
function parse(file) {
  return ts.createSourceFile(
    file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, false, ts.ScriptKind.TS
  );
}

/**
 * Check files without eslint, using only the TypeScript AST.
 *
 * @return problems, each with the file and position of the offending augmentation.
 */
function checkFiles(files, options, cwd = process.cwd()) {
  const context = getContext(options, cwd);
  return files.flatMap(file => {
    if (isIgnored(path.resolve(cwd, file), context)) return [];
    const source = parse(file);
    // in a file that is not itself a module, `declare module` declares an ambient module rather
    // than augmenting an existing one, and needs no import
    if (!ts.isExternalModule(source)) return [];
    const problems = [];
    (function visit(node) {
      if (ts.isModuleDeclaration(node) && node.name && ts.isStringLiteral(node.name) &&
          !isMarkedOptional(leadingJSDoc(source, node))) {
        const problem = checkAugmentation(node.name.text, file, options, cwd);
        if (problem != null) {
          const {line, character} = source.getLineAndCharacterOfPosition(node.name.getStart(source));
          problems.push({
            file,
            line: line + 1,
            column: character + 1,
            message: formatMessage(problem.messageId, problem.data)
          });
        }
      }
      ts.forEachChild(node, visit);
    })(source);
    return problems;
  });
}

module.exports = {
  MESSAGES,
  OPTIONAL_TAG,
  isMarkedOptional,
  TYPED_EXTENSIONS,
  checkAugmentation,
  checkFiles,
  listFiles
};
