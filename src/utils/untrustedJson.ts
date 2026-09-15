/**
 * JSON parsing for text that came from outside the page - bidder and server response bodies.
 *
 * `JSON.parse` is not itself unsafe: a `"__proto__"` key in the text becomes an ordinary own
 * property rather than changing the object's prototype. The exposure is downstream. Code that
 * folds a response into an object of its own with a recursive merge assigns key by key, and
 * `target.__proto__ = value` does reach the prototype - so an attacker-chosen key in the text
 * becomes a write to `Object.prototype` several call frames away from the parse.
 *
 * This removes the two keys that a merge can follow, leaving everything else exactly as
 * `JSON.parse` produced it.
 */

/** Keys whose own presence on a parsed object gives a recursive merge a route to a prototype. */
const PROTO_KEY = '__proto__';
const CONSTRUCTOR_KEY = 'constructor';

const hasOwn = (obj, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Whether `text` could contain either key, cheap enough to run on every response.
 *
 * Deliberately over-inclusive: a false positive costs one traversal, a false negative costs the
 * guard. JSON can spell any letter as a `\uXXXX` escape, so `"__proto__"` has many textual forms
 * and a search for the literal spelling alone would be bypassable - any escaped form contains
 * `\u`, so the presence of an escape anywhere is treated as a possible hit.
 */
function mayCarryGadget(text: string): boolean {
  return /"(?:__proto__|constructor)"\s*:|\\u/.test(text);
}

/**
 * Deletes the two keys wherever they appear, in place, breadth-first.
 *
 * Iterative rather than recursive so that response nesting cannot overflow the stack, and over
 * own keys only: walking inherited keys would visit whatever the page has put on
 * `Object.prototype`, including - if that value is an object - itself, without end.
 */
function stripGadgetKeys<T>(root: T): T {
  const queue: any[] = [root];
  while (queue.length) {
    const node = queue.pop();
    if (hasOwn(node, PROTO_KEY)) {
      delete node[PROTO_KEY];
    }
    if (hasOwn(node, CONSTRUCTOR_KEY)) {
      // Only when it is the gadget shape. A response field that happens to be called
      // `constructor` and holds a string is ordinary data and is kept. When it does hold an
      // object with its own `prototype`, the whole key goes, siblings of `prototype` included -
      // the key is what a merge follows, so keeping a pruned version of it would not be safer.
      const value = node[CONSTRUCTOR_KEY];
      if (value !== null && typeof value === 'object' && hasOwn(value, 'prototype')) {
        delete node[CONSTRUCTOR_KEY];
      }
    }
    Object.keys(node).forEach(key => {
      const value = node[key];
      if (value !== null && typeof value === 'object') {
        queue.push(value);
      }
    });
  }
  return root;
}

/**
 * Parses JSON that came from outside the page.
 *
 * Throws what `JSON.parse` throws on text that is not JSON, so a caller's existing handling of
 * an unparseable body is unchanged. Text that parses always yields a value, never an exception
 * about its contents.
 */
export function parseUntrustedJSON(text: string): any {
  const parsed = JSON.parse(text);
  if (parsed === null || typeof parsed !== 'object' || !mayCarryGadget(text)) {
    return parsed;
  }
  return stripGadgetKeys(parsed);
}
