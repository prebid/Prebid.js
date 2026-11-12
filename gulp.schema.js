/**
 * Generates JSON Schemas (draft 2020-12) from TypeScript types.
 *
 * Every `.d.ts` file under `schema/` that has a default export becomes `<same path>.schema.json`, describing
 * the type exported as default. Where that type refers to the default export of another schema file,
 * the generated schema `$ref`s that file instead of including it, so that consumers can choose not to load it
 * (by registering a permissive schema under its `$id`).
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const TJS = require('typescript-json-schema');
const {version} = require('./package.json');

const SCHEMA_DIR = path.resolve(__dirname, 'schema');
const DEFAULT_BASE_URL = `https://cdn.jsdelivr.net/npm/prebid.js@${version}/dist/schema/`;

/**
 * The sources as `gulp ts` compiles them - all of them, so that every module augmentation applies - but with
 * strictNullChecks, without which `T | null` is just `T`.
 */
function sourceProject() {
  const {config} = ts.readConfigFile(path.resolve(__dirname, 'tsconfig.json'), ts.sys.readFile);
  const {options, fileNames} = ts.parseJsonConfigFileContent(config, ts.sys, __dirname);
  const {outDir, tsBuildInfoFile, declaration, emitDeclarationOnly, ...rest} = options;
  return {fileNames, options: {...rest, strictNullChecks: true, noEmit: true}};
}

/**
 * Blank out JSDoc tags, keeping their positions: the generator turns tags such as `@type`, `@pattern` or `@ignore`
 * into schema keywords, and should do that only for the types written to describe a schema.
 */
function withoutJsDocTags(sourceFile) {
  const ranges = [];
  const visit = (node) => {
    ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc).forEach(doc => {
      if (doc.tags?.length > 0) ranges.push([doc.tags[0].pos, doc.end - '*/'.length]);
    });
    ts.forEachChild(node, visit);
  };
  // getJSDocCommentsAndTags needs parent pointers, which the compiler host's source files do not have
  visit(ts.createSourceFile(sourceFile.fileName, sourceFile.text, ts.ScriptTarget.Latest, true));
  if (ranges.length === 0) return sourceFile.text;
  const text = sourceFile.text.split('');
  ranges.forEach(([start, end]) => {
    for (let i = start; i < end; i++) {
      if (text[i] !== '\n' && text[i] !== '\r') text[i] = ' ';
    }
  });
  return text.join('');
}

function compilerHost(options, schemaFiles) {
  const keep = new Set(schemaFiles.map(file => path.resolve(file)));
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile;
  host.getSourceFile = function (fileName, languageVersionOrOptions, ...rest) {
    const sourceFile = getSourceFile.call(this, fileName, languageVersionOrOptions, ...rest);
    if (sourceFile == null || keep.has(path.resolve(fileName)) || !sourceFile.text.includes('@')) {
      return sourceFile;
    }
    const text = withoutJsDocTags(sourceFile);
    return text === sourceFile.text ? sourceFile : ts.createSourceFile(fileName, text, languageVersionOrOptions, true);
  };
  return host;
}

function schemaFiles(dir) {
  return fs.readdirSync(dir, {recursive: true})
    .filter(file => file.endsWith('.d.ts'))
    .map(file => path.join(dir, file));
}

function defaultExportName(program, file) {
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(file));
  let symbol = moduleSymbol?.exports?.get('default');
  if (symbol == null) return null;
  if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  return symbol.name;
}

function typeParameterIds(program) {
  const checker = program.getTypeChecker();
  const ids = new Set();
  const visit = (node) => {
    if (ts.isTypeParameterDeclaration(node)) ids.add(checker.getTypeAtLocation(node).id);
    ts.forEachChild(node, visit);
  };
  program.getSourceFiles().forEach(visit);
  return ids;
}

/**
 * typescript-json-schema reads some types (such as those of index signatures) from their declaration rather than
 * their instantiation, which turns uses of a generic's parameters into definitions for the bare parameter.
 */
function checkTypeParameters(root, schema, generator, typeParameters) {
  // typeIdsByName is reset by each getSchemaForSymbol call
  const leaked = Object.keys(schema.definitions ?? {}).filter(name => typeParameters.has(generator.typeIdsByName[name]));
  if (leaked.length > 0) {
    throw new Error(`The JSON schema for '${root}' would describe type parameter(s) ${leaked.map(n => `'${n}'`).join(', ')} rather than the types they are instantiated with. This happens with generic index signatures; use a non-generic type in its place.`);
  }
}

