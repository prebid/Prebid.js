import { expect, assert } from 'chai';
import { spec } from 'modules/jwplayerBidAdapter.js';
import { config } from 'src/config.js';

describe('jwplayer adapter tests', function() {
  var sandbox, clock, frozenNow = new Date();

  beforeEach(function() {
    this.defaultBidderRequest = {
      'gdprConsent': {
        'consentString': '',
        'gdprApplies': true
      },
      'uspConsent': true
    }

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

  describe('buildRequests for video', function() {
    it('buildRequests works', function() {
      const bidRequests = [
        {
          'bidder': 'jwplayer',
          'params': {
            'placementId': 12345
          },
          'mediaTypes': {
            'video': {
              'playerSize': [640, 480],
              'content': {}
            }
          },
          'bidRequestsCount': 1,
          'adUnitCode': 'testAdUnitCode',
          'bidId': 'testBidId'
        }
      ]

      const serverRequests = spec.buildRequests(bidRequests, this.defaultBidderRequest);

      /* eslint-disable no-console */

      serverRequests.forEach(serverRequest => {
        expect(serverRequest.url).to.have.string('https://ib.adnxs.com/openrtb2/prebid');
        expect(serverRequest.method).to.equal('POST');

        const openrtbRequest = JSON.parse(serverRequest.data);
        console.log(openrtbRequest);
        expect(openrtbRequest.id).to.not.equal(null);
        expect(openrtbRequest.id).to.have.string('testBidId');

        expect(openrtbRequest.site).to.not.equal(null);
        expect(openrtbRequest.device).to.not.equal(null);
        expect(openrtbRequest.device.ua).to.equal(navigator.userAgent);

        expect(openrtbRequest.imp).to.not.equal(null);
        expect(openrtbRequest.imp[0]).to.not.equal(null);
        expect(openrtbRequest.imp[0].video).to.not.equal(null);
        expect(openrtbRequest.imp[0].ext).to.not.equal(null);
        expect(openrtbRequest.imp[0].ext.appnexus).to.not.equal(null);
        expect(openrtbRequest.imp[0].ext.appnexus.placement_id).to.not.equal(null);
        expect(openrtbRequest.imp[0].ext.appnexus.placement_id).to.equal(12345);

        expect(openrtbRequest.user).to.not.equal(null);
        expect(openrtbRequest.user.ext).to.not.equal(null);

        expect(openrtbRequest.regs).to.not.equal(null);
        expect(openrtbRequest.regs.ext).to.not.equal(null);
        expect(openrtbRequest.regs.ext.gdpr).to.equal(1);
        expect(openrtbRequest.regs.ext.us_privacy).to.equal(true);
      })
    });
  });

  describe('interpretResponse for video', function() {});

  describe('user sync handler', function() {});
});
