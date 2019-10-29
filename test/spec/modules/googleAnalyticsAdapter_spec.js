import ga from 'modules/googleAnalyticsAdapter';

var assert = require('assert');

describe('Ga', function () {
  describe('enableAnalytics', function () {
    var cpmDistribution = function(cpm) {
      return cpm <= 1 ? '<= 1$' : '> 1$';
    }
    var config = { options: { trackerName: 'foo', enableDistribution: true, cpmDistribution: cpmDistribution } };

    // enableAnalytics can only be called once
    ga.enableAnalytics(config);

    it('should accept a tracker name option and output prefixed send string', function () {
      var output = ga.getTrackerSend();
      assert.equal(output, 'foo.send');
    });

    it('should use the custom cpm distribution', function() {
      assert.equal(ga.getCpmDistribution(0.5), '<= 1$');
      assert.equal(ga.getCpmDistribution(1), '<= 1$');
      assert.equal(ga.getCpmDistribution(2), '> 1$');
      assert.equal(ga.getCpmDistribution(5.23), '> 1$');
    });
  });
});
