// A Vite plugin that lets the precompiled specs (dist/src/test) run as native ES modules, unchanged. It
// covers what webpack and @babel/plugin-transform-modules-commonjs gave them under Karma:
//   - `require()` in test code (test_deps.js, global_hooks.js, ~80 specs);
//   - `sinon.stub(namespace, 'fn')`, which ~300 specs and test/mocks/adloaderStub.js do: the namespaces that
//     test code imports are replaced by stand-ins whose writes reassign the module's exports (stubs.mjs).
//     Unlike a CommonJS stub, this also replaces the module's own calls to the export;
//   - test/helpers/hookSetup.js loading after each spec, as Karma loads it after the specs;
//   - with coverage, babel-plugin-istanbul over the sources, as Karma's webpack config did.
// vitest.config.mjs resolves bare `src/...`, `modules/...`, `test/...` imports against dist/src.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { init, parse } from 'es-module-lexer';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '../..');
export const DIST = path.join(ROOT, 'dist/src');
const DIST_TEST = path.join(DIST, 'test') + path.sep;
// root-relative URLs
const STUBS = '/test/vitest/stubs.mjs';
const HOOK_SETUP = '/dist/src/test/helpers/hookSetup.js';
// what webpack resolves bare specifiers against first (resolve.modules in webpack.conf.js): `src/`, `modules/`,
// `test/`, ..., and top-level files such as `buildOptions.mjs`
export const DIST_ENTRIES = fs.existsSync(DIST)
  ? fs.readdirSync(DIST, { withFileTypes: true }).map(d => d.isDirectory() ? d.name + '/' : d.name)
  : [];
const isAliased = (src) => DIST_ENTRIES.some(e => e.endsWith('/') ? src.startsWith(e) : src === e);

const file = (id) => path.normalize(id.split('?')[0]);
const isDist = (id) => file(id).startsWith(DIST + path.sep) && !id.includes('node_modules');
const isTest = (id) => file(id).startsWith(DIST_TEST);
const isSpec = (id) => isTest(id) && /_spec\.m?js$/.test(file(id));

/**
 * @param {object} options
 * @param {boolean} options.coverage instrument the sources with babel-plugin-istanbul, as Karma's coverage runs do
 * @param {boolean} options.specStubs also make specs' own `import * as ns` namespaces stubbable. Without it,
 *   only the shared mocks and helpers get stubbable namespaces (test/mocks/adloaderStub.js needs one) and
 *   a spec that stubs a namespace fails with "ES Modules cannot be stubbed", as under plain Vite.
 * @param {boolean} options.cacheModules let the browser keep dist/src modules for the whole run; only safe when
 *   dist/src can't change mid-run (not in watch mode)
 * @returns {import('vite').Plugin[]} the plugins
 */
export function nativeSpecs({ coverage = false, specStubs = true, cacheModules = true } = {}) {
  const stubbable = (id) => isTest(id) && (specStubs || !isSpec(id));
  return [{
    name: 'prebid-native-specs',
    enforce: 'pre',
    configureServer(server) {
      // Every spec file loads in a new page, and Vite has the browser revalidate each module on every load
      // (Cache-Control: no-cache), several hundred requests a page.
      if (!cacheModules) return;
      server.middlewares.use((req, res, next) => {
        if (req.url?.includes('/dist/src/')) {
          const setHeader = res.setHeader;
          res.setHeader = function (name, value) {
            return setHeader.call(this, name, String(name).toLowerCase() === 'cache-control' ? 'max-age=31536000, immutable' : value);
          };
        }
        next();
      });
    },
    async transform(code, id) {
      if (!isDist(id) || !/\.m?js$/.test(file(id))) return null;
      await init;
      return transformFile(code, id, { coverage, facades: stubbable(id) });
    },
  }];
}

