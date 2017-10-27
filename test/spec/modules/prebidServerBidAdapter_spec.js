import { expect } from 'chai';
import Adapter from 'modules/prebidServerBidAdapter';
import bidmanager from 'src/bidmanager';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';
import cookie from 'src/cookie';
import { userSync } from 'src/userSync';

let CONFIG = {
  accountId: '1',
  enabled: true,
  bidders: ['appnexus'],
  timeout: 1000,
  endpoint: CONSTANTS.S2S.DEFAULT_ENDPOINT
};

const REQUEST = {
  'account_id': '1',
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'max_bids': 1,
  'timeout_millis': 1000,
  'secure': 0,
  'url': '',
  'prebid_version': '0.30.0-pre',
  'ad_units': [
    {
      'code': 'div-gpt-ad-1460505748561-0',
      'sizes': [
        {
          'w': 300,
          'h': 250
        },
        {
          'w': 300,
          'h': 600
        }
      ],
      'transactionId': '4ef956ad-fd83-406d-bd35-e4bb786ab86c',
      'bids': [
        {
          'bid_id': '123',
          'bidder': 'appnexus',
          'params': {
            'placementId': '10433394',
            'member': 123
          }
        }
      ]
    }
  ]
};

const RESPONSE = {
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'status': 'OK',
  'bidder_status': [
    {
      'bidder': 'appnexus',
      'response_time_ms': 52,
      'num_bids': 1
    }
  ],
  'bids': [
    {
      'bid_id': '123',
      'code': 'div-gpt-ad-1460505748561-0',
      'creative_id': '29681110',
      'bidder': 'appnexus',
      'price': 0.5,
      'adm': '<script type="application/javascript" src="http://nym1-ib.adnxs.com/ab?e=wqT_3QL_Baj_AgAAAwDWAAUBCO-s38cFEJG-p6iRgOfvdhivtLWVpomhsWUgASotCQAAAQII4D8RAQc0AADgPxkAAACA61HgPyEREgApEQmgMPLm_AQ4vgdAvgdIAlDWy5MOWOGASGAAaJFAeP3PBIABAYoBA1VTRJIFBvBSmAGsAqAB-gGoAQGwAQC4AQLAAQPIAQLQAQnYAQDgAQHwAQCKAjp1ZignYScsIDQ5NDQ3MiwgMTQ5MjYzNzI5NSk7dWYoJ3InLCAyOTY4MTExMCwyHgDwnJIC7QEhcHpUNkZ3aTYwSWNFRU5iTGt3NFlBQ0RoZ0Vnd0FEZ0FRQVJJdmdkUTh1YjhCRmdBWVBfX19fOFBhQUJ3QVhnQmdBRUJpQUVCa0FFQm1BRUJvQUVCcUFFRHNBRUF1UUVwaTRpREFBRGdQOEVCS1l1SWd3QUE0RF9KQWQ0V2JVTnJmUEVfMlFFQUFBQUFBQUR3UC1BQkFQVUIFD0BKZ0Npb2FvcEFtZ0FnQzFBZwEWBEM5CQjoREFBZ0hJQWdIUUFnSFlBZ0hnQWdEb0FnRDRBZ0NBQXdHUUF3Q1lBd0dvQTdyUWh3US6aAjEhRXduSHU68AAcNFlCSUlBUW8JbARreAFmDQHwui7YAugH4ALH0wHqAg93d3cubnl0aW1lcy5jb23yAhEKBkNQR19JRBIHMTk3NzkzM_ICEAoFQ1BfSUQSBzg1MTM1OTSAAwGIAwGQAwCYAxSgAwGqAwDAA6wCyAMA2APjBuADAOgDAPgDA4AEAJIECS9vcGVucnRiMpgEAKIECzEwLjI0NC4wLjIyqAQAsgQKCAAQABgAIAAwALgEAMAEAMgEANIEDDEwLjMuMTM4LjE0ONoEAggB4AQA8ARBXyCIBQGYBQCgBf8RAZwBqgUkNDM3ZmJiZjUtMzNmNS00ODdhLThlMTYtYTcxMTI5MDNjZmU1&s=b52bf8a6265a78a5969444bc846cc6d0f9f3b489&test=1&referrer=www.nytimes.com&pp=${AUCTION_PRICE}&"></script>',
      'width': 300,
      'height': 250,
      'deal_id': 'test-dealid',
      'ad_server_targeting': {
        'foo': 'bar'
      }
    }
  ]
};

const RESPONSE_NO_BID_NO_UNIT = {
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'status': 'OK',
  'bidder_status': [{
    'bidder': 'appnexus',
    'response_time_ms': 132,
    'no_bid': true
  }]
};

