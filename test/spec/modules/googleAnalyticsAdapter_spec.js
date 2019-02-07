import ga from 'modules/googleAnalyticsAdapter';

var assert = require('assert');

describe('Ga', function () {
  describe('enableAnalytics', function () {
    it('should accept a tracker name option and output prefixed send string', function () {
      var config = { options: { trackerName: 'foo' } };
      ga.enableAnalytics(config);

      var output = ga.getTrackerSend();
      assert.equal(output, 'foo.send');
    });
  });
});