// At most one Babel pass per file. Sources: stubSetter when the module has named exports of its own, and
// babel-plugin-istanbul with coverage. Test code: namespaceFacades, requireToImport, and hookSetup.js after a spec.
function transformFile(code, id, { coverage, facades }) {
  const plugins = [];
  const test = isTest(id);
  if (!test) {
    if (hasOwnNamedExports(code, id)) plugins.push([stubSetter, { self: '/' + path.relative(ROOT, file(id)).split(path.sep).join('/') }]);
    if (coverage) plugins.push(istanbul(id));
  } else {
    if (facades && /\bimport\s*\*\s*as\b/.test(code)) plugins.push(namespaceFacades);
    if (/\brequire\(/.test(code)) plugins.push([requireToImport, { spec: isSpec(id) }]);
  }
  let out = code;
  let map = null;
  if (plugins.length) {
    const result = require('@babel/core').transformSync(code, {
      filename: file(id),
      configFile: false,
      babelrc: false,
      sourceType: 'module',
      // keeps the lines, so test code can go on using the precompile's source map
      retainLines: true,
      sourceMaps: !test,
      // Vite chains the map onto the precompile's
      inputSourceMap: false,
      plugins,
    });
    out = result.code;
    map = result.map;
  }
  if (isSpec(id)) out += `\nawait import('${HOOK_SETUP}');\n`;
  return out === code ? null : { code: out, map };
}

function hasOwnNamedExports(code, id) {
  try {
    return parse(code, id)[1].some(e => e.ln && e.n !== 'default');
  } catch {
    return false;
  }
}

/**
 * Babel plugin that makes `import * as ns` in test code bind `ns` to a stubbable facade (stubs.mjs) of the
 * namespace, rather than the namespace itself.
 */
export function namespaceFacades({ types: t, template }) {
  return {
    visitor: {
      Program(p) {
        const facades = [];
        for (const { node } of p.get('body')) {
          if (node.type !== 'ImportDeclaration') continue;
          for (const s of node.specifiers) {
            if (s.type !== 'ImportNamespaceSpecifier') continue;
            const name = s.local.name;
            s.local = t.identifier(`__ns_${name}`);
            p.scope.removeOwnBinding(name);
            facades.push(`const ${name} = __stubbable(${s.local.name});`);
          }
        }
        if (!facades.length) return;
        p.unshiftContainer('body', template.statements.ast(
          `import { stubbable as __stubbable } from '${STUBS}'; ${facades.join(' ')}`));
      },
    },
  };
}

/**
 * Babel plugin that lets stubs.mjs reassign a module's named exports from outside, as `sinon.stub(namespace,
 * 'f')` does to a CommonJS exports object; importers see the new value through the live binding. It registers
 * a setter under the module's namespace (imported from the module itself, at `self`), rather than exporting
 * one, so the namespace's keys stay the same. Exported `const`s become `let`s; imports can't be reassigned.
 */
export function stubSetter({ types: t, template }) {
  return {
    visitor: {
      Program: {
        // ahead of istanbul's enter, which instruments the body and adds its own bindings
        enter(p, state) {
          state.cases = [];
          for (const { node } of p.get('body')) {
            if (node.type !== 'ExportNamedDeclaration' || node.source) continue;
            const names = node.declaration
              ? Object.keys(t.getOuterBindingIdentifiers(node.declaration)).map(n => [n, n])
              : node.specifiers.map(s => [s.exported.name ?? s.exported.value, s.local.name]);
            for (const [exported, local] of names) {
              const binding = exported !== 'default' && p.scope.getOwnBinding(local);
              if (!binding || !['var', 'let', 'const', 'hoisted'].includes(binding.kind)) continue;
              if (binding.kind === 'const') binding.path.parentPath.node.kind = 'let';
              state.cases.push([exported, local]);
            }
          }
        },
        // after istanbul's enter, so the setter isn't instrumented
        exit(p, state) {
          if (!state.cases.length) return;
          const self = p.scope.generateUid('vitestSelf');
          const [n, v] = [p.scope.generateUid('n'), p.scope.generateUid('v')];
          const cases = state.cases.map(([exported, local]) => `case ${JSON.stringify(exported)}: ${local} = ${v}; return true;`).join(' ');
          p.unshiftContainer('body', template.statements.ast(`
            import * as ${self} from ${JSON.stringify(state.opts.self)};
            (globalThis.__vitestNativeSetters ??= new WeakMap()).set(${self}, (${n}, ${v}) => { switch (${n}) { ${cases} } return false; });
          `));
        },
      },
    },
  };
}

// What Karma's webpack config did with coverage on: babel-plugin-istanbul over the precompiled sources, with
// their source maps, so coverage.js can map the counters back to the original files.
function istanbul(id) {
  let inputSourceMap;
  try {
    // with absolute sources, as webpack's extractSourceMap handed them to babel-loader under Karma
    const map = JSON.parse(fs.readFileSync(file(id) + '.map', 'utf8'));
    const base = path.resolve(path.dirname(file(id)), map.sourceRoot ?? '');
    inputSourceMap = { ...map, sourceRoot: undefined, sources: map.sources.map(s => path.resolve(base, s)) };
  } catch {}
  return ['babel-plugin-istanbul', { cwd: DIST, exclude: ['test/**', 'buildOptions.mjs'], inputSourceMap }];
}

// `require('x')` at a module's top level becomes `await import('x')` in place, keeping evaluation order
// (test_deps.js sets globals between its requires). Inside a function it can't await, so it becomes a
// static import in a spec (its describe() callbacks run while the module evaluates, and need it then), and
// elsewhere a dynamic import that setup.mjs runs once everything has loaded, read when the require() runs:
// global_hooks.js requires userSync lazily to avoid an import cycle, which an earlier import brings back.
function requireToImport({ types: t, template }) {
  return {
    visitor: {
      Program: {
        enter(p, state) {
          state.hoisted = [];
        },
        exit(p, state) {
          if (!state.required) return;
          p.unshiftContainer('body', template.statements.ast(
            `import { required as __vitestRequire, later as __vitestLater } from '${STUBS}'; ${state.hoisted.join(' ')}`));
        },
      },
      CallExpression(p, state) {
        const { callee, arguments: args } = p.node;
        if (!t.isIdentifier(callee, { name: 'require' }) || p.scope.hasBinding('require') ||
          args.length !== 1 || !t.isStringLiteral(args[0])) return;
        const src = args[0].value;
        const { hoisted } = state;
        let ns;
        if (p.getFunctionParent() && state.opts.spec) {
          ns = t.identifier(`__req_${hoisted.length}`);
          hoisted.push(`import * as ${ns.name} from ${JSON.stringify(src)};`);
        } else if (p.getFunctionParent()) {
          ns = t.identifier(`__req_${hoisted.length}`);
          hoisted.push(`const ${ns.name} = __vitestLater(() => import(${JSON.stringify(src)}), ${JSON.stringify(src)});`);
          ns = t.callExpression(ns, []);
        } else {
          ns = t.awaitExpression(t.callExpression(t.import(), [t.stringLiteral(src)]));
        }
        state.required = true;
        p.replaceWith(t.callExpression(t.identifier('__vitestRequire'),
          [ns, t.stringLiteral(src), t.booleanLiteral(isCommonJsPackage(src))]));
      },
    },
  };
}

// Whether webpack's require() of a package specifier gets CommonJS (module.exports) rather than an ES
// module (a namespace): it prefers a package's `browser` export condition and `module` field.
function isCommonJsPackage(src) {
  if (/^[./]/.test(src) || isAliased(src)) return false;
  const name = src.split('/').slice(0, src.startsWith('@') ? 2 : 1).join('/');
  try {
    const pkg = require(path.join(ROOT, 'node_modules', name, 'package.json'));
    const dot = pkg.exports?.['.'] ?? pkg.exports;
    return !(pkg.type === 'module' || pkg.module || (src === name && typeof dot === 'object' && dot?.browser));
  } catch {
    return true;
  }
}
