import {isData, objectTransformer, sessionedApplies} from '../../src/activities/redactor.js';
import {deepAccess, deepClone, deepEqual, deepSetValue} from '../../src/utils.js';

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
 * An object guard is a pair {obj, verify} where:
 *  - `obj` is a view on the guarded object that applies "redact" rules (the same rules used in activites/redactor.js)
 *  - `verify` is a function that, when called, will check that the guarded object was not modified
 *   in a way that violates any "write protect" rules, and rolls back any offending changes.
 *
 * This is meant to provide sandboxed version of a privacy-sensitive object, where reads
 * are filtered through redaction rules and writes are checked against write protect rules.
 *
 * @param {Array[TransformationRule]} rules
 * @return {function(*, ...[*]): ObjectGuard}
 */
export function objectGuard(rules) {
  const root = {};
  const writeRules = [];

  rules.forEach(rule => {
    if (rule.wp) writeRules.push(rule);
    if (!rule.get) return;
    rule.paths.forEach(path => {
      let node = root;
      path.split('.').forEach(el => {
        node.children = node.children || {};
        node.children[el] = node.children[el] || {};
        node = node.children[el];
      })
      node.rule = rule;
    });
  });

  const wpTransformer = objectTransformer(writeRules);

  function mkGuard(obj, tree, applies) {
    return new Proxy(obj, {
      get(target, prop, receiver) {
        const val = Reflect.get(target, prop, receiver);
        if (tree.hasOwnProperty(prop)) {
          const {children, rule} = tree[prop];
          if (children && val != null && typeof val === 'object') {
            return mkGuard(val, children, applies);
          } else if (rule && isData(val) && applies(rule)) {
            return rule.get(val);
          }
        }
        return val;
      },
    });
  }

  function mkVerify(transformResult) {
    return function () {
      transformResult.forEach(fn => fn());
    }
  }

  return function guard(obj, ...args) {
    const session = {};
    return {
      obj: mkGuard(obj, root.children || {}, sessionedApplies(session, ...args)),
      verify: mkVerify(wpTransformer(session, obj, ...args))
    }
  };
}

/**
 * @param {TransformationRuleDef} ruleDef
 * @return {TransformationRule}
 */
export function writeProtectRule(ruleDef) {
  return Object.assign({
    wp: true,
    run(root, path, object, property, applies) {
      const origHasProp = object && object.hasOwnProperty(property);
      const original = origHasProp ? object[property] : undefined;
      const origCopy = origHasProp && original != null && typeof original === 'object' ? deepClone(original) : original;
      return function () {
        const object = path == null ? root : deepAccess(root, path);
        const finalHasProp = object && isData(object[property]);
        const finalValue = finalHasProp ? object[property] : undefined;
        if (!origHasProp && finalHasProp && applies()) {
          delete object[property];
        } else if ((origHasProp !== finalHasProp || finalValue !== original || !deepEqual(finalValue, origCopy)) && applies()) {
          deepSetValue(root, (path == null ? [] : [path]).concat(property).join('.'), origCopy);
        }
      }
    }
  }, ruleDef)
}
