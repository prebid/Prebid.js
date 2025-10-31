import {config} from '../config.js';
import type {AnyFunction, Wraps} from "../types/functions.d.ts";
import {type BeforeHook, type BeforeHookParams, type HookType, Next} from "../hook.ts";
import type {addBidResponse} from "../auction.ts";
import type {PrivRequestBidsOptions, StartAuctionOptions} from "../prebid.ts";

export const CONFIG_TOGGLE = 'performanceMetrics';
const getTime = window.performance && window.performance.now ? () => window.performance.now() : () => Date.now();
const NODES = new WeakMap();

export type Metrics = ReturnType<ReturnType<typeof metricsFactory>>;

/**
 * A function that, when called, stops a time measure and saves it as a metric.
 */
export type MetricsTimer = {
  (): void;
  /**
   * @return a wrapper around the given function that begins by stopping this time measure.
   */
  stopBefore<F extends AnyFunction>(fn: F): Wraps<F>;
  /**
   * @return a wrapper around the given function that ends by stopping this time measure.
   */
  stopAfter<F extends AnyFunction>(fn: F): Wraps<F>;
};

export type InstrumentedNext<F extends AnyFunction> = Next<F> & {
  /**
   * The original `next` argument; using it will not affect the timer.
   */
  untimed: Next<F>;
  stopTiming: MetricsTimer;
}

