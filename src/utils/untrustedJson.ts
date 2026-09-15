/**
 * JSON parsing for the response bodies core parses on an adapter's behalf: a bidder's HTTP
 * response body, and Prebid Server's. Two things sit outside it - a module that fetches and parses
 * its own endpoint, and content carried *inside* one of these bodies and parsed again elsewhere,
 * of which an `adm` holding a native ORTB document is the case in point.
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
 *   merge(target[key], source[key])      chain, so for any inherited name that line copies the
 *                                        shared object onto `target` - `constructor` resolves to
 *                                        the `Object` function, `hasOwnProperty` to that method.
 *                                        The descent on the next line then assigns into it.
 *
 * Removed here: `__proto__`, which carries the first route; and `constructor` whenever it holds an
 * object, which carries the second one to `Object` itself, where a write lands on `Object.keys` or
 * `Object.assign` and breaks the page. A `constructor` holding a string or a number is ordinary
 * data and is kept - it cannot be recursed into.
 *
 * The rest of the second route is not filtered here. Dropping every name that appears on
 * `Object.prototype` takes legitimate response fields called `toString` or `valueOf` with it, and
 * makes which fields survive depend on what other scripts on the page have added to
 * `Object.prototype`. What closes that route is the merge rather than the parse: test the value's
 * type before recursing, so that an inherited method is replaced rather than merged into
 * (`mergeDeep` in src/utils.js does this with `isPlainObject`).
 *
 * Why a walk after parsing rather than a `JSON.parse` reviver, which would be one pass and would
 * never let the key land: the reviver's internalization is recursive, so supplying one imposes a
 * nesting limit that plain `JSON.parse` does not - measured at roughly 2800 levels on V8, 4500 on
 * WebKit and 3500 on SpiderMonkey, against 20000+ without. The depth is attacker-chosen, and the
 * `RangeError` would surface at the call sites as "that body was not JSON", handing the raw body
 * on as a string. The walk below is iterative for the same reason.
 *
 * `safeJSONParse` in src/utils.js is a different function with a different contract. Check which
 * one you want rather than picking by name.
 */

import { logWarn } from './logging.js';

const PROTO_KEY = '__proto__';
const CONSTRUCTOR_KEY = 'constructor';

/**
 * Captured at module load, which precedes any response.
 *
 * A guard that reads `Object.keys` or `Object.prototype.hasOwnProperty.call` at call time depends
 * on globals that the merges above can overwrite - `constructor` reaches the first, `hasOwnProperty`
 * the second. It would then throw rather than strip, and both callers read a throw as "that body
 * was not JSON": one such response would leave every later one unparsed, or discarded.
 *
 * The array methods used below are not captured, because neither route reaches them: a merge that
 * lands on `Array.prototype.push` writes own properties onto that function rather than replacing
 * it, and `Array.prototype` is not writable through either route.
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
 * Unconditional. A pre-check on the raw text can be written, and has to match every `\uXXXX`
 * spelling of each key rather than the literal one. It pays only on bodies it lets skip the walk,
 * and Prebid Server escapes `<`, `>` and `&` that way inside creative markup, so a body carrying a
 * creative tends to trip it anyway. The walk costs a fraction of the parse it follows.
 */
function stripGadgetKeys<T>(root: T): T {
  let protos = 0;
  let constructors = 0;
  const pending: any[] = [root];
  while (pending.length) {
    const node = pending.pop();
    if (hasOwn(node, PROTO_KEY)) {
      delete node[PROTO_KEY];
      protos++;
    }
    if (hasOwn(node, CONSTRUCTOR_KEY)) {
      const value = node[CONSTRUCTOR_KEY];
      if (value !== null && typeof value === 'object') {
        // When it is the gadget shape, the whole key goes, siblings of `prototype` included - the
        // key is what a merge follows, so keeping a pruned version of it would not be safer.
        delete node[CONSTRUCTOR_KEY];
        constructors++;
      }
    }
    ownKeys(node).forEach(key => {
      const value = node[key];
      if (value !== null && typeof value === 'object') {
        pending.push(value);
      }
    });
  }
  if (protos || constructors) {
    // Once for the whole body, not once per key: a hostile payload can carry thousands, and the
    // point is to give a bidder debugging a missing field something to find, not to narrate.
    logWarn(
      'Removed keys from a response that could let a recursive merge reach Object.prototype:' +
      (protos ? ` ${PROTO_KEY} (${protos})` : '') +
      (constructors ? ` ${CONSTRUCTOR_KEY} (${constructors})` : '')
    );
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
