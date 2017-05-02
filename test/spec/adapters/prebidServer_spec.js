import { expect } from 'chai';
import Adapter from 'src/adapters/prebidServer';
import bidmanager from 'src/bidmanager';
import CONSTANTS from 'src/constants.json';

const REQUEST = {
  "account_id": "1",
  "tid": "437fbbf5-33f5-487a-8e16-a7112903cfe5",
  "max_bids": 1,
  "timeout_millis": 1000,
  "url": "",
  "prebid_version": "0.21.0-pre",
  "ad_units": [
    {
      "code": "div-gpt-ad-1460505748561-0",
      "sizes": [
        {
          "w": 300,
          "h": 250
        },
        {
          "w": 300,
          "h": 600
        }
      ],
      "transactionId": "4ef956ad-fd83-406d-bd35-e4bb786ab86c",
      "bids": [
        {
          "bid_id" : "123",
          "bidder": "appnexus",
          "params": {
            "placementId": "10433394"
          }
        }
      ]
    }
  ]
};

const RESPONSE = {
  "tid": "437fbbf5-33f5-487a-8e16-a7112903cfe5",
  "status": "OK",
  "bidder_status": [
    {
      "bidder": "appnexus",
      "response_time_ms": 52,
      "num_bids": 1
    }
  ],
  "bids": [
    {
      "bid_id": "123",
      "code": "div-gpt-ad-1460505748561-0",
      "creative_id": "29681110",
      "bidder": "appnexus",
      "price": 0.5,
      "adm": "<script type=\"application/javascript\" src=\"http://nym1-ib.adnxs.com/ab?e=wqT_3QL_Baj_AgAAAwDWAAUBCO-s38cFEJG-p6iRgOfvdhivtLWVpomhsWUgASotCQAAAQII4D8RAQc0AADgPxkAAACA61HgPyEREgApEQmgMPLm_AQ4vgdAvgdIAlDWy5MOWOGASGAAaJFAeP3PBIABAYoBA1VTRJIFBvBSmAGsAqAB-gGoAQGwAQC4AQLAAQPIAQLQAQnYAQDgAQHwAQCKAjp1ZignYScsIDQ5NDQ3MiwgMTQ5MjYzNzI5NSk7dWYoJ3InLCAyOTY4MTExMCwyHgDwnJIC7QEhcHpUNkZ3aTYwSWNFRU5iTGt3NFlBQ0RoZ0Vnd0FEZ0FRQVJJdmdkUTh1YjhCRmdBWVBfX19fOFBhQUJ3QVhnQmdBRUJpQUVCa0FFQm1BRUJvQUVCcUFFRHNBRUF1UUVwaTRpREFBRGdQOEVCS1l1SWd3QUE0RF9KQWQ0V2JVTnJmUEVfMlFFQUFBQUFBQUR3UC1BQkFQVUIFD0BKZ0Npb2FvcEFtZ0FnQzFBZwEWBEM5CQjoREFBZ0hJQWdIUUFnSFlBZ0hnQWdEb0FnRDRBZ0NBQXdHUUF3Q1lBd0dvQTdyUWh3US6aAjEhRXduSHU68AAcNFlCSUlBUW8JbARreAFmDQHwui7YAugH4ALH0wHqAg93d3cubnl0aW1lcy5jb23yAhEKBkNQR19JRBIHMTk3NzkzM_ICEAoFQ1BfSUQSBzg1MTM1OTSAAwGIAwGQAwCYAxSgAwGqAwDAA6wCyAMA2APjBuADAOgDAPgDA4AEAJIECS9vcGVucnRiMpgEAKIECzEwLjI0NC4wLjIyqAQAsgQKCAAQABgAIAAwALgEAMAEAMgEANIEDDEwLjMuMTM4LjE0ONoEAggB4AQA8ARBXyCIBQGYBQCgBf8RAZwBqgUkNDM3ZmJiZjUtMzNmNS00ODdhLThlMTYtYTcxMTI5MDNjZmU1&s=b52bf8a6265a78a5969444bc846cc6d0f9f3b489&test=1&referrer=www.nytimes.com&pp=${AUCTION_PRICE}&\"></script>",
      "width": 300,
      "height": 250
    }
  ]
};

describe('S2S Adapter', () => {

  let adapter;

  beforeEach(() => adapter = Adapter.createNew());

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
    let config = {
      accountId : '1',
      enabled : true,
      bidders : ['appnexus'],
      timeout : 1000,
      endpoint : CONSTANTS.S2S.DEFAULT_ENDPOINT
    };

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

      adapter.setConfig(config);
      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm', 0.5);
    });

  });

});
