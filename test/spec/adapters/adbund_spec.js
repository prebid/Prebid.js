import { expect } from 'chai';
import Adapter from '../../../src/adapters/adbund';
import adapterManager from 'src/adaptermanager';
import bidManager from 'src/bidmanager';
import CONSTANTS from 'src/constants.json';

describe('adbund adapter tests', function () {

    let sandbox;
    const adUnit = {
        code: 'adbund',
        sizes: [[300, 250]],
        bids: [{
            bidder: 'adbund',
            params: {
                sid: '110238',
				bidfloor: 0.036
            }
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

        let adapter = adapterManager.bidderRegistry['adbund'];

        it('Valid bid-request', () => {
            sandbox.stub(adapter, 'callBids');
            adapterManager.callBids({
                adUnits: [clone(adUnit)]
            });

            let bidderRequest = adapter.callBids.getCall(0).args[0];

            expect(bidderRequest).to.have.property('bids')
                .that.is.an('array')
                .with.lengthOf(1);

            expect(bidderRequest).to.have.deep.property('bids[0]')
                .to.have.property('bidder', 'adbund');

            expect(bidderRequest).to.have.deep.property('bids[0]')
                .with.property('sizes')
                .that.is.an('array')
                .with.lengthOf(1)
                .that.deep.equals(adUnit.sizes);
            expect(bidderRequest).to.have.deep.property('bids[0]')
                .with.property('params')
                .to.have.property('bidfloor', 0);
        });

        it('Valid bid-response', ()=>{
            server.respondWith(JSON.stringify(
                response
            ));
            adapterManager.callBids({
                adUnits: [clone(adUnit)]
            });
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