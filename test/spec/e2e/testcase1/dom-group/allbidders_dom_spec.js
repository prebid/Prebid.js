//var verify = require('verify');
var util = require('../../common/utils.js');

module.exports = {
  'adequant ad rendering' : function (browser) {
    browser
      .url('http://an.localhost:9999/test/spec/e2e/gpt-examples/all_bidders_instant_load.html')
      .waitForElementVisible('body', 5000)
      .pause(7000)
      .execute(util.findIframeInDiv, ['div-1'], function(result) {
        this.verify.equal(result.value, true, 'adequant ad not rendered');
      });
  },
  'adform ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-2'], function(result) {
        this.verify.equal(result.value, true, 'adform ad not rendered');
      });
  },
  'aol ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-3'], function(result) {
        this.verify.equal(result.value, true, 'aol ad not rendered');
      });
  },
  'appnexus ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-4'], function(result) {
        this.verify.equal(result.value, true, 'appnexus ad not rendered');
      });
  },
  'indexExchange ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-5'], function(result) {
        this.verify.equal(result.value, true, 'indexExchange ad not rendered');
      });
  },
  'openx ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-6'], function(result) {
        this.verify.equal(result.value, true, 'openx ad not rendered');
      });
  },
  'pubmatic ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-7'], function(result) {
        this.verify.equal(result.value, true, 'pubmatic ad not rendered');
      });
  },
  'pulsepoint ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-8'], function(result) {
        this.verify.equal(result.value, true, 'pulsepoint ad not rendered');
      });
  },
  'rubicon ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-9'], function(result) {
        this.verify.equal(result.value, true, 'rubicon ad not rendered');
      });
  },
  'sonobi ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-10'], function(result) {
        this.verify.equal(result.value, true, 'sonobi ad not rendered');
      });
  },
  'sovrn ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-11'], function(result) {
        this.verify.equal(result.value, true, 'sovrn ad not rendered');
      });
  },
  'springserve ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-12'], function(result) {
        this.verify.equal(result.value, true, 'springserve ad not rendered');
      });
  },
  'triplelift ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-13'], function(result) {
        this.verify.equal(result.value, true, 'triplelift ad not rendered');
      });
  },
  'yieldbot ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-14'], function(result) {
        this.verify.equal(result.value, true, 'yieldbot ad not rendered');
      });
  },
  'nginad ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-15'], function(result) {
        this.verify.equal(result.value, true, 'nginad ad not rendered');
      });
  },
  'brightcom ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-16'], function(result) {
        this.verify.equal(result.value, true, 'brightcom ad not rendered');
      });
  },
  'sekindo ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-17'], function(result) {
        this.verify.equal(result.value, true, 'sekindo ad not rendered');
      });
  },
  'kruxlink ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-18'], function(result) {
        this.verify.equal(result.value, true, 'kruxlink ad not rendered');
      });
  },
  'AdMedia ad rendering' : function (browser) {
    browser
      .execute(util.findIframeInDiv, ['div-19'], function(result) {
        this.verify.equal(result.value, true, 'AdMedia ad not rendered');
      });
  },
  after : function(browser) {
    browser.end();
  }
};
