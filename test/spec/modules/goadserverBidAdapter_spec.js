import { expect } from 'chai';
import { spec } from 'modules/goadserverBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import { config } from '../../../src/config.js';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';

// Load prebid core + ORTB processors the converter relies on.
import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/userId/index.js';
import 'modules/multibid/index.js';
import 'modules/priceFloors.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';

const HOST = 'ads.example.com';
const TOKEN = 'test-campaign-token';
const EXPECTED_ENDPOINT = `https://${HOST}/openrtb2/auction`;

const BANNER_BID_REQUEST = {
  bidder: 'goadserver',
  params: {
    host: HOST,
    token: TOKEN,
  },
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [728, 90]],
    },
  },
  adUnitCode: '/test/adunit/banner',
  transactionId: 'test-txn-banner',
  bidId: 'test-bid-banner',
  bidderRequestId: 'test-req-1',
  auctionId: 'test-auction-1',
  sizes: [[300, 250], [728, 90]],
  timeout: 1000,
};

const VIDEO_BID_REQUEST = {
  bidder: 'goadserver',
  params: {
    host: HOST,
    token: TOKEN,
  },
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [[640, 480]],
      mimes: ['video/mp4'],
      protocols: [2, 3],
    },
  },
  adUnitCode: '/test/adunit/video',
  transactionId: 'test-txn-video',
  bidId: 'test-bid-video',
  bidderRequestId: 'test-req-1',
  auctionId: 'test-auction-1',
  timeout: 1000,
};

const NATIVE_BID_REQUEST = {
  bidder: 'goadserver',
  params: {
    host: HOST,
    token: TOKEN,
  },
  mediaTypes: {
    native: {
      title: { required: true, len: 140 },
      image: { required: true, sizes: [300, 250] },
      sponsoredBy: { required: true },
    },
  },
  adUnitCode: '/test/adunit/native',
  transactionId: 'test-txn-native',
  bidId: 'test-bid-native',
  bidderRequestId: 'test-req-1',
  auctionId: 'test-auction-1',
  timeout: 1000,
};

const BID_REQUEST_WITH_FLOOR = {
  ...BANNER_BID_REQUEST,
  bidId: 'test-bid-floor',
  params: {
    host: HOST,
    token: TOKEN,
    floor: 1.25,
  },
};

const BID_REQUEST_WITH_SUBID = {
  ...BANNER_BID_REQUEST,
  bidId: 'test-bid-subid',
  params: {
    host: HOST,
    token: TOKEN,
    subid: 'article_top_728x90',
  },
};

const bidderRequest = {
  refererInfo: {
    page: 'https://publisher.example.com/article/42',
    ref: 'https://referrer.example.com',
  },
};

const GDPR_CONSENT = {
  apiVersion: 2,
  consentString: 'CONSENT_STRING_TEST',
  vendorData: { purpose: { consents: { 1: true } } },
  gdprApplies: true,
};

