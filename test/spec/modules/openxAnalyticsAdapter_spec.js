import { expect } from 'chai';
import openxAdapter from 'modules/openxAnalyticsAdapter.js';
import * as utils from 'src/utils.js';

describe('openx analytics adapter', function() {
  describe('deprecation message', function () {
    let spy;
    beforeEach(function () {
      spy = sinon.spy(utils, 'logWarn');
    });

    afterEach(function() {
      utils.logWarn.restore();
    });

    it('should warn on enable', function() {
      openxAdapter.enableAnalytics();
      expect(spy.firstCall.args[0]).to.match(/OpenX Analytics has been deprecated/);
    });
  });
});
