import { expect } from 'chai';
import Adapter from '../../../src/adapters/huddledmasses';
import adapterManager from 'src/adaptermanager';
import bidManager from 'src/bidmanager';
import CONSTANTS from 'src/constants.json';

describe('HuddledMasses adapter tests', function () {

    let sandbox;
    const adUnit = {
        code: 'huddledmasses',
        sizes: [[300, 250], [300,600]],
        bids: [{
            bidder: 'huddledmasses',
            params: {
                placement_id: 0
            }
        }]
    };

    const response = {
        ad_id: 15,
        adm: "<div>Bid Response</div>",
        cpm: 0.712,
        deal: "5e1f0a8f2aa1",
        width: 300,
        height: 250
    };

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('HuddledMasses callBids validation', () => {

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

        let adapter = adapterManager.bidderRegistry['huddledmasses'];

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
                .to.have.property('bidder', 'huddledmasses');

            expect(bidderRequest).to.have.deep.property('bids[0]')
                .with.property('sizes')
                .that.is.an('array')
                .with.lengthOf(2)
                .that.deep.equals(adUnit.sizes);
            expect(bidderRequest).to.have.deep.property('bids[0]')
                .with.property('params')
                .to.have.property('placement_id', 0);
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
            expect(bids[0].bidderCode).to.equal("huddledmasses");
            expect(bids[0].width).to.equal(300);
            expect(bids[0].height).to.equal(250);
            expect(bids[0].cpm).to.equal(0.712);
            expect(bids[0].dealId).to.equal("5e1f0a8f2aa1");
        });
    });

    describe('MAS mapping / ordering', () => {

        let masSizeOrdering = Adapter.masSizeOrdering;

        it('should not include values without a proper mapping', () => {
            let ordering = masSizeOrdering([[320, 50], [42, 42], [300, 250], [640, 480], [0, 0]]);
            expect(ordering).to.deep.equal([15, 43, 65]);
        });

        it('should sort values without any MAS priority sizes in regular ascending order', () => {
            let ordering = masSizeOrdering([[320, 50], [640, 480], [200, 600]]);
            expect(ordering).to.deep.equal([43, 65, 119]);
        });

        it('should sort MAS priority sizes in the proper order w/ rest ascending', () => {
            let ordering = masSizeOrdering([[320, 50], [640, 480], [300, 250], [200, 600]]);
            expect(ordering).to.deep.equal([15, 43, 65, 119]);

            ordering = masSizeOrdering([[320, 50], [300, 250], [640, 480], [200, 600], [728, 90]]);
            expect(ordering).to.deep.equal([15, 2, 43, 65, 119]);

            ordering = masSizeOrdering([ [320, 50], [640, 480], [200, 600], [728, 90]]);
            expect(ordering).to.deep.equal([2, 43, 65, 119]);
        })
    });
});

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}