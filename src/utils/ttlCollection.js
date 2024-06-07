import {GreedyPromise} from './promise.js';
import {binarySearch, logError, timestamp} from '../utils.js';

/**
 * Create a set-like collection that automatically forgets items after a certain time.
 *
 * @param {({}) => Number|Promise<Number>} startTime? a function taking an item added to this collection,
 *   and returning (a promise to) a timestamp to be used as the starting time for the item
 *   (the item will be dropped after `ttl(item)` milliseconds have elapsed since this timestamp).
 *   Defaults to the time the item was added to the collection.
 * @param {({}) => Number|void|Promise<Number|void>} ttl a function taking an item added to this collection,
 *   and returning (a promise to) the duration (in milliseconds) the item should be kept in it.
 *   May return null to indicate that the item should be persisted indefinitely.
 * @param {boolean} monotonic? set to true for better performance, but only if, given any two items A and B in this collection:
 *   if A was added before B, then:
 *     - startTime(A) + ttl(A) <= startTime(B) + ttl(B)
 *     - Promise.all([startTime(A), ttl(A)]) never resolves later than Promise.all([startTime(B), ttl(B)])
 * @param {number} slack? maximum duration (in milliseconds) that an item is allowed to persist
 *   once past its TTL. This is also roughly the interval between "garbage collection" sweeps.
 */
export function ttlCollection(
  {
    startTime = timestamp,
    ttl = () => null,
    monotonic = false,
    slack = 5000
  } = {}
) {
  const items = new Map();
  const callbacks = [];
  const pendingPurge = [];
  const markForPurge = monotonic
    ? (entry) => pendingPurge.push(entry)
    : (entry) => pendingPurge.splice(binarySearch(pendingPurge, entry, (el) => el.expiry), 0, entry)
  let nextPurge, task;

  function reschedulePurge() {
    task && clearTimeout(task);
    if (pendingPurge.length > 0) {
      const now = timestamp();
      nextPurge = Math.max(now, pendingPurge[0].expiry + slack);
      task = setTimeout(() => {
        const now = timestamp();
        let cnt = 0;
        for (const entry of pendingPurge) {
          if (entry.expiry > now) break;
          callbacks.forEach(cb => {
            try {
              cb(entry.item)
            } catch (e) {
              logError(e);
            }
          });
          items.delete(entry.item)
          cnt++;
        }
        pendingPurge.splice(0, cnt);
        task = null;
        reschedulePurge();
      }, nextPurge - now);
    } else {
      task = null;
    }
  }

  function mkEntry(item) {
    const values = {};
    const thisCohort = currentCohort;
    let expiry;

    function update() {
      if (thisCohort === currentCohort && values.start != null && values.delta != null) {
        expiry = values.start + values.delta;
        markForPurge(entry);
        if (task == null || nextPurge > expiry + slack) {
          reschedulePurge();
        }
      }
    }

    const [init, refresh] = Object.entries({
      start: startTime,
      delta: ttl
    }).map(([field, getter]) => {
      let currentCall;
      return function() {
        const thisCall = currentCall = {};
        GreedyPromise.resolve(getter(item)).then((val) => {
          if (thisCall === currentCall) {
            values[field] = val;
            update();
          }
        });
      }
    })

    const entry = {
      item,
      refresh,
      get expiry() {
        return expiry;
      },
    };

    init();
    refresh();
    return entry;
  }

  let currentCohort = {};

  return {
    [Symbol.iterator]: () => items.keys(),
    /**
     * Add an item to this collection.
     * @param item
     */
    add(item) {
      !items.has(item) && items.set(item, mkEntry(item));
    },
    /**
     * Clear this collection.
     */
    clear() {
      pendingPurge.length = 0;
      reschedulePurge();
      items.clear();
      currentCohort = {};
    },
    /**
     * @returns {[]} all the items in this collection, in insertion order.
     */
    toArray() {
      return Array.from(items.keys());
    },
    /**
     * Refresh the TTL for each item in this collection.
     */
    refresh() {
      pendingPurge.length = 0;
      reschedulePurge();
      for (const entry of items.values()) {
        entry.refresh();
      }
    },
    /**
     * Register a callback to be run when an item has expired and is about to be
     * removed the from the collection.
     * @param cb a callback that takes the expired item as argument
     * @return an unregistration function.
     */
    onExpiry(cb) {
      callbacks.push(cb);
      return () => {
        const idx = callbacks.indexOf(cb);
        if (idx >= 0) {
          callbacks.splice(idx, 1);
        }
      }
    }
  };
}
