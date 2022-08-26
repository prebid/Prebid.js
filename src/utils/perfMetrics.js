const getTime = window.performance && window.performance.now ? () => window.performance.now() : () => Date.now();
const NODES = new WeakMap();
const [METRICS, TIMESTAMPS, GROUPS] = [0, 1, 2];

export function performanceMetrics(now = getTime, mkNode = makeNode) {
  function makeMetrics(self, rename = (n) => ({forEach(fn) { fn(n); }})) {
    function accessor(slot) {
      return function (name) {
        return self.dfWalk({
          in_(edge, node) {
            const obj = node.get(slot);
            if (obj.hasOwnProperty(name)) {
              return obj[name];
            }
          }
        });
      };
    }

    const getTimestamp = accessor(TIMESTAMPS);

    function wrapFn(fn, before, after) {
      return function () {
        before && before();
        try {
          return fn.apply(this, arguments);
        } finally {
          after && after();
        }
      };
    }

    /**
     * Register a metric.
     *
     * @param name metric name
     * @param value metric valiue
     */
    function setMetric(name, value) {
      const names = rename(name);
      self.dfWalk({
        upFrom(edge) {
          return !edge || !edge.stopPropagation
        },
        in_(edge, node) {
          if (edge == null) {
            names.forEach(name => self.set(METRICS, name, value));
          } else {
            names.forEach(name => {
              if (!node.get(GROUPS).hasOwnProperty(name)) {
                node.set(GROUPS, name, []);
              }
              node.get(GROUPS)[name].push(value);
            });
          }
        }
      });
    }

    /**
     * Mark the current time as a checkpoint with the given name, to be referenced later
     * by `timeSince` or `timeBetween`.
     *
     * @param name checkpoint name
     */
    function checkpoint(name) {
      self.set(TIMESTAMPS, name, now());
    }

    function timeSince(checkpoint, metric) {
      const ts = getTimestamp(checkpoint);
      const elapsed = ts != null ? now() - ts : null;
      if (metric != null) {
        setMetric(metric, elapsed);
      }
      return elapsed;
    }

    function timeBetween(startCheckpoint, endCheckpoint, metric) {
      const start = getTimestamp(startCheckpoint);
      const end = getTimestamp(endCheckpoint);
      const elapsed = start != null && end != null ? end - start : null;
      if (metric != null) {
        setMetric(metric, elapsed);
      }
      return elapsed;
    }

    /**
     * A function that, when called, stops a time measure and saves it as a metric.
     *
     * @typedef {function(): void} MetricsTimer
     * @template F
     * @property {function(F: function): F} stopBefore returns a wrapper around the given function that begins by
     *   stopping this time measure.
     * @property {function(F: function): F} stopAfter returns a wrapper around the given function that ends by
     *   stopping this time measure.
     */

    /**
     * Start measuring a time metric with the given name.
     *
     * @param name metric name
     * @return {MetricsTimer}
     */
    function startTiming(name) {
      const start = now();
      let done = false;
      function stopTiming() {
        if (!done) {
          setMetric(name, now() - start);
          done = true;
        }
      }
      stopTiming.stopBefore = (fn) => wrapFn(fn, stopTiming);
      stopTiming.stopAfter = (fn) => wrapFn(fn, null, stopTiming);
      return stopTiming;
    }

    /**
     * Run fn and measure the time spent in it.
     *
     * @template T
     * @param name the name to use for the measured time metric
     * @param {function(): T} fn
     * @return {T} the return value of `fn`
     */
    function measureTime(name, fn) {
      return startTiming(name).stopAfter(fn)();
    }

    /**
     * @typedef {function: T} HookFn
     * @property {function(T): void} bail
     *
     * @template T
     * @typedef {T: HookFn} TimedHookFn
     * @property {function(): void} stopTiming
     * @property {T} untimed
     */

    /**
     * Convenience method for measuring time spent in a `.before` or `.after` hook.
     *
     * @template T
     * @param name metric name
     * @param {HookFn} next the hook's `next` (first) argument
     * @param {function(TimedHookFn): T} fn a function that will be run immediately; it takes `next`,
     *    where both `next` and `next.bail` automatically
     *    call `stopTiming` before continuing with the original hook.
     * @return {T} fn's return value
     */
    function measureHookTime(name, next, fn) {
      const stopTiming = startTiming(name);
      next = (function (orig) {
        const next = stopTiming.stopBefore(orig);
        next.bail = orig.bail && stopTiming.stopBefore(orig.bail);
        next.stopTiming = stopTiming;
        next.untimed = orig;
        return next;
      })(next);
      return fn.call(this, next);
    }

    function getMetrics() {
      const result = {}
      self.dfWalk({
        reverse: true,
        out(edge, node) {
          Object.assign(result, !edge ? node.get(GROUPS) : null, node.get(METRICS));
        }
      });
      return result;
    }

    /**
     * Create a new metric object that contains all metrics registered here,
     * and - by default - propagates all new metrics to this one (see `setMetric` for propagation semantics).
     *
     * @param stopPropagation if true, propagation from the new metrics is stopped here - instead of
     *   continuing up the chain (if for example these metrics were themselves created through `.fork()`)
     */
    function fork({stopPropagation = false} = {}) {
      return makeMetrics(mkNode([[self, {stopPropagation}]]), rename);
    }

    /**
     * Join `otherMetrics` with these; all metrics from `otherMetrics` will (by default) be propagated here,
     * and all metrics from here will be included in `otherMetrics`.
     *
     * @param otherMetrics metrics to join
     * @param stopPropagation if false, propagation from `otherMetrics` is stopped here,
     *   and does not continue further up the chain.
     */
    function join(otherMetrics, {stopPropagation = false} = {}) {
      const other = NODES.get(otherMetrics);
      if (other != null) {
        other.addParent(self, {stopPropagation});
      }
    }

    function newMetrics() {
      return makeMetrics(self.newSibling(), rename);
    }

    const metrics = {
      startTiming,
      measureTime,
      measureHookTime,
      checkpoint,
      timeSince,
      timeBetween,
      setMetric,
      getMetrics,
      fork,
      join,
      newMetrics,
      renameWith(renameFn) {
        return makeMetrics(self, renameFn);
      },
      toJSON() {
        return getMetrics();
      }
    };
    NODES.set(metrics, self);
    return metrics;
  }

  return makeMetrics(mkNode([]));
}

