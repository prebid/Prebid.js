
import create from 'fun-hooks';
import { logError } from 'src/utils';

export let hook = create();
/**
 * @typedef {function} HookedFunction
 * @property {function(function(), [number])} addHook A method that takes a new function to attach as a hook
 *  to the HookedFunction
 * @property {function(function())} removeHook A method to remove attached hooks
 */

/**
 * A map of global hook methods to allow easy extension of hooked functions that are intended to be extended globally
 * @type {{}}
 */
export const hooks = hook.hooks;

/**
 * An adapter from old API to new fun-hooks API
 *
 * @deprecated The hooks API has been updated and this function will be removed in a future version of Prebid.  Rather
 * than `createHook`, `hook` should be used above.  Once a function has been hooked with `hook` above, the hooked
 * functions should use `before` and `after` to attach hooks rather than `addHook`.
 *
 * @param {string} type The method for applying all attached hooks when this hooked function is called
 * @param {function()} fn The function to make hookable
 * @param {string} hookName If provided this allows you to register a name for a global hook to have easy access to
 *  the addHook and removeHook methods for that hook (which are usually accessed as methods on the function itself)
 * @returns {HookedFunction} A new function that implements the HookedFunction interface
 */
export function createHook(type, fn, hookName) {
  if (type !== 'asyncSeries') {
    return logError('unsupported hook');
  }
  let removeMap = new Map();
  return Object.assign(hook('async', fn, hookName), {
    addHook(fn, priority = 10) {
      let removes;
      if (removeMap.has(fn)) {
        removes = removeMap.get(fn);
      } else {
        removes = [];
        removeMap.set(fn, removes);
      }
      this[priority >= 0 ? 'before' : 'after'](
        partial,
        priority
      );

      removes.push(() => this.getHooks({hook: partial}).remove());

      function partial(...args) {
        args.push(args.shift());
        fn.apply(this, args);
      }
    },
    removeHook(fn) {
      let removes = removeMap.get(fn);
      if (Array.isArray(removes)) {
        removes.forEach(rm => rm());
        removeMap.set(fn, []);
      }
    },
    hasHook(fn) {
      let removes = removeMap.get(fn);
      return Array.isArray(removes) && removes.length > 0;
    }
  });
}
