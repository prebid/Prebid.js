import { expect } from 'chai';
import Adapter from 'src/adapters/vertamedia';
import bidmanager from 'src/bidmanager';

const ENDPOINT = 'http://rtb.vertamedia.com/hb/?aid=22489&w=640&h=480&domain=localhost';

const REQUEST = {
    "bidderCode": "vertamedia",
    "requestId": "d3e07445-ab06-44c8-a9dd-5ef9af06d2a6",
    "bidderRequestId": "7101db09af0db2",
    "bids": [
        {
            "bidder": "vertamedia",
            "params": {
                aid: 22489,
                placementId: '123456'
            },
            "placementCode": "/19968336/header-bid-tag1",
            "sizes": [640, 480],
            "bidId": "84ab500420319d",
            "bidderRequestId": "7101db09af0db2",
            "requestId": "d3e07445-ab06-44c8-a9dd-5ef9af06d2a6"
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
            "cpm": 4.5,
            "url": "http://rtb.vertamedia.com/vast?adid=BFDB9CC0038AD918",
            "cur": "USD"
        }
    ]
};


describe('VertamediaAdater', () => {

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

        it('requires paramters to make request', () => {
            adapter.callBids({});
            expect(requests).to.be.empty;
        });

        it('requires member && invCode', () => {
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

        it('registers bids', () => {
            server.respondWith(JSON.stringify(RESPONSE));

            adapter.callBids(REQUEST);
            server.respond();
            sinon.assert.calledOnce(bidmanager.addBidResponse);

            const response = bidmanager.addBidResponse.firstCall.args[1];
            expect(response).to.have.property('statusMessage', 'Bid available');
            expect(response).to.have.property('cpm', 4.5);
        });

        it('handles nobid responses', () => {
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

        it('handles JSON.parse errors', () => {
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
