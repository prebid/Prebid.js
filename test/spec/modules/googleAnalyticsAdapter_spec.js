import { newEvents } from 'src/events';
import gaFactory from 'modules/googleAnalyticsAdapter';

var assert = require('assert');

describe('Ga', function () {
  describe('enableAnalytics', function () {
    it('should accept a tracker name option and output prefixed send string', function () {
      const ga = gaFactory({
        events: newEvents(),
      });
      var config = { options: { trackerName: 'foo' } };
      ga.enableAnalytics(config);

      var output = ga.getTrackerSend();
      assert.equal(output, 'foo.send');
    });
  });
});
