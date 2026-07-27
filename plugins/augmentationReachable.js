/**
 * Checks that relative `declare module` augmentations can take effect.
 *
 * TypeScript resolves the module named by an augmentation, but does not add it to the program:
 * the augmentation only applies if something else pulls that file in. An augmentation of a file
 * that nothing imports is silently inert - the types it declares never reach a consumer.
 *
 * This is the policy shared by the `prebid/augmentation-reachable` lint rule (which runs on the
 * sources) and `gulp lint-declarations` (which runs on generated declarations, where the imports
 * that survived declaration emit can finally be seen).
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// a specifier may name any of the extensions the same module can be served by - `./x.ts` is
// `x.d.ts` once compiled, `./x.js` may be `x.ts` in the sources
const RESOLVE_EXTENSIONS = ['.d.ts', '.ts', '.js', '.mjs'];
// only typed files contribute to the type program an augmentation needs its target to be part of
const TYPED_EXTENSIONS = ['.d.ts', '.ts'];

const MESSAGES = {
  unresolved: 'cannot resolve augmented module "{{specifier}}"',
  unreachable: 'augmenting "{{specifier}}", but nothing imports {{target}}, so the augmentation ' +
    'never applies. Import it (a side effect import, or a re-export, survives declaration emit).'
};

function formatMessage(messageId, data) {
  return Object.entries(data).reduce(
    (message, [key, value]) => message.replaceAll(`{{${key}}}`, value),
    MESSAGES[messageId]
  );
}

function resolveSpecifier(specifier, fromFile) {
  const base = path.resolve(path.dirname(fromFile), specifier.replace(/\.(d\.ts|ts|js|mjs)$/, ''));
  const candidates = [base]
    .concat(RESOLVE_EXTENSIONS.map(ext => base + ext))
    .concat(RESOLVE_EXTENSIONS.map(ext => path.join(base, `index${ext}`)));
  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

function parse(file) {
  return ts.createSourceFile(
    file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, false, ts.ScriptKind.TS
  );
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

/**
 * Everything the given file pulls into a TS program - imports and exports, including the
 * `import("./x").T` form that declaration emit uses for cross-file type references.
 */
function collectImports(file, into) {
  (function visit(node) {
    let specifier;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      specifier = node.moduleSpecifier.text;
    } else if (ts.isImportTypeNode(node) && node.argument && ts.isLiteralTypeNode(node.argument)) {
      specifier = node.argument.literal.text;
    }
    if (specifier?.startsWith('.')) {
      const resolved = resolveSpecifier(specifier, file);
      if (resolved != null) into.add(resolved);
    }
    ts.forEachChild(node, visit);
  })(parse(file));
}

/**
 * Files a consumer can pull in without any other file importing them: the module entry points,
 * exposed through package.json "exports" as `prebid.js/modules/*`.
 */
function collectEntryPoints(dir, into) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      RESOLVE_EXTENSIONS.map(ext => path.join(entryPath, `index${ext}`))
        .filter(fs.existsSync)
        .forEach(file => into.add(file));
    } else if (RESOLVE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      into.add(entryPath);
    }
  }
}

const graphCache = new Map();

function getReachableFiles({roots = [], entryDirs = [], ignore = []} = {}, cwd = process.cwd()) {
  const key = JSON.stringify([cwd, roots, entryDirs, ignore]);
  if (!graphCache.has(key)) {
    const reachable = new Set();
    const excluded = ignore.map(dir => path.resolve(cwd, dir));
    roots.forEach(root => listFiles(path.resolve(cwd, root), TYPED_EXTENSIONS, excluded)
      .forEach(file => collectImports(file, reachable)));
    entryDirs.forEach(dir => collectEntryPoints(path.resolve(cwd, dir), reachable));
    graphCache.set(key, reachable);
  }
  return graphCache.get(key);
}

/**
 * @return {{messageId: string, data: object}|null} the problem with augmenting `specifier` from
 * `filename`, if any.
 */
function checkAugmentation(specifier, filename, options, cwd = process.cwd()) {
  if (!specifier.startsWith('.')) return null;
  const target = resolveSpecifier(specifier, filename);
  if (target == null) {
    return {messageId: 'unresolved', data: {specifier}};
  }
  if (!getReachableFiles(options, cwd).has(target)) {
    return {messageId: 'unreachable', data: {specifier, target: path.relative(cwd, target)}};
  }
  return null;
}

/**
 * Check files without eslint, using only the TypeScript AST.
 *
 * @return problems, each with the file and position of the offending augmentation.
 */
function checkFiles(files, options, cwd = process.cwd()) {
  return files.flatMap(file => {
    const source = parse(file);
    // in a file that is not itself a module, `declare module` declares an ambient module rather
    // than augmenting an existing one, and needs no import
    if (!ts.isExternalModule(source)) return [];
    const problems = [];
    (function visit(node) {
      if (ts.isModuleDeclaration(node) && node.name && ts.isStringLiteral(node.name)) {
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
  TYPED_EXTENSIONS,
  checkAugmentation,
  checkFiles,
  listFiles
};
