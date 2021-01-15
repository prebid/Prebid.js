/* eslint-disable no-console */
module.exports = {
  host: (process.env.TEST_SERVER_HOST) ? process.env.TEST_SERVER_HOST : 'localhost',
  protocol: (process.env.TEST_SERVER_PROTOCOL) ? 'https' : 'http',
  waitForElement: function(elementRef, time = 2000) {
    let element = $(elementRef);
    element.waitForExist({timeout: time});
  },
  switchFrame: function(frameRef, frameName) {
    let iframe = $(frameRef);
    browser.switchToFrame(iframe);
  }
}
