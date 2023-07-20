import { expect, assert } from 'chai';
import { spec } from 'modules/jwplayerBidAdapter.js';
import { config } from 'src/config.js';

describe('jwplayer bid adapter tests', function() {
  beforeEach(function() {
    this.defaultBidderRequest = {
      'gdprConsent': {
        'consentString': 'testConsentString',
        'gdprApplies': true
      },
      'uspConsent': 'testCCPA',
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
    it('should include proper ortb params in requests', function() {
      const bidRequests = [
        {
          bidder: 'jwplayer',
          params: {
            placementId: 'testPlacementId',
            publisherId: 'testPublisherId',
            siteId: 'testSiteId',
            bidFloor: 10,
            currency: 'EUR',
          },
          mediaTypes: {
            video: {
              playerSize: [640, 480],
              context: 'instream',
              mimes: [
                'video/mp4',
                'application/javascript'
              ],
              protocols: [2, 3, 5, 6],
              maxduration: 60,
              minduration: 3,
              startdelay: 0,
              linearity: 1,
              placement: 1,
              plcmt: 1,
              skip: 1,
              skipafter: 4,
              minbitrate: 500,
              maxbitrate: 1000,
              api: [2],
              delivery: [2],
              playbackmethod: [1],
            }
          },
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: [
              {
                asi: 'publisher.com',
                sid: '00001',
                hp: 1
              }
            ]
          },
          bidRequestsCount: 1,
          adUnitCode: 'testAdUnitCode',
          bidId: 'testBidId'
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
        expect(serverRequest.url).to.equal('https://vpb-server.jwplayer.com/openrtb2/auction');
        expect(serverRequest.method).to.equal('POST');

        const openrtbRequest = JSON.parse(serverRequest.data);

        expect(openrtbRequest.id).to.equal('testBidId');

        expect(openrtbRequest.site.domain).to.equal('page.example.com');
        expect(openrtbRequest.site.page).to.equal('https://examplepage.com');
        expect(openrtbRequest.site.ref).to.equal('https://example.com');
        expect(openrtbRequest.site.publisher.ext.jwplayer.publisherId).to.equal('testPublisherId');
        expect(openrtbRequest.site.publisher.ext.jwplayer.siteId).to.equal('testSiteId');

        expect(openrtbRequest.device.ua).to.equal(navigator.userAgent);

        expect(openrtbRequest.imp[0].id).to.equal('testAdUnitCode');
        expect(openrtbRequest.imp[0].video.mimes).to.deep.equal(['video/mp4', 'application/javascript']);
        expect(openrtbRequest.imp[0].video.protocols).to.deep.equal([2, 3, 5, 6]);
        expect(openrtbRequest.imp[0].video.api).to.deep.equal([2]);
        expect(openrtbRequest.imp[0].video.startdelay).to.equal(0);
        expect(openrtbRequest.imp[0].video.placement).to.equal(1);
        expect(openrtbRequest.imp[0].video.plcmt).to.equal(1);
        expect(openrtbRequest.imp[0].video.minduration).to.equal(3);
        expect(openrtbRequest.imp[0].video.maxduration).to.equal(60);
        expect(openrtbRequest.imp[0].video.skip).to.equal(1);
        expect(openrtbRequest.imp[0].video.skipafter).to.equal(4);
        expect(openrtbRequest.imp[0].video.minbitrate).to.equal(500);
        expect(openrtbRequest.imp[0].video.maxbitrate).to.equal(1000);
        expect(openrtbRequest.imp[0].video.delivery).to.deep.equal([2]);
        expect(openrtbRequest.imp[0].video.playbackmethod).to.deep.equal([1]);
        expect(openrtbRequest.imp[0].video.linearity).to.equal(1);

        expect(openrtbRequest.imp[0].bidfloor).to.equal(10);
        expect(openrtbRequest.imp[0].bidfloorcur).to.equal('EUR');

        expect(openrtbRequest.imp[0].ext.prebid.bidder.jwplayer.placementId).to.equal('testPlacementId');

        expect(openrtbRequest.user.ext.consent).to.equal('testConsentString');

        expect(openrtbRequest.regs.ext.gdpr).to.equal(1);
        expect(openrtbRequest.regs.ext.us_privacy).to.equal('testCCPA');

        expect(openrtbRequest.source.schain).to.deep.equal({
          ver: '1.0',
          complete: 1,
          nodes: [
            {
              asi: 'publisher.com',
              sid: '00001',
              hp: 1
            }
          ]
        });

        expect(openrtbRequest.tmax).to.not.equal(null);
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
