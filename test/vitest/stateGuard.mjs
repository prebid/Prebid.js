// Fails a spec file that leaves state behind on `window.top`. Each spec file runs in a page (iframe) of its own and
// starts with no cookies or storage (nativeSetup.mjs), but `window.top` is shared by the spec files that run one
// after another in a page: a property a spec adds there, or a built-in it shadows, outlives it and can break a later
// file (sevio's spec once hid `top.performance.timing`, which oolo's reads). nativeSetup.mjs snapshots it before the
// spec loads; the plugin (plugins.mjs) calls registerStateGuard() at the end of each spec, so its afterAll runs after
// the spec's own after() hooks.
import * as vitest from 'vitest';

// own properties a page shouldn't gain from a spec (built-ins live on prototypes, so an own one shadows them)
const WATCHED = {
  'window.top': () => window.top,
  'window.top.document': () => window.top.document,
  'window.top.performance': () => window.top.performance,
  'window.top.history': () => window.top.history,
  'window.top.navigator': () => window.top.navigator,
};

// what Vitest itself keeps on the top page while files run
const IGNORED = /^(__vitest|__VITEST|__vite)/;

export function snapshotTop() {
  const own = Object.fromEntries(Object.entries(WATCHED).map(([name, get]) => {
    try {
      return [name, new Set(Object.getOwnPropertyNames(get()))];
    } catch (e) {
      return [name, null];
    }
  }));
  let body = null;
  try {
    body = new Set(window.top.document.body.children);
  } catch (e) {}
  return { own, body };
}

export function leaksSince(snapshot) {
  const leaks = [];
  for (const [name, get] of Object.entries(WATCHED)) {
    const before = snapshot.own[name];
    if (before == null) continue;
    let after;
    try {
      after = Object.getOwnPropertyNames(get());
    } catch (e) {
      continue;
    }
    after.filter(key => !before.has(key) && !IGNORED.test(key)).forEach(key => leaks.push(`${name}.${key}`));
  }
  if (snapshot.body) {
    try {
      [...window.top.document.body.children]
        .filter(el => !snapshot.body.has(el) && el.tagName !== 'IFRAME')
        .forEach(el => leaks.push(`an element in window.top.document.body (<${el.tagName.toLowerCase()}${el.id ? ` id="${el.id}"` : ''}>)`));
    } catch (e) {}
  }
  return leaks;
}

export function registerStateGuard() {
  const snapshot = globalThis.__vitestTopSnapshot__;
  if (!snapshot) return;
  vitest.afterAll(() => {
    const leaks = leaksSince(snapshot);
    if (leaks.length) {
      throw new Error(`This spec file left state on window.top, which later spec files share: ${leaks.join(', ')}. ` +
        'Restore it in an after()/afterEach() hook (delete an own property you added). See test/vitest/README.md.');
    }
  });
}
