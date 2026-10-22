/**
 * Layout reads (window dimensions, scroll offsets, element rects) are cached for the duration of a
 * layout epoch, and every cache is discarded together when it ends, so that values combined from
 * different caches - a rect and a scroll offset, for instance - always describe the same layout.
 *
 * Layout and scroll position change when the browser renders a frame, so an epoch ends at the next
 * animation frame. Animation frames do not run in background tabs, so an epoch also ends once it is
 * older than MAX_EPOCH_MS. A script that alters the page and then measures it within the same epoch
 * sees the layout from before the change.
 */
const MAX_EPOCH_MS = 20;

export const dep = {
  now: () => Date.now(),
  requestAnimationFrame: (callback) => window.requestAnimationFrame(callback),
};

const resets = [];
let epoch = 0;
let startedAt = null;

/**
 * Register a function that discards a layout cache; it is called whenever an epoch ends.
 * Returns a function that unregisters it.
 */
export function onLayoutEpochEnd(reset) {
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
  epoch++;
  startedAt = null;
  resets.forEach(reset => reset());
}

/**
 * Start an epoch if none is running. To be called whenever a value is read from the page into a
 * layout cache, so that the value is discarded when the epoch it was read in ends.
 */
export function startLayoutEpoch() {
  if (startedAt != null) return;
  startedAt = dep.now();
  const current = epoch;
  try {
    dep.requestAnimationFrame(() => {
      if (epoch === current) endLayoutEpoch();
    });
  } catch (e) {
    // without animation frames, epochs end on MAX_EPOCH_MS alone
  }
}

/**
 * To be called before serving a value from a layout cache: ends the current epoch if it has outlived
 * MAX_EPOCH_MS, and starts one if none is running.
 */
export function enterLayoutEpoch() {
  if (startedAt != null) {
    const age = dep.now() - startedAt;
    // a clock that went backwards cannot say how old the epoch is
    if (age < 0 || age > MAX_EPOCH_MS) endLayoutEpoch();
  }
  startLayoutEpoch();
}
