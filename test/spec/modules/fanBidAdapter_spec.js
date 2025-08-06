import { spec } from 'modules/fanBidAdapter.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { expect } from 'chai';
import sinon from 'sinon';

describe('freedomadnetworkAdapter', function() {
  const BIDDER_CODE = 'freedomadnetwork';
  const DEFAULT_CURRENCY = 'USD';
  const DEFAULT_TTL = 300;

  let validBidRequestBanner;
  let validBidRequestVideo;
  let bidderRequest;

  beforeEach(function() {
    // A minimal valid banner bid request
    validBidRequestBanner = {
      bidder: BIDDER_CODE,
      params: {
        placementId: 'placement123',
        network: 'test'
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      adUnitCode: 'adunit-code-banner',
      auctionId: 'auction-1',
      bidId: 'bid-1',
      bidderRequestId: 'br-1',
      auctionStart: Date.now()
    };

    // A minimal valid video bid request
    validBidRequestVideo = {
      bidder: BIDDER_CODE,
      params: {
        placementId: 'placementVideo',
        network: 'fan',
        bidFloor: 1.5,
        bidFloorCur: 'USD'
      },
      mediaTypes: {
        video: {
          mimes: ['video/mp4'],
          playerSize: [[640, 480]]
        }
      },
      adUnitCode: 'adunit-code-video',
      auctionId: 'auction-2',
      bidId: 'bid-2',
      bidderRequestId: 'br-2',
      auctionStart: Date.now()
    };

    // Stub bidderRequest used by buildRequests
    bidderRequest = {
      refererInfo: { referer: 'http://example.com' },
      auctionId: 'auction-1',
      timeout: 3000,
      gdprConsent: null,
      uspConsent: null,
      gppConsent: null
    };

    // Reset any config overrides
    config.setConfig({});
  });

  describe('isBidRequestValid', function() {
    it('should return true when required params for banner are present', function() {
      expect(spec.isBidRequestValid(validBidRequestBanner)).to.be.true;
    });

    it('should return true when required params for video are present', function() {
      expect(spec.isBidRequestValid(validBidRequestVideo)).to.be.true;
    });

    it('should return false when params object is missing', function() {
      const bid = Object.assign({}, validBidRequestBanner, { params: null });
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when placementId is missing', function() {
      const bid = Object.assign({}, validBidRequestBanner, { params: {} });
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when network param is invalid', function() {
      const bid = Object.assign({}, validBidRequestBanner, {
        params: {
          placementId: 'placement123',
          network: 'invalidNetwork'
        }
      });
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when mediaTypes is unsupported', function() {
      const bid = Object.assign({}, validBidRequestBanner, {
        mediaTypes: { native: {} }
      });
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when video params missing required fields', function() {
      const badVideoBid1 = JSON.parse(JSON.stringify(validBidRequestVideo));
      delete badVideoBid1.mediaTypes.video.mimes;
      expect(spec.isBidRequestValid(badVideoBid1)).to.be.false;

      const badVideoBid2 = JSON.parse(JSON.stringify(validBidRequestVideo));
      delete badVideoBid2.mediaTypes.video.playerSize;
      expect(spec.isBidRequestValid(badVideoBid2)).to.be.false;
    });
  });

  describe('buildRequests', function() {
    it('should group bids by network and produce valid HTTP requests', function() {
      // Create two bids, one to 'test' network, one to FAN
      const bidTest = JSON.parse(JSON.stringify(validBidRequestBanner));
      const bidFan = JSON.parse(JSON.stringify(validBidRequestBanner));
      bidFan.params.network = 'fan';
      bidFan.params.placementId = 'placement456';
      bidFan.bidId = 'bid-3';

      const requests = spec.buildRequests([bidTest, bidFan], bidderRequest);

      // Expect two separate requests (one per network)
      expect(requests).to.have.lengthOf(2);

      // Find the request for 'test'
      const reqTest = requests.find(r => r.url === 'http://localhost:8001/ortb');
      expect(reqTest).to.exist;
      expect(reqTest.method).to.equal('POST');
      expect(reqTest.options.contentType).to.equal('text/plain');
      expect(reqTest.options.withCredentials).to.be.false;

      // The data payload should have 'imp' array with one impression
      expect(reqTest.data.imp).to.be.an('array').with.lengthOf(1);
      const impTest = reqTest.data.imp[0];
      expect(impTest.tagid).to.equal('placement123');

      // Source.tid must equal auctionId
      expect(reqTest.data.source.tid).to.equal(bidderRequest.auctionId);
      expect(reqTest.data.at).to.equal(1);
      expect(reqTest.data.cur).to.deep.equal([DEFAULT_CURRENCY]);
      expect(reqTest.data.ext.prebid.channel).to.equal(BIDDER_CODE);
      expect(reqTest.data.ext.prebid.version).to.exist;

      // Find the request for FAN
      const reqFan = requests.find(r => r.url === 'https://srv.freedomadnetwork.com/ortb');
      expect(reqFan).to.exist;
      expect(reqFan.method).to.equal('POST');
      expect(reqFan.data.imp[0].tagid).to.equal('placement456');

      // Validate bidfloor and bidfloorcur were set for video
      const videoBid = validBidRequestVideo;
      const reqVideo = spec.buildRequests([videoBid], bidderRequest)[0];
      const impVideo = reqVideo.data.imp[0];
      expect(impVideo.bidfloor).to.equal(0);
      expect(impVideo.bidfloorcur).to.equal(videoBid.params.bidFloorCur);
    });

    describe('PriceFloors module support', function () {
      it('should get default bid floor', function () {
        const bidTest = JSON.parse(JSON.stringify(validBidRequestBanner));
        const requests = spec.buildRequests([bidTest], bidderRequest);

        const data = requests[0].data;
        expect(data.imp[0].banner).to.exist;
        expect(data.imp[0].bidfloor).to.equal(0);
      });

      it('should not add bid floor if getFloor fails', function () {
        const bidTest = JSON.parse(JSON.stringify(validBidRequestBanner));
        bidTest.getFloor = () => {
          return false;
        };

        const requests = spec.buildRequests([bidTest], bidderRequest);

        const data = requests[0].data;
        expect(data.imp[0].banner).to.exist;
        expect(data.imp[0].bidfloor).to.not.exist;
      });

      it('should get the floor when bid have several mediaTypes', function () {
        const bidTest = JSON.parse(JSON.stringify(validBidRequestBanner));

        bidTest.mediaTypes.video = {
          playerSize: [600, 480],
        };

        const requests = spec.buildRequests([bidTest], bidderRequest);

        const data = requests[0].data;
        expect(data.imp[0].banner).to.exist;
        expect(data.imp[0].bidfloor).to.equal(0);
      });
    });
  });

  describe('interpretResponse', function() {
    it('should return an empty array when response body is missing', function() {
      const builtRequests = spec.buildRequests([validBidRequestBanner], bidderRequest);
      const fakeRequest = builtRequests[0];

      const result = spec.interpretResponse({ body: null }, fakeRequest);
      expect(result).to.be.an('array').and.have.lengthOf(0);
    });

    it('should return proper bid objects for a valid ORTB response', function() {
      const builtRequests = spec.buildRequests([validBidRequestBanner], bidderRequest);
      const fakeRequest = builtRequests[0];

      const ortbResponse = {
        id: fakeRequest.data.id,
        cur: 'USD',
        seatbid: [
          {
            bid: [
              {
                id: '123',
                impid: fakeRequest.data.imp[0].id,
                price: 2.5,
                adm: '<div>Ad</div>',
                w: 300,
                h: 250,
                crid: 'cr123',
                mtype: 1,
              }
            ]
          }
        ],
      };

      const serverResponse = { body: ortbResponse };
      const bidResponses = spec.interpretResponse(serverResponse, fakeRequest);

      expect(bidResponses).to.be.an('array').with.lengthOf(1);

      const bid = bidResponses[0];
      expect(bid.requestId).to.equal('bid-1');
      expect(bid.cpm).to.equal(2.5);
      expect(bid.ad).to.equal('<div>Ad</div>');
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal('cr123');
      expect(bid.currency).to.equal('USD');
      expect(bid.ttl).to.equal(300);
    });
  });

  describe('getUserSyncs', function() {
    const gdprConsent = { gdprApplies: true, consentString: 'CONSENT123' };
    const uspConsent = '1YNN';
    const gppConsent = { gppString: 'GPPSTRING', applicableSections: [6, 7] };

    it('should return empty array when syncOptions disabled', function() {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, [], gdprConsent, uspConsent, gppConsent);
      expect(syncs).to.deep.equal([]);
    });

    it('should return iframe and image sync URLs without duplicates', function() {
      const serverResponses = [{
        body: {
          ext: {
            sync: {
              iframe: [{ url: 'https://sync.iframe/endpoint' }],
              image: [{ url: 'https://sync.image/endpoint' }]
            }
          }
        }
      }, {
        body: {
          ext: {
            sync: {
              iframe: [{ url: 'https://sync.iframe/endpoint' }], // duplicate
              image: [{ url: 'https://sync.image/endpoint2' }]
            }
          }
        }
      }];

      const syncOptions = { iframeEnabled: true, pixelEnabled: true };
      const syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent);

      // Should have exactly three sync entries (unique URLs)
      expect(syncs).to.have.lengthOf(3);

      // Validate type and URL parameters for GDPR and US Privacy
      const iframeSync = syncs.find(s => s.type === 'iframe' && s.url.startsWith('https://sync.iframe/endpoint'));
      expect(iframeSync).to.exist;
      expect(iframeSync.url).to.match(/gdpr=1/);
      expect(iframeSync.url).to.match(/gdpr_consent=CONSENT123/);
      expect(iframeSync.url).to.match(/us_privacy=1YNN/);
      expect(iframeSync.url).to.match(/gpp=GPPSTRING/);
      // The comma in '6,7' will be percent-encoded as '%2C'
      expect(iframeSync.url).to.match(/gpp_sid=6%2C7/);

      const imageSync1 = syncs.find(s => s.type === 'image' && s.url.startsWith('https://sync.image/endpoint'));
      expect(imageSync1).to.exist;
      const imageSync2 = syncs.find(s => s.type === 'image' && s.url.startsWith('https://sync.image/endpoint2'));
      expect(imageSync2).to.exist;
    });
  });

  describe('Win Events', function() {
    let triggerPixelStub;

    beforeEach(function() {
      triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function() {
      triggerPixelStub.restore();
    });

    it('onBidWon should fire nurl and win tracking pixel', function() {
      const fakeBid = {
        requestId: 'req123',
        auctionId: 'auc123',
        cpm: 5.0,
        currency: 'USD',
        creativeId: 'creative123',
        nurl: 'https://win.nurl/track?bid=req123',
        meta: {
          libertas: {
            pxl: [
              {url: 'https://pxl.nurl/track?bid=req456', type: 0}
            ],
          },
        },
      };

      spec.onBidWon(fakeBid);

      // First call: nurl
      expect(triggerPixelStub.calledWith('https://win.nurl/track?bid=req123')).to.be.true;

      // Second call: win tracking URL must start with base
      const winCallArgs = triggerPixelStub.getCall(1).args[0];
      expect(winCallArgs).to.match(/^https:\/\/pxl\.nurl\/track\?bid=req456/);
    });
  });
});
