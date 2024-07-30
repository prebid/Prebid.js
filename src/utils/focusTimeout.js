let outOfFocusStart = null; // enforce null otherwise it could be undefined and the callback wouldn't execute
let timeOutOfFocus = 0;
let suspendedTimeouts = [];

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    outOfFocusStart = Date.now()
  } else {
    timeOutOfFocus += Date.now() - (outOfFocusStart ?? 0); // when the page is loaded in hidden state outOfFocusStart is undefined, which results in timeoutOffset being NaN
    outOfFocusStart = null; // out of focus time should be cleared prior looping the suspendedTimeouts, as the callbacks could reached their timelimit and could be executed immediately
    suspendedTimeouts.forEach(({ callback, startTime, setTimerId }) => setTimerId(setFocusTimeout(callback, timeOutOfFocus - startTime)()));
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
  suspendedTimeouts = suspendedTimeouts.filter((cbObj) => cbObj.callback !== callback); // remove the callback from the suspendedTimeouts, to prevent unbounded growth of the array
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
