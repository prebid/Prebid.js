// Runtime half of plugins.mjs, loaded in the browser.
// on the global object, so they are shared even if this file is loaded under two URLs (setup.mjs imports it
// relatively, transformed code by its root-relative URL)
const facades = globalThis.__vitestNativeFacades ??= new WeakMap();
// filled by the modules themselves (stubSetter in plugins.mjs), keyed by their namespace
const setters = globalThis.__vitestNativeSetters ??= new WeakMap();

/**
 * A stand-in for an ES module namespace that sinon can stub, as it can a CommonJS exports object. Reads go
 * to the module's live bindings; writes reassign them through the setter the module registers,
 * so every importer, not just this one, sees the stub (and its restore). One facade per namespace, so a
 * stub made through one importer's facade can be restored through another's.
 * @param {object} ns module namespace
 * @param {object} [fallback] where to read keys the namespace lacks (a package's CommonJS exports)
 * @returns {object} the facade
 */
export function stubbable(ns, fallback) {
  if (ns == null || typeof ns !== 'object' || ns[Symbol.toStringTag] !== 'Module') return ns;
  let facade = facades.get(ns);
  if (facade) return facade;
  // keys added by test code (e.g. `sinon.sandbox = ...` on a required namespace) live here
  const extra = Object.create(null);
  const has = (k) => typeof k === 'string' && k in ns;
  // looked up on use: in an import cycle, the facade can exist before the module has run
  const set = (k, v) => {
    if (!setters.get(ns)?.(k, v)) throw new TypeError(`Cannot stub '${String(k)}': it is not a reassignable export`);
    return true;
  };
  const target = {};
  facade = new Proxy(target, {
    get: (t, k) => has(k) ? ns[k] : k in extra ? extra[k] : fallback != null && k in Object(fallback) ? fallback[k] : t[k],
    has: (t, k) => has(k) || k in extra || k in t,
    set(t, k, v) {
      if (has(k)) {
        set(k, v);
      } else {
        extra[k] = v;
      }
      return true;
    },
    defineProperty(t, k, desc) {
      if (has(k) && 'value' in desc) return set(k, desc.value);
      if (has(k)) return false;
      Object.defineProperty(extra, k, { ...desc, configurable: true });
      return true;
    },
    deleteProperty: (t, k) => has(k) ? false : delete extra[k],
    ownKeys: (t) => [...Object.keys(ns).filter(has), ...Reflect.ownKeys(extra)],
    getOwnPropertyDescriptor(t, k) {
      if (has(k)) return { value: ns[k], writable: true, enumerable: true, configurable: true };
      return Reflect.getOwnPropertyDescriptor(extra, k);
    },
    getPrototypeOf: () => Object.prototype,
  });
  facades.set(ns, facade);
  return facade;
}

/**
 * What `require(src)` returns. Under webpack that is a module's namespace object, plain and mutable, or a
 * CommonJS package's exports. Here it is a stubbable stand-in for the namespace, which also reads through to
 * `default` for names the namespace lacks. For a CommonJS package, and for JSON, it is Vite's `default`,
 * which holds `module.exports` (the parsed value).
 * @param {object} ns module namespace
 * @param {string} src the required specifier
 * @param {boolean} commonJs whether it's a CommonJS package (plugins.mjs decides, as webpack would)
 * @returns {*} the value
 */
export function required(ns, src, commonJs) {
  if (/\.json$/.test(src) || (commonJs && ns.default !== undefined)) return ns.default;
  return stubbable(ns, ns.default);
}

const pending = globalThis.__vitestNativeLater ??= [];

/**
 * A `require()` inside a function can't await, so plugins.mjs has it read an import that loadLater() runs
 * once setup is done. Starting it any earlier, while the module graph is still evaluating, can evaluate
 * the module ahead of the modules it is in a cycle with.
 * @param {function(): Promise<object>} load imports the module
 * @param {string} src the required specifier
 * @returns {function(): object} returns the namespace once loaded
 */
export function later(load, src) {
  let ns;
  pending.push(async () => { ns = await load(); });
  return () => {
    if (!ns) throw new Error(`require('${src}') ran before its module loaded`);
    return ns;
  };
}

/** Runs the imports later() deferred. */
export async function loadLater() {
  while (pending.length) await pending.shift()();
}
