import { expect } from 'chai';
import Adapter from '../../../src/adapters/adbund';
import bidManager from 'src/bidmanager';
import CONSTANTS from 'src/constants.json';

describe('adbund adapter tests', function () {

    let sandbox;
    const request = {
        bidderCode: 'adbund',
        bids: [{
            bidder: 'adbund',
            params: {
                sid: '110238',
                bidfloor: 0.036
            },
            placementCode: 'adbund',
			sizes: [[300, 250]],
            bidId: 'adbund_bidId',
            bidderRequestId: 'adbund_bidderRequestId',
            requestId: 'adbund_requestId'
        }]
    };

    const response = {
        cpm: 1.06,
        height: 250,
        width: 300
    };

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('adbund callBids validation', () => {

        let bids,
            server;

        beforeEach(() => {
            bids = [];
            server = sinon.fakeServer.create();
            sandbox.stub(bidManager, 'addBidResponse', (elemId, bid) => {
                bids.push(bid);
            });
        });

        afterEach(() => {
            server.restore();
        });

        it('Valid bid-request', () => {
            sandbox.stub(Adapter, 'callBids');
			Adapter.callBids(request);

            let bidderRequest = Adapter.callBids.getCall(0).args[0];

            expect(bidderRequest).to.have.property('bids')
                .that.is.an('array')
                .with.lengthOf(1);

            expect(bidderRequest).to.have.deep.property('bids[0]')
                .to.have.property('bidder', 'adbund');

            expect(bidderRequest).to.have.deep.property('bids[0]')
                .with.property('sizes')
                .that.is.an('array')
                .with.lengthOf(1)
                .that.deep.equals(request.bids[0].sizes);

            expect(bidderRequest).to.have.deep.property('bids[0]')
                .with.property('params')
                .to.have.property('bidfloor', 0.036);
        });

        it('Valid bid-response', ()=>{
            server.respondWith(JSON.stringify(
                response
            ));
			Adapter.callBids(request);
            server.respond();

            expect(bids).to.be.lengthOf(1);
            expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
            expect(bids[0].bidderCode).to.equal("adbund");
            expect(bids[0].width).to.equal(300);
            expect(bids[0].height).to.equal(250);
            expect(bids[0].cpm).to.equal(1.06);
        });
    });
});

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}