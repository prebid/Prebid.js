import { clearEvents } from '../../src/events.js';
import { removeUserSyncIframes } from '../../src/utils.js';

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
              // remove sync iframes a spec left behind now, rather than when their automatic removal
              // timers come due in the middle of some later, possibly timing-sensitive, test
              removeUserSyncIframes();
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
