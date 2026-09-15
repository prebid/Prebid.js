/**
 * JSON parsing for response bodies that core parses on an adapter's behalf - a bidder's HTTP
 * response, and Prebid Server's. That is the boundary this covers; a module that fetches and
 * parses its own endpoint is not behind it.
 *
 * `JSON.parse` is not itself unsafe: a `"__proto__"` key in the text becomes an ordinary own
 * property rather than changing the object's prototype. The exposure is downstream, in code that
 * folds a response into an object of its own. Two shapes of recursive merge, two routes:
 *
 *   target[key] = value                  assignment. `target.__proto__ = value` reaches the
 *                                        prototype, because the name resolves to the inherited
 *                                        setter. The name is what matters, so removing it works.
 *
 *   target[key] = target[key] || {}      the left side is a *read*, which walks the prototype
 *   merge(target[key], source[key])      chain. Any inherited name lands the recursion on a
 *                                        shared object - `constructor` on the `Object` function,
 *                                        `hasOwnProperty` on that method - and writes into it.
 *
 * Removed here: `__proto__`, which carries the first route; and `constructor` whenever it holds an
 * object, which carries the second one to `Object` itself, where a write lands on `Object.keys` or
 * `Object.assign` and breaks the page. A `constructor` holding a string or a number is ordinary
 * data and is kept - it cannot be recursed into.
 *
 * The rest of the second route is deliberately not filtered, and could be: the sanitizer this
 * replaced dropped every name found on `Object.prototype`. It also dropped legitimate response
 * fields called `toString` or `valueOf`, and which fields it dropped varied with what other
 * scripts on the page had done to `Object.prototype`. That cost was judged higher than the
 * residue. What closes the residue is the merge, not the parse: test the value's type before
 * recursing, as `mergeDeep` does with `isPlainObject` - an inherited method is not a plain object,
 * so it is replaced rather than merged into.
 *
 * Distinct from `safeJSONParse` in src/utils.js, which swallows a parse error and returns
 * undefined while removing nothing. This removes those keys and lets a parse error through.
 */

const PROTO_KEY = '__proto__';
const CONSTRUCTOR_KEY = 'constructor';

/**
 * Captured at module load, which precedes any response.
 *
 * A guard that reads `Object.keys` or `Object.prototype.hasOwnProperty.call` at call time depends
 * on globals that the merges above can overwrite - `constructor` reaches the first, `hasOwnProperty`
 * the second. It would then throw rather than strip, and both callers read a throw as "that body
 * was not JSON": one such response would leave every later one unparsed, or discarded.
 */
const hasOwn: (obj: unknown, key: string) => boolean =
  Function.prototype.call.bind(Object.prototype.hasOwnProperty);
const ownKeys: (obj: object) => string[] = Object.keys;

/**
 * Deletes those keys wherever they appear, in place.
 *
 * Iterative, so that response nesting cannot overflow the stack, and over own keys only: walking
 * inherited keys would visit whatever the page has put on `Object.prototype` - including, when
 * that value is an object, itself, without end.
 *
 * Unconditional. A pre-check on the raw text would have to decide from the text which keys the
 * parse will produce, and JSON can spell any letter as a `\uXXXX` escape; Prebid Server escapes
 * `<`, `>` and `&` that way inside creative markup, so the bodies such a check would most need to
 * be careful about are also the ones it would least often let it skip.
 */
function stripGadgetKeys<T>(root: T): T {
  const pending: any[] = [root];
  while (pending.length) {
    const node = pending.pop();
    if (hasOwn(node, PROTO_KEY)) {
      delete node[PROTO_KEY];
    }
    if (hasOwn(node, CONSTRUCTOR_KEY)) {
      const value = node[CONSTRUCTOR_KEY];
      if (value !== null && typeof value === 'object') {
        // The whole key goes, whatever it contains. A merge follows the key name, so what the
        // value holds decides only where the write lands, not whether one happens.
        delete node[CONSTRUCTOR_KEY];
      }
    }
    ownKeys(node).forEach(key => {
      const value = node[key];
      if (value !== null && typeof value === 'object') {
        pending.push(value);
      }
    });
  }
  return root;
}

/**
 * Parses JSON that came from outside the page.
 *
 * Throws what `JSON.parse` throws on text that is not JSON, so a caller's existing handling of an
 * unparseable body is unchanged. Text that parses always yields a value.
 */
export function parseUntrustedJSON(text: string): any {
  const parsed = JSON.parse(text);
  return parsed !== null && typeof parsed === 'object' ? stripGadgetKeys(parsed) : parsed;
}
