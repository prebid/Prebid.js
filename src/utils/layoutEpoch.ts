/**
 * Layout reads (window dimensions, scroll offsets, element rects) are cached for the duration of a
 * layout epoch, and every cache is discarded together when it ends, so that values combined from
 * different caches - a rect and a scroll offset, for instance - always describe the same layout.
 *
 * An epoch ends in a microtask queued when it starts, so it never outlives the task that started it:
 * rendering, input, and scripts running in other tasks - everything else that can scroll the page or
 * change its layout - only run after it has ended. Code that alters the page and then measures it
 * within the same epoch sees the layout from before the change.
 */
// captured when this module loads: an epoch whose microtask is lost to a replacement installed later (by
// another script, or a timer mock) would never end, and every cache would keep serving its values
const enqueue: (callback: () => void) => void = typeof queueMicrotask === 'function'
  ? queueMicrotask.bind(window)
  : (callback) => { Promise.resolve().then(callback); };

export const dep = {
  queueMicrotask: enqueue,
};

type Reset = () => void;

const resets: Reset[] = [];
let running = false;
let epochToken = 0;

/**
 * Register a function that discards a layout cache; it is called whenever an epoch ends.
 * Returns a function that unregisters it.
 */
export function onLayoutEpochEnd(reset: Reset) {
  resets.push(reset);
  return () => {
    const i = resets.indexOf(reset);
    if (i >= 0) resets.splice(i, 1);
  };
}

/**
 * End the current epoch, discarding every layout cache.
 */
export function endLayoutEpoch() {
  running = false;
  epochToken += 1;
  resets.forEach(reset => reset());
}

/**
 * Start an epoch if none is running. To be called before a value is read from the page into a layout
 * cache, so that the value is discarded when the epoch it was read in ends.
 */
export function startLayoutEpoch() {
  if (running) return;
  running = true;
  epochToken += 1;
  const token = epochToken;
  dep.queueMicrotask(() => {
    if (running && epochToken === token) endLayoutEpoch();
  });
}
