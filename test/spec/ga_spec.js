var assert = require('assert');
var ga = require('../../src/adapters/analytics/ga');

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
