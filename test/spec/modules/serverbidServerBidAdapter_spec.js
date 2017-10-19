import { expect } from 'chai';
import Adapter from 'modules/serverbidServerBidAdapter';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';

const ENDPOINT = 'https://e.serverbid.com/api/v2';
const SMARTSYNC_CALLBACK = 'serverbidCallBids';

let CONFIG = {
  accountId: '1',
  enabled: true,
  bidders: ['appnexus'],
  timeout: 1000,
  adapter : 'serverbidServer',
  networkId: 9969,
  siteId: 730181,
  endpoint: ENDPOINT
};

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

describe('ServerBid S2S Adapter', () => {
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

  });

  describe('response handler', () => {
    let server;

    beforeEach(() => {
      server = sinon.fakeServer.create();
      sinon.stub(bidmanager, 'addBidResponse');
    });

    afterEach(() => {
      server.restore();
      bidmanager.addBidResponse.restore();
    });

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


    it('registers no-bid response when ad unit is set', () => {
      server.respondWith(JSON.stringify(RESPONSE_NO_BID_NO_UNIT));

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
      server.respondWith(JSON.stringify(RESPONSE));

      adapter.setConfig(CONFIG);
      adapter.callBids(REQUEST_TWO_UNITS);
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
  });
});
