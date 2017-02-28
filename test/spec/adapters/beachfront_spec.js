import { expect } from 'chai';
import Adapter from 'src/adapters/vertamedia';
import bidmanager from 'src/bidmanager';

const ENDPOINT = 'http://ads.bf.rebel.ai/bid.json?exchange_id=';

const REQUEST = {
    "bidId": "2a1444be20bb2c",
    "bidder": "beachfront",
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
            "bidFloor": 2.00,
            "bidId": "2a1444be20bb2c",
            "bidderRequestId": "7101db09af0db2",
            "requestId": "979b659e-ecff-46b8-ae03-7251bae4b725"
        }
    ],
    "requestId": "979b659e-ecff-46b8-ae03-7251bae4b725",
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
            "url": "https://ad.doubleclick.net/ddm/pfadx/N470801.134502VIDEOLOGY/B10713766.143108226;sz=0x0;ord=2022068331;dc_lat=;dc_rdid=;tag_for_child_directed_treatment=;dcmt=text/xml",
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

        it('sends bid request to ENDPOINT via POST', () => {
            adapter.callBids(REQUEST);
            expect(requests[0].url).to.equal(ENDPOINT);
            // expect(requests[0].method).to.equal('POST');
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
                appId: "0a47f4ce-d91f-48d0-bd1c-64fa2c196f13",
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
