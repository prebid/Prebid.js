import { expect, assert } from 'chai';
import { spec } from 'modules/jwplayerBidAdapter.js';
import { config } from 'src/config.js';

describe('jwplayer bid adapter tests', function() {
  beforeEach(function() {
    this.defaultBidderRequest = {
      'gdprConsent': {
        'consentString': '',
        'gdprApplies': true
      },
      'uspConsent': true,
      'refererInfo': {
        'referer': 'https://example.com'
      }
    }
  });

  describe('isBidRequestValid', function() {
    it('passes when the bid includes a placement ID, a publisher ID and a site ID', function() {
      assert(spec.isBidRequestValid({params: {placementId: 'foo', publisherId: 'bar', siteId: 'siteId '}}) === true);
    });

    it('fails when the bid request only includes a publisher ID', function() {
      assert(spec.isBidRequestValid({params: {publisherId: 'foo'}}) === false);
    });

    it('fails when the bid request only includes a placement ID', function() {
      assert(spec.isBidRequestValid({params: {placementId: 'foo'}}) === false);
    });

    it('fails when the bid request only includes a site ID', function() {
      assert(spec.isBidRequestValid({params: {siteId: 'foo'}}) === false);
    });

    it('fails when bid is undefined', function() {
      assert(spec.isBidRequestValid() === false);
    });

    it('fails when bid is null', function() {
      assert(spec.isBidRequestValid(null) === false);
    });

    it('fails when the bid has no params', function() {
      assert(spec.isBidRequestValid({}) === false);
    });
  });

  describe('buildRequests for video', function() {
    it('should build requests', function() {
      const bidRequests = [
        {
          'bidder': 'jwplayer',
          'params': {
            'placementId': 'testPlacementId',
            'publisherId': 'testPublisherId',
            'siteId': 'testSiteId'
          },
          'mediaTypes': {
            'video': {
              'playerSize': [640, 480],
            }
          },
          'bidRequestsCount': 1,
          'adUnitCode': 'testAdUnitCode',
          'bidId': 'testBidId'
        }
      ]

      let sandbox = sinon.sandbox.create();
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        const config = {
          'ortb2.site': {
            domain: 'page.example.com',
            page: 'https://examplepage.com'
          }
        };
        return config[key];
      });

      const serverRequests = spec.buildRequests(bidRequests, this.defaultBidderRequest);

      serverRequests.forEach(serverRequest => {
        expect(serverRequest.url).to.have.string('https://ib.adnxs.com/openrtb2/prebid');
        expect(serverRequest.method).to.equal('POST');

        const openrtbRequest = JSON.parse(serverRequest.data);

        expect(openrtbRequest.id).to.not.equal(null);
        expect(openrtbRequest.id).to.have.string('testBidId');

        expect(openrtbRequest.site).to.not.equal(null);
        expect(openrtbRequest.site).to.be.an('object');
        expect(openrtbRequest.site.domain).to.be.a('string');
        expect(openrtbRequest.site.domain).to.have.string('page.example.com');
        expect(openrtbRequest.site.page).to.be.a('string');
        expect(openrtbRequest.site.page).to.have.string('https://examplepage.com');
        expect(openrtbRequest.site.ref).to.be.a('string');
        expect(openrtbRequest.site.ref).to.have.string('https://example.com');

        expect(openrtbRequest.device).to.not.equal(null);
        expect(openrtbRequest.device.ua).to.equal(navigator.userAgent);

        expect(openrtbRequest.imp).to.not.equal(null);
        expect(openrtbRequest.imp[0]).to.not.equal(null);
        expect(openrtbRequest.imp[0].video).to.not.equal(null);
        expect(openrtbRequest.imp[0].ext).to.not.equal(null);
        expect(openrtbRequest.imp[0].ext.prebid.bidder.jwplayer.placementId).to.not.equal(null);
        expect(openrtbRequest.imp[0].ext.prebid.bidder.jwplayer.placementId).to.equal('testPlacementId');

        expect(openrtbRequest.user).to.not.equal(null);
        expect(openrtbRequest.user.ext).to.not.equal(null);

        expect(openrtbRequest.regs).to.not.equal(null);
        expect(openrtbRequest.regs.ext).to.not.equal(null);
        expect(openrtbRequest.regs.ext.gdpr).to.equal(1);
        expect(openrtbRequest.regs.ext.us_privacy).to.equal(true);
      });

      sandbox.restore();
    });
  });

  describe('interpretResponse for video', function() {
    const bidResponse = {
      id: 'testId',
      impid: 'test-imp-id',
      price: 1.000000,
      adid: '97517771',
      adm: 'some-test-ad',
      adomain: ['prebid.com'],
      w: 1,
      h: 1,
    }

    const serverResponse = {
      body: {
        id: 'test-request-id',
        seatbid: [
          {
            bid: [ bidResponse ],
            seat: 1000
          }
        ]
      },
      bidid: '123456789',
      cur: 'USD'
    }

    const bidResponses = spec.interpretResponse(serverResponse);

    expect(bidResponses[0]).to.not.equal(null);
    expect(bidResponses[0].requestId).to.equal('123456789');
    expect(bidResponses[0].cpm).to.equal(1);
    expect(bidResponses[0].currency).to.equal('USD');
    expect(bidResponses[0].width).to.equal(1);
    expect(bidResponses[0].height).to.equal(1);
    expect(bidResponses[0].creativeId).to.equal('97517771');
    expect(bidResponses[0].vastXml).to.equal('some-test-ad');
    expect(bidResponses[0].netRevenue).to.equal(true);
    expect(bidResponses[0].ttl).to.equal(500);
    expect(bidResponses[0].ad).to.equal('some-test-ad');
    expect(bidResponses[0].meta).to.not.equal(null);
    expect(bidResponses[0].meta.advertiserDomains).to.not.equal(null);
    expect(bidResponses[0].meta.advertiserDomains[0]).to.equal('prebid.com');
  });

  describe('user sync handler', function() {});
});