const RESPONSE_NO_BID_UNIT_SET = {
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'status': 'OK',
  'bidder_status': [{
    'bidder': 'appnexus',
    'ad_unit': 'div-gpt-ad-1460505748561-0',
    'response_time_ms': 91,
    'no_bid': true
  }]
};

const RESPONSE_NO_COOKIE = {
  'tid': 'd6eca075-4a59-4346-bdb3-86531830ef2c',
  'status': 'OK',
  'bidder_status': [{
    'bidder': 'pubmatic',
    'no_cookie': true,
    'usersync': {
      'url': '//ads.pubmatic.com/AdServer/js/user_sync.html?predirect=http://localhost:8000/setuid?bidder=pubmatic&uid=',
      'type': 'iframe'
    }
  }]
};

const RESPONSE_NO_PBS_COOKIE = {
  'tid': '882fe33e-2981-4257-bd44-bd3b03945f48',
  'status': 'no_cookie',
  'bidder_status': [{
    'bidder': 'rubicon',
    'no_cookie': true,
    'usersync': {
      'url': 'https://pixel.rubiconproject.com/exchange/sync.php?p=prebid',
      'type': 'redirect'
    }
  }, {
    'bidder': 'pubmatic',
    'no_cookie': true,
    'usersync': {
      'url': '//ads.pubmatic.com/AdServer/js/user_sync.html?predirect=https%3A%2F%2Fprebid.adnxs.com%2Fpbs%2Fv1%2Fsetuid%3Fbidder%3Dpubmatic%26uid%3D',
      'type': 'iframe'
    }
  }, {
    'bidder': 'appnexus',
    'response_time_ms': 162,
    'num_bids': 1,
    'debug': [{
      'request_uri': 'http://ib.adnxs.com/openrtb2',
      'request_body': '{"id":"882fe33e-2981-4257-bd44-bd3b03945f48","imp":[{"id":"/19968336/header-bid-tag-0","banner":{"w":300,"h":250,"format":[{"w":300,"h":250}]},"secure":1,"ext":{"appnexus":{"placement_id":5914989}}}],"site":{"domain":"nytimes.com","page":"http://www.nytimes.com"},"device":{"ua":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36","ip":"75.97.0.47"},"user":{"id":"3519479852893340159","buyeruid":"3519479852893340159"},"at":1,"tmax":1000,"source":{"fd":1,"tid":"882fe33e-2981-4257-bd44-bd3b03945f48"}}',
      'response_body': '{"id":"882fe33e-2981-4257-bd44-bd3b03945f48"}',
      'status_code': 200
    }]
  }],
  'bids': [{
    'bid_id': '123',
    'code': 'div-gpt-ad-1460505748561-0',
    'creative_id': '70928274',
    'bidder': 'appnexus',
    'price': 0.07425,
    'adm': '<script type="application/javascript" src="https://secure-nym.adnxs.com/ab?e=wqT_3QLeCPBOXgQAAAMA1gAFAQi5krDKBRCwho2ft8LKoCMY_4PozveI7eswIAEqLQnbgoxDEVi5PxElYqnyDAKzPxkAAAAgXA8zQCHOzMzMzMy8PykzMwECsMM_MO2C6QI47RtA_AxIAlCSj-khWL-tNGAAaNfUTniivwSAAQGKAQNVU0SSAQEG8FSYAawCoAH6AagBAbABALgBAsABBcgBAtABCdgBAOABAPABAIoCkgF1ZignYScsIDE2OTc2MjksIDE0OTgxNTUzMjEpO3VmKCdyJywgNzA5MjgyNzQsQh4ABGMnATsQODY2NTVKPAAgZycsIDM5OTgzTh0AKGknLCA0OTM1MTUsMlcA8IeSAs0CIWhWRE5jZ2pfdVlVSUVKS1A2U0VZQUNDX3JUUXdBRGdBUUFCSV9BeFE3WUxwQWxnQVlKOEJhQUJ3QUhnQWdBRUFpQUVBa0FFQm1BRUJvQUVCcUFFRHNBRUF1UUhPRGRmZE16UERQOEVCemczWDNUTXp3el9KQVFBQUFBQUFBUEFfMlFFCQw0QUR3UC1BQnk0OGU5UUUFFChnQUlCaUFLMzdjRQEIQEIzNWNCaUFMZzZJNEVpQUxoDQgAag0IAG4NCABvAQhIa0FJSG1BSUFvQUlBcUFJR3RRSQVUAHYNCPBed0FJQXlBSUEwQUlBMkFJQTRBTDYtd2ZvQXBqaXI4b0Y4Z0lGZG1semFUSDRBZ0NBQXdHUUF3Q1lBd0dvQV8tNWhRaTZBd2xPV1UweU9qTTJNamcumgItIV93ajdud2oyUAHwTHY2MDBJQUFvQURvSlRsbE5Nam96TmpJNNgCAOACvtUr6gIWaHR0cDovL3d3dy5ueXRpbWVzLmNvbfICEQoGQURWX0lEEgcxNjk3NjI5BRQIQ1BHBRQt9AEUCAVDUAETBAgxTSXA8gINCghBRFZfRlJFURIBMPICGQoPQ1VTVE9NX01PREVMX0lEEgYxMzA1NTTyAh8KFjIcAFBMRUFGX05BTUUSBXZpc2kx8gIoCho2IgAIQVNUAUkcSUZJRUQSCjFBzvB4NDkxNDSAAwCIAwGQAwCYAxSgAwGqAwDAA6wCyAMA2APjBuADAOgDAPgDA4AEAJIECS9vcGVucnRiMpgEAKIECjc1Ljk3LjAuNDeoBACyBAoIABAAGAAgADAAuAQAwAQAyAQA0gQJTllNMjozNjI42gQCCAHgBADwBGGlIIgFAZgFAKAF_xEBuAGqBSQ4ODJmZTMzZS0yOTgxLTQyNTctYmQ0NC1iZDNiMDM5NDVmNDjABQDJBQAAAQI08D_SBQkJAAAAAAAAAAA.&s=d4bc7cd2e5d7e1910a591bc97df6ae9e63333e52&referrer=http%3A%2F%2Fwww.nytimes.com&pp=${AUCTION_PRICE}&"></script>',
    'width': 300,
    'height': 250,
    'response_time_ms': 162
  }]
};

