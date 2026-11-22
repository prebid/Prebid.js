/**
 * JSON parsing for the text core turns into objects on an adapter's behalf: a bidder's HTTP
 * response body, Prebid Server's auction and cookie-sync bodies, and a native `adm` document
 * carried as a string inside any of them, which the outer parse cannot see into.
 *
 * What sits outside is text an adapter parses for itself - its own endpoint, or its own `adm`
 * handling. There are dozens of those, in vendor helpers under `libraries/` and in adapters
 * directly; they own that choice and can call this.
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
 * `Object.assign` and breaks the page. A `constructor` holding anything that is not an object -
 * a string, a number, a boolean, `null` - is kept: a merge cannot recurse into it.
 *
 * The rest of the second route is not filtered here. Dropping every name that appears on
 * `Object.prototype` takes legitimate response fields called `toString` or `valueOf` with it, and
 * makes which fields survive depend on what other scripts on the page have added to
 * `Object.prototype`. What closes that route is the merge rather than the parse: skip the two names
 * outright, and test each value's type before recursing so that an inherited method is replaced
 * rather than merged into. `mergeDeep` in src/utils.js does both.
 *
 * Why a walk after parsing rather than a `JSON.parse` reviver, which would be one pass and would
 * never let the key land: the reviver's internalization is recursive, so supplying one imposes a
 * nesting limit an order of magnitude below what plain `JSON.parse` accepts. The depth is
 * attacker-chosen, and the `RangeError` would surface at the call sites as "that body was not
 * JSON", handing the raw body on as a string. The walk below is iterative for the same reason.
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
 * was not JSON", or as a bid that could not be built. One such response would cost every later
 * one: the bidder body handed on as raw text, the server auction and its user syncs dropped, a
 * native bid skipped.
 *
 * The array methods used below are not captured. What keeps them out of reach is this guard's own
 * removal of object-valued `constructor`, not anything about the language: in sloppy mode - a
 * publisher's inline `<script>`, which is the merge this exists to backstop - a merge over
 * `{"constructor":{"prototype":{"pop":1}}}` does replace `Array.prototype.pop`. Text this guard
 * never sees can still do that, and the walk below would then throw on every later body.
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
 * Unconditional. A pre-check on the raw text is possible - it has to match every `\uXXXX` spelling
 * of each key, not just the literal one - and it is not worth the second thing to get right: the
 * walk costs a fraction of the parse it follows.
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
    // Once per parse, not once per key: a hostile payload can carry thousands, and the point is to
    // leave something for a bidder debugging a missing field, not to narrate an attack. Note
    // `logWarn` also emits an AUCTION_DEBUG event, so this is visible to analytics, not only to a
    // console with debug on.
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
