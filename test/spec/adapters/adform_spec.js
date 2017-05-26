// jshint esversion: 6

import { assert } from 'chai';
import * as utils from '../../../src/utils';
import adLoader from '../../../src/adloader';
import bidManager from '../../../src/bidmanager';
import adapter from '../../../src/adapters/adform';

describe('Adform adapter', () => {
  let _adapter, sandbox;

  describe('request', () => {
    it('should create callback method on PREBID_GLOBAL', () => {
      assert.typeOf($$PREBID_GLOBAL$$._adf_callback, 'function');
    });

    it('should pass multiple bids via single request', () => {
      const _request = adLoader.loadScript;

      assert(_request.calledOnce);
      assert.lengthOf(_request.args[0], 1);
      assert.lengthOf(parseUrl(_request.args[0][0]).items, 3);
    });

    it('should handle global request parameters', () => {
      const _request = parseUrl(adLoader.loadScript.args[0][0]);
      const _query = _request.query;

      assert.equal(_request.path, '//newdomain/adx');
      assert.equal(_query.callback.split('.')[1], '_adf_callback');
      assert.equal(_query.tid, 145);
      assert.equal(_query.rp, 4);
      assert.equal(_query.url, encodeURIComponent('some// there'));
    });

    it('should correctly form bid items', () => {
      const _items = parseUrl(adLoader.loadScript.args[0][0]).items;

      assert.deepEqual(_items[0], { mid: '1' });
      assert.deepEqual(_items[1], { mid: '2', someVar: 'someValue' });
      assert.deepEqual(_items[2], { mid: '3', pdom: 'home' });
    });
  });

  describe('response callback', () => {
    it('should create bid response item for every requested item', () => {
      assert(bidManager.addBidResponse.calledThrice);
    });

    it('should correctly form bid response object', () => {
      const _bid = bidManager.addBidResponse.firstCall.args;
      const _bidObject = _bid[1];

      assert.equal(_bid[0], 'code-1');
      assert.equal(_bidObject.statusMessage, 'Bid available');
      assert.equal(_bidObject.bidderCode, 'adform');
      assert.equal(_bidObject.cpm, 1.1);
      assert.equal(_bidObject.cur, 'EUR');
      assert.equal(_bidObject.ad, '<tag>');
      assert.equal(_bidObject.width, 90);
      assert.equal(_bidObject.height, 90);
      assert.equal(_bidObject.dealId, 'deal-1');
    });

    it('should correctly form empty bid response object', () => {
      const _bid = bidManager.addBidResponse.secondCall.args;
      const _bidObject = _bid[1];

      assert.equal(_bid[0], 'code-2');
      assert.equal(_bidObject.statusMessage, 'Bid returned empty or error response');
      assert.equal(_bidObject.bidderCode, 'adform');
    });

    it('should filter out item which does not fit required size', () => {
      const _bid = bidManager.addBidResponse.thirdCall.args;
      const _bidObject = _bid[1];

      assert.equal(_bid[0], 'code-3');
      assert.equal(_bidObject.statusMessage, 'Bid returned empty or error response');
      assert.equal(_bidObject.bidderCode, 'adform');
    });

    it('should correctly set bid response adId', () => {
      const addResponse = bidManager.addBidResponse;
      assert.equal('abc', addResponse.getCall(0).args[1].adId);
      assert.equal('123', addResponse.getCall(1).args[1].adId);
      assert.equal('a1b', addResponse.getCall(2).args[1].adId);
    });

    beforeEach(() => {
      sandbox.stub(bidManager, 'addBidResponse');
      $$PREBID_GLOBAL$$._adf_callback([
        {
          response: 'banner',
          width: 90,
          height: 90,
          banner: '<tag>',
          win_bid: 1.1,
          win_cur: 'EUR',
          deal_id: 'deal-1'
        },
        {},
        {
          response: 'banner',
          width: 50,
          height: 50,
          banner: '<tag>'
        }
      ]);
    });
  });

  beforeEach(() => {
    _adapter = adapter();
    utils.getUniqueIdentifierStr = () => 'callback';
    sandbox = sinon.sandbox.create();
    sandbox.stub(adLoader, 'loadScript');
    _adapter.callBids({
      bids: [
        {
          bidId: 'abc',
          placementCode: 'code-1',
          sizes: [ [ 100, 100], [ 90, 90 ] ],
          params: {
            mid: 1,
            url: 'some// there'
          },
          adxDomain: 'newdomain',
          tid: 45
        },
        {
          bidId: '123',
          placementCode: 'code-2',
          sizes: [ [ 100, 100] ],
          params: {
            mid: 2,
            tid: 145,
            someVar: 'someValue'
          }
        },
        {
          bidId: 'a1b',
          placementCode: 'code-3',
          sizes: [ [ 50, 40], [ 40, 50 ] ],
          params: {
            mid: 3,
            pdom: 'home'
          }
        }
      ]});
  });

  afterEach(() => {
    sandbox.restore();
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
