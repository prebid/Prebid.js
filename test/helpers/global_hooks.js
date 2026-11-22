import { clearEvents } from '../../src/events.js';

window.describe = window.context = ((orig) => {
  let level = 0;
  return function (name, fn, ...args) {
    try {
      if (level++ === 0) {
        fn = ((orig) => {
          return function (...args) {
            const result = orig.apply(this, args);
            after(() => {
              // run this after each top-level "describe", roughly equivalent to each file
              clearEvents();
              // leftover sync iframes' removal timers could otherwise fire during a later test;
              // required lazily because importing userSync first creates an import cycle
              require('../../src/userSync.js').removeUserSyncIframes();
            });
            return result;
          };
        })(fn);
      }
      return orig.call(this, name, fn, ...args);
    } finally {
      level--;
    }
  };
})(window.describe);