function toDraft2020(node, resolveRef) {
  if (Array.isArray(node)) return node.map(n => toDraft2020(n, resolveRef));
  if (node == null || typeof node !== 'object') return node;
  const result = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref') {
      Object.assign(result, resolveRef(decodeURIComponent(value.replace('#/definitions/', ''))));
    } else if (key === 'items' && Array.isArray(value)) {
      result.prefixItems = toDraft2020(value, resolveRef);
    } else if (key === 'additionalItems') {
      result.items = toDraft2020(value, resolveRef);
    } else {
      result[key] = toDraft2020(value, resolveRef);
    }
  }
  return result;
}

/**
 * @param {Object} [options]
 * @param {string} [options.baseUrl] base for the `$id` of each schema
 * @param {string} [options.dir] directory containing the `.d.ts` files to generate schemas from
 * @returns {Object.<string, Object>} map from output path (relative to the base) to schema
 */
function generateSchemas({baseUrl = DEFAULT_BASE_URL, dir = SCHEMA_DIR} = {}) {
  const files = schemaFiles(dir);
  const {fileNames, options} = sourceProject();
  const program = ts.createProgram([...new Set([...fileNames, ...files])], options, compilerHost(options, files));
  const generator = TJS.buildGenerator(program, {
    required: true,
    strictNullChecks: true,
    ref: true,
    topRef: false,
    // the sources are not null-safe yet, and are checked by `gulp ts`; errors in schema/ are checked below
    ignoreErrors: true,
  });
  const errors = ts.getPreEmitDiagnostics(program).filter(d => d.file?.fileName.startsWith(dir + path.sep));
  if (errors.length > 0) {
    throw new Error(ts.formatDiagnostics(errors, {
      getCanonicalFileName: f => f, getCurrentDirectory: () => __dirname, getNewLine: () => '\n',
    }));
  }
  const roots = Object.fromEntries(
    files
      .map(file => [defaultExportName(program, file), path.relative(dir, file).split(path.sep).join('/').replace(/\.d\.ts$/, '.schema.json')])
      .filter(([name]) => name != null)
  );
  const typeParameters = typeParameterIds(program);
  const generated = Object.fromEntries(Object.keys(roots).map(name => {
    // the generator looks types up by name, across the whole program
    if (new Set(generator.getSymbols(name).map(({symbol}) => symbol)).size > 1) {
      throw new Error(`Type name '${name}' is used for more than one type; JSON schema root types must have unique names`);
    }
    const schema = generator.getSchemaForSymbol(name);
    checkTypeParameters(name, schema, generator, typeParameters);
    return [name, schema];
  }));
  return Object.fromEntries(Object.entries(roots).map(([name, output]) => {
    const {definitions = {}, $schema, ...root} = generated[name];
    const defs = {};
    const resolveRef = (ref) => {
      if (/_\d+$/.test(ref) && roots[ref.replace(/_\d+$/, '')] != null) {
        throw new Error(`Type name '${ref.replace(/_\d+$/, '')}' is used for more than one type; JSON schema root types must have unique names`);
      }
      if (roots[ref] != null) {
        // `type` duplicates what the referenced schema says, but still applies when consumers replace it with a permissive one
        const {type} = generated[ref];
        return {$ref: path.posix.relative(path.posix.dirname(output), roots[ref]), ...(type && {type})};
      }
      if (!Object.hasOwn(defs, ref)) {
        defs[ref] = null; // claimed before converting, as definitions can be recursive
        defs[ref] = toDraft2020(definitions[ref], resolveRef);
      }
      return {$ref: `#/$defs/${encodeURIComponent(ref)}`};
    };
    const body = toDraft2020(root, resolveRef);
    return [output, {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: new URL(output, baseUrl).toString(),
      ...body,
      ...(Object.keys(defs).length > 0 && {$defs: defs}),
    }];
  }));
}

function buildSchemas(outDir) {
  return function buildSchemas(done) {
    Object.entries(generateSchemas()).forEach(([file, schema]) => {
      const target = path.join(outDir, file);
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.writeFileSync(target, JSON.stringify(schema, null, 2) + '\n');
    });
    done();
  };
}

module.exports = {generateSchemas, buildSchemas};
