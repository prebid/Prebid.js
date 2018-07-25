import {assert, expect} from 'chai';
import * as url from 'src/url';
import {spec} from 'modules/etargetBidAdapter';
import { BANNER, VIDEO } from 'src/mediaTypes';

describe('etarget adapter', () => {
  let serverResponse, bidRequest, bidResponses;
  let bids = [];
  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'etarget',
      'params': {
        'refid': '55410',
        'country': '1'
      }
    };

    it('should return true when required params found', () => {
      assert(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequests', () => {
    it('should pass multiple bids via single request', () => {
      let request = spec.buildRequests(bids);
      let parsedUrl = parseUrl(request.url);
      assert.lengthOf(parsedUrl.items, 7);
    });

    it('should handle global request parameters', () => {
      let parsedUrl = parseUrl(spec.buildRequests([bids[0]]).url);
      let query = parsedUrl.query;

      assert.equal(parsedUrl.path, '//sk.search.etargetnet.com/hb');
      assert.equal(query.stid, '7aefb970-2045');
      assert.equal(query.url, encodeURIComponent('some// there'));
    });

    it('should set correct request method', () => {
      let request = spec.buildRequests([bids[0]]);
      assert.equal(request.method, 'POST');
    });

    it('should correctly form bid items', () => {
      let bidList = bids;
      let request = spec.buildRequests(bidList);
      let parsedUrl = parseUrl(request.url);
      assert.deepEqual(parsedUrl.items, [
        {
          refid: '1',
          country: '1',
          transactionId: '5f33781f-9552-4ca1'
        },
        {
          refid: '2',
          country: '1',
          someVar: 'someValue',
          pt: 'gross',
          transactionId: '5f33781f-9552-4iuy'
        },
        {
          refid: '3',
          country: '1',
          pdom: 'home',
          transactionId: '5f33781f-9552-7ev3'
        },
        {
          refid: '3',
          country: '1',
          pdom: 'home',
          transactionId: '5f33781f-9552-7ev3'
        },
        {
          refid: '3',
          country: '1',
          pdom: 'home',
          transactionId: '5f33781f-9552-7ev3'
        },
        {
          refid: '5',
          country: '1',
          pt: 'net',
          transactionId: '5f33781f-9552-7ev3',
        },
        {
          refid: '6',
          country: '1',
          pt: 'gross',
          transactionId: '5f33781f-9552-7ev3'
        }
      ]);
    });

    it('should not change original validBidRequests object', () => {
      var resultBids = JSON.parse(JSON.stringify(bids[0]));
      let request = spec.buildRequests([bids[0]]);
      assert.deepEqual(resultBids, bids[0]);
    });

    it('should set gross to the request, if there is any gross priceType', () => {
      let request = spec.buildRequests([bids[5], bids[5]]);
      let parsedUrl = parseUrl(request.url);

      assert.equal(parsedUrl.query.pt, 'net');

      request = spec.buildRequests([bids[4], bids[3]]);
      parsedUrl = parseUrl(request.url);

      assert.equal(parsedUrl.query.pt, 'gross');
    });

    describe('gdpr', () => {
      it('should send GDPR Consent data to etarget if gdprApplies', () => {
        let resultBids = JSON.parse(JSON.stringify(bids[0]));
        let request = spec.buildRequests([bids[0]], {gdprConsent: {gdprApplies: true, consentString: 'concentDataString'}});
        let parsedUrl = parseUrl(request.url).query;

        assert.equal(parsedUrl.gdpr, 'true');
        assert.equal(parsedUrl.gdpr_consent, 'concentDataString');
      });

      it('should not send GDPR Consent data to etarget if gdprApplies is false or undefined', () => {
        let resultBids = JSON.parse(JSON.stringify(bids[0]));
        let request = spec.buildRequests([bids[0]], {gdprConsent: {gdprApplies: false, consentString: 'concentDataString'}});
        let parsedUrl = parseUrl(request.url).query;

        assert.ok(!parsedUrl.gdpr);
        assert.ok(!parsedUrl.gdpr_consent);

        request = spec.buildRequests([bids[0]], {gdprConsent: {gdprApplies: undefined, consentString: 'concentDataString'}});
        assert.ok(!parsedUrl.gdpr);
        assert.ok(!parsedUrl.gdpr_consent);
      });

      it('should return GDPR Consent data with request data', () => {
        let request = spec.buildRequests([bids[0]], {gdprConsent: {gdprApplies: true, consentString: 'concentDataString'}});

        assert.deepEqual(request.gdpr, {
          gdpr: true,
          gdpr_consent: 'concentDataString'
        });

        request = spec.buildRequests([bids[0]]);
        assert.ok(!request.gdpr);
      });
    });
  });

  describe('interpretResponse', () => {
    it('should respond with empty response when there is empty serverResponse', () => {
      let result = spec.interpretResponse({ body: {} }, {});
      assert.deepEqual(result, []);
    });
    it('should respond with empty response when response from server is not banner', () => {
      serverResponse.body[0].response = 'not banner';
      serverResponse.body = [serverResponse.body[0]];
      bidRequest.bids = [bidRequest.bids[0]];
      let result = spec.interpretResponse(serverResponse, bidRequest);

      assert.deepEqual(result, []);
    });
    it('should interpret server response correctly with one bid', () => {
      serverResponse.body = [serverResponse.body[0]];
      bidRequest.bids = [bidRequest.bids[0]];
      let result = spec.interpretResponse(serverResponse, bidRequest)[0];

      assert.equal(result.requestId, '2a0cf4e');
      assert.equal(result.cpm, 13.9);
      assert.equal(result.width, 300);
      assert.equal(result.height, 250);
      assert.equal(result.creativeId, '2a0cf4e');
      assert.equal(result.dealId, '123abc');
      assert.equal(result.currency, 'EUR');
      assert.equal(result.netRevenue, true);
      assert.equal(result.ttl, 360);
      assert.equal(result.ad, '<tag1>');
      assert.equal(result.bidderCode, 'etarget');
      assert.equal(result.transactionId, '5f33781f-9552-4ca1');
    });

    it('should set correct netRevenue', () => {
      serverResponse.body = [serverResponse.body[0]];
      bidRequest.bids = [bidRequest.bids[1]];
      bidRequest.netRevenue = 'net';
      let result = spec.interpretResponse(serverResponse, bidRequest)[0];

      assert.equal(result.netRevenue, false);
    });

    it('should create bid response item for every requested item', () => {
      let result = spec.interpretResponse(serverResponse, bidRequest);
      assert.lengthOf(result, 5);
    });

    it('should create bid response with vast xml', () => {
      const result = spec.interpretResponse(serverResponse, bidRequest)[3];
      assert.equal(result.vastXml, '<vast_xml>');
    });

    it('should create bid response with vast url', () => {
      const result = spec.interpretResponse(serverResponse, bidRequest)[4];
      assert.equal(result.vastUrl, 'vast://url');
    });

    it('should set mediaType on bid response', () => {
      const expected = [ BANNER, BANNER, BANNER, VIDEO, VIDEO ];
      const result = spec.interpretResponse(serverResponse, bidRequest);
      for (let i = 0; i < result.length; i++) {
        assert.equal(result[i].mediaType, expected[i]);
      }
    });

    it('should set default netRevenue as gross', () => {
      bidRequest.netRevenue = 'gross';
      const result = spec.interpretResponse(serverResponse, bidRequest);
      for (let i = 0; i < result.length; i++) {
        assert.equal(result[i].netRevenue, false);
      }
    });

    it('should set gdpr if it exist in bidRequest', () => {
      bidRequest.gdpr = {
        gdpr: true,
        gdpr_consent: 'ERW342EIOWT34234KMGds'
      };
      let result = spec.interpretResponse(serverResponse, bidRequest);
      for (let i = 0; i < result.length; i++) {
        assert.equal(result[i].gdpr, true);
        assert.equal(result[i].gdpr_consent, 'ERW342EIOWT34234KMGds');
      };

      bidRequest.gdpr = undefined;
      result = spec.interpretResponse(serverResponse, bidRequest);
      for (let i = 0; i < result.length; i++) {
        assert.ok(!result[i].gdpr);
        assert.ok(!result[i].gdpr_consent);
      };
    });

    describe('verifySizes', () => {
      it('should respond with empty response when sizes doesn\'t match', () => {
        serverResponse.body[0].response = 'banner';
        serverResponse.body[0].width = 100;
        serverResponse.body[0].height = 150;

        serverResponse.body = [serverResponse.body[0]];
        bidRequest.bids = [bidRequest.bids[0]];
        let result = spec.interpretResponse(serverResponse, bidRequest);

        assert.equal(serverResponse.body.length, 1);
        assert.equal(serverResponse.body[0].response, 'banner');
        assert.deepEqual(result, []);
      });
      it('should respond with empty response when sizes as a strings doesn\'t match', () => {
        serverResponse.body[0].response = 'banner';
        serverResponse.body[0].width = 100;
        serverResponse.body[0].height = 150;

        serverResponse.body = [serverResponse.body[0]];
        bidRequest.bids = [bidRequest.bids[0]];

        bidRequest.bids[0].sizes = [['101', '150']];
        let result = spec.interpretResponse(serverResponse, bidRequest);

        assert.equal(serverResponse.body.length, 1);
        assert.equal(serverResponse.body[0].response, 'banner');
        assert.deepEqual(result, []);
      });
      it('should support size dimensions as a strings', () => {
        serverResponse.body[0].response = 'banner';
        serverResponse.body[0].width = 300;
        serverResponse.body[0].height = 600;

        serverResponse.body = [serverResponse.body[0]];
        bidRequest.bids = [bidRequest.bids[0]];

        bidRequest.bids[0].sizes = [['300', '250'], ['250', '300'], ['300', '600'], ['600', '300']]
        let result = spec.interpretResponse(serverResponse, bidRequest);

        assert.equal(result[0].width, 300);
        assert.equal(result[0].height, 600);
      });
    })
  });

  beforeEach(() => {
    let sizes = [[250, 300], [300, 250], [300, 600]];
    let placementCode = ['div-01', 'div-02', 'div-03', 'div-04', 'div-05'];
    let params = [{ refid: 1, country:1, url: 'some// there' }, {adxDomain: null, refid: 2, country:1, someVar: 'someValue', pt: 'gross'}, { adxDomain: null, refid: 3, country:1, pdom: 'home' }, {refid: 5, country:1, pt: 'net'}, {refid: 6, country:1, pt: 'gross'}];
    bids = [
      {
        adUnitCode: placementCode[0],
        auctionId: '7aefb970-2045',
        bidId: '2a0cf4e',
        bidder: 'etarget',
        bidderRequestId: '1ab8d9',
        params: params[0],
        adxDomain: 'newDomain',
        tid: 45,
        placementCode: placementCode[0],
        sizes: [[300, 250], [250, 300], [300, 600], [600, 300]],
        transactionId: '5f33781f-9552-4ca1'
      },
      {
        adUnitCode: placementCode[1],
        auctionId: '7aefb970-2045',
        bidId: '2a0cf5b',
        bidder: 'etarget',
        bidderRequestId: '1ab8d9',
        params: params[1],
        placementCode: placementCode[1],
        sizes: [[300, 250], [250, 300], [300, 600], [600, 300]],
        transactionId: '5f33781f-9552-4iuy'
      },
      {
        adUnitCode: placementCode[2],
        auctionId: '7aefb970-2045',
        bidId: '2a0cf6n',
        bidder: 'etarget',
        bidderRequestId: '1ab8d9',
        params: params[2],
        placementCode: placementCode[2],
        sizes: [[300, 250], [250, 300], [300, 600], [600, 300]],
        transactionId: '5f33781f-9552-7ev3'
      },
      {
        adUnitCode: placementCode[3],
        auctionId: '7aefb970-2045',
        bidId: '2a0cf6n',
        bidder: 'etarget',
        bidderRequestId: '1ab8d9',
        params: params[2],
        placementCode: placementCode[2],
        sizes: [],
        transactionId: '5f33781f-9552-7ev3'
      },
      {
        adUnitCode: placementCode[4],
        auctionId: '7aefb970-2045',
        bidId: '2a0cf6n',
        bidder: 'etarget',
        bidderRequestId: '1ab8d9',
        params: params[2],
        placementCode: placementCode[2],
        sizes: [],
        transactionId: '5f33781f-9552-7ev3'
      },
      {
        adUnitCode: placementCode[4],
        auctionId: '7aefb970-2045',
        bidId: '2a0cf6n',
        bidder: 'etarget',
        bidderRequestId: '1ab8d9',
        params: params[3],
        placementCode: placementCode[2],
        sizes: [],
        transactionId: '5f33781f-9552-7ev3'
      },
      {
        adUnitCode: placementCode[4],
        auctionId: '7aefb970-2045',
        bidId: '2a0cf6n',
        bidder: 'etarget',
        bidderRequestId: '1ab8d9',
        params: params[4],
        placementCode: placementCode[2],
        sizes: [],
        transactionId: '5f33781f-9552-7ev3'
      }
    ];
    serverResponse = {
      body: [
        {
          banner: '<tag1>',
          deal_id: '123abc',
          height: 250,
          response: 'banner',
          width: 300,
          win_bid: 13.9,
          win_cur: 'EUR'
        },
        {
          banner: '<tag2>',
          deal_id: '123abc',
          height: 300,
          response: 'banner',
          width: 250,
          win_bid: 13.9,
          win_cur: 'EUR'
        },
        {
          banner: '<tag3>',
          deal_id: '123abc',
          height: 300,
          response: 'banner',
          width: 600,
          win_bid: 10,
          win_cur: 'EUR'
        },
        {
          deal_id: '123abc',
          height: 300,
          response: 'vast_content',
          width: 600,
          win_bid: 10,
          win_cur: 'EUR',
          vast_content: '<vast_xml>'
        },
        {
          deal_id: '123abc',
          height: 300,
          response: 'vast_url',
          width: 600,
          win_bid: 10,
          win_cur: 'EUR',
          vast_url: 'vast://url'
        }
      ],
      headers: {}
    };
    bidRequest = {
      bidder: 'etarget',
      bids: bids,
      method: 'GET',
      url: 'url',
      netRevenue: 'net'
    };
  });
});

function parseUrl(url) {
  const parts = url.split('/');
  const query = parts.pop().split('&');
  return {
    path: parts.join('/'),
    items: query
      .filter((i) => !~i.indexOf('='))
      .map((i) => atob(decodeURIComponent(i))
        .split('&')
        .reduce(toObject, {})),
    query: query
      .filter((i) => ~i.indexOf('='))
      .map((i) => i.replace('?', ''))
      .reduce(toObject, {})
  };
}

function toObject(cache, string) {
  const keyValue = string.split('=');
  cache[keyValue[0]] = keyValue[1];
  return cache;
}
