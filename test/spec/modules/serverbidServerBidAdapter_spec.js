import { expect } from 'chai';
import Adapter from 'modules/serverbidServerBidAdapter';
import * as utils from 'src/utils';
import { config } from 'src/config';
import { ajax } from 'src/ajax';

const ENDPOINT = 'https://e.serverbid.com/api/v2';

let CONFIG = {
  enabled: true,
  bidders: ['appnexus'],
  timeout: 1000,
  adapter: 'serverbidServer',
  networkId: 9969,
  siteId: 730181,
  endpoint: ENDPOINT
};

let CONFIG_ARG = {
  s2sConfig: CONFIG
}

const REQUEST = {
  'account_id': '1',
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'max_bids': 1,
  'timeout_millis': 1000,
  'url': '',
  'prebid_version': '0.21.0-pre',
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

const BID_REQUESTS = [
  {
    'bidderCode': 'appnexus',
    'auctionId': '173afb6d132ba3',
    'bidderRequestId': '3d1063078dfcc8',
    'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
    'bids': [
      {
        'bidder': 'appnexus',
        'params': {
          'placementId': '10433394',
          'member': 123
        },
        'bid_id': '123',
        'adUnitCode': 'div-gpt-ad-1460505748561-0',
        'transactionId': '4ef956ad-fd83-406d-bd35-e4bb786ab86c',
        'sizes': [
          {
            'w': 300,
            'h': 250
          }
        ],
        'bidId': '259fb43aaa06c1',
        'bidderRequestId': '3d1063078dfcc8',
        'auctionId': '173afb6d132ba3'
      }
    ],
    'auctionStart': 1510852447530,
    'timeout': 5000,
    'src': 's2s',
    'doneCbCallCount': 0
  }
];

const RESPONSE = {
  'user': { 'key': 'ue1-2d33e91b71e74929b4aeecc23f4376f1' },
  'decisions': {
    '123': [{
      'adId': 2364764,
      'creativeId': 1950991,
      'flightId': 2788300,
      'campaignId': 542982,
      'clickUrl': 'https://e.serverbid.com/r',
      'impressionUrl': 'https://e.serverbid.com/i.gif',
      'contents': [{
        'type': 'html',
        'body': '<html></html>',
        'data': {
          'height': 300,
          'width': 250,
          'imageUrl': 'https://static.adzerk.net/Advertisers/b0ab77db8a7848c8b78931aed022a5ef.gif',
          'fileName': 'b0ab77db8a7848c8b78931aed022a5ef.gif'
        },
        'template': 'image'
      }],
      'height': 250,
      'width': 300,
      'events': [],
      'pricing': {'price': 0.5, 'clearPrice': 0.5, 'revenue': 0.0005, 'rateType': 2, 'eCPM': 0.5}
    }],
  }
};

const RESPONSE_NO_BID_NO_UNIT = {
  'user': { 'key': 'ue1-2d33e91b71e74929b4aeecc23f4376f1' },
  'decisions': {
    '123': []
  }
};

const REQUEST_TWO_UNITS = {
  'account_id': '1',
  'tid': '437fbbf5-33f5-487a-8e16-a7112903cfe5',
  'max_bids': 1,
  'timeout_millis': 1000,
  'url': '',
  'prebid_version': '0.21.0-pre',
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
    },
    {
      'code': 'div-gpt-ad-1460505748561-1',
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
      'transactionId': '4ef956ad-fd83-406d-bd35-e4bb786bb86d',
      'bids': [
        {
          'bid_id': '101111',
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

describe('ServerBid S2S Adapter', function () {
  let adapter,
    addBidResponse = sinon.spy(),
    done = sinon.spy();

  beforeEach(function () {
    adapter = new Adapter()
  });

  afterEach(function () {
    addBidResponse.resetHistory();
    done.resetHistory();
  });

  describe('request function', function () {
    let xhr;
    let requests;

    beforeEach(function () {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = request => requests.push(request);
    });

    afterEach(function () {
      xhr.restore();
    });

    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('response handler', function () {
    let server;

    beforeEach(function () {
      server = sinon.fakeServer.create();
      sinon.stub(utils, 'getBidRequest').returns({
        bidId: '123'
      });
    });

    afterEach(function () {
      server.restore();
      utils.getBidRequest.restore();
    });

    it('registers bids', function () {
      server.respondWith(JSON.stringify(RESPONSE));

      config.setConfig(CONFIG_ARG);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      sinon.assert.calledOnce(addBidResponse);

      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm', 0.5);
      expect(response).to.have.property('adId', '123');
    });

    it('registers no-bid response when ad unit not set', function () {
      server.respondWith(JSON.stringify(RESPONSE_NO_BID_NO_UNIT));

      config.setConfig(CONFIG_ARG);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      sinon.assert.calledOnce(addBidResponse);

      const ad_unit_code = addBidResponse.firstCall.args[0];
      expect(ad_unit_code).to.equal('div-gpt-ad-1460505748561-0');

      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid returned empty or error response');

      const bid_request_passed = addBidResponse.firstCall.args[1];
      expect(bid_request_passed).to.have.property('adId', '123');
    });

    it('registers no-bid response when ad unit is set', function () {
      server.respondWith(JSON.stringify(RESPONSE_NO_BID_NO_UNIT));

      config.setConfig(CONFIG_ARG);
      adapter.callBids(REQUEST, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();
      sinon.assert.calledOnce(addBidResponse);

      const ad_unit_code = addBidResponse.firstCall.args[0];
      expect(ad_unit_code).to.equal('div-gpt-ad-1460505748561-0');

      const response = addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid returned empty or error response');
    });

    it('registers no-bid response when there are less bids than requests', function () {
      server.respondWith(JSON.stringify(RESPONSE));

      config.setConfig(CONFIG_ARG);
      adapter.callBids(REQUEST_TWO_UNITS, BID_REQUESTS, addBidResponse, done, ajax);
      server.respond();

      sinon.assert.calledTwice(addBidResponse);

      expect(addBidResponse.firstCall.args[0]).to.equal('div-gpt-ad-1460505748561-0');
      expect(addBidResponse.secondCall.args[0]).to.equal('div-gpt-ad-1460505748561-1');

      expect(addBidResponse.firstCall.args[1]).to.have.property('adId', '123');
      expect(addBidResponse.secondCall.args[1]).to.have.property('adId', '101111');

      expect(addBidResponse.firstCall.args[1])
        .to.have.property('statusMessage', 'Bid available');
      expect(addBidResponse.secondCall.args[1])
        .to.have.property('statusMessage', 'Bid returned empty or error response');
    });
  });
});
