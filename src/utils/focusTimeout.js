let activeFocusTimeouts = [];

document.addEventListener('visibilitychange', () => {
  activeFocusTimeouts.forEach(({ pause, resume }) => document.hidden ? pause() : resume())
});

function removeFromActiveTimeouts(timerId) {
  activeFocusTimeouts = activeFocusTimeouts.filter(timeout => timeout.timerId !== timerId);
}

export function clearFocusTimeout(timerId) {
  clearTimeout(timerId);
  removeFromActiveTimeouts(timerId);
}

/**
 * Wraps native setTimeout function in order to count time only when page is focused
 *
 * @param {function(*): ()} [callback] - A function that will be invoked after passed time
 * @param {number} [milliseconds] - Minimum duration (in milliseconds) that the callback will be executed after
 * @returns {function(*): (number)} - Getter function for current timer id
 */
export default function setFocusTimeout(callback, milliseconds) {
  let timerId;

  timerId = setTimeout(() => {
    removeFromActiveTimeouts(timerId);
    callback();
  }, milliseconds);

  let timeLeft = milliseconds;
  let start = Date.now();

  function pause() {
    if (!timerId) return;
    timeLeft -= Date.now() - start;
    clearTimeout(timerId);
  }

  function resume() {
    start = Date.now();
    removeFromActiveTimeouts(timerId);
    const getCurrentTimerId = setFocusTimeout(callback, timeLeft);
    timerId = getCurrentTimerId();
  }

  activeFocusTimeouts.push({
    timerId,
    resume,
    pause
  })

  return () => timerId;
}
