import {assert} from 'chai';
import {spec} from 'modules/mediaforceBidAdapter.js';
import * as utils from '../../../src/utils.js';

describe('mediaforce bid adapter', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  function getLanguage() {
    let language = navigator.language ? 'language' : 'userLanguage';
    return navigator[language].split('-')[0];
  }

  const language = getLanguage();
  const baseUrl = 'https://rtb.mfadsrvr.com'

  describe('isBidRequestValid()', function () {
    const defaultBid = {
      bidder: 'mediaforce',
      params: {
        property: '10433394',
        bidfloor: 0.3,
      },
    };

    it('should not accept bid without required params', function () {
      assert.equal(spec.isBidRequestValid(defaultBid), false);
    });

    it('should return false when params are not passed', function () {
      let bid = utils.deepClone(defaultBid);
      delete bid.params;
      assert.equal(spec.isBidRequestValid(bid), false);
    });

    it('should return false when valid params are not passed', function () {
      let bid = utils.deepClone(defaultBid);
      bid.params = {placement_id: '', publisher_id: ''};
      assert.equal(spec.isBidRequestValid(bid), false);
    });

    it('should return true when valid params are passed', function () {
      let bid = utils.deepClone(defaultBid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      bid.params = {publisher_id: 2, placement_id: '123'};
      assert.equal(spec.isBidRequestValid(bid), true);
    });

    it('should return false when mediaTypes == native passed (native is not supported yet)', function () {
      let bid = utils.deepClone(defaultBid);
      bid.mediaTypes = {
        native: {
          sizes: [[300, 250]]
        }
      };
      bid.params = {publisher_id: 2, placement_id: '123'};
      assert.equal(spec.isBidRequestValid(bid), true);
    });
  });

  describe('buildRequests()', function () {
    const defaultBid = {
      bidder: 'mediaforce',
      params: {
        publisher_id: 'pub123',
        placement_id: '202',
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b',
    };

    const refererInfo = {
      referer: 'https://www.prebid.org',
      reachedTop: true,
      stack: [
        'https://www.prebid.org/page.html',
        'https://www.prebid.org/iframe1.html',
      ]
    };

    const requestUrl = `${baseUrl}/header_bid`;
    const dnt = utils.getDNT() ? 1 : 0;
    const secure = 1

    it('should return undefined if no validBidRequests passed', function () {
      assert.equal(spec.buildRequests([]), undefined);
    });

    it('should return proper request url: no refererInfo', function () {
      let [request] = spec.buildRequests([defaultBid]);
      assert.equal(request.url, requestUrl);
    });

    it('should return proper banner imp', function () {
      let bid = utils.deepClone(defaultBid);
      bid.params.bidfloor = 0.5;

      let bidRequests = [bid];
      let bidderRequest = {bids: bidRequests, refererInfo: refererInfo};

      let [request] = spec.buildRequests(bidRequests, bidderRequest);

      let data = JSON.parse(request.data);
      assert.deepEqual(data, {
        id: bid.transactionId,
        site: {
          id: bid.params.publisher_id,
          publisher: {id: bid.params.publisher_id},
          ref: encodeURIComponent(refererInfo.referer),
          page: encodeURIComponent(refererInfo.referer),
        },
        device: {
          ua: navigator.userAgent,
          dnt: dnt,
          js: 1,
          language: language,
        },
        imp: [{
          tagid: bid.params.placement_id,
          secure: secure,
          bidfloor: bid.params.bidfloor,
          banner: {w: 300, h: 250},
        }],
      });

      assert.deepEqual(request, {
        method: 'POST',
        url: requestUrl,
        data: '{"id":"d45dd707-a418-42ec-b8a7-b70a6c6fab0b","site":{"page":"https%3A%2F%2Fwww.prebid.org","ref":"https%3A%2F%2Fwww.prebid.org","id":"pub123","publisher":{"id":"pub123"}},"device":{"ua":"' + navigator.userAgent + '","js":1,"dnt":' + dnt + ',"language":"' + language + '"},"imp":[{"tagid":"202","secure":1,"bidfloor":0.5,"banner":{"w":300,"h":250}}]}',
      });
    });

    it('multiple sizes', function () {
      let bid = utils.deepClone(defaultBid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 600], [300, 250]],
        }
      };

      let [request] = spec.buildRequests([bid]);
      let data = JSON.parse(request.data);
      assert.deepEqual(data.imp[0].banner, {w: 300, h: 600, format: [{w: 300, h: 250}]});
    });
  });

  describe('interpretResponse() banner', function () {
    it('not successfull response', function () {
      assert.deepEqual(spec.interpretResponse(), []);
    });

    it('successfull response', function () {
      let bid = {
        price: 3,
        w: 100,
        id: '65599d0a-42d2-446a-9d39-6086c1433ffe',
        burl: `${baseUrl}/burl/\${AUCTION_PRICE}`,
        cid: '2_ssl',
        h: 100,
        cat: ['IAB1-1'],
        crid: '2_ssl',
        impid: '2b3c9d103723a7',
        adid: '2_ssl',
        adm: `<a href="${baseUrl}/click2/"><img width=100 height=100 src="${baseUrl}/image2"></a>`
      };

      let response = {
        body: {
          seatbid: [{
            bid: [bid]
          }],
          cur: 'USD',
          id: '620190c2-7eef-42fa-91e2-f5c7fbc2bdd3'
        }
      };

      let bids = spec.interpretResponse(response);
      assert.deepEqual(bids, ([{
        ad: bid.adm,
        cpm: bid.price,
        creativeId: bid.adid,
        currency: response.body.cur,
        height: bid.h,
        netRevenue: true,
        burl: bid.burl,
        requestId: bid.impid,
        ttl: 300,
        width: bid.w,
      }]));
    });
  });

  describe('onBidWon()', function () {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });
    it('should expand price macros in burl', function () {
      let burl = 'burl&s=${AUCTION_PRICE}';
      let bid = {
        bidder: 'mediaforce',
        width: 300,
        height: 250,
        adId: '330a22bdea4cac',
        mediaType: 'banner',
        cpm: 0.28,
        ad: '...',
        requestId: '418b37f85e772c',
        adUnitCode: 'div-gpt-ad-1460505748561-0',
        size: '350x250',
        burl: burl,
        adserverTargeting: {
          hb_bidder: 'mediaforce',
          hb_adid: '330a22bdea4cac',
          hb_pb: '0.20',
          hb_size: '350x250'
        }
      }
      spec.onBidWon(bid);
      assert.equal(bid.burl, 'burl&s=0.20');
    });
  });
});
