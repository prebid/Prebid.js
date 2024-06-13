/**
 * Wraps native setTimeout function in order to count time only when page is focused
 *
 * @param {function(*): (number|Promise<number>)} [callback] - A function that will be invoked after passed time
 * @param {number} [milliseconds] - Minimum duration (in milliseconds) after the callback will be executed
 * @returns {number} A timer id
 */
export default function setDeferredTimeout(callback, milliseconds) {
  let timerId = setTimeout(callback, milliseconds);
  let timeLeft = milliseconds;
  let start = Date.now();

  function pause() {
    if (!timerId) return;
    timeLeft -= Date.now() - start;
    clearTimeout(timerId);
  }

  function resume() {
    start = Date.now();
    timerId = setTimeout(callback, timeLeft);
  }

  function handleFocusChange() {
    document.hidden ? pause() : resume();
  }

  document.addEventListener('visibilitychange', handleFocusChange);

  return timerId;
}
