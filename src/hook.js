
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
export const hooks = {};

/**
 * A utility function for allowing a regular function to be extensible with additional hook functions
 * @param {string} type The method for applying all attached hooks when this hooked function is called
 * @param {function()} fn The function to make hookable
 * @param {string} hookName If provided this allows you to register a name for a global hook to have easy access to
 *  the addHook and removeHook methods for that hook (which are usually accessed as methods on the function itself)
 * @returns {HookedFunction} A new function that implements the HookedFunction interface
 */
export function createHook(type, fn, hookName) {
  let _hooks = [{fn, priority: 0}];

  let types = {
    sync: function(...args) {
      _hooks.forEach(hook => {
        hook.fn.apply(this, args);
      });
    },
    asyncSeries: function(...args) {
      let curr = 0;

      const asyncSeriesNext = (...args) => {
        let hook = _hooks[++curr];
        if (typeof hook === 'object' && typeof hook.fn === 'function') {
          return hook.fn.apply(this, args.concat(asyncSeriesNext))
        }
      };

      return _hooks[curr].fn.apply(this, args.concat(asyncSeriesNext));
    }
  };

  if (!types[type]) {
    throw 'invalid hook type';
  }

  let methods = {
    addHook: function(fn, priority = 10) {
      if (typeof fn === 'function') {
        _hooks.push({
          fn,
          priority: priority
        });

        _hooks.sort((a, b) => b.priority - a.priority);
      }
    },
    removeHook: function(removeFn) {
      _hooks = _hooks.filter(hook => hook.fn === fn || hook.fn !== removeFn);
    },
    hasHook: function(fn) {
      return _hooks.some(hook => hook.fn === fn);
    }
  };

  if (typeof hookName === 'string') {
    hooks[hookName] = methods;
  }

  function hookedFn(...args) {
    if (_hooks.length === 1 && _hooks[0].fn === fn) {
      return fn.apply(this, args);
    }
    return types[type].apply(this, args);
  }

  return Object.assign(hookedFn, methods);
}
