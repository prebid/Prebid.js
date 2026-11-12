// Runs in the browser before each spec file, after the Mocha shim (setup.mjs).
// Loads what Karma loads ahead of the specs, from the precompiled tree: test_deps.js and pipeline_setup.js.
// hookSetup.js, which Karma loads after them, is imported at the end of each spec (plugins.mjs).
import { commands } from 'vitest/browser';
import { loadLater } from './stubs.mjs';
import { snapshotTop } from './stateGuard.mjs';

// webpack's default `node.global`: `global` is the global object (some specs use it)
globalThis.global = globalThis;

// Spec files that run one after another in a page share its origin's storage; start each from none, before anything
// (test_deps.js included) reads it.
localStorage.clear();
sessionStorage.clear();
if (!await commands.clearCookies()) {
  // the debug page, which has no provider to clear them; good enough for cookies the specs set at their default path or /
  const dir = location.pathname.slice(0, location.pathname.lastIndexOf('/')) || '/';
  document.cookie.split(';').map(c => c.split('=', 1)[0].trim()).filter(Boolean).forEach(name => {
    [dir, '/'].forEach(path => { document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`; });
  });
} else {
  // WebKit's document.cookie can still show cleared cookies for a moment (cookies.mjs)
  const barrier = () => globalThis.cookieStore
    ? cookieStore.get('__vitest_cookie_barrier').catch(() => {})
    : new Promise(resolve => setTimeout(resolve, 1));
  for (const start = performance.now(); (await barrier(), document.cookie);) {
    if (performance.now() - start > 1000) throw new Error(`Could not clear cookies: ${document.cookie}`);
  }
}

// before test_deps.js, so that the modules it loads see it too
await import('test/helpers/windowTop.js');
await import('test/test_deps.js');
await import('test/pipeline_setup.js');
await loadLater();

// window.top as this spec file finds it, after the shared setup above and before the spec: stateGuard.mjs fails the
// file if the spec leaves something behind there
globalThis.__vitestTopSnapshot__ = snapshotTop();
