import { expect } from 'chai';
import { spec } from 'modules/mediasniperBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';
import { BANNER } from '../../../src/mediaTypes.js';

const DEFAULT_CURRENCY = 'RUB';
const DEFAULT_BID_TTL = 360;

describe('mediasniperBidAdapter', function () {
  const adapter = newBidder(spec);
  let utilsMock;
  let sandbox;

  const bid = {
    bidder: 'mediasniper',
    params: { siteid: 'testSiteID', placementId: '12345' },
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 600],
        ],
      },
    },
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    transactionId: '47789656-9e5c-4250-b7e0-2ce4cbe71a55',
    sizes: [
      [300, 250],
      [300, 600],
    ],
    bidId: '299320f4de980d',
    bidderRequestId: '1c1b642f803242',
    auctionId: '84212956-c377-40e8-b000-9885a06dc692',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0,
  };

  const bidderRequest = {
    bidderCode: 'mediasniper',
    auctionId: '84212956-c377-40e8-b000-9885a06dc692',
    bidderRequestId: '1c1b642f803242',
    bids: [bid],
    auctionStart: 1620973766319,
    timeout: 1000,
    refererInfo: {
      referer:
        'https://local.url/integrationExamples/gpt/hello_world.html?pbjs_debug=true',
      reachedTop: true,
      isAmp: false,
      numIframes: 0,
      stack: [
        'https://local.url/integrationExamples/gpt/hello_world.html?pbjs_debug=true',
      ],
      canonicalUrl: null,
    },
    start: 1620973766325,
  };

  beforeEach(function () {
    utilsMock = sinon.mock(utils);
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    utilsMock.restore();
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    it('should returns true when bid is provided with params', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should returns false when bid is provided with empty params', function () {
      const noParamsBid = {
        bidder: 'mediasniper',
        params: {},
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600],
            ],
          },
        },
        adUnitCode: 'div-gpt-ad-1460505748561-0',
        transactionId: '47789656-9e5c-4250-b7e0-2ce4cbe71a55',
        sizes: [
          [300, 250],
          [300, 600],
        ],
        bidId: '299320f4de980d',
      };

      expect(spec.isBidRequestValid(noParamsBid)).to.equal(false);
    });

    it('should returns false when bid is falsy or empty', function () {
      const emptyBid = {};
      expect(spec.isBidRequestValid()).to.equal(false);
      expect(spec.isBidRequestValid(false)).to.equal(false);
      expect(spec.isBidRequestValid(emptyBid)).to.equal(false);
    });

    it('should return false when no sizes', function () {
      const bannerNoSizeBid = {
        bidder: 'mediasniper',
        params: { placementId: '123' },
        mediaTypes: {
          banner: {},
        },
      };

      expect(spec.isBidRequestValid(bannerNoSizeBid)).to.equal(false);
    });

    it('should return false when empty sizes', function () {
      const bannerEmptySizeBid = {
        bidder: 'mediasniper',
        params: { placementId: '123' },
        mediaTypes: {
          banner: { sizes: [] },
        },
      };

      expect(spec.isBidRequestValid(bannerEmptySizeBid)).to.equal(false);
    });

    it('should return false when mediaType is not supported', function () {
      const bannerVideoBid = {
        bidder: 'mediasniper',
        params: { placementId: '123' },
        mediaTypes: {
          video: {},
        },
      };

      expect(spec.isBidRequestValid(bannerVideoBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should create imp for supported mediaType only', function () {
      const bidRequests = [utils.deepClone(bid)];
      const bidderRequestCopy = utils.deepClone(bidderRequest);

      bidderRequestCopy.bids = bidRequests[0];

      const request = spec.buildRequests(bidRequests, bidderRequestCopy);
      const data = JSON.parse(request.data);

      expect(data.imp.length).to.equal(1);
      expect(data.imp[0].banner).to.exist;
    });

    it('should fill pmp only if dealid exists', function () {
      const bidRequests = [utils.deepClone(bid)];
      const bidderRequestCopy = utils.deepClone(bidderRequest);

      bidRequests[0].params.dealid = '123';

      const request = spec.buildRequests(bidRequests, bidderRequestCopy);
      const data = JSON.parse(request.data);

      expect(data.imp.length).to.equal(1);
      expect(data.imp[0].pmp).to.exist;
      expect(data.imp[0].pmp.deals).to.exist;
      expect(data.imp[0].pmp.deals.length).to.equal(1);
      expect(data.imp[0].pmp.deals[0].id).to.equal(
        bidRequests[0].params.dealid
      );
    });

    it('should fill site only if referer exists', function () {
      const bidRequests = [utils.deepClone(bid)];
      const bidderRequestCopy = utils.deepClone(bidderRequest);

      bidderRequestCopy.refererInfo = {};

      const request = spec.buildRequests(bidRequests, bidderRequestCopy);
      const data = JSON.parse(request.data);

      expect(data.site.domain).to.not.exist;
      expect(data.site.page).to.not.exist;
      expect(data.site.ref).to.not.exist;
    });

    it('should fill site only if referer exists', function () {
      const bidRequests = [utils.deepClone(bid)];
      const bidderRequestCopy = utils.deepClone(bidderRequest);

      bidderRequestCopy.refererInfo = null;

      const request = spec.buildRequests(bidRequests, bidderRequestCopy);
      const data = JSON.parse(request.data);

      expect(data.site.domain).to.not.exist;
      expect(data.site.page).to.not.exist;
      expect(data.site.ref).to.not.exist;
    });

    it('should get expected properties with default values (no params set)', function () {
      const bidRequests = [utils.deepClone(bid)];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const data = JSON.parse(request.data);

      // openRTB 2.5
      expect(data.cur[0]).to.equal(DEFAULT_CURRENCY);
      expect(data.id).to.equal(bidderRequest.auctionId);

      expect(data.imp.length).to.equal(1);
      expect(data.imp[0].id).to.equal(bidRequests[0].bidId);
      expect(data.imp[0].banner.w).to.equal(300);
      expect(data.imp[0].banner.h).to.equal(250);
      expect(data.imp[0].banner.format[0].w).to.equal(300);
      expect(data.imp[0].banner.format[0].h).to.equal(250);
      expect(data.imp[0].banner.format[1].w).to.equal(300);
      expect(data.imp[0].banner.format[1].h).to.equal(600);
      expect(data.imp[0].banner.topframe).to.equal(0);
      expect(data.imp[0].banner.pos).to.equal(0);
    });

    it('should get expected properties with values from params', function () {
      const bidRequests = [utils.deepClone(bid)];
      bidRequests[0].params = {
        pos: 2,
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.imp[0].banner.pos).to.equal(2);
    });

    describe('PriceFloors module support', function () {
      it('should not set `imp[]bidfloor` property when priceFloors module is not available', function () {
        const bidRequests = [bid];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const data = JSON.parse(request.data);
        expect(data.imp[0].banner).to.exist;
        expect(data.imp[0].bidfloor).to.not.exist;
      });

      it('should not set `imp[]bidfloor` property when priceFloors module returns false', function () {
        const bidWithPriceFloors = utils.deepClone(bid);

        bidWithPriceFloors.getFloor = () => {
          return false;
        };

        const bidRequests = [bidWithPriceFloors];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const data = JSON.parse(request.data);

        expect(data.imp[0].banner).to.exist;
        expect(data.imp[0].bidfloor).to.not.exist;
      });

      it('should get the highest floorPrice found when bid have several mediaTypes', function () {
        const getFloorTest = (options) => {
          switch (options.mediaType) {
            case BANNER:
              return { floor: 1, currency: DEFAULT_CURRENCY };
            default:
              return false;
          }
        };

        const bidWithPriceFloors = utils.deepClone(bid);

        bidWithPriceFloors.mediaTypes.video = {
          playerSize: [600, 480],
        };

        bidWithPriceFloors.getFloor = getFloorTest;

        const bidRequests = [bidWithPriceFloors];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const data = JSON.parse(request.data);

        expect(data.imp[0].banner).to.exist;
        expect(data.imp[0].bidfloor).to.equal(1);
      });
    });
  });

  describe('intrepretResponse', function () {
    const rawServerResponse = {
      body: {
        id: '60839f99-d5f2-3ab3-b6ac-736b4fe9d0ae',
        seatbid: [
          {
            bid: [
              {
                id: '60839f99-d5f2-3ab3-b6ac-736b4fe9d0ae_0_0',
                impid: '1',
                price: 58.01,
                adid: 'string-id',
                cid: 'string-id',
                crid: 'string-id',
                nurl: 'https://local.url/notif?index=ab-cd-ef&price=${AUCTION_PRICE}',
                w: 300,
                h: 250,
                adomain: ['domain.io'],
                adm: '<iframe src="https://local.url"></iframe>',
              },
            ],
            seat: '',
          },
        ],
        cur: DEFAULT_CURRENCY,
        ext: { protocol: '5.3' },
      },
    };

    it('Returns empty array if no bid', function () {
      const request = '';
      const response01 = spec.interpretResponse(
        { body: { seatbid: [{ bid: [] }] } },
        request
      );
      const response02 = spec.interpretResponse(
        { body: { seatbid: [] } },
        request
      );
      const response03 = spec.interpretResponse(
        { body: { seatbid: null } },
        request
      );
      const response04 = spec.interpretResponse(
        { body: { seatbid: null } },
        request
      );
      const response05 = spec.interpretResponse({ body: {} }, request);
      const response06 = spec.interpretResponse({}, request);

      expect(response01.length).to.equal(0);
      expect(response02.length).to.equal(0);
      expect(response03.length).to.equal(0);
      expect(response04.length).to.equal(0);
      expect(response05.length).to.equal(0);
      expect(response06.length).to.equal(0);
    });

    it('Log an error', function () {
      const request = '';
      sinon.stub(utils, 'isArray').throws();
      utilsMock.expects('logError').once();
      spec.interpretResponse(rawServerResponse, request);
      utils.isArray.restore();
    });

    describe('Build banner response', function () {
      it('Retrurn successful response', function () {
        const request = '';
        const response = spec.interpretResponse(rawServerResponse, request);

        expect(response.length).to.equal(1);
        expect(response[0].requestId).to.equal(
          rawServerResponse.body.seatbid[0].bid[0].impid
        );
        expect(response[0].cpm).to.equal(
          rawServerResponse.body.seatbid[0].bid[0].price
        );
        expect(response[0].width).to.equal(
          rawServerResponse.body.seatbid[0].bid[0].w
        );
        expect(response[0].height).to.equal(
          rawServerResponse.body.seatbid[0].bid[0].h
        );
        expect(response[0].creativeId).to.equal(
          rawServerResponse.body.seatbid[0].bid[0].crid
        );
        expect(response[0].dealId).to.equal(null);
        expect(response[0].currency).to.equal(rawServerResponse.body.cur);
        expect(response[0].netRevenue).to.equal(true);
        expect(response[0].ttl).to.equal(DEFAULT_BID_TTL);
        expect(response[0].ad).to.equal(
          rawServerResponse.body.seatbid[0].bid[0].adm
        );
        expect(response[0].mediaType).to.equal(BANNER);
        expect(response[0].burl).to.equal(
          rawServerResponse.body.seatbid[0].bid[0].nurl
        );
        expect(response[0].meta).to.deep.equal({
          advertiserDomains: rawServerResponse.body.seatbid[0].bid[0].adomain,
          mediaType: BANNER,
        });
      });

      it('shoud use adid if no crid', function () {
        const raw = {
          body: {
            seatbid: [
              {
                bid: [
                  {
                    adid: 'string-id',
                  },
                ],
              },
            ],
          },
        };
        const response = spec.interpretResponse(raw, '');

        expect(response[0].creativeId).to.equal(
          raw.body.seatbid[0].bid[0].adid
        );
      });

      it('shoud use id if no crid or adid', function () {
        const raw = {
          body: {
            seatbid: [
              {
                bid: [
                  {
                    id: '60839f99-d5f2-3ab3-b6ac-736b4fe9d0ae_0_0',
                  },
                ],
              },
            ],
          },
        };
        const response = spec.interpretResponse(raw, '');

        expect(response[0].creativeId).to.equal(raw.body.seatbid[0].bid[0].id);
      });

      it('shoud use 0 if no cpm', function () {
        const raw = {
          body: {
            seatbid: [
              {
                bid: [{}],
              },
            ],
          },
        };
        const response = spec.interpretResponse(raw, '');

        expect(response[0].cpm).to.equal(0);
      });

      it('shoud use dealid if exists', function () {
        const raw = {
          body: {
            seatbid: [
              {
                bid: [{ dealid: '123' }],
              },
            ],
          },
        };
        const response = spec.interpretResponse(raw, '');

        expect(response[0].dealId).to.equal(raw.body.seatbid[0].bid[0].dealid);
      });

      it('shoud use DEFAUL_CURRENCY if no cur', function () {
        const raw = {
          body: {
            seatbid: [
              {
                bid: [{}],
              },
            ],
          },
        };
        const response = spec.interpretResponse(raw, '');

        expect(response[0].currency).to.equal(DEFAULT_CURRENCY);
      });
    });
  });

  describe('onBidWon', function () {
    beforeEach(function () {
      sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      utils.triggerPixel.restore();
    });

    it('Should not trigger pixel if bid does not contain burl', function () {
      const result = spec.onBidWon({});
      expect(result).to.be.undefined;
      expect(utils.triggerPixel.callCount).to.equal(0);
    });

    it('Should trigger pixel if bid.burl exists', function () {
      const result = spec.onBidWon({
        cpm: 4.2,
        burl: 'https://example.com/p=${AUCTION_PRICE}&foo=bar',
      });

      expect(utils.triggerPixel.callCount).to.equal(1);
      expect(utils.triggerPixel.firstCall.args[0]).to.be.equal(
        'https://example.com/p=4.2&foo=bar'
      );
    });
  });
});
