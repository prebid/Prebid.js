// var assert = require('assert');
var assert = require('chai').assert;
var utils = require('util');

module.exports = {
  'bidReceived not empty': function(browser) {
    browser
      .url('http://localhost:9999/test/spec/e2e/gpt-examples/gpt_default.html')
      .waitForElementVisible('body', 3000)
      .pause(5000)
      .execute(function() {
        return window.pbjs._bidsReceived.length;
      }, [], function(result) {
        // browser.assert.first(false, 'Bid response empty');
        assert.isOk(result.value, 'Bid response empty');
      });
  },
  'check keys': function(browser) {
    browser
      .execute(function() {
        return window.pbjs._bidsReceived;
      }, [], function(result) {
        // minimum expected keys in bid received
        var expected = ['bidderCode', 'width', 'height', 'adId', 'cpm', 'requestId', 'bidder', 'adUnitCode', 'timeToRespond'];
        Object.keys(result.value).forEach(function(key) {
          var compare = Object.keys(result.value[key]);
          assert.includeMembers(compare, expected, 'include members');
        });
      });
  },
  after: function(browser) {
    browser.end();
  }
};
