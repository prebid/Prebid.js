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

function compilerOptions() {
  const configFile = path.resolve(__dirname, 'tsconfig-strict.json');
  const {config} = ts.readConfigFile(configFile, ts.sys.readFile);
  const {options} = ts.parseJsonConfigFileContent(config, ts.sys, __dirname);
  // schema types are written against the sources, not the published declarations tsconfig-strict.json is for
  return {...options, allowImportingTsExtensions: true, noEmit: true};
}

function schemaFiles() {
  return fs.readdirSync(SCHEMA_DIR, {recursive: true})
    .filter(file => file.endsWith('.d.ts'))
    .map(file => path.join(SCHEMA_DIR, file));
}

function defaultExportName(program, file) {
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(file));
  let symbol = moduleSymbol?.exports?.get('default');
  if (symbol == null) return null;
  if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  return symbol.name;
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
 * @returns {Object.<string, Object>} map from output path (relative to the base) to schema
 */
function generateSchemas({baseUrl = DEFAULT_BASE_URL} = {}) {
  const files = schemaFiles();
  const program = ts.createProgram(files, compilerOptions());
  const generator = TJS.buildGenerator(program, {
    required: true,
    strictNullChecks: true,
    ref: true,
    topRef: false,
    // the sources are not strict yet (see tsconfig.json); errors in schema/ are checked below
    ignoreErrors: true,
  });
  const errors = ts.getPreEmitDiagnostics(program).filter(d => d.file?.fileName.startsWith(SCHEMA_DIR + path.sep));
  if (errors.length > 0) {
    throw new Error(ts.formatDiagnostics(errors, {
      getCanonicalFileName: f => f, getCurrentDirectory: () => __dirname, getNewLine: () => '\n',
    }));
  }
  const roots = Object.fromEntries(
    files
      .map(file => [defaultExportName(program, file), path.relative(SCHEMA_DIR, file).split(path.sep).join('/').replace(/\.d\.ts$/, '.schema.json')])
      .filter(([name]) => name != null)
  );
  const generated = Object.fromEntries(Object.keys(roots).map(name => [name, generator.getSchemaForSymbol(name)]));
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
