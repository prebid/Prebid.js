import {isData, sessionedApplies} from '../../src/activities/redactor.js';
import {deepEqual, logWarn} from '../../src/utils.js';

/**
 * @typedef {import('../src/activities/redactor.js').TransformationRuleDef} TransformationRuleDef
 * @typedef {import('../src/adapters/bidderFactory.js').TransformationRule} TransformationRule
 * @typedef {Object} ObjectGuard
 * @property {*} obj a view on the guarded object
 * @property {function(): void} verify a function that checks for and rolls back disallowed changes to the guarded object
 */

/**
 * Create a factory function for object guards using the given rules.
 *
 * An object guard is a view on the guarded object that applies "redact" rules (the same rules used in activites/redactor.js),
 * and prevents writes (including deltes) that violate "write protect" rules.
 *
 * This is meant to provide sandboxed version of a privacy-sensitive object, where reads
 * are filtered through redaction rules and writes are checked against write protect rules.
 *
 */
export function objectGuard(rules) {
  const root = {};

  // rules are associated with specific portions of the object, e.g. "user.eids"
  // build a tree representation of them, where the root is the object itself,
  // and each node's children are properties of the corresponding (nested) object.

  rules.forEach(rule => {
    rule.paths.forEach(path => {
      let node = root;
      path.split('.').forEach(el => {
        node.children = node.children ?? {};
        node.children[el] = node.children[el] ?? { parent: node, path: node.path ? `${node.path}.${el}` : el };
        node = node.children[el];
        node.wpRules = node.wpRules ?? [];
        node.redactRules = node.redactRules ?? [];
      });
      (rule.wp ? node.wpRules : node.redactRules).push(rule);
      if (rule.wp) {
        // mark the whole path as write protected, so that write operations
        // on parents do not need to walk down the tree
        let parent = node;
        while (parent && !parent.hasWP) {
          parent.hasWP = true;
          parent = parent.parent;
        }
      }
    });
  });

  function getRedactRule(node) {
    if (node.redactRule == null) {
      node.redactRule = node.redactRules.length === 0 ? false : {
        check: (applies) => node.redactRules.some(applies),
        get(val) {
          for (const rule of node.redactRules) {
            val = rule.get(val);
            if (!isData(val)) break;
          }
          return val;
        }
      }
    }
    return node.redactRule;
  }

  function getWPRule(node) {
    if (node.wpRule == null) {
      node.wpRule = node.wpRules.length === 0 ? false : {
        check: (applies) => node.wpRules.some(applies),
      }
    }
    return node.wpRule;
  }

  /**
   * clean up `newValue` so that it doesn't violate any write protect rules
   * when set onto the property represented by 'node'.
   *
   * This is done substituting (portions of) `curValue` when some rule is violated.
   */
  function cleanup(node, curValue, newValue, applies) {
    if (
      !node.hasWP ||
      (!isData(curValue) && !isData(newValue)) ||
      deepEqual(curValue, newValue)
    ) {
      return newValue;
    }
    const rule = getWPRule(node);
    if (rule && rule.check(applies)) {
      return curValue;
    }
    if (node.children) {
      for (const [prop, child] of Object.entries(node.children)) {
        const propValue = cleanup(child, curValue?.[prop], newValue?.[prop], applies);
        if (newValue != null && typeof newValue === 'object') {
          if (!isData(propValue) && !curValue?.hasOwnProperty(prop)) {
            delete newValue[prop];
          } else {
            newValue[prop] = propValue;
          }
        } else {
          logWarn(`Invalid value set for '${node.path}', expected an object`, newValue);
          return curValue;
        }
      }
    }
    return newValue;
  }

  function isDeleteAllowed(node, curValue, applies) {
    if (!node.hasWP || !isData(curValue)) {
      return true;
    }
    const rule = getWPRule(node);
    if (rule && rule.check(applies)) {
      return false;
    }
    if (node.children) {
      for (const [prop, child] of Object.entries(node.children)) {
        if (!isDeleteAllowed(child, curValue?.[prop], applies)) {
          return false;
        }
      }
    }
    return true;
  }

  function mkGuard(obj, tree, final, applies, cache = new WeakMap()) {
    // If this object is already proxied, return the cached proxy
    if (cache.has(obj)) {
      return cache.get(obj);
    }

    const proxy = new Proxy(obj, {
      get(target, prop, receiver) {
        const val = Reflect.get(target, prop, receiver);
        if (final && val != null && typeof val === 'object') {
          // a parent property has write protect rules, keep guarding
          return mkGuard(val, tree, final, applies, cache)
        } else if (tree.children?.hasOwnProperty(prop)) {
          const {children, hasWP} = tree.children[prop];
          if ((children || hasWP) && val != null && typeof val === 'object') {
            // some nested properties have rules, return a guard for the branch
            return mkGuard(val, tree.children?.[prop] || tree, final || children == null, applies, cache);
          } else if (isData(val)) {
            // if this property has redact rules, apply them
            const rule = getRedactRule(tree.children[prop]);
            if (rule && rule.check(applies)) {
              return rule.get(val);
            }
          }
        }
        return val;
      },
      set(target, prop, newValue, receiver) {
        if (final) {
          // a parent property has rules, apply them
          const rule = getWPRule(tree);
          if (rule && rule.check(applies)) {
            return true;
          }
        }
        if (tree.children?.hasOwnProperty(prop)) {
          // apply all (possibly nested) write protect rules
          const curValue = Reflect.get(target, prop, receiver);
          newValue = cleanup(tree.children[prop], curValue, newValue, applies);
          if (!isData(newValue) && !target.hasOwnProperty(prop)) {
            return true;
          }
        }
        return Reflect.set(target, prop, newValue, receiver);
      },
      deleteProperty(target, prop) {
        if (final) {
          // a parent property has rules, apply them
          const rule = getWPRule(tree);
          if (rule && rule.check(applies)) {
            return true;
          }
        }
        if (tree.children?.hasOwnProperty(prop) && !isDeleteAllowed(tree.children[prop], target[prop], applies)) {
          // some nested properties should not be deleted
          return true;
        }
        return Reflect.deleteProperty(target, prop);
      }
    });

    // Cache the proxy before returning
    cache.set(obj, proxy);
    return proxy;
  }

  return function guard(obj, ...args) {
    const session = {};
    return mkGuard(obj, root, false, sessionedApplies(session, ...args))
  };
}

/**
 * @param {TransformationRuleDef} ruleDef
 * @return {TransformationRule}
 */
export function writeProtectRule(ruleDef) {
  return Object.assign({
    wp: true,
  }, ruleDef)
}
