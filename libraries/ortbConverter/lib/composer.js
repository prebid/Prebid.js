const SORTED = new WeakMap();

/**
 * @typedef {Object} Component
 * A component function, that can be composed with other compatible functions into one.
 * Compatible functions take the same arguments; return values are ignored.
 *
 * @property {function} fn the component function;
 * @property {number} priority determines the order in which this function will run when composed with others.
 */

/**
 *
 * @param {Object[string, Component]} components to compose
 * @param {Object[string, function|boolean]} overrides a map from component name, to a function that should override that component.
 * Override functions are replacements, except that they get the original function they are overriding as their first argument. If the override
 * is `false`, the component is disabled.
 *
 * @return a function that will run all components in order of priority, with functions from `overrides` taking
 * precedence over components that match names
 */
export function compose(components, overrides = {}) {
  if (!SORTED.has(components)) {
    const sorted = Object.entries(components);
    sorted.sort((a, b) => {
      a = a[1].priority || 0;
      b = b[1].priority || 0;
      return a === b ? 0 : a > b ? -1 : 1
    });
    SORTED.set(components, sorted.map(([name, cmp]) => [name, cmp.fn]))
  }
  const fns = SORTED.get(components)
    .filter(([name]) => !overrides.hasOwnProperty(name) || overrides[name])
    .map(function ([name, fn]) {
      return overrides.hasOwnProperty(name) ? overrides[name].bind(this, fn) : fn;
    });
  return function () {
    const args = Array.from(arguments);
    fns.forEach(fn => {
      fn.apply(this, args);
    })
  }
}
