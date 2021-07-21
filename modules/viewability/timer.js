// kudos: https://gist.github.com/ncou/3a0a1f89c8e22416d0d607f621a948a9
export function Timer(callback, delay, autostart = true) {
  let timerId;
  let start;
  let remaining = delay;

  this.pause = function () {
    window.clearTimeout(timerId);
    remaining -= new Date() - start;
  };

  this.resume = function () {
    start = new Date();
    window.clearTimeout(timerId);
    timerId = window.setTimeout(callback, remaining);
  };

  if (autostart) {
    this.resume();
  }
}
