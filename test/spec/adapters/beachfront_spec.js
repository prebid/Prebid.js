import { expect } from 'chai';
import BeachfrontAdapter from 'src/adapters/beachfront';
import bidmanager from 'src/bidmanager';

const ENDPOINT = '//ads.bf.rebel.ai/bid.json?exchange_id=0a47f4ce-d91f-48d0-bd1c-64fa2c196f13';

const REQUEST = {
    "width": 640,
    "height": 480,
    "bidId": "2a1444be20bb2c",
    "bidder": "beachfront",
    "bidderRequestId": "7101db09af0db2",
    "params": {
      "appId": "whatever",
      "video": {},
      "placementCode": "video",
      "sizes": [
        640, 480
      ]
    },
    "bids": [
        {
            "bidFloor": 2.00,
            "bidder": "beachfront",
            "params": {
                "appId": "0a47f4ce-d91f-48d0-bd1c-64fa2c196f13",
                "bidfloor": 2.00,
                "video": {},
            },
            "placementCode": "video",
            "sizes": [640, 480],

            "bidId": "2a1444be20bb2c",
            "bidderRequestId": "7101db09af0db2",
            "requestId": "979b659e-ecff-46b8-ae03-7251bae4b725"
        }
    ],
    "requestId": "979b659e-ecff-46b8-ae03-7251bae4b725",
};


var RESPONSE = {
 "id": "e926f4eaef66673dd52485ebadba9ebd",
 "seatbid": [
   {
     "bid": [
       {
         "id": 1,
         "impid": "1",
         "price": "5",
         "adid": "784858",
         "adm": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><VAST version=\"2.0\"><Ad id=\"1\"><Wrapper><AdSystem><![CDATA[Techniqal]]></AdSystem><VASTAdTagURI><![CDATA[http://www.techniqal.com/tmp/bf/bid_wrap.php?c=1]]></VASTAdTagURI></Wrapper></Ad></VAST>",
         "adomain": [
           "techniqal.com"
         ],
         "cid": "64045",
         "crid": "784858"
       }
     ],
     "seat": "bfio"
   }
 ],
 "bidid": "7d6cb445071069b437c307bedfb69ae8",
 "cur": "USD"
};

describe('BeachfrontAdapter', () => {

    let adapter;

    beforeEach(() => adapter = BeachfrontAdapter.createNew());

    describe('request function', () => {

        let xhr;
        let requests;

        beforeEach(() => {
            xhr = sinon.useFakeXMLHttpRequest();
            requests = [];
            xhr.onCreate = request => requests.push(request);
        });

        afterEach(() => xhr.restore());



        console.log("XXXXXXXX running beachfront tests");



        it('exists and is a function', () => {
            expect(adapter.callBids).to.exist.and.to.be.a('function');
        });

        it('requires parameters to make request', () => {
            adapter.callBids({});
            expect(requests).to.be.empty;
        });

        it('sends bid request to ENDPOINT via POST', () => {

          adapter.callBids(REQUEST);
          console.log("requests = "+requests[0]);
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
            server.restore();
            bidmanager.addBidResponse.restore();
        });

        it('registers bids', () => {
            server.respondWith(JSON.stringify(RESPONSE));

            adapter.callBids(REQUEST);
            server.respond();
            sinon.assert.calledOnce(bidmanager.addBidResponse);

            const response = bidmanager.addBidResponse.firstCall.args[1];
            console.log("Response is:: ");
            console.log(response);
            expect(response).to.have.property('statusMessage', 'Bid available');
            expect(response).to.have.property('cpm', "5");
        });

        it('handles nobid responses', () => {
            server.respondWith(JSON.stringify({
              "width": 640,
              "height": 480,
              "bidId": "2a1444be20bb2c",
              "bidder": "beachfront",
              "bidderRequestId": "7101db09af0db2",
              "requestId": "979b659e-ecff-46b8-ae03-7251bae4b725"
            }));

            adapter.callBids(REQUEST);
            server.respond();
            sinon.assert.calledOnce(bidmanager.addBidResponse);

            const response = bidmanager.addBidResponse.firstCall.args[1];
            expect(response).to.have.property(
                'statusMessage',
                'Bid returned empty or error response'
            );
        });

        it('handles JSON.parse errors', () => {
            server.respondWith("");

            adapter.callBids(REQUEST);
            server.respond();
            sinon.assert.calledOnce(bidmanager.addBidResponse);

            const response = bidmanager.addBidResponse.firstCall.args[1];
            expect(response).to.have.property(
                'statusMessage',
                'Bid returned empty or error response'
            );
        });
    });
});