function wrapFn<F extends AnyFunction>(fn: F, before?: () => void, after?: () => void): Wraps<F> {
  return function (...args) {
    before && before();
    try {
      return fn.apply(this, args);
    } finally {
      after && after();
    }
  };
}

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
      function setMetric(name: string, value: unknown): void {
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
      function checkpoint(name: string): void {
        self.timestamps[name] = now();
      }

      /**
       * Get the tame passed since `checkpoint`, and optionally save it as a metric.
       *
       * @param checkpoint checkpoint name
       * @param metric The name of the metric to save. Optional.
       * @return The time in milliseconds between now and the checkpoint, or `null` if the checkpoint is not found.
       */
      function timeSince(checkpoint: string, metric?: string): number | null {
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
       * @param startCheckpoint - The name of the starting checkpoint.
       * @param endCheckpoint - The name of the ending checkpoint.
       * @param metric - The name of the metric to save.
       * @return The time in milliseconds between `startCheckpoint` and `endCheckpoint`, or `null` if either checkpoint is not found.
       */
      function timeBetween(startCheckpoint: string, endCheckpoint: string, metric?: string): number | null {
        const start = getTimestamp(startCheckpoint);
        const end = getTimestamp(endCheckpoint);
        const elapsed = start != null && end != null ? end - start : null;
        if (metric != null) {
          setMetric(metric, elapsed);
        }
        return elapsed;
      }

      /**
       * Start measuring a time metric with the given name.
       *
       * @param name metric name
       */
      function startTiming(name: string): MetricsTimer {
        return mkTimer(now, (val) => setMetric(name, val))
      }

      /**
       * Run fn and measure the time spent in it.
       *
       * @param name the name to use for the measured time metric
       * @param fn the function to run
       * @return the return value of `fn`
       */
      function measureTime<R>(name: string, fn: () => R): R {
        return startTiming(name).stopAfter(fn)();
      }

      /**
       * Convenience method for measuring time spent in a `.before` or `.after` hook.
       *
       * @param name - The metric name.
       * @param next - The hook's `next` (first) argument.
       * @param fn   - A function that will be run immediately; it takes `next`, where both `next` and
       *               `next.bail` automatically call `stopTiming` before continuing with the original hook.
       * @return The return value of `fn`.
       */
      function measureHookTime<F extends AnyFunction, R>(name: string, next: Next<F>, fn: (next: InstrumentedNext<F>) => R): R {
        const stopTiming = startTiming(name);
        return fn((function (orig) {
          const next = stopTiming.stopBefore(orig) as InstrumentedNext<F>;
          next.bail = orig.bail && stopTiming.stopBefore(orig.bail);
          next.stopTiming = stopTiming;
          next.untimed = orig;
          return next;
        })(next));
      }

      /**
       * Get all registered metrics.
       */
      function getMetrics(): { [name: string]: unknown } {
        let result = {}
        self.dfWalk({
          visit(edge, node) {
            result = Object.assign({}, !edge || edge.includeGroups ? node.groups : null, node.metrics, result);
          }
        });
        return result;
      }

            type PropagationOptions = {
              /**
               * If false, the forked or joined metrics will not be propagated here.
               */
              propagate?: boolean;
              /**
               * If true, propagation from the new metrics is stopped here, instead of
               * continuing up the chain (if for example these metrics were themselves created through `.fork()`).
               */
              stopPropagation?: boolean;
              /**
               * If true, the forked metrics will also replicate metrics that were propagated
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
              includeGroups?: boolean;
            };

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
             */
            function fork({propagate = true, stopPropagation = false, includeGroups = false}: PropagationOptions = {}): Metrics {
              return makeMetrics(mkNode([[self, {propagate, stopPropagation, includeGroups}]]), rename);
            }

            /**
             * Join `otherMetrics` with these; all metrics from `otherMetrics` will (by default) be propagated here,
             * and all metrics from here will be included in `otherMetrics`.
             */
            function join(otherMetrics: Metrics, {propagate = true, stopPropagation = false, includeGroups = false}: PropagationOptions = {}): void {
              const other = nodes.get(otherMetrics);
              if (other != null) {
                other.addParent(self, {propagate, stopPropagation, includeGroups});
              }
            }

            /**
             * @return a version of these metrics with the same propagation rules, but:
             *  - all metrics are renamed according to `renameFn`, or
             *  - without these metrics' rename rule (if `renameFn` is omitted).
             */
            function renameWith(renameFn?: (name: string) => string[]): Metrics {
              return makeMetrics(self, renameFn);
            }

            /**
             * @return a new metrics object that uses the same propagation and renaming rules as this one.
             */
            function newMetrics(): Metrics {
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

function makeTimer(now: () => number, cb: (elapsed: number) => void): MetricsTimer {
  const start = now();
  let done = false;
  function stopTiming() {
    if (!done) {
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
    dfWalk({visit, follow = () => true, visited = new Set(), inEdge} = {} as any) {
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

const nullMetrics: Metrics = (() => {
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
    mkNode: () => nullNode as any,
    mkRenamer: () => () => none,
    mkTimer: () => nullTimer,
    nodes: {get: nop, set: nop} as unknown as Map<any, any>
  })();
})();

let enabled = true;
config.getConfig(CONFIG_TOGGLE, (cfg) => { enabled = !!cfg[CONFIG_TOGGLE] });

/**
 * convenience fallback function for metrics that may be undefined, especially during tests.
 */
export function useMetrics(metrics: Metrics): Metrics {
  return (enabled && metrics) || nullMetrics;
}

export const newMetrics = (() => {
  const makeMetrics = metricsFactory();
  return function (): Metrics {
    return enabled ? makeMetrics() : nullMetrics;
  }
})();

export function hookTimer<TYP extends HookType, F extends AnyFunction>(prefix: string, getMetrics: (...args: Parameters<F>) => Metrics) {
  return function(name: string, hookFn: (next: InstrumentedNext<(...args: BeforeHookParams<TYP, F>) => ReturnType<F>>, ...args: BeforeHookParams<TYP, F>) => unknown): BeforeHook<TYP, F> {
    return (next, ...args) => {
      return useMetrics(getMetrics.apply(this, args)).measureHookTime(prefix + name, next, (next) => {
        return hookFn.call(this, next, ...args);
      });
    }
  }
}

export const timedAuctionHook = hookTimer<'async', (options: PrivRequestBidsOptions | StartAuctionOptions) => void>('requestBids.', (req) => req.metrics);
export const timedBidResponseHook = hookTimer<'async', typeof addBidResponse>('addBidResponse.', (_, bid) => bid.metrics)
