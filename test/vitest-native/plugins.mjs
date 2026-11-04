// A Vite plugin that lets the precompiled specs (dist/src/test) run as native ES modules, unchanged. It
// covers what webpack and @babel/plugin-transform-modules-commonjs give the bridge (../vitest-webpack):
//   - `require()` in test code (test_deps.js, global_hooks.js, ~80 specs);
//   - `sinon.stub(namespace, 'fn')`, which ~300 specs and test/mocks/adloaderStub.js do: the namespaces that
//     test code imports are replaced by stand-ins whose writes reassign the module's exports (stubs.mjs).
//     Unlike a CommonJS stub, this also replaces the module's own calls to the export;
//   - test/helpers/hookSetup.js loading after each spec, as Karma loads it after the specs;
//   - with coverage, babel-plugin-istanbul over the sources, as test/webpackTestConfig.js does.
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
const STUBS = '/test/vitest-native/stubs.mjs';
const HOOK_SETUP = '/dist/src/test/helpers/hookSetup.js';
const SETTER = '__vitestNativeSet__';
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
 * @returns {import('vite').Plugin[]} the plugins
 */
export function nativeSpecs({ coverage = false, specStubs = true } = {}) {
  const stubbable = (id) => isTest(id) && (specStubs || !isSpec(id));
  return [{
    name: 'prebid-native-specs',
    enforce: 'pre',
    configureServer(server) {
      // Every spec file loads in a new page, and Vite has the browser revalidate each module on every load
      // (Cache-Control: no-cache), several hundred requests a page. dist/src doesn't change during a run, so
      // let the browser keep its modules.
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
      if (!isTest(id)) {
        const instrumented = coverage ? instrument(code, id) : code;
        return { code: addSetter(instrumented, id) ?? instrumented, map: null };
      }
      let out = code;
      let prelude = '';
      if (stubbable(id)) {
        out = out.replace(/\bimport \* as (\w+) from (['"][^'"]+['"]);?/g, (m, name, src) => {
          prelude = prelude || `import { stubbable as __stubbable } from '${STUBS}'; `;
          return `import * as __ns_${name} from ${src}; const ${name} = __stubbable(__ns_${name});`;
        });
      }
      if (/\brequire\(/.test(out)) out = rewriteRequire(out, id);
      if (isSpec(id)) out += `\nawait import('${HOOK_SETUP}');\n`;
      return out === code ? null : { code: prelude + out, map: null };
    },
  }];
}

// `export function f` and `export let x` bindings can be reassigned inside their module, and importers see
// the new value through the live binding. A setter export lets stubs.mjs do that from outside, which is
// what `sinon.stub(namespace, 'f')` does to a CommonJS exports object.
function addSetter(code, id) {
  let exports;
  try {
    [, exports] = parse(code, id);
  } catch {
    return null;
  }
  // `export const` can't be reassigned; `let` behaves the same otherwise
  const locals = [...new Set(exports.filter(e => e.ln && e.n !== 'default').map(e => [e.n, e.ln]).map(JSON.stringify))].map(s => JSON.parse(s));
  if (!locals.length) return null;
  const cases = locals.map(([n, ln]) => `case ${JSON.stringify(n)}: ${ln} = v; return true;`).join(' ');
  // (padded to the same length, so the source map still lines up; not only at line starts, as instrumented
  // code with retainLines puts several statements on a line)
  return code.replace(/(?<![\w$.])export const /g, 'export let   ') +
    `\nexport function ${SETTER}(n, v) { switch (n) { ${cases} } return false; }\n`;
}

// What test/webpackTestConfig.js does with coverage on: babel-plugin-istanbul over the precompiled sources, with
// their source maps, so coverage.js can map the counters back to the original files.
function instrument(code, id) {
  const babel = require('@babel/core');
  let inputSourceMap;
  try {
    // with absolute sources, as webpack's extractSourceMap hands them to the bridge's babel-loader
    const map = JSON.parse(fs.readFileSync(file(id) + '.map', 'utf8'));
    const base = path.resolve(path.dirname(file(id)), map.sourceRoot ?? '');
    inputSourceMap = { ...map, sourceRoot: undefined, sources: map.sources.map(s => path.resolve(base, s)) };
  } catch {}
  return babel.transformSync(code, {
    filename: file(id),
    configFile: false,
    babelrc: false,
    sourceType: 'module',
    retainLines: true,
    plugins: [['babel-plugin-istanbul', { cwd: DIST, exclude: ['test/**', 'buildOptions.mjs'], inputSourceMap }]],
  }).code;
}

// `require('x')` at a module's top level becomes `await import('x')` in place, keeping evaluation order
// (test_deps.js sets globals between its requires). Inside a function it can't await, so it becomes a
// static import in a spec (its describe() callbacks run while the module evaluates, and need it then), and
// elsewhere a dynamic import that setup.mjs runs once everything has loaded, read when the require() runs:
// global_hooks.js requires userSync lazily to avoid an import cycle, which an earlier import brings back.
function rewriteRequire(code, id) {
  const babel = require('@babel/core');
  const hoisted = [];
  const result = babel.transformSync(code, {
    filename: file(id),
    configFile: false,
    babelrc: false,
    sourceType: 'module',
    sourceMaps: false,
    // keep line numbers, so the spec's source map (and failure locations) still apply
    retainLines: true,
    plugins: [({ types: t }) => ({
      visitor: {
        CallExpression(p) {
          const { callee, arguments: args } = p.node;
          if (!t.isIdentifier(callee, { name: 'require' }) || p.scope.hasBinding('require') ||
            args.length !== 1 || !t.isStringLiteral(args[0])) return;
          const src = args[0].value;
          let ns;
          if (p.getFunctionParent() && isSpec(id)) {
            ns = t.identifier(`__req_${hoisted.length}`);
            hoisted.push(`import * as ${ns.name} from ${JSON.stringify(src)};`);
          } else if (p.getFunctionParent()) {
            ns = t.identifier(`__req_${hoisted.length}`);
            hoisted.push(`const ${ns.name} = __vitestLater(() => import(${JSON.stringify(src)}), ${JSON.stringify(src)});`);
            ns = t.callExpression(ns, []);
          } else {
            ns = t.awaitExpression(t.callExpression(t.import(), [t.stringLiteral(src)]));
          }
          p.replaceWith(t.callExpression(t.identifier('__vitestRequire'),
            [ns, t.stringLiteral(src), t.booleanLiteral(isCommonJsPackage(src))]));
        },
      },
    })],
  });
  return `import { required as __vitestRequire, later as __vitestLater } from '${STUBS}'; ${hoisted.join(' ')} ${result.code}`;
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
