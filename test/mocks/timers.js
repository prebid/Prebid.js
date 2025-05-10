/*
 * Provides wrappers for timers to allow easy cancelling and/or awaiting of outstanding timers.
 * This helps avoid functionality leaking from one test to the next.
 */

let wrappersActive = false;

export function configureTimerInterceptors(debugLog = function() {}, generateStackTraces = false) {
  if (wrappersActive) throw new Error(`Timer wrappers are already in place.`);
  wrappersActive = true;
  let theseWrappersActive = true;

  let originalSetTimeout = setTimeout, originalSetInterval = setInterval, originalClearTimeout = clearTimeout, originalClearInterval = clearInterval;

  let timerId = -1;
  let timers = [];

  const waitOnTimersResolves = [];
  function checkWaits() {
    if (timers.length === 0) waitOnTimersResolves.forEach((r) => r());
  }
  const waitAllActiveTimers = () => timers.length === 0 ? Promise.resolve() : new Promise((resolve) => waitOnTimersResolves.push(resolve));
  const clearAllActiveTimers = () => timers.forEach((timer) => timer.type === 'timeout' ? clearTimeout(timer.handle) : clearInterval(timer.handle));

  const generateInterceptor = (type, originalFunctionWrapper) => (fn, delay, ...args) => {
    timerId++;
    debugLog(`Setting wrapped timeout ${timerId} for ${delay ?? 0}`);
    const info = { timerId, type };
    if (generateStackTraces) {
      try {
        throw new Error();
      } catch (ex) {
        info.stack = ex.stack;
      }
    }
    info.handle = originalFunctionWrapper(info, fn, delay, ...args);
    timers.push(info);
    return info.handle;
  };
  const setTimeoutInterceptor = generateInterceptor('timeout', (info, fn, delay, ...args) => originalSetTimeout(() => {
    try {
      debugLog(`Running timeout ${info.timerId}`);
      fn(...args);
    } finally {
      const infoIndex = timers.indexOf(info);
      if (infoIndex > -1) timers.splice(infoIndex, 1);
      checkWaits();
    }
  }, delay));

  const setIntervalInterceptor = generateInterceptor('interval', (info, fn, interval, ...args) => originalSetInterval(() => {
    debugLog(`Running interval ${info.timerId}`);
    fn(...args);
  }, interval));

  const generateClearInterceptor = (type, originalClearFunction) => (handle) => {
    originalClearFunction(handle);
    const infoIndex = timers.findIndex((i) => i.handle === handle && i.type === type);
    if (infoIndex > -1) timers.splice(infoIndex, 1);
    checkWaits();
  }
  const clearTimeoutInterceptor = generateClearInterceptor('timeout', originalClearTimeout);
  const clearIntervalInterceptor = generateClearInterceptor('interval', originalClearInterval);

  setTimeout = setTimeoutInterceptor;
  setInterval = setIntervalInterceptor;
  clearTimeout = clearTimeoutInterceptor;
  clearInterval = clearIntervalInterceptor;

  return {
    waitAllActiveTimers,
    clearAllActiveTimers,
    timers,
    restore: () => {
      if (theseWrappersActive) {
        theseWrappersActive = false;
        setTimeout = originalSetTimeout;
        setInterval = originalSetInterval;
        clearTimeout = originalClearTimeout;
        clearInterval = originalClearInterval;
      }
    }
  }
}
