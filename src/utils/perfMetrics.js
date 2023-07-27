import {config} from '../config.js';
export const CONFIG_TOGGLE = 'performanceMetrics';
const getTime = window.performance && window.performance.now ? () => window.performance.now() : () => Date.now();
const NODES = new WeakMap();

export function metricsFactory({now = getTime, mkNode = makeNode, mkTimer = makeTimer, mkRenamer = (rename) => rename, nodes = NODES} = {}) {
  return function newMetrics() {
    function makeMetrics(self, rename = (n) => ({forEach(fn) { fn(n); }})) {
      rename = mkRenamer(rename);

      function accessor(slot) {
        return function (name) {
          return self.dfWalk({
            visit(edge, node) {
              const obj = node[slot];
              if (obj.hasOwnProperty(name)) {
                return obj[name];
              }
            }
          });
        };
      }

      const getTimestamp = accessor('timestamps');

      /**
       * Register a metric.
       *
       * @param name metric name
       * @param value metric valiue
       */
      function setMetric(name, value) {
        const names = rename(name);
        self.dfWalk({
          follow(inEdge, outEdge) {
            return outEdge.propagate && (!inEdge || !inEdge.stopPropagation)
          },
          visit(edge, node) {
            names.forEach(name => {
              if (edge == null) {
                node.metrics[name] = value;
              } else {
                if (!node.groups.hasOwnProperty(name)) {
                  node.groups[name] = [];
                }
                node.groups[name].push(value);
              }
            })
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
        self.timestamps[name] = now();
      }

      /**
       * Get the tame passed since `checkpoint`, and optionally save it as a metric.
       *
       * @param checkpoint checkpoint name
       * @param metric? metric name
       * @return {number} time between now and `checkpoint`
       */
      function timeSince(checkpoint, metric) {
        const ts = getTimestamp(checkpoint);
        const elapsed = ts != null ? now() - ts : null;
        if (metric != null) {
          setMetric(metric, elapsed);
        }
        return elapsed;
      }

      /**
       * Get the time passed between `startCheckpoint` and `endCheckpoint`, optionally saving it as a metric.
       *
       * @param startCheckpoint begin checkpoint
       * @param endCheckpoint end checkpoint
       * @param metric? metric name
       * @return {number} time passed between `startCheckpoint` and `endCheckpoint`
       */
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
       * @template {function} F
       * @property {function(F): F} stopBefore returns a wrapper around the given function that begins by
       *   stopping this time measure.
       * @property {function(F): F} stopAfter returns a wrapper around the given function that ends by
       *   stopping this time measure.
       */

      /**
       * Start measuring a time metric with the given name.
       *
       * @param name metric name
       * @return {MetricsTimer}
       */
      function startTiming(name) {
        return mkTimer(now, (val) => setMetric(name, val))
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
        return fn((function (orig) {
          const next = stopTiming.stopBefore(orig);
          next.bail = orig.bail && stopTiming.stopBefore(orig.bail);
          next.stopTiming = stopTiming;
          next.untimed = orig;
          return next;
        })(next));
      }

      /**
       * Get all registered metrics.
       * @return {{}}
       */
      function getMetrics() {
        let result = {}
        self.dfWalk({
          visit(edge, node) {
            result = Object.assign({}, !edge || edge.includeGroups ? node.groups : null, node.metrics, result);
          }
        });
        return result;
      }

      /**
       * Create and return a new metrics object that starts as a view on all metrics registered here,
       * and - by default - also propagates all new metrics here.
       *
       * Propagated metrics are grouped together, and intended for repeated operations. For example, with the following:
       *
       * ```
       * const metrics = newMetrics();
       * const requests = metrics.measureTime('buildRequests', buildRequests)
       * requests.forEach((req) => {
       *   const requestMetrics = metrics.fork();
       *   requestMetrics.measureTime('processRequest', () => processRequest(req);
       * })
       * ```
       *
       * if `buildRequests` takes 10ms and returns 3 objects, which respectively take 100, 200, and 300ms in `processRequest`, then
       * the final `metrics.getMetrics()` would be:
       *
       * ```
       * {
       *    buildRequests: 10,
       *    processRequest: [100, 200, 300]
       * }
       * ```
       *
       * while the inner `requestMetrics.getMetrics()` would be:
       *
       * ```
       * {
       *   buildRequests: 10,
       *   processRequest: 100 // or 200 for the 2nd loop, etc
       * }
       * ```
       *
       *
       * @param propagate if false, the forked metrics will not be propagated here
       * @param stopPropagation if true, propagation from the new metrics is stopped here - instead of
       *   continuing up the chain (if for example these metrics were themselves created through `.fork()`)
       * @param includeGroups if true, the forked metrics will also replicate metrics that were propagated
       *   here from elsewhere. For example:
       *   ```
       *   const metrics = newMetrics();
       *   const op1 = metrics.fork();
       *   const withoutGroups = metrics.fork();
       *   const withGroups = metrics.fork({includeGroups: true});
       *   op1.setMetric('foo', 'bar');
       *   withoutGroups.getMetrics() // {}
       *   withGroups.getMetrics() // {foo: ['bar']}
       *   ```
       */
      function fork({propagate = true, stopPropagation = false, includeGroups = false} = {}) {
        return makeMetrics(mkNode([[self, {propagate, stopPropagation, includeGroups}]]), rename);
      }

      /**
       * Join `otherMetrics` with these; all metrics from `otherMetrics` will (by default) be propagated here,
       * and all metrics from here will be included in `otherMetrics`.
       *
       * `propagate`, `stopPropagation` and `includeGroups` have the same semantics as in `.fork()`.
       */
      function join(otherMetrics, {propagate = true, stopPropagation = false, includeGroups = false} = {}) {
        const other = nodes.get(otherMetrics);
        if (other != null) {
          other.addParent(self, {propagate, stopPropagation, includeGroups});
        }
      }

      /**
       * return a version of these metrics where all new metrics are renamed according to `renameFn`.
       *
       * @param {function(String): Array[String]} renameFn
       */
      function renameWith(renameFn) {
        return makeMetrics(self, renameFn);
      }

      /**
       * Create a new metrics object that uses the same propagation and renaming rules as this one.
       */
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
        renameWith,
        toJSON() {
          return getMetrics();
        }
      };
      nodes.set(metrics, self);
      return metrics;
    }

    return makeMetrics(mkNode([]));
  }
}

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

function makeTimer(now, cb) {
  const start = now();
  let done = false;
  function stopTiming() {
    if (!done) {
      // eslint-disable-next-line standard/no-callback-literal
      cb(now() - start);
      done = true;
    }
  }
  stopTiming.stopBefore = (fn) => wrapFn(fn, stopTiming);
  stopTiming.stopAfter = (fn) => wrapFn(fn, null, stopTiming);
  return stopTiming;
}

function makeNode(parents) {
  return {
    metrics: {},
    timestamps: {},
    groups: {},
    addParent(node, edge) {
      parents.push([node, edge]);
    },
    newSibling() {
      return makeNode(parents.slice());
    },
    dfWalk({visit, follow = () => true, visited = new Set(), inEdge} = {}) {
      let res;
      if (!visited.has(this)) {
        visited.add(this);
        res = visit(inEdge, this);
        if (res != null) return res;
        for (const [parent, outEdge] of parents) {
          if (follow(inEdge, outEdge)) {
            res = parent.dfWalk({visit, follow, visited, inEdge: outEdge});
            if (res != null) return res;
          }
        }
      }
    }
  };
}

const nullMetrics = (() => {
  const nop = function () {};
  const empty = () => ({});
  const none = {forEach: nop};
  const nullTimer = () => null;
  nullTimer.stopBefore = (fn) => fn;
  nullTimer.stopAfter = (fn) => fn;
  const nullNode = Object.defineProperties(
    {dfWalk: nop, newSibling: () => nullNode, addParent: nop},
    Object.fromEntries(['metrics', 'timestamps', 'groups'].map(prop => [prop, {get: empty}])));
  return metricsFactory({
    now: () => 0,
    mkNode: () => nullNode,
    mkRenamer: () => () => none,
    mkTimer: () => nullTimer,
    nodes: {get: nop, set: nop}
  })();
})();

let enabled = true;
config.getConfig(CONFIG_TOGGLE, (cfg) => { enabled = !!cfg[CONFIG_TOGGLE] });

/**
 * convenience fallback function for metrics that may be undefined, especially during tests.
 */
export function useMetrics(metrics) {
  return (enabled && metrics) || nullMetrics;
}

export const newMetrics = (() => {
  const makeMetrics = metricsFactory();
  return function () {
    return enabled ? makeMetrics() : nullMetrics;
  }
})();

export function hookTimer(prefix, getMetrics) {
  return function(name, hookFn) {
    return function (next, ...args) {
      const that = this;
      return useMetrics(getMetrics.apply(that, args)).measureHookTime(prefix + name, next, function (next) {
        return hookFn.call(that, next, ...args);
      });
    }
  }
}

export const timedAuctionHook = hookTimer('requestBids.', (req) => req.metrics);
export const timedBidResponseHook = hookTimer('addBidResponse.', (_, bid) => bid.metrics)
