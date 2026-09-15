/**
 * JSON parsing for text that came from outside the page - bidder and server response bodies.
 *
 * `JSON.parse` is not itself unsafe: a `"__proto__"` key in the text becomes an ordinary own
 * property rather than changing the object's prototype. The exposure is downstream. Code that
 * folds a response into an object of its own with a recursive merge assigns key by key, and
 * `target.__proto__ = value` does reach the prototype - so an attacker-chosen key in the text
 * becomes a write to `Object.prototype` several call frames away from the parse.
 *
 * Two keys carry that route and are removed here: `__proto__`, and `constructor` when it holds an
 * object with its own `prototype`. A `constructor` holding anything else is ordinary data and is
 * kept.
 *
 * What this does not stop: a merge written as `target[key] = target[key] || {}` resolves its own
 * left-hand side through the prototype chain, so it follows *any* inherited name - `push`,
 * `hasOwnProperty` - and then recurses into the shared object it landed on. Nothing about such a
 * key is unusual in the response text, so no parse-time filter can pick it out. A merge closes
 * that by guarding its read with `Object.prototype.hasOwnProperty.call`, as `mergeDeep` does.
 *
 * Distinct from `safeJSONParse` in src/utils.js, which swallows a parse error and returns
 * undefined while removing nothing. This removes those keys and lets a parse error through.
 */

const PROTO_KEY = '__proto__';
const CONSTRUCTOR_KEY = 'constructor';

/**
 * Captured at module load, which precedes any response.
 *
 * Reading `Object.prototype.hasOwnProperty.call` per call would let a page replace it - and so
 * would a hostile response that reached a naive merge, since `hasOwnProperty` is one of the
 * inherited names such a merge follows. This guard would then throw rather than strip, and its
 * callers read a throw as "that body was not JSON": one such response would leave every later one
 * unparsed, or discarded.
 */
const hasOwn: (obj: unknown, key: string) => boolean =
  Function.prototype.call.bind(Object.prototype.hasOwnProperty);

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
      // When it is the gadget shape, the whole key goes, siblings of `prototype` included - the
      // key is what a merge follows, so keeping a pruned version of it would not be safer.
      const value = node[CONSTRUCTOR_KEY];
      if (value !== null && typeof value === 'object' && hasOwn(value, 'prototype')) {
        delete node[CONSTRUCTOR_KEY];
      }
    }
    Object.keys(node).forEach(key => {
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
