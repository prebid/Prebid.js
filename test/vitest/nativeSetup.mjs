// Runs in the browser before each spec file, after the Mocha shim (setup.mjs).
// Loads what Karma loads ahead of the specs, from the precompiled tree: test_deps.js and pipeline_setup.js.
// hookSetup.js, which Karma loads after them, is imported at the end of each spec (plugins.mjs).
import { loadLater } from './stubs.mjs';
import { snapshotTop } from './stateGuard.mjs';

// Each spec file gets a fresh page, but pages share the origin's storage. Start each file with none, as a
// fresh browser would, so a spec can't pass or fail on cookies another file left (test_deps.js clears
// localStorage itself).
// A cookie written for a domain (Domain=bs-local.com on a BrowserStack device, as sharedId's are) is only removed by
// expiring it for that domain too, so expire each one host-only and for the page's domain and each parent domain.
const domains = location.hostname.split('.').map((_, i, parts) => parts.slice(i).join('.')).filter(d => d.includes('.'));
for (const cookie of document.cookie.split(';')) {
  const name = cookie.split('=')[0].trim();
  if (!name) continue;
  for (const domain of ['', ...domains]) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ''}`;
  }
}
sessionStorage.clear();
// webpack's default `node.global`: `global` is the global object (some specs use it)
globalThis.global = globalThis;

await import('test/test_deps.js');
await import('test/pipeline_setup.js');
await loadLater();

// window.top as this spec file finds it, after the shared setup above and before the spec: stateGuard.mjs fails the
// file if the spec leaves something behind there
globalThis.__vitestTopSnapshot__ = snapshotTop();
