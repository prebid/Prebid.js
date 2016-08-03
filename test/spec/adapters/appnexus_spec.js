import { expect } from 'chai';
import Adapter from 'src/adapters/ut';
import bidmanager from 'src/bidmanager';
const ENDPOINT = 'http://ib.adnxs.com/ut/v2';

const PARAMS = {
  "bidderCode": "ut",
  "requestId": "d3e07445-ab06-44c8-a9dd-5ef9af06d2a6",
  "bidderRequestId": "7101db09af0db2",
  "bids": [
    {
      "bidder": "ut",
      "params": {
        "foo": "bar"
      },
      "placementCode": "/19968336/header-bid-tag1",
      "sizes": [
        [728, 90],
        [970, 90]
      ],
      "bidId": "84ab500420319d",
      "bidderRequestId": "7101db09af0db2",
      "requestId": "d3e07445-ab06-44c8-a9dd-5ef9af06d2a6"
    }
  ],
  "start": 1469479810130,
  "timeout": 3000
};

const RESPONSE = {
    "version": "0.0.1",
    "tags": [{
        "uuid": "8160b2bea694fc",
        "tag_id": 4799418,
        "auction_id": "2256922143947979797",
        "no_ad_url": "http://lax1-ib.adnxs.com/no-ad",
        "timeout_ms": 2500,
        "ads": [{
            "content_source": "rtb",
            "ad_type": "banner",
            "buyer_member_id": 958,
            "creative_id": 33989846,
            "media_type_id": 1,
            "media_subtype_id": 1,
            "cpm": 0.500000,
            "cpm_publisher_currency": 0.500000,
            "publisher_currency_code": "$",
            "client_initiated_ad_counting": true,
            "rtb": {
                "banner": {
                    "width": 728,
                    "height": 90,
                    "content": "<!-- Creative -->"
                },
                "trackers": [{
                    "impression_urls": ["http://lax1-ib.adnxs.com/impression"]
                }]
            }
        }]
    }, {
        "uuid": "9f6e9235559e8e",
        "tag_id": 4799418,
        "auction_id": "5911338687906386297",
        "no_ad_url": "http://lax1-ib.adnxs.com/no-ad",
        "timeout_ms": 2500,
        "ads": [{
            "content_source": "rtb",
            "ad_type": "banner",
            "buyer_member_id": 958,
            "creative_id": 29681110,
            "media_type_id": 1,
            "media_subtype_id": 1,
            "cpm": 0.500000,
            "cpm_publisher_currency": 0.500000,
            "publisher_currency_code": "$",
            "client_initiated_ad_counting": true,
            "rtb": {
                "banner": {
                    "width": 300,
                    "height": 250,
                    "content": "<!-- Creative -->"
                },
                "trackers": [{
                    "impression_urls": ["http://lax1-ib.adnxs.com/impression"]
                }]
            }
        }]
    }]
};

describe('AppNexusAdapter', () => {

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

    it('sends bid request to ENDPOINT via POST', () => {
      adapter.callBids(PARAMS);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('POST');
    });

  });

  describe('response handler', () => {

    let server;

    beforeEach(() => {
      server = sinon.fakeServer.create();
      sinon.stub(bidmanager, 'addBidResponse');
    });

    afterEach(() => {
      server.restore()
      bidmanager.addBidResponse.restore();
    });

    it('registers bids', () => {
      server.respondWith(JSON.stringify(RESPONSE));

      adapter.callBids(PARAMS);
      server.respond();
      sinon.assert.calledTwice(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm', 0.5);
    });

    it('handles blank bids', () => {
      server.respondWith(JSON.stringify({
        "tags": [{}]
      }));

      adapter.callBids(PARAMS);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage',
        'Bid returned empty or error response');
    });

  });

});