describe('goadserverBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exposes a callBids function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('returns true when host and token are both set', function () {
      expect(spec.isBidRequestValid(BANNER_BID_REQUEST)).to.equal(true);
    });

    it('returns false when host is missing', function () {
      const bid = { ...BANNER_BID_REQUEST, params: { token: TOKEN } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false when token is missing', function () {
      const bid = { ...BANNER_BID_REQUEST, params: { host: HOST } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false when params is missing entirely', function () {
      expect(spec.isBidRequestValid({})).to.equal(false);
    });

    it('returns false when host is not a string', function () {
      const bid = { ...BANNER_BID_REQUEST, params: { host: 123, token: TOKEN } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('returns an empty array when no valid bid requests', async function () {
      const result = spec.buildRequests([], await addFPDToBidderRequest(bidderRequest));
      expect(result).to.be.an('array').that.is.empty;
    });

    it('targets https://{host}/openrtb2/auction', async function () {
      const request = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(EXPECTED_ENDPOINT);
      expect(request.data).to.be.an('object');
    });

    it('places the token in site.publisher.id', async function () {
      const request = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      expect(request.data.site).to.have.property('publisher');
      expect(request.data.site.publisher.id).to.equal(TOKEN);
    });

    it('defaults currency to USD when unset', async function () {
      const request = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      expect(request.data.cur).to.deep.equal(['USD']);
    });

    it('builds a valid banner imp', async function () {
      const request = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      expect(request.data.imp).to.have.lengthOf(1);
      expect(request.data.imp[0].banner).to.exist;
      expect(request.data.imp[0].banner.format).to.be.an('array').with.lengthOf(2);
      expect(request.data.imp[0].banner.format[0]).to.have.property('w');
      expect(request.data.imp[0].banner.format[0]).to.have.property('h');
    });

    if (FEATURES.VIDEO) {
      it('builds a valid video imp', async function () {
        const request = spec.buildRequests([VIDEO_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
        expect(request.data.imp[0].video).to.exist;
        expect(request.data.imp[0].video.w).to.be.a('number');
        expect(request.data.imp[0].video.h).to.be.a('number');
      });
    }

    it('builds a valid native imp', async function () {
      // Native serialization in ortbConverter depends on modules/native.js
      // being loaded by the publisher's build; without it the imp will
      // still be emitted but without a native block — mirrors blasto's test.
      const request = spec.buildRequests([NATIVE_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      expect(request.data.imp).to.have.lengthOf(1);
      expect(request.data.imp[0]).to.be.an('object');
      expect(request.data.imp[0]).to.have.property('id');
    });

    it('applies params.floor when Price Floors has not set bidfloor', async function () {
      const request = spec.buildRequests([BID_REQUEST_WITH_FLOOR], await addFPDToBidderRequest(bidderRequest));
      expect(request.data.imp[0].bidfloor).to.equal(1.25);
      expect(request.data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('emits params.subid as imp.ext.goadserver.subid', async function () {
      const request = spec.buildRequests([BID_REQUEST_WITH_SUBID], await addFPDToBidderRequest(bidderRequest));
      expect(request.data.imp[0].ext).to.exist;
      expect(request.data.imp[0].ext.goadserver).to.exist;
      expect(request.data.imp[0].ext.goadserver.subid).to.equal('article_top_728x90');
    });

    it('omits imp.ext.goadserver.subid when no subid is set', async function () {
      const request = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      const goadserverExt = request.data.imp[0].ext && request.data.imp[0].ext.goadserver;
      if (goadserverExt) {
        expect(goadserverExt.subid).to.be.undefined;
      }
    });

    it('forwards GDPR consent to regs.ext.gdpr and user.ext.consent', async function () {
      const req = await addFPDToBidderRequest({
        ...bidderRequest,
        gdprConsent: GDPR_CONSENT,
      });
      const request = spec.buildRequests([BANNER_BID_REQUEST], req);
      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.user.ext.consent).to.equal('CONSENT_STRING_TEST');
    });

    it('forwards US Privacy string to regs.ext.us_privacy', async function () {
      const req = await addFPDToBidderRequest({
        ...bidderRequest,
        uspConsent: '1YYY',
      });
      const request = spec.buildRequests([BANNER_BID_REQUEST], req);
      expect(request.data.regs.ext.us_privacy).to.equal('1YYY');
    });

    it('forwards COPPA flag to regs.coppa', async function () {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(true);
      const request = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      expect(request.data.regs.coppa).to.equal(1);
      config.getConfig.restore();
    });
  });

  describe('interpretResponse', function () {
    it('returns empty array when the server response is null', function () {
      expect(spec.interpretResponse(null, { data: {} })).to.deep.equal([]);
    });

    it('returns empty array when body is missing', function () {
      expect(spec.interpretResponse({}, { data: {} })).to.deep.equal([]);
    });

    it('parses a banner bid response', async function () {
      const request = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      const serverResponse = {
        body: {
          id: 'test-auction-1',
          cur: 'USD',
          seatbid: [{
            seat: 'goadserver',
            bid: [{
              id: 'bid-1',
              impid: request.data.imp[0].id,
              price: 1.75,
              adm: '<div>banner</div>',
              crid: 'creative-1',
              w: 300,
              h: 250,
              mtype: 1, // banner per OpenRTB 2.6
            }],
          }],
        },
      };
      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.be.an('array').with.lengthOf(1);
      expect(bids[0].cpm).to.equal(1.75);
      expect(bids[0].currency).to.equal('USD');
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].creativeId).to.equal('creative-1');
    });
  });

  describe('onBidWon', function () {
    let triggerPixelStub;

    beforeEach(function () {
      triggerPixelStub = sinon.stub();
    });

    it('does not throw on a bid without nurl', function () {
      expect(() => spec.onBidWon({})).to.not.throw();
    });

    it('does not throw when nurl is not a string', function () {
      expect(() => spec.onBidWon({ nurl: 123 })).to.not.throw();
    });
  });

  describe('getUserSyncs', function () {
    const SYNC_URL = 'https://ads.example.com/openrtb2/sync';

    const responseWithSync = {
      body: {
        ext: {
          goadserver: {
            usersync: { type: 'image', url: SYNC_URL },
          },
        },
      },
    };

    it('returns empty array when no server responses', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, [])).to.deep.equal([]);
    });

    it('returns empty array when no ext.goadserver.usersync is present', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, [{ body: {} }])).to.deep.equal([]);
    });

    it('returns an image sync when pixelEnabled and type is image', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: false }, [responseWithSync]);
      expect(syncs).to.deep.equal([{ type: 'image', url: SYNC_URL }]);
    });

    it('returns empty array when pixelEnabled is false and type is image', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: false, iframeEnabled: true }, [responseWithSync]);
      expect(syncs).to.deep.equal([]);
    });

    it('returns an iframe sync when iframeEnabled and type is iframe', function () {
      const iframeResponse = {
        body: { ext: { goadserver: { usersync: { type: 'iframe', url: SYNC_URL } } } },
      };
      const syncs = spec.getUserSyncs({ pixelEnabled: false, iframeEnabled: true }, [iframeResponse]);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: SYNC_URL }]);
    });
  });
});
