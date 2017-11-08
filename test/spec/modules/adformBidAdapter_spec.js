import {assert, expect} from 'chai';
import * as url from 'src/url';
import {spec} from 'modules/adformBidAdapter';

describe('Adform adapter', () => {
  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'adform',
      'params': {
        'mid': '19910113'
      }
    };

    it('should return true when required params found', () => {
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when required params are missing', () => {
      bid.params = {
        adxDomain: 'adx.adform.net'
      };
      assert.isFalse(spec.isBidRequestValid(bid));
    })
  });

  describe('buildRequests', () => {
    let bids;
    beforeEach(() => {
      bids = [
        {
          'adUnitCode': 'div-gpt-ad-01',
          'bidId': '2a0cf4e',
          'bidder': 'adform',
          'bidderRequestId': '1ab8d9',
          'params': {
            'adxDomain': null,
            'mid': '123'
          },
          'placementCode': 'div-gpt-ad-01',
          'requestId': '7aefb970-2045',
          'sizes': [[300, 250], [250, 300], [300, 600]],
          'transactionId': '5f33781f-9552-4ca1'
        },
        {
          'adUnitCode': 'div-gpt-ad-01',
          'bidId': '2a0cf5b',
          'bidder': 'adform',
          'bidderRequestId': '1ab8d9',
          'params': {
            'adxDomain': null,
            'mid': '234'
          },
          'placementCode': 'div-gpt-ad-01',
          'requestId': '7aefb970-2045',
          'sizes': [[300, 250], [250, 300], [300, 600]],
          'transactionId': '5f33781f-9552-4iuy'
        },
        {
          'adUnitCode': 'div-gpt-ad-02',
          'bidId': '2a0cf6n',
          'bidder': 'adform',
          'bidderRequestId': '1ab8d9',
          'params': {
            'adxDomain': null,
            'mid': '345'
          },
          'placementCode': 'div-gpt-ad-01',
          'requestId': '7aefb970-2045',
          'sizes': [[300, 250], [250, 300], [300, 600]],
          'transactionId': '5f33781f-9552-7ev3'
        }
      ];
    });

    it('should create a valid adform request url', () => {
      let request = spec.buildRequests([bids[0]])[0];
      let parsedUrl = parseUrl(request.url);
      assert.ok(request);
      assert.equal(parsedUrl.path, '//adx.adform.net/adx');
      assert.deepEqual(parsedUrl.query, {rp: '4', fd: '1'});
    });
    it('should set correct request method', () => {
      let request = spec.buildRequests([bids[0]])[0];
      assert.equal(request.method, 'GET');
    });
    it('should pass correct items when there is one bid', () => {
      let request = spec.buildRequests([bids[0]])[0];
      let parsedUrl = parseUrl(request.url);

      assert.deepEqual(parsedUrl.items, [
        {
          mid: '123',
          transactionId: '5f33781f-9552-4ca1'
        }
      ]);
    })
    it('create a valid adform request url for more than one bids on one placement', () => {
      let bidList = [bids[0], bids[1]];
      let request = spec.buildRequests(bidList)[0];
      let parsedUrl = parseUrl(request.url);

      assert.deepEqual(parsedUrl.items, [
        {
          mid: '123',
          transactionId: '5f33781f-9552-4ca1'
        },
        {
          mid: '234',
          transactionId: '5f33781f-9552-4iuy'
        }
      ]);
    });
    it('create a valid adform request url for more than one bids on one placement', () => {
      let bidList = bids;
      let request = spec.buildRequests(bidList)[0];
      let parsedUrl = parseUrl(request.url);

      assert.deepEqual(parsedUrl.items, [
        {
          mid: '123',
          transactionId: '5f33781f-9552-4ca1'
        },
        {
          mid: '234',
          transactionId: '5f33781f-9552-4iuy'
        },
        {
          mid: '345',
          transactionId: '5f33781f-9552-7ev3'
        }
      ]);
    });
  });

  describe.only('interpretResponse', () => {
    let serverResponse, bidRequest, bidResponses;
    beforeEach(() => {
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
            win_bid: 13.9,
            win_cur: 'EUR'
          }
        ],
        headers: {}
      };
      bidRequest = {
        bidder: 'adform',
        bids: [
          {
            'adUnitCode': 'div-gpt-ad-01',
            'bidId': '2a0cf4e',
            'bidder': 'adform',
            'bidderRequestId': '1ab8d9',
            'params': {
              'adxDomain': null,
              'mid': '123'
            },
            'placementCode': 'div-gpt-ad-01',
            'requestId': '7aefb970-2045',
            'sizes': [[300, 250], [250, 300], [300, 600]],
            'transactionId': '5f33781f-9552-4ca1'
          },
          {
            'adUnitCode': 'div-gpt-ad-01',
            'bidId': '2a0cf5b',
            'bidder': 'adform',
            'bidderRequestId': '1ab8d9',
            'params': {
              'adxDomain': null,
              'mid': '234'
            },
            'placementCode': 'div-gpt-ad-01',
            'requestId': '7aefb970-2045',
            'sizes': [[300, 250], [250, 300], [300, 600]],
            'transactionId': '5f33781f-9552-4iuy'
          },
          {
            'adUnitCode': 'div-gpt-ad-02',
            'bidId': '2a0cf6n',
            'bidder': 'adform',
            'bidderRequestId': '1ab8d9',
            'params': {
              'adxDomain': null,
              'mid': '345'
            },
            'placementCode': 'div-gpt-ad-01',
            'requestId': '7aefb970-2045',
            'sizes': [[300, 250], [250, 300], [300, 600], [600, 300]],
            'transactionId': '5f33781f-9552-7ev3'
          }
        ],
        method: 'GET',
        url: 'url'
      };
      bidResponses = [
        {
          ad: '<tag1>',
          bidderCode: 'adform',
          cpm: 13.9,
          creativeId: '2a0cf4e',
          currency: 'EUR',
          dealId: '123abc',
          height: 250,
          netRevenue: true,
          requestId: '2a0cf4e',
          transactionId: '5f33781f-9552-4ca1',
          ttl: 3000,
          width: 300
        },
        {
          ad: '<tag2>',
          bidderCode: 'adform',
          cpm: 13.9,
          creativeId: '2a0cf5b',
          currency: 'EUR',
          dealId: '123abc',
          height: 300,
          netRevenue: true,
          requestId: '2a0cf5b',
          transactionId: '5f33781f-9552-4iuy',
          ttl: 3000,
          width: 250
        },
        {
          ad: '<tag3>',
          bidderCode: 'adform',
          cpm: 13.9,
          creativeId: '2a0cf6n',
          currency: 'EUR',
          dealId: '123abc',
          height: 300,
          netRevenue: true,
          requestId: '2a0cf6n',
          transactionId: '5f33781f-9552-7ev3',
          ttl: 3000,
          width: 600
        }
      ];
    })
    it('should respond with empty response when there is empty serverResponse', () => {
      let result = spec.interpretResponse({ body: {}}, {});
      assert.deepEqual(result, []);
    });
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
      bidResponses = [bidResponses[0]]
      let result = spec.interpretResponse(serverResponse, bidRequest);

      assert.deepEqual(result, bidResponses);
    });
    it('should interpret server response correctly with more than one bid on more than one placement', () => {
      let result = spec.interpretResponse(serverResponse, bidRequest);

      assert.deepEqual(result, bidResponses);
    });
  });
});

function parseUrl(url) {
  const parts = url.split('/');
  const query = parts.pop().split('&');
  return {
    path: parts.join('/'),
    items: query
      .filter((i) => !~i.indexOf('='))
      .map((i) => fromBase64(i)
        .split('&')
        .reduce(toObject, {})),
    query: query
      .filter((i) => ~i.indexOf('='))
      .map((i) => i.replace('?', ''))
      .reduce(toObject, {})
  };
}

function fromBase64(input) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'.split('');
  let bc = 0, bs, buffer, idx = 0, output = '';
  for (; buffer = input.charAt(idx++);
    ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
      bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
  ) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}

function toObject(cache, string) {
  const keyValue = string.split('=');
  cache[keyValue[0]] = keyValue[1];
  return cache;
}
