// Runs in the browser before each spec file, after the Mocha shim (setup.mjs).
// Loads what Karma loads ahead of the specs, from the precompiled tree: test_deps.js and pipeline_setup.js.
// hookSetup.js, which Karma loads after them, is imported at the end of each spec (plugins.mjs).
import { commands } from 'vitest/browser';
import { expiringAssignments } from './cookies.mjs';
import { loadLater } from './stubs.mjs';

// webpack's default `node.global`: `global` is the global object (some specs use it)
globalThis.global = globalThis;

// Spec files that run one after another in a page share its origin's storage; start each from none, before anything
// (test_deps.js included) reads it.
localStorage.clear();
sessionStorage.clear();
await commands.clearCookies();
// The page expires what the provider left (the debug page has none; WebDriver clears only the top page's path) or what
// WebKit still shows (cookies.mjs); writing them also has setup.mjs settle them before the first test.
const shown = () => document.cookie.split(';').some(c => c.slice(c.indexOf('=') + 1).trim());
const barrier = () => globalThis.cookieStore
  ? cookieStore.get('__vitest_cookie_barrier').catch(() => {})
  : new Promise(resolve => setTimeout(resolve, 1));
for (const start = performance.now(); (await barrier(), shown());) {
  if (performance.now() - start > 1000) throw new Error(`Could not clear cookies: ${document.cookie}`);
  expiringAssignments(document.cookie, location).forEach(assignment => { document.cookie = assignment; });
}

await import('test/test_deps.js');
await import('test/pipeline_setup.js');
await loadLater();