const RESPONSE_NO_PBS_COOKIE_ERROR = {
  'tid': '882fe33e-2981-4257-bd44-bd3b0394545f',
  'status': 'no_cookie',
  'bidder_status': [{
    'bidder': 'rubicon',
    'no_cookie': true,
    'usersync': {
      'url': 'https://pixel.rubiconproject.com/exchange/sync.php?p=prebid',
      'type': 'jsonp'
    }
  }, {
    'bidder': 'pubmatic',
    'no_cookie': true,
    'usersync': {
      'url': '',
      'type': 'iframe'
    }
  }]
};

describe('S2S Adapter', () => {
  let adapter;

  beforeEach(() => adapter = new Adapter());

  describe('request function', () => {
    let xhr;
    let requests;

    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = request => requests.push(request);
    });

    afterEach(() => xhr.restore());

    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('exists converts types', () => {
      adapter.setConfig(CONFIG);
      adapter.callBids(REQUEST);
      const requestBid = JSON.parse(requests[0].requestBody);
      expect(requestBid.ad_units[0].bids[0].params.placementId).to.exist.and.to.be.a('number');
      expect(requestBid.ad_units[0].bids[0].params.member).to.exist.and.to.be.a('string');
    });
  });

  describe('response handler', () => {
    let server;

    beforeEach(() => {
      server = sinon.fakeServer.create();
      sinon.stub(utils, 'triggerPixel');
      sinon.stub(utils, 'insertUserSyncIframe');
      sinon.stub(utils, 'logError');
      sinon.stub(cookie, 'cookieSet');
      sinon.stub(bidmanager, 'addBidResponse');
      sinon.stub(utils, 'getBidderRequestAllAdUnits').returns({
        bids: [{
          bidId: '123',
          placementCode: 'div-gpt-ad-1460505748561-0'
        }]
      });
      sinon.stub(utils, 'getBidRequest').returns({
        bidId: '123'
      });
    });

    afterEach(() => {
      server.restore();
      bidmanager.addBidResponse.restore();
      utils.getBidderRequestAllAdUnits.restore();
      utils.getBidRequest.restore();
      utils.triggerPixel.restore();
      utils.insertUserSyncIframe.restore();
      utils.logError.restore();
      cookie.cookieSet.restore();
    });

    // TODO: test dependent on pbjs_api_spec.  Needs to be isolated
    it('registers bids', () => {
      server.respondWith(JSON.stringify(RESPONSE));

      adapter.setConfig(CONFIG);
      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm', 0.5);
      expect(response).to.have.property('adId', '123');
    });

    it('registers no-bid response when ad unit not set', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_BID_NO_UNIT));

      adapter.setConfig(CONFIG);
      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const ad_unit_code = bidmanager.addBidResponse.firstCall.args[0];
      expect(ad_unit_code).to.equal('div-gpt-ad-1460505748561-0');

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid returned empty or error response');

      const bid_request_passed = bidmanager.addBidResponse.firstCall.args[1];
      expect(bid_request_passed).to.have.property('adId', '123');
    });

    it('registers no-bid response when server requests cookie sync', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_COOKIE));

      adapter.setConfig(CONFIG);
      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const ad_unit_code = bidmanager.addBidResponse.firstCall.args[0];
      expect(ad_unit_code).to.equal('div-gpt-ad-1460505748561-0');

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid returned empty or error response');

      const bid_request_passed = bidmanager.addBidResponse.firstCall.args[1];
      expect(bid_request_passed).to.have.property('adId', '123');
    });

    it('registers no-bid response when ad unit is set', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_BID_UNIT_SET));

      adapter.setConfig(CONFIG);
      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const ad_unit_code = bidmanager.addBidResponse.firstCall.args[0];
      expect(ad_unit_code).to.equal('div-gpt-ad-1460505748561-0');

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid returned empty or error response');
    });

    it('registers no-bid response when there are less bids than requests', () => {
      utils.getBidderRequestAllAdUnits.restore();
      sinon.stub(utils, 'getBidderRequestAllAdUnits').returns({
        bids: [{
          bidId: '123',
          placementCode: 'div-gpt-ad-1460505748561-0'
        }, {
          bidId: '101111',
          placementCode: 'div-gpt-ad-1460505748561-1'
        }]
      });

      server.respondWith(JSON.stringify(RESPONSE));

      adapter.setConfig(CONFIG);
      adapter.callBids(REQUEST);
      server.respond();

      sinon.assert.calledTwice(bidmanager.addBidResponse);

      expect(bidmanager.addBidResponse.firstCall.args[0]).to.equal('div-gpt-ad-1460505748561-0');
      expect(bidmanager.addBidResponse.secondCall.args[0]).to.equal('div-gpt-ad-1460505748561-1');

      expect(bidmanager.addBidResponse.firstCall.args[1]).to.have.property('adId', '123');
      expect(bidmanager.addBidResponse.secondCall.args[1]).to.have.property('adId', '101111');

      expect(bidmanager.addBidResponse.firstCall.args[1])
        .to.have.property('statusMessage', 'Bid available');
      expect(bidmanager.addBidResponse.secondCall.args[1])
        .to.have.property('statusMessage', 'Bid returned empty or error response');
    });

    it('should have dealId in bidObject', () => {
      server.respondWith(JSON.stringify(RESPONSE));

      adapter.setConfig(CONFIG);
      adapter.callBids(REQUEST);
      server.respond();
      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('dealId', 'test-dealid');
    });

    it('should pass through default adserverTargeting if present in bidObject', () => {
      server.respondWith(JSON.stringify(RESPONSE));

      adapter.setConfig(CONFIG);
      adapter.callBids(REQUEST);
      server.respond();
      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('adserverTargeting').that.deep.equals({'foo': 'bar'});
    });

    it('registers bid responses when server requests cookie sync', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_PBS_COOKIE));

      adapter.setConfig(CONFIG);
      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const ad_unit_code = bidmanager.addBidResponse.firstCall.args[0];
      expect(ad_unit_code).to.equal('div-gpt-ad-1460505748561-0');

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('source', 's2s');

      const bid_request_passed = bidmanager.addBidResponse.firstCall.args[1];
      expect(bid_request_passed).to.have.property('adId', '123');
    });

    it('does cookie sync when no_cookie response', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_PBS_COOKIE));

      adapter.setConfig(CONFIG);
      adapter.callBids(REQUEST);
      server.respond();

      sinon.assert.calledOnce(utils.triggerPixel);
      sinon.assert.calledWith(utils.triggerPixel, 'https://pixel.rubiconproject.com/exchange/sync.php?p=prebid');
      sinon.assert.calledOnce(utils.insertUserSyncIframe);
      sinon.assert.calledWith(utils.insertUserSyncIframe, '//ads.pubmatic.com/AdServer/js/user_sync.html?predirect=https%3A%2F%2Fprebid.adnxs.com%2Fpbs%2Fv1%2Fsetuid%3Fbidder%3Dpubmatic%26uid%3D');
    });

    it('logs error when no_cookie response is missing type or url', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_PBS_COOKIE_ERROR));

      adapter.setConfig(CONFIG);
      adapter.callBids(REQUEST);
      server.respond();

      sinon.assert.notCalled(utils.triggerPixel);
      sinon.assert.notCalled(utils.insertUserSyncIframe);
      sinon.assert.calledTwice(utils.logError);
    });

    it('does not call cookieSet cookie sync when no_cookie response && not opted in', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_PBS_COOKIE));

      adapter.setConfig(CONFIG);
      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.notCalled(cookie.cookieSet);
    });

    it('calls cookieSet cookie sync when no_cookie response && opted in', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_PBS_COOKIE));
      let config = Object.assign({
        cookieSet: true
      }, CONFIG);

      adapter.setConfig(config);
      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(cookie.cookieSet);
    });
  });
});
