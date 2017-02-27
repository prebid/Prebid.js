import { expect } from 'chai';
import Adapter from 'src/adapters/vertamedia';
import bidmanager from 'src/bidmanager';

const ENDPOINT = 'http://ads.bf.rebel.ai/bid.json?exchange_id=';

const REQUEST = {
    "bidderCode": "beachfront",
    "requestId": "979b659e-ecff-46b8-ae03-7251bae4b725",
    "bidderRequestId": "7101db09af0db2",
    "bids": [
        {
            "bidder": "beachfront",
            "params": {
                appId: "0a47f4ce-d91f-48d0-bd1c-64fa2c196f13",
                video: {},
            },
            "placementCode": "video",
            "sizes": [640, 480],
            "bidId": "27e10573b4031d",
            "bidderRequestId": "13908061d4c9d6",
            "requestId": "979b659e-ecff-46b8-ae03-7251bae4b725"
        }
    ],
    "start": 1469479810130
};
var RESPONSE = {
    "source": {
        "aid": 22489,
        "pubId": 18016,
        "sid": "0"
    },
    "bids": [
        {
            "cmpId": 9541,
            "cpm": 2.49,
            "url": "http://rtb.vertamedia.com/vast?adid=BFDB9CC0038AD918",
            "cur": "USD"
        }
    ]
};


describe('BeachfrontAdapter', () => {

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

        it('requires parameters to make request', () => {
            adapter.callBids({});
            expect(requests).to.be.empty;
        });

        xit('requires member && invCode', () => {
            let backup = REQUEST.bids[0].params;
            REQUEST.bids[0].params = {member: 1234};
            adapter.callBids(REQUEST);
            expect(requests).to.be.empty;
            REQUEST.bids[0].params = backup;
        });


        it('sends bid request to ENDPOINT via POST', () => {
            adapter.callBids(REQUEST);
            expect(requests[0].url).to.equal(ENDPOINT);
            expect(requests[0].method).to.equal('GET');
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

        xit('registers bids', () => {
            server.respondWith(JSON.stringify(RESPONSE));

            adapter.callBids(REQUEST);
            server.respond();
            sinon.assert.calledOnce(bidmanager.addBidResponse);

            const response = bidmanager.addBidResponse.firstCall.args[1];
            expect(response).to.have.property('statusMessage', 'Bid available');
            expect(response).to.have.property('cpm', 2.49);
        });

        xit('handles nobid responses', () => {
            server.respondWith(JSON.stringify({
                aid: 356465468,
                w: 640,
                h: 480,
                domain: 'localhost'
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

        xit('handles JSON.parse errors', () => {
            server.respondWith('');

            adapter.callBids(REQUEST);
            server.respond();
            sinon.assert.calledOnce(bidmanager.addBidResponse);

            expect(bidmanager.addBidResponse.firstCall.args[1]).to.have.property(
                'statusMessage',
                'Bid returned empty or error response'
            );
        });
    });
});
