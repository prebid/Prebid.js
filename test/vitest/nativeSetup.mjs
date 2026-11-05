// Runs in the browser before each spec file, after the Mocha shim (setup.mjs).
// Loads what Karma loads ahead of the specs, from the precompiled tree: test_deps.js and pipeline_setup.js.
// hookSetup.js, which Karma loads after them, is imported at the end of each spec (plugins.mjs).
import { loadLater } from './stubs.mjs';

// webpack's default `node.global`: `global` is the global object (some specs use it)
globalThis.global = globalThis;

await import('test/test_deps.js');
await import('test/pipeline_setup.js');
await loadLater();
