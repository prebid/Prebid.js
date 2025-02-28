import { spec } from 'modules/aniviewBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
const { expect } = require('chai');

const PUBLISHER_ID_1 = 'publisher_id_1';
const CHANNEL_ID_1 = 'channel_id_1';
const PUBLISHER_ID_2 = 'publisher_id_2';
const CHANNEL_ID_2 = 'channel_id_2';
const BID_ID_1 = 'bid_id_1';
const BID_ID_2 = 'bid_id_2';
const BIDDER_REQUEST_ID = 'bidder_request_id';
const CUSTOM_DOMAIN = 'example.com';

const BASE_URL = 'https://' + CUSTOM_DOMAIN + '/track' +
  '?rtbbp=10' +
  '&cpm=${AUCTION_PRICE}' +
  '&aucid=${AUCTION_ID}' +
  '&aucbid=${AUCTION_BID_ID}' +
  '&limid=${AUCTION_IMP_ID}' +
  '&aucseid=${AUCTION_SEAT_ID}' +
  '&aucadid=${AUCTION_AD_ID}';
const LURL = `${BASE_URL}&e=AV_M40&rcd=\${AUCTION_LOSS}`;
const NURL = `${BASE_URL}&e=AV_M4`;

const VIDEO_VAST = `<VAST version="3.0"><Tracking><![CDATA[${NURL}]]></Tracking></VAST>`
const BANNER_VAST = VIDEO_VAST;
const BANNER_HTML = '<h1>HTML BANNER</h1>';

const CURRENCY = 'USD';
const PRICE = 10;
const FLOOR_PRICE = PRICE * 0.5;
const TTL = 600;

const VIDEO_SIZE = { width: 640, height: 360 };
const BANNER_SIZE = { width: 250, height: 250 };

const CUSTOM_RENDERER_URL = `https://${CUSTOM_DOMAIN}/script/6.1/prebidRenderer.js`;
const DEFAULT_RENDERER_URL = `https://player.aniview.com/script/6.1/prebidRenderer.js`;

const REPLACEMENT_1 = '12345';

const MOCK = {
  bidRequest: () => ({
    bidderCode: 'aniview',
    auctionId: null,
    bidderRequestId: BIDDER_REQUEST_ID,
    bids: [
      {
        bidder: 'aniview',
        params: {
          AV_PUBLISHERID: PUBLISHER_ID_1,
          AV_CHANNELID: CHANNEL_ID_1,
          playerDomain: CUSTOM_DOMAIN,
        },
        mediaTypes: {
          video: {
            playerSize: [[VIDEO_SIZE.width, VIDEO_SIZE.height]],
            context: 'outstream',
            mimes: ['video/mpeg', 'video/mp4', 'application/javascript'],
          }
        },
        bidId: BID_ID_1,
        bidderRequestId: BIDDER_REQUEST_ID,
        sizes: [[VIDEO_SIZE.width, VIDEO_SIZE.height]],
      },
      {
        bidder: 'aniview',
        params: {
          AV_PUBLISHERID: PUBLISHER_ID_2,
          AV_CHANNELID: CHANNEL_ID_2,
          playerDomain: CUSTOM_DOMAIN,
          replacements: {
            AV_CDIM1: REPLACEMENT_1,
          },
        },
        mediaTypes: {
          video: {
            playerSize: [[VIDEO_SIZE.width, VIDEO_SIZE.height]],
            context: 'outstream',
            mimes: ['video/mpeg', 'video/mp4', 'application/javascript'],
          }
        },
        bidId: BID_ID_2,
        bidderRequestId: BIDDER_REQUEST_ID,
        sizes: [[VIDEO_SIZE.width, VIDEO_SIZE.height]],
        floorData: {
          currency: CURRENCY,
          floor: FLOOR_PRICE,
        },
        getFloor: _ => ({
          currency: CURRENCY,
          floor: FLOOR_PRICE,
        }),
      },
    ],
    auctionStart: 1722343584268,
    timeout: 1_000,
    start: 1722343584269,
    ortb2: {
      source: {},
      site: {
        page: 'http://localhost:8080/',
        ref: 'http://localhost:8080/',
        domain: 'http://localhost:8080',
        publisher: {
          domain: 'http://localhost:8080',
        }
      },
      device: {
        w: 1800,
        h: 1169,
        language: 'en',
      },
    },
  }),

  bidderResponse: () => ({
    body: {
      id: 'bidder_response_id',
      bidid: 'bidder_response_bid_id',
      cur: CURRENCY,
      ext: {
        aniview: {
          sync: [
            { url: 'https://iframe-1.example.com/sync', e: 'sync', pr: '14', t: 3 },
            { url: 'https://iframe-2.example.com/sync', e: 'sync', pr: '28', t: 3 },
            { url: 'https://image.example.com/sync', e: 'sync', pr: 'abc12', t: 1 }
          ]
        }
      },
      seatbid: [
        {
          seat: '',
          bid: [
            {
              adm: VIDEO_VAST,
              adomain: [''],
              id: 'seatbid_bid_id_1',
              impid: BID_ID_1,
              lurl: LURL,
              nurl: NURL,
              price: PRICE,
            }
          ]
        }
      ]
    },
  })
}

