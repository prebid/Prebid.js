var assert = require('assert');
var ga = require('../../src/ga');

describe('Ga', function () {

  describe('enableAnalytics', function () {

    it('should accept a tracker name option and output prefixed send string', function () {
      var options = { trackerName: 'foo' };
      ga.enableAnalytics(options);

      var output = ga.getTrackerSend();
      assert.equal(output, 'foo.send');
    });


    it('should output normal send string when trackerName is not set', function () {
      var options = {};
      ga.enableAnalytics(options);

      var output = ga.getTrackerSend();
      assert.equal(output, 'send');
    });

  });


});
