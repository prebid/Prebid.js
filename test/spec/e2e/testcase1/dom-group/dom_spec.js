// var assert = require('assert');

module.exports = {

  'Test rendering ad div-2': function (browser) {
    var checkAdRendering2 = function() {
      var div = document.getElementById('div-2');
      var iframes = div.getElementsByTagName('iframe');
      try {
        if (iframes.length == 1 && iframes[0].contentWindow.document.body.innerHTML == '') {
          return false;
        } else {
          return true;
        }
      } catch (e) {
        return true;
      }
    }

    browser
      .url('http://an.localhost:9999/test/spec/e2e/gpt-examples/e2e_default.html')
      .waitForElementVisible('body', 3000)
      .pause(3000)
      .execute(checkAdRendering2, [], function(result) {
        this.assert.equal(result.value, true, 'Ad of div-2 not rendered');
      });
  },
  'Test rendering ad div-1': function (browser) {
    var checkAdRendering = function() {
      var div = document.getElementById('div-1');
      var iframes = div.getElementsByTagName('iframe');
      try {
        if (iframes.length == 1 && iframes[0].contentWindow.document.body.innerHTML == '') {
          return false;
        } else {
          return true;
        }
      } catch (e) {
        return true;
      }
    }

    browser
      .execute(checkAdRendering, [], function(result) {
        this.assert.equal(result.value, true, 'Ad of div-1 not rendered');
      });
  },
  after: function(browser) {
    browser.end();
  }
};