describe('Aniview Bid Adapter', function () {
  const adapter = newBidder(spec);

  describe('Inherited function', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let videoBidRequest;

    beforeEach(() => {
      videoBidRequest = MOCK.bidRequest();
    });

    it('should return `true` when required params found', function () {
      expect(spec.isBidRequestValid(videoBidRequest.bids[0])).to.be.true;
    });

    it('should return `false` when required params are wrong', function () {
      videoBidRequest.bids[0].params = { something: 'is wrong' };

      expect(spec.isBidRequestValid(videoBidRequest.bids[0])).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let videoBidRequest;

    beforeEach(() => {
      videoBidRequest = MOCK.bidRequest();
    });

    it('should return expected request object', function () {
      const bidRequest = spec.buildRequests(videoBidRequest.bids, videoBidRequest);

      expect(bidRequest).to.exist.and.to.be.a('array').and.to.have.lengthOf(2);

      const { url, method, data } = bidRequest[0];
      const { ext, imp } = data;

      expect(url).equal('https://rtb.aniview.com/sspRTB2');
      expect(method).equal('POST');
      expect(imp[0].tagid).equal(CHANNEL_ID_1);
      expect(imp[0].id).equal(videoBidRequest.bids[0].bidId);
      expect(ext.aniview.pbjs).equal(1);
    });

    it('should have floor data inside imp', function () {
      const bidRequest = spec.buildRequests(videoBidRequest.bids, videoBidRequest);
      const imp = bidRequest[1].data.imp[0];

      expect(imp.bidfloor).equal(FLOOR_PRICE);
      expect(imp.bidfloorcur).equal(CURRENCY);
    });

    it('should have replacements in request', function () {
      const bidRequest = spec.buildRequests(videoBidRequest.bids, videoBidRequest);
      const { replacements } = bidRequest[1].data.ext.aniview;

      expect(replacements.AV_CDIM1).equal(REPLACEMENT_1);
    });

    it('should not have floor data in imp if getFloor returns empty object', function () {
      videoBidRequest.bids[1].getFloor = () => ({});

      const bidRequest = spec.buildRequests(videoBidRequest.bids, videoBidRequest);
      const imp = bidRequest[1].data.imp[0];

      expect(imp.bidfloor).not.exist;
      expect(imp.bidfloorcur).not.exist;
    });

    it('should use dev environment', function () {
      const DEV_ENDPOINT = 'https://dev.aniview.com/sspRTB2';
      videoBidRequest.bids[0].params.dev = { endpoint: DEV_ENDPOINT };

      const bidRequest = spec.buildRequests(videoBidRequest.bids, videoBidRequest);

      expect(bidRequest[0].url).to.equal(DEV_ENDPOINT);
    });
  });

  describe('interpretResponse', function () {
    describe('Video format', function () {
      let bidRequests, bidderResponse;

      beforeEach(function() {
        const videoBidRequest = MOCK.bidRequest();

        bidRequests = spec.buildRequests(videoBidRequest.bids, videoBidRequest);
        bidderResponse = MOCK.bidderResponse();
      });

      it('should return empty bids array for empty response', function () {
        const emptyResponse = bidderResponse.body = {};
        const bids = spec.interpretResponse(emptyResponse, bidRequests[0]);

        expect(bids).to.be.empty;
      });

      it('should return valid bids array', function () {
        const bids = spec.interpretResponse(bidderResponse, bidRequests[0]);
        const bid = bids[0];

        expect(bids.length).to.greaterThan(0);
        expect(bid.vastXml).to.exist.and.to.not.have.string('${AUCTION_PRICE}');
        expect(bid.vastXml).to.have.string('cpm=' + PRICE);
        expect(bid.vastUrl).to.exist.and.to.not.have.string('${AUCTION_PRICE}');
        expect(bid.vastUrl).to.have.string('cpm=' + PRICE);
        expect(bid.requestId).to.equal(bidRequests[0].data.imp[0].id);
        expect(bid.cpm).to.equal(PRICE);
        expect(bid.ttl).to.equal(TTL);
        expect(bid.currency).to.equal(CURRENCY);
        expect(bid.netRevenue).to.equal(true);
        expect(bid.mediaType).to.equal('video');
        expect(bid.meta.advertiserDomains).to.be.an('array');
        expect(bid.creativeId).to.exist;
        expect(bid.width).to.exist;
        expect(bid.height).to.exist;
      });

      it('should return bid without required properties if cpm less or equal 0', function () {
        bidderResponse.body.seatbid[0].bid[0].price = 0;

        const bids = spec.interpretResponse(bidderResponse, bidRequests[0]);
        const bid = bids[0];

        expect(bid.renderer).to.not.exist;
        expect(bid.ad).to.not.exist;
      });

      it('should return empty bids array if no bids in response', function () {
        bidderResponse.body.seatbid[0].bid = [];

        const bids = spec.interpretResponse(bidderResponse, bidRequests[0]);

        expect(bids).to.exist.and.to.be.a('array').and.to.have.lengthOf(0);
      });

      it('should add renderer if outstream context', function () {
        const bid = spec.interpretResponse(bidderResponse, bidRequests[0])[0];

        expect(bid.renderer.url).to.equal(CUSTOM_RENDERER_URL);
        expect(bid.renderer.config.AV_PUBLISHERID).to.equal(PUBLISHER_ID_1);
        expect(bid.renderer.config.AV_CHANNELID).to.equal(CHANNEL_ID_1);
        expect(bid.renderer.loaded).to.equal(false);
        expect(bid.width).to.equal(VIDEO_SIZE.width);
        expect(bid.height).to.equal(VIDEO_SIZE.height);
      });

      it('should use default renderer domain', function () {
        delete bidRequests[0].bids[0].params.playerDomain;

        const bid = spec.interpretResponse(bidderResponse, bidRequests[0])[0];

        expect(bid.renderer.url).to.equal(DEFAULT_RENDERER_URL);
      });

      it('should not add renderer if context is not outstream', function () {
        bidRequests[0].bids[0].mediaTypes.video.context = 'instream';

        const bid = spec.interpretResponse(bidderResponse, bidRequests[0])[0];

        expect(bidRequests[0].bids[0].mediaTypes.video.context).to.be.not.equal('outstream');
        expect(bid.renderer).to.not.exist;
      });
    });

    describe('Banner format', function () {
      let bidRequests, bidderResponse;

      beforeEach(function() {
        const bannerBidRequest = MOCK.bidRequest();

        // Converting video bid request to banner bid request

        delete bannerBidRequest.bids[0].mediaTypes.video;

        bannerBidRequest.bids[0].sizes = [[BANNER_SIZE.width, BANNER_SIZE.height]];
        bannerBidRequest.bids[0].mediaTypes.banner = {
          sizes: [
            [BANNER_SIZE.width, BANNER_SIZE.height],
            [BANNER_SIZE.width * 2, BANNER_SIZE.height],
          ],
        };

        bidRequests = spec.buildRequests(bannerBidRequest.bids, bannerBidRequest);
        bidderResponse = MOCK.bidderResponse();
      });

      it('should return valid banner bids (HTML)', function () {
        bidderResponse.body.seatbid[0].bid[0].adm = BANNER_HTML;

        const bid = spec.interpretResponse(bidderResponse, bidRequests[0])[0];

        expect(bid.ad).to.exist;
        expect(bid.cpm).to.equal(PRICE);
        expect(bid.width).to.equal(BANNER_SIZE.width);
        expect(bid.height).to.equal(BANNER_SIZE.height);
        expect(bid.renderer).to.not.exist;
      });

      it('should return valid banner bids (VAST) with renderer', function () {
        bidderResponse.body.seatbid[0].bid[0].adm = BANNER_VAST;

        const bid = spec.interpretResponse(bidderResponse, bidRequests[0])[0];

        expect(bid.ad).to.exist;
        expect(bid.ad).to.not.have.string('${AUCTION_PRICE}');
        expect(bid.ad).to.have.string('cpm=' + PRICE);
        expect(bid.cpm).to.equal(PRICE);
        expect(bid.width).to.equal(BANNER_SIZE.width);
        expect(bid.height).to.equal(BANNER_SIZE.height);
        expect(bid.renderer.url).to.equal(CUSTOM_RENDERER_URL);
        expect(bid.renderer.config.AV_PUBLISHERID).to.equal(PUBLISHER_ID_1);
        expect(bid.renderer.config.AV_CHANNELID).to.equal(CHANNEL_ID_1);
        expect(bid.renderer.loaded).to.equal(false);
      });
    });
  });

  describe('getUserSyncs', function () {
    let bidRequest, bidderResponse;

    beforeEach(function() {
      const videoBidRequest = MOCK.bidRequest();

      bidRequest = spec.buildRequests(videoBidRequest.bids, videoBidRequest);
      bidderResponse = MOCK.bidderResponse();
    });

    it('should get syncs from response', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [bidderResponse]);

      expect(syncs).to.be.a('array').and.to.have.lengthOf(3);
    });

    it('should get only pixel syncs from response', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, [bidderResponse]);

      expect(syncs).to.be.a('array').and.to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
    });

    it('should return empty array of syncs if no syncs in response', function () {
      delete bidderResponse.body.ext.aniview.sync

      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, [bidderResponse]);

      expect(syncs).to.be.a('array').and.to.have.lengthOf(0);
    });

    it('should return empty array of syncs if no body in response', function () {
      delete bidderResponse.body

      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [bidderResponse]);

      expect(syncs).to.be.a('array').and.to.have.lengthOf(0);
    });
  });
});
