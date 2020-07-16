import * as utils from 'src/utils.js';
import { expect } from 'chai';
import { spec } from 'modules/performaxBidAdapter';

describe('PerformaxAdapter', function () {
  let bidRequests, bidderRequest;
  let serverResponse, serverRequest;

  const URL =
    'https://dale.performax.cz/hb?slotId[]=3,2&client=hellboy:v0.0.1&auctionId=144b5079-8cbf-49a5-aca7-a68b3296cd6c';

  bidRequests = [
    {
      adUnitCode: 'postbid_iframe',
      auctionId: '144b5079-8cbf-49a5-aca7-a68b3296cd6c',
      bidId: '2a4332f6b2bc74',
      bidRequestsCount: 1,
      bidder: 'performax',
      bidderRequestId: '1c7d8bf204f11e',
      bidderRequestsCount: 1,
      bidderWinsCount: 0,
      mediaTypes: {
        banner: {
          sizes: [[300, 300]],
        },
      },
      params: {
        slotId: 3,
      },
      sizes: [[300, 300]],
      src: 'client',
      transactionId: '14969d09-0068-4d5b-a34e-e35091561dee',
    },
    {
      adUnitCode: 'postbid_iframe2',
      auctionId: '144b5079-8cbf-49a5-aca7-a68b3296cd6c',
      bidId: '300bb0ac6a156a',
      bidRequestsCount: 1,
      bidder: 'performax',
      bidderRequestId: '1c7d8bf204f11e',
      bidderRequestsCount: 1,
      bidderWinsCount: 0,
      mediaTypes: {
        banner: {
          sizes: [[300, 300]],
        },
      },
      params: {
        slotId: 2,
      },
      sizes: [[300, 300]],
      src: 'client',
      transactionId: '107cbebd-8c36-4456-b28c-91a19ba80151',
    },
  ];

  bidderRequest = {
    auctionId: '144b5079-8cbf-49a5-aca7-a68b3296cd6c',
    auctionStart: 1594281941845,
    bidderCode: 'performax',
    bidderRequestId: '1c7d8bf204f11e',
    bids: bidRequests,
    refererInfo: {
      canonicalUrl: '',
      numIframes: 0,
      reachedTop: true,
      referer: '',
    },
    stack: [''],
    start: 1594281941935,
    timeout: 3600,
  };

  serverResponse = {
    body: [
      {
        ad: {
          code: '$SYS_ID$ $VAR_NAME$ rest of the code',
          data: {
            SYS_ID: 1,
            VAR_NAME: 'name',
          },
          format_id: 2,
          id: 11,
          size: {
            width: 300,
            height: 300,
          },
          tag_ids: [],
          type: 'creative',
        },
        cpm: 30,
        creativeId: 'creative:11',
        currency: 'CZK',
        height: 300,
        meta: {
          agencyId: 1,
          mediaType: 'banner',
        },
        netRevenue: true,
        requestId: '2a4332f6b2bc74',
        ttl: 60,
        width: 300,
      },
      {
        ad: {
          code: '<!-- px empty -->',
          reason: 'Slot 2 does not allow HB requests',
          type: 'empty',
        },
        cpm: 0,
        creativeId: null,
        currency: 'CZK',
        height: null,
        meta: {
          agencyId: null,
          mediaType: 'banner',
        },
        netRevenue: true,
        requestId: '1c7d8bf204f11e',
        ttl: 60,
        width: 300,
      },
    ],
  };

  serverRequest = {
    data: {
      bidderRequest: bidderRequest,
      validBidRequests: bidRequests,
    },
    method: 'POST',
    options: {
      contentType: 'application/json',
    },
    url: URL,
  };

  describe('Bid validations', function () {
    it('Valid bid', function () {
      let validBid = {
          bidder: 'performax',
          params: {
            slotId: 2,
          },
        },
        isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(true);
    });

    it('Invalid bid: required param is missing', function () {
      let invalidBid = {
          bidder: 'performax',
          params: {
            invalidParam: 2,
          },
        },
        isValid = spec.isBidRequestValid(invalidBid);
      expect(isValid).to.equal(false);
    });
  });

  describe('Build Url', function () {
    it('Should return url', function () {
      let url = spec.buildUrl(bidRequests, bidderRequest);
      expect(url).to.equal(URL);
    });
  });

  describe('Build Request', function () {
    it('Should not modify bidRequests and bidder Requests', function () {
      let originalBidRequests = utils.deepClone(bidRequests);
      let originalBidderRequest = utils.deepClone(bidderRequest);
      let request = spec.buildRequests(bidRequests, bidderRequest);

      expect(bidRequests).to.deep.equal(originalBidRequests);
      expect(bidderRequest).to.deep.equal(originalBidderRequest);
    });

    it('Endpoint checking', function () {
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.equal(URL);
      expect(request.method).to.equal('POST');
      expect(request.options).to.deep.equal({
        contentType: 'application/json',
      });
    });

    it('Request params checking', function () {
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.validBidRequests).to.deep.equal(bidRequests);
      expect(request.data.bidderRequest).to.deep.equal(bidderRequest);
    });
  });

  describe('Build Html', function () {
    it('Ad with data: should return build html', function () {
      let validAd = {
        code: '$SYS_ID$ $VAR_NAME$ rest of the code',
        data: {
          SYS_ID: 1,
          VAR_NAME: 'name',
        },
        format_id: 2,
        id: 11,
        size: {
          width: 300,
          height: 300,
        },
        tag_ids: [],
        type: 'creative',
      };
      let html = spec.buildHtml(validAd);
      expect(html).to.equal('1 name rest of the code');
    });

    it('Ad with partial data: should return html without data change', function () {
      let adWithPartialData = {
        code: '$SYS_ID$ $VAR_NAME$ rest of the code',
        data: {
          VAR_NAME: 'name',
        },
        format_id: 2,
        id: 11,
        size: {
          width: 300,
          height: 300,
        },
        tag_ids: [],
        type: 'creative',
      };
      let html = spec.buildHtml(adWithPartialData);
      expect(html).to.equal('$SYS_ID$ name rest of the code');
    });

    it('Ad without data: should return html without data change', function () {
      let adWithoutData = {
        code: '$SYS_ID$ $VAR_NAME$ rest of the code',
        format_id: 2,
        id: 11,
        size: {
          width: 300,
          height: 300,
        },
        tag_ids: [],
        type: 'creative',
      };
      let html = spec.buildHtml(adWithoutData);
      expect(html).to.equal('$SYS_ID$ $VAR_NAME$ rest of the code');
    });
  });

  describe('Interpret Response', function () {
    it('Ad without data: should return html without data change', function () {
      let ads = spec.interpretResponse(serverResponse, serverRequest);
      expect(ads).to.have.length(1);
      expect(ads[0]).to.deep.equal({
        ad: '1 name rest of the code',
        cpm: 30,
        creativeId: 'creative:11',
        currency: 'CZK',
        height: 300,
        meta: {
          agencyId: 1,
          mediaType: 'banner',
        },
        netRevenue: true,
        requestId: '2a4332f6b2bc74',
        ttl: 60,
        width: 300,
      });
    });
  });
});
