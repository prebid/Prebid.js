let outOfFocusStart;
let timeOutOfFocus = 0;
let suspendedTimeouts = [];

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    outOfFocusStart = Date.now()
  } else {
    timeOutOfFocus += Date.now() - outOfFocusStart
    suspendedTimeouts.forEach(({ callback, startTime, setTimerId }) => setTimerId(setFocusTimeout(callback, timeOutOfFocus - startTime)()))
    outOfFocusStart = null;
  }
});

/**
 * Wraps native setTimeout function in order to count time only when page is focused
 *
 * @param {function(*): ()} [callback] - A function that will be invoked after passed time
 * @param {number} [milliseconds] - Minimum duration (in milliseconds) that the callback will be executed after
 * @returns {function(*): (number)} - Getter function for current timer id
 */
export default function setFocusTimeout(callback, milliseconds) {
  const startTime = timeOutOfFocus;
  let timerId = setTimeout(() => {
    if (timeOutOfFocus === startTime && outOfFocusStart == null) {
      callback();
    } else if (outOfFocusStart != null) {
      // case when timeout ended during page is out of focus
      suspendedTimeouts.push({
        callback,
        startTime,
        setTimerId(newId) {
          timerId = newId;
        }
      })
    } else {
      timerId = setFocusTimeout(callback, timeOutOfFocus - startTime)();
    }
  }, milliseconds);
  return () => timerId;
}
