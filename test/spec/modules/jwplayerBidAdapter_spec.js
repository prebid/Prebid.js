import { expect, assert } from 'chai';
import { spec } from 'modules/jwplayerBidAdapter.js';
import { config } from 'src/config.js';

describe('jwplayer adapter tests', function() {
  var sandbox, clock, frozenNow = new Date();

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    clock = sinon.useFakeTimers(frozenNow.getTime());
  });

  afterEach(function() {
    sandbox.restore();
    clock.restore();
  });

  describe('isBidRequestValid', function() {
    it('passes when the bid includes a placement ID and a publisher ID', function() {
      assert(spec.isBidRequestValid({params: {placementId: 'foo', pubId: 'bar'}}) === true);
    });

    it('fails when the bid does not include a placement ID', function() {
      assert(spec.isBidRequestValid({params: {pubId: 'foo'}}) === false);
    });

    it('fails when the bid does not include a publisher ID', function() {
      assert(spec.isBidRequestValid({params: {placementId: 'foo'}}) === false);
    });

    it('fails when bid is falsey', function() {
      assert(spec.isBidRequestValid() === false);
    });

    it('fails when the bid has no params at all', function() {
      assert(spec.isBidRequestValid({}) === false);
    });
  });

  describe('buildRequests for video', function() {});

  describe('interpretResponse for video', function() {});

  describe('user sync handler', function() {});
});
