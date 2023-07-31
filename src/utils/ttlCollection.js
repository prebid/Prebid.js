import {GreedyPromise} from './promise.js';
import {binarySearch} from '../utils.js';

export function ttlCollection(
  {
    startTime = (item) => new Date().getTime(),
    ttl = (item) => null,
    monotonic = false,
    slack = 5000
  } = {}
) {
  const items = new Map();
  const pendingPurge = [];
  const markForPurge = monotonic
    ? (entry) => pendingPurge.push(entry)
    : (entry) => pendingPurge.splice(binarySearch(pendingPurge, entry, (el) => el.expiry), 0, entry)
  let nextPurge, task;

  function reschedulePurge() {
    task && clearTimeout(task);
    if (pendingPurge.length > 0) {
      const now = new Date().getTime();
      nextPurge = Math.max(now, pendingPurge[0].expiry + slack);
      task = setTimeout(() => {
        const now = new Date().getTime();
        let cnt = 0;
        for (const entry of pendingPurge) {
          if (entry.expiry > now) break;
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
    let start, delta, expiry;
    const thisCohort = currentCohort;

    function update() {
      if (thisCohort === currentCohort && start != null && delta != null) {
        expiry = start + delta;
        markForPurge(entry);
        if (task == null || nextPurge > expiry + slack) {
          reschedulePurge();
        }
      }
    }

    const [init, refresh] = [
      [startTime, (val) => {
        start = val;
      }],
      [ttl, (val) => {
        delta = val;
      }]
    ].map(([getter, setter]) => {
      let currentCall;
      return function() {
        const thisCall = currentCall = {};
        GreedyPromise.resolve(getter(item)).then((val) => {
          if (thisCall === currentCall) {
            setter(val);
            update();
          }
        });
      }
    });

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
    add(item) {
      items.set(item, mkEntry(item));
    },
    items() {
      return items.keys();
    },
    clear() {
      pendingPurge.length = 0;
      reschedulePurge();
      items.clear();
      currentCohort = {};
    },
    toArray() {
      return Array.from(items.keys());
    },
    refresh() {
      pendingPurge.length = 0;
      reschedulePurge();
      for (const entry of items.values()) {
        entry.refresh();
      }
    }
  };
}
