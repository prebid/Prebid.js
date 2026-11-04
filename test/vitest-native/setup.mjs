// Runs in the browser before each native spec file, after the Mocha shim (../vitest-webpack/setup.mjs).
// Loads what Karma loads ahead of the specs, from the precompiled tree: test_deps.js and pipeline_setup.js.
// hookSetup.js, which Karma loads after them, is imported at the end of each spec (plugins.mjs).
import { loadLater } from './stubs.mjs';

// Each spec file gets a fresh page, but pages share the origin's storage. Start each file with none, as a
// fresh browser would, so a spec can't pass or fail on cookies another file left (test_deps.js clears
// localStorage itself).
for (const cookie of document.cookie.split(';')) {
  const name = cookie.split('=')[0].trim();
  if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}
sessionStorage.clear();
// webpack's default `node.global`: `global` is the global object (some specs use it)
globalThis.global = globalThis;

await import('test/test_deps.js');
await import('test/pipeline_setup.js');
await loadLater();