function makeNode(parents) {
  const state = {[METRICS]: {}, [TIMESTAMPS]: {}, [GROUPS]: {}};
  return {
    addParent(node, edge) {
      parents.push([node, edge]);
    },
    set(slot, k, v) {
      state[slot][k] = v;
    },
    get(slot) {
      return state[slot];
    },
    newSibling() {
      return makeNode(parents);
    },
    dfWalk({reverse = false, in_, out, upFrom = () => true, visited = new Set(), edge} = {}) {
      let res;
      if (!visited.has(this)) {
        visited.add(this);
        res = in_ && in_(edge, this);
        if (typeof res !== 'undefined') return res;
        if (upFrom(edge, this)) {
          for (const [parent, edge] of (reverse ? parents.slice().reverse() : parents)) {
            res = parent.dfWalk({reverse, in_, out, upFrom, visited, edge});
            if (typeof res !== 'undefined') return res;
          }
        }
        return out && out(edge, this);
      }
    }
  };
}

const nullMetrics = (() => {
  const nop = function () {}
  const empty = {};
  const nullNode = {get: () => empty, set: nop, dfWalk: nop, addParent: nop, newSibling: () => nullNode}
  const nullMetrics = performanceMetrics(() => 0, () => nullNode);
  nullMetrics.renameWith = () => nullMetrics;
  return nullMetrics;
})();

/**
 * convenience fallback function for metrics that may be undefined, especially during tests.
 */
export function useMetrics(metrics) {
  return metrics == null ? nullMetrics : metrics;
}

export function hookTimer(prefix, getMetrics) {
  return function(name, hookFn) {
    return function (next, ...args) {
      return useMetrics(getMetrics.apply(this, args)).measureHookTime(prefix + name, next, function (next) {
        return hookFn.call(this, next, ...args);
      });
    }
  }
}

export const timedAuctionHook = hookTimer('requestBids.', (req) => req.auctionMetrics);
export const timedBidResponseHook = hookTimer('addBidResponse.', (_, bid) => bid.metrics)
