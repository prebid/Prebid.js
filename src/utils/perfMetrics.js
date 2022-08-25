import {deepAccess, deepSetValue, isNumber} from '../utils.js';

const METRICS = new WeakMap();
const getTime = window.performance && window.performance.now ? () => window.performance.now() : () => Date.now();

export function performanceMetrics(now = getTime) {
  function makeMetrics(parents = []) {
    const self = (() => {
      const metrics = {};
      const groups = {};
      const revParents = parents.slice().reverse();
      return {
        metrics,
        timestamps: {},
        addParent(parent, continuePropagation) {
          parents.unshift([parent, continuePropagation]);
          revParents.push([parent, continuePropagation]);
        },
        group(name, value) {
          let tally = deepAccess(metrics, name);
          if (typeof tally === 'undefined' || tally === groups[name]) {
            tally = groups[name] = tally || {n: 0};
            deepSetValue(metrics, name, tally);
            if (isNumber(value) && !isNaN(value)) {
              if (tally.min == null || tally.min > value) {
                tally.min = value;
              }
              if (tally.max == null || tally.max < value) {
                tally.max = value;
              }
              tally.avg = tally.avg == null ? value : ((tally.avg * tally.n) + value) / (tally.n + 1);
            }
            tally.n++;
          }
        },
        dfWalk({onlyProp = false, reverse = false, in_, out, visited = new Set(), stop = false} = {}) {
          let res;
          if (!visited.has(self)) {
            visited.add(self);
            res = in_ && in_(self);
            if (typeof res !== 'undefined') return res;
            if (!stop) {
              for (const [parent, continueProp] of (reverse ? revParents : parents)) {
                res = parent.dfWalk({onlyProp, reverse, in_, out, visited, stop: onlyProp && !continueProp});
                if (typeof res !== 'undefined') return res;
              }
            }
            return out && out(self);
          }
        }
      };
    })();

    function getTimestamp(checkpoint) {
      return self.dfWalk({
        reverse: true,
        in_(node) {
          if (node.timestamps.hasOwnProperty(checkpoint)) {
            return node.timestamps[checkpoint];
          }
        }
      });
    }

    function wrapFn(fn, before, after) {
      return function () {
        const val = before && before();
        try {
          return fn.apply(this, arguments);
        } finally {
          after && after(val);
        }
      }
    }

    /**
     * Register a metric.
     *
     * @param name metric name
     * @param value metric valiue
     * @param propagate if true, propagate this metric to other metrics that are related to this via `.fork` or `.join`.
     *  propagated metrics are aggregated, and intended for numerical measures on repeated operations. For example:
     *
     *   ```
     *      const metrics = performanceMetrics();
     *      requests.forEach(request => {
     *        const requestMetrics = metrics.fork();
     *        requestMetrics.measureTime('processingTime', request.process);
     *      });
     *
     *      // In this example, if the inner `measureTime` is invoked 3 times with time values of [100, 240, 500],
     *      // then `metrics.getMetrics` will be:
     *
     *      {
     *        processingTime: {
     *          n: 3,
     *          min: 100,
     *          max: 500,
     *          avg: 280
     *        }
     *      }
     *   ```
     */
    function setMetric(name, value, propagate = true) {
      deepSetValue(self.metrics, name, value);
      if (propagate) {
        self.dfWalk({
          onlyProp: true,
          in_(node) {
            node.group(name, value)
          }
        });
      }
    }

    /**
     * Mark the current time as a checkpoint with the given name, to be referenced later
     * by `timeSince` or `timeBetween`.
     *
     * @param name checkpoint name
     */
    function checkpoint(name) {
      return self.timestamps[name] = now();
    }

    function timeSince(checkpoint) {
      const ts = getTimestamp(checkpoint);
      return ts != null ? now() - ts : null;
    }

    function timeBetween(startCheckpoint, endCheckpoint) {
      const start = getTimestamp(startCheckpoint);
      const end = getTimestamp(endCheckpoint);
      return start != null && end != null ? end - start : null;
    }

    /**
     * Start measuring a time metric with the given name.
     *
     * @param name metric name
     * @param propagate if true, propagate this metric - see  `setMetric` for semantics.
     * @return {(function(): void)} a function that, when called, stops the measure and saves the time metric.
     */
    function startTiming(name, propagate = true) {
      const start = now();
      let done = false;
      return function stopTiming() {
        if (!done) {
          setMetric(name, now() - start, propagate);
          done = true;
        }
      }
    }

    /**
     * Run fn and measure the time spent in it.
     *
     * @param name the name to use for the measured time metric
     * @param propagate if true, propagate this metric - see  `setMetric` for semantics.
     * @param {function(): T} fn
     * @return {T} the return value of `fn`
     */
    function measureTime(name, fn, propagate = true) {
      return wrapFn(fn, () => startTiming(name, propagate), (stopTiming) => stopTiming())();
    }

    /**
     * Convenience method for measuring time spent in a `.before` or `.after` hook.
     *
     * @param name metric name
     * @param next the hook's `next` (first) argument
     * @param fn a function that will be run immediately; it takes (next, stopTiming),
     *    where stopTiming stops the time measure, and both `next` and `next.bail` automatically
     *    call `stopTiming` before continuing with the original hook.
     * @param propagate if true, propagate this metric - see  `setMetric` for semantics.
     * @return {*}
     */
    function measureHookTime(name, next, fn, propagate = true) {
      const stopTiming = startTiming(name, propagate);
      next = (function (orig) {
        const next = wrapFn(orig, stopTiming);
        next.bail = orig.bail && wrapFn(orig.bail, stopTiming);
        return next;
      })(next);
      return fn(next, stopTiming);
    }

    function getMetrics() {
      const result = {};
      self.dfWalk({
        out(node) {
          Object.assign(result, node.metrics)
        }
      });
      return result;
    }

    /**
     * Create a new metric object that contains all metrics registered here,
     * and - by default - propagates all new metrics to this one (see `setMetric` for propagation semantics).
     *
     * @param continuePropagation if false, propagation from the new metrics is stopped here - instead of
     *   continuing up the chain (if for example these metrics were themselves created through `.fork()`)
     */
    function fork(continuePropagation = true) {
      return makeMetrics([[self, continuePropagation]]);
    }

    /**
     * Join `otherMetrics` with these; all metrics from `otherMetrics` will (by default) be propagated here,
     * and all metrics from here will be included in `otherMetrics`.
     *
     * @param otherMetrics metrics to join
     * @param continuePropagation if false, propagation from `otherMetrics` is stopped here,
     *   and does not continue further up the chain.
     */
    function join(otherMetrics, continuePropagation = true) {
      const other = METRICS.get(otherMetrics);
      if (other != null) {
        other.addParent(self, continuePropagation);
      }
    }

    function newMetrics() {
      return makeMetrics(parents);
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
      toJSON() {
        return getMetrics();
      }
    };
    METRICS.set(metrics, self);
    return metrics;
  }

  return makeMetrics();
}

const nullMetrics = (() => {
  const m = performanceMetrics(() => 0);
  METRICS.get(m).addParent = function () {};
  ['fork', 'join', 'newMetrics'].forEach(meth => m[meth] = () => m);
  return m;
})();

/**
 * convenience fallback function for metrics that may be undefined, especially during tests.
 */
export function useMetrics(metrics) {
  return metrics == null ? nullMetrics : metrics;
}
