var assert = require('assert');
var utils = require('util');

module.exports = {
  'AdserverTargeting Test Case 1' : function (browser) {
    browser
      .url('http://localhost:9999/test/spec/e2e/gpt-examples/gpt_default.html')
      .waitForElementVisible('body', 3000)
      .pause(3000)
      .execute(function(){

        if(typeof window.pbjs.bidderSettings == "undefined") {
          var pbjsBidderSettingsObject = [
            "hb_bidder",
            "hb_adid",
            "hb_pb",
            "hb_size"
          ];
        } else {
          var pbjsBidderSettings = window.pbjs.bidderSettings;
          var pbjsBidderSettingsObject = {};
          Object.keys(pbjsBidderSettings).forEach(function (prop) {
            //if(prop == 'standard') return;
            var value = pbjsBidderSettings[prop];
            var bs = value.adserverTargeting.map(function(item){
              return item.key;
            });
            pbjsBidderSettings.standard.adserverTargeting.map(function(value){
              if(bs.indexOf(value.key) == -1 ) {
                bs.push(value.key)
              }
            });
            pbjsBidderSettingsObject[prop] = bs;
          });
        }

        var adserverTargetingObject = {};
        var adserverTargeting = window.pbjs.getAdserverTargeting();
        Object.keys(adserverTargeting).forEach(function(value){
          if(Object.keys(adserverTargeting[value]).length == 0) return;
          adserverTargetingObject[adserverTargeting[value].hb_bidder] = Object.keys(adserverTargeting[value])
        });

        return [pbjsBidderSettingsObject, adserverTargetingObject];
      }, [], function(result) {
        Object.keys(result.value[1]).forEach(function(key) {
          if(utils.isArray(result.value[0])) {
            assert.deepEqual(result.value[0].sort(), result.value[1][key].sort());
          } else {
            if(result.value[0].hasOwnProperty(key)) {
              var obj1 = result.value[0][key].sort();
            } else {
              var obj1 = result.value[0]['standard'].sort();
            }
            assert.deepEqual(obj1, result.value[1][key].sort());
          }
        });
      });
  },
  after : function(browser) {
    browser.end();
  }
};
