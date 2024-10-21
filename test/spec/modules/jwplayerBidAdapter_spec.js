import { expect, assert } from 'chai';
import { spec } from 'modules/jwplayerBidAdapter.js';

describe('jwplayerBidAdapter', function() {
  beforeEach(function() {
    this.defaultBidderRequest = {
      gdprConsent: {
        consentString: 'testConsentString',
        gdprApplies: true
      },
      uspConsent: 'testCCPA',
      refererInfo: {
        referer: 'https://example.com'
      },
      ortb2: {
        site: {
          domain: 'page.example.com',
          page: 'https://examplepage.com',
          content: {
            url: 'media.mp4',
            id: 'testMediaId',
            title: 'testTile',
            data: [{
              name: 'jwplayer.com',
              segment: [{
                id: '00000000'
              }, {
                id: '88888888'
              }, {
                id: '80808080'
              }],
              ext: {
                segtax: 502,
                cids: ['testMediaId', 'externalTestId'],
              }
            }],
            ext: {
              description: 'testDescription'
            }
          }
        }
      },
      timeout: 1000
    }
  });

  it('should use jwplayer bidder code', function () {
    expect(spec.code).to.equal('jwplayer');
  });

  it('should use jwplayer GVLID code', function () {
    expect(spec.gvlid).to.equal(1046);
  });

  it('should support VIDEO media type only', function () {
    expect(spec.supportedMediaTypes).to.have.length(1);
    expect(spec.supportedMediaTypes[0]).to.equal('video');
  });

  describe('isBidRequestValid', function() {
    it('should be invalid when bidRequest is undefined', function() {
      assert(spec.isBidRequestValid() === false);
    });

    it('should be invalid when bidRequest is null', function() {
      assert(spec.isBidRequestValid(null) === false);
    });

    it('should be invalid when the bidRequest has no params', function() {
      assert(spec.isBidRequestValid({}) === false);
    });

    it('should be invalid when the bid request only includes a publisher ID', function() {
      assert(spec.isBidRequestValid({params: {publisherId: 'foo'}}) === false);
    });

    it('should be invalid when the bid request only includes a placement ID', function() {
      assert(spec.isBidRequestValid({params: {placementId: 'foo'}}) === false);
    });

    it('should be invalid when the bid request only includes a site ID', function() {
      assert(spec.isBidRequestValid({params: {siteId: 'foo'}}) === false);
    });

    it('should be valid when the bid includes a placement ID, a publisher ID and a site ID', function() {
      assert(spec.isBidRequestValid({params: {placementId: 'foo', publisherId: 'bar', siteId: 'siteId '}}) === true);
    });
  });

  describe('buildRequests', function() {
    it('should return undefined when bidRequests is undefined', function () {
      expect(spec.buildRequests()).to.be.undefined;
    });

    it('should return undefined when bidRequests is null', function () {
      expect(spec.buildRequests(null)).to.be.undefined;
    });

    it('should return undefined when ortb site.content.url is absent', function () {
      const request = spec.buildRequests({}, {
        ortb2: {
          site: {
            content: {
              url: null,
            }
          }
        }
      });

      expect(request).to.be.undefined;
    });

    it('should build a valid request when bid request is complete', function() {
      const incomingBidRequests = [
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
              pos: 3,
              w: 640,
              h: 480,
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
              playbackend: 2
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
      ];

      const outgoingBidRequests = spec.buildRequests(incomingBidRequests, this.defaultBidderRequest);

      outgoingBidRequests.forEach(serverRequest => {
        expect(serverRequest.url).to.equal('https://vpb-server.jwplayer.com/openrtb2/auction');
        expect(serverRequest.method).to.equal('POST');

        const openrtbRequest = JSON.parse(serverRequest.data);

        expect(openrtbRequest.id).to.equal('testBidId');

        expect(openrtbRequest.imp[0].id).to.equal('testAdUnitCode');
        expect(openrtbRequest.imp[0].video.w).to.equal(640);
        expect(openrtbRequest.imp[0].video.h).to.equal(480);
        expect(openrtbRequest.imp[0].video.mimes).to.deep.equal(['video/mp4', 'application/javascript']);
        expect(openrtbRequest.imp[0].video.protocols).to.deep.equal([2, 3, 5, 6]);
        expect(openrtbRequest.imp[0].video.api).to.deep.equal([2]);
        expect(openrtbRequest.imp[0].video.startdelay).to.equal(0);
        expect(openrtbRequest.imp[0].video.placement).to.equal(1);
        expect(openrtbRequest.imp[0].video.plcmt).to.equal(1);
        expect(openrtbRequest.imp[0].video.pos).to.equal(3);
        expect(openrtbRequest.imp[0].video.minduration).to.equal(3);
        expect(openrtbRequest.imp[0].video.maxduration).to.equal(60);
        expect(openrtbRequest.imp[0].video.skip).to.equal(1);
        expect(openrtbRequest.imp[0].video.skipafter).to.equal(4);
        expect(openrtbRequest.imp[0].video.minbitrate).to.equal(500);
        expect(openrtbRequest.imp[0].video.maxbitrate).to.equal(1000);
        expect(openrtbRequest.imp[0].video.delivery).to.deep.equal([2]);
        expect(openrtbRequest.imp[0].video.playbackmethod).to.deep.equal([1]);
        expect(openrtbRequest.imp[0].video.playbackend).to.equal(2);
        expect(openrtbRequest.imp[0].video.linearity).to.equal(1);

        expect(openrtbRequest.imp[0].bidfloor).to.equal(10);
        expect(openrtbRequest.imp[0].bidfloorcur).to.equal('EUR');

        expect(openrtbRequest.imp[0].ext.prebid.bidder.jwplayer.placementId).to.equal('testPlacementId');

        expect(openrtbRequest.site.domain).to.equal('page.example.com');
        expect(openrtbRequest.site.page).to.equal('https://examplepage.com');
        expect(openrtbRequest.site.ref).to.equal('https://example.com');

        expect(openrtbRequest.site.publisher.ext.jwplayer.publisherId).to.equal('testPublisherId');
        expect(openrtbRequest.site.publisher.ext.jwplayer.siteId).to.equal('testSiteId');

        expect(openrtbRequest.site.content.url).to.equal('media.mp4');
        expect(openrtbRequest.site.content.id).to.equal('testMediaId');
        expect(openrtbRequest.site.content.title).to.equal('testTile');
        expect(openrtbRequest.site.content.ext.description).to.equal('testDescription');
        expect(openrtbRequest.site.content.data.length).to.equal(1);
        const datum = openrtbRequest.site.content.data[0];
        expect(datum.name).to.equal('jwplayer.com');
        expect(datum.segment).to.deep.equal([{
          id: '00000000'
        }, {
          id: '88888888'
        }, {
          id: '80808080'
        }]);
        expect(datum.ext.segtax).to.equal(502);
        expect(datum.ext.cids).to.deep.equal(['testMediaId', 'externalTestId']);

        expect(openrtbRequest.device.ua).to.equal(navigator.userAgent);
        expect(openrtbRequest.device.w).to.not.be.undefined;
        expect(openrtbRequest.device.h).to.not.be.undefined;
        expect(openrtbRequest.device.dnt).to.not.be.undefined;
        expect(openrtbRequest.device.js).to.equal(1);
        expect(openrtbRequest.device.language).to.not.be.undefined;

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

        expect(openrtbRequest.tmax).to.equal(1000);
      });
    });
  });

  describe('interpretResponse', function() {
    const serverResponse = {
      body: {
        id: 'test-request-id',
        cur: 'USD',
        seatbid: [{
          bid: [{
            id: 'testId',
            impid: 'test-imp-id',
            price: 5.000,
            adid: 'test-creative-id',
            adm: 'test-ad-xml',
            adomain: ['prebid.com'],
            cat: ['test-iab-category'],
            w: 200,
            h: 150,
            dealid: 'test-deal-id'
          }],
          seat: 1000
        }]
      }
    };

    const bidResponses = spec.interpretResponse(serverResponse);

    expect(bidResponses).to.have.length(1);
    const bid = bidResponses[0];
    expect(bid.requestId).to.equal('test-request-id');
    expect(bid.cpm).to.equal(5);
    expect(bid.currency).to.equal('USD');
    expect(bid.width).to.equal(200);
    expect(bid.height).to.equal(150);
    expect(bid.creativeId).to.equal('test-creative-id');
    expect(bid.vastXml).to.equal('test-ad-xml');
    expect(bid.netRevenue).to.equal(false);
    expect(bid.ttl).to.equal(3600);
    expect(bid.ad).to.equal('test-ad-xml');
    expect(bid.dealId).to.equal('test-deal-id');

    expect(bid.meta).to.not.be.undefined;

    expect(bid.meta.advertiserDomains).to.have.length(1);
    expect(bid.meta.advertiserDomains[0]).to.equal('prebid.com');

    expect(bid.meta.mediaType).to.equal('video');

    expect(bid.meta.primaryCatId).to.have.length(1);
    expect(bid.meta.primaryCatId[0]).to.equal('test-iab-category');
  });

  describe('getUserSyncs', function() {
    const consentString = 'test_consent_string';
    const baseGdprConsent = {
      gdprApplies: true,
      vendorData: {
        purpose: {
          consents: {
            1: true
          }
        }
      }
    };

    const expectedBaseUrl = 'https://ib.adnxs.com/getuid?https://vpb-server.jwplayer.com/setuid?bidder=jwplayer&uid=$UID&f=i';

    it('should return empty when Purpose 1 consent is not granted', function() {
      expect(spec.getUserSyncs({}, {})).to.be.empty;
      expect(spec.getUserSyncs({}, {}, {})).to.be.empty;
      expect(spec.getUserSyncs({}, {}, { gdprApplies: false })).to.be.empty;
      expect(spec.getUserSyncs({}, {}, {
        gdprApplies: true,
        vendorData: {
          purpose: {
            consents: {
              1: false
            }
          }
        }
      })).to.be.empty;
    });

    it('should return iframe when enabled', function () {
      const userSyncs = spec.getUserSyncs({ iframeEnabled: true }, {}, baseGdprConsent);
      expect(userSyncs.length).to.equal(1);
      const sync = userSyncs[0];
      expect(sync.type).to.equal('iframe');
      expect(sync.url).to.equal(expectedBaseUrl);
    });

    it('should return image when enabled', function () {
      const userSyncs = spec.getUserSyncs({ pixelEnabled: true }, {}, baseGdprConsent);
      expect(userSyncs.length).to.equal(1);
      const sync = userSyncs[0];
      expect(sync.type).to.equal('image');
      expect(sync.url).to.equal(expectedBaseUrl);
    });

    it('should return both iframe and image when enabled', function () {
      const userSyncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, {}, baseGdprConsent);
      expect(userSyncs.length).to.equal(2);

      const iframeSync = userSyncs[0];
      expect(iframeSync.type).to.equal('iframe');
      expect(iframeSync.url).to.equal(expectedBaseUrl);

      const imageSync = userSyncs[1];
      expect(imageSync.type).to.equal('image');
      expect(imageSync.url).to.equal(expectedBaseUrl);
    });

    it('should include gdpr consent query params in sync redirect url', function () {
      const expectedUrl = expectedBaseUrl + '&gdpr=1&gdpr_consent=' + consentString;
      const gdprConsent = Object.assign({ }, baseGdprConsent, { consentString });
      const userSyncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, {}, gdprConsent);
      expect(userSyncs.length).to.equal(2);

      const iframeSync = userSyncs[0];
      expect(iframeSync.type).to.equal('iframe');
      expect(iframeSync.url).to.equal(expectedUrl);

      const imageSync = userSyncs[1];
      expect(imageSync.type).to.equal('image');
      expect(imageSync.url).to.equal(expectedUrl);
    });

    it('should include gdpr 0 in consent query params when gdprApplies is false', function () {
      const expectedUrl = expectedBaseUrl + '&gdpr=0&gdpr_consent=' + consentString;
      const gdprConsent = Object.assign({ }, baseGdprConsent, { consentString, gdprApplies: false });
      const userSyncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, {}, gdprConsent);
      expect(userSyncs.length).to.equal(2);

      const iframeSync = userSyncs[0];
      expect(iframeSync.type).to.equal('iframe');
      expect(iframeSync.url).to.equal(expectedUrl);

      const imageSync = userSyncs[1];
      expect(imageSync.type).to.equal('image');
      expect(imageSync.url).to.equal(expectedUrl);
    });

    it('should include gdpr 0 in consent query params when gdprApplies is not a bool', function () {
      const expectedUrl = expectedBaseUrl + '&gdpr=0&gdpr_consent=' + consentString;
      const gdprConsent = Object.assign({ }, baseGdprConsent, { consentString, gdprApplies: 1 });
      const userSyncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, {}, gdprConsent);
      expect(userSyncs.length).to.equal(2);

      const iframeSync = userSyncs[0];
      expect(iframeSync.type).to.equal('iframe');
      expect(iframeSync.url).to.equal(expectedUrl);

      const imageSync = userSyncs[1];
      expect(imageSync.type).to.equal('image');
      expect(imageSync.url).to.equal(expectedUrl);
    });
  });
});
