// Native Vitest project (#16010): runs the precompiled specs in dist/src as ES modules served by Vite, with
// no webpack bundle. The specs listed in bridge-specs.json stay on the webpack bridge (../vitest-webpack),
// which in turn skips every spec this project runs, so each spec runs in exactly one of the two.
// Run `npx gulp precompile`, then `npm run test:vitest-native`. See "Native project" in
// ../vitest-webpack/README.md. Browser selection (VITEST_BROWSER, ...) and VITEST_PARALLEL work as there.
//   TEST_CHUNKS/TEST_CHUNK  run the native specs of one Karma chunk, as the bridge does
//   VITEST_COVERAGE=1       instrument as Karma does; lcov goes to build/coverage/chunks/native/<chunk>
//   VITEST_NATIVE_STUBS=0   leave the specs' own namespaces plain ES modules (see plugins.mjs)
//   VITEST_NATIVE_ALL=1     ignore bridge-specs.json and run every spec (for auditing it)
//   VITEST_NATIVE_PORT      the port to serve on (default 9878)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';
import bridge from '../vitest-webpack/vitest.config.mjs';
import { DIST, DIST_ENTRIES, nativeSpecs } from './plugins.mjs';
import { RAW } from './globalSetup.mjs';

// CommonJS, shared with build.js; required rather than imported so Vite doesn't bundle it into the config
const { nativeSpecFiles } = createRequire(import.meta.url)('./specs.js');
const root = path.resolve(import.meta.dirname, '../..');
const posix = (p) => p.split(path.sep).join('/');
const dist = posix(path.relative(root, DIST));
const specs = nativeSpecFiles({ all: !!process.env.VITEST_NATIVE_ALL }).map(f => `${dist}/${f}`);
const chunk = process.env.TEST_CHUNK || '1';

export default defineConfig({
  ...bridge,
  publicDir: false,
  plugins: [nativeSpecs({ coverage: !!process.env.VITEST_COVERAGE, specStubs: process.env.VITEST_NATIVE_STUBS !== '0' })],
  resolve: {
    alias: [
      // webpack resolves bare paths against dist/src (resolve.modules in webpack.conf.js)
      ...DIST_ENTRIES.map(e => e.replace(/\/$/, '')).map(e => ({ find: e, replacement: `${posix(DIST)}/${e}` })),
      { find: /^package\.json$/, replacement: path.join(root, 'package.json') },
      // karma.conf.maker.js's alias
      { find: /^web-bundler\//, replacement: posix(path.join(root, 'web-bundler')) + '/' },
      // faker's CommonJS sources include a file that isn't UTF-8, which Vite's dependency optimizer
      // rejects (webpack reads it); its prebuilt browser bundle is the same library
      { find: /^faker$/, replacement: path.join(root, 'node_modules/faker/dist/faker.js') },
    ],
  },
  optimizeDeps: {
    // Every package the specs and sources import in the browser, so Vite pre-bundles them all before the
    // run: one it discovers mid-run makes it reload the pages under test. Vite's own scan of the specs
    // misses some (it doesn't see through plugins.mjs); a package missing here shows up as
    // "dependency optimized: <name>" in the output.
    entries: [],
    include: [
      'chai', 'chai/index.js', 'chai/index.mjs', 'sinon', 'nise', 'faker', 'assert', 'lodash', 'lodash/cloneDeep', 'lodash/unset',
      'dset', 'dlv/index.js', 'klona/json', 'fun-hooks/no-eval/index.js', 'live-connect-js', 'url-parse', 'whatwg-fetch',
      'crypto-js/sha1', 'crypto-js/md5.js', 'crypto-js/hmac-sha512', 'crypto-js/enc-utf8', 'crypto-js/enc-base64',
      'video.js', 'videojs-ima', 'videojs-contrib-ads', 'videojs-playlist',
    ],
  },
  test: {
    ...bridge.test,
    // not karma's 9876, so this can run beside the bridge; specs that hard-code 9876 stay on the bridge
    api: { port: Number(process.env.VITEST_NATIVE_PORT || 9878), strictPort: true },
    include: specs,
    setupFiles: ['test/vitest-webpack/setup.mjs', 'test/vitest-native/setup.mjs'],
    globalSetup: ['test/vitest-native/globalSetup.mjs'],
    browser: {
      ...bridge.test.browser,
      commands: {
        // as the bridge's, one raw file per spec; the name ends in the chunk for coverage.js's chunkOf()
        writeCoverage(ctx, json) {
          const name = path.relative(DIST, ctx.testPath).replace(/\.m?js$/, '').replace(/[\\/]/g, '__');
          fs.mkdirSync(RAW, { recursive: true });
          fs.writeFileSync(path.join(RAW, `${name}.chunk-${chunk}_spec.json`), json);
        },
      },
    },
  },
});
