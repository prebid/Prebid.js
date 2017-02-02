import { expect } from 'chai';
import Adapter from '../../../src/adapters/smartyads';
import adapterManager from 'src/adaptermanager';
import bidManager from 'src/bidmanager';
import CONSTANTS from 'src/constants.json';

describe('Smartyads adapter tests', function () {

    let sandbox;
    const adUnit = { // TODO CHANGE
        code: 'smartyads',
        sizes: [[300, 250], [300,600], [320, 80]],
        bids: [{
            bidder: 'smartyads',
            params: {
                banner_id: 0
            }
        }]
    };

    const response = {
        ad_id: 0,
        adm: "<span>Test Response</span>",
        cpm: 0.5,
        deal: "bf063e2e025c",
        height: 240,
        width: 360
    };

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Smartyads callBids validation', () => {

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

        let adapter = adapterManager.bidderRegistry['smartyads'];

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
                .to.have.property('bidder', 'smartyads');

            expect(bidderRequest).to.have.deep.property('bids[0]')
                .with.property('sizes')
                .that.is.an('array')
                .with.lengthOf(3)
                .that.deep.equals(adUnit.sizes);
            expect(bidderRequest).to.have.deep.property('bids[0]')
                .with.property('params')
                .to.have.property('banner_id', 0);
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
            expect(bids[0].bidderCode).to.equal("smartyads");
            expect(bids[0].width).to.equal(360);
            expect(bids[0].height).to.equal(240);
            expect(bids[0].cpm).to.equal(0.5);
            expect(bids[0].dealId).to.equal("bf063e2e025c");
        });
    });

    describe('MAS mapping / ordering', () => {

        let masSizeOrdering = Adapter.masSizeOrdering;

        it('should not include values without a proper mapping', () => {
            let ordering = masSizeOrdering([[320, 50], [42, 42], [300, 250], [640, 480], [1, 1], [336, 280]]);
            expect(ordering).to.deep.equal([15, 16, 43, 65]);
        });

        it('should sort values without any MAS priority sizes in regular ascending order', () => {
            let ordering = masSizeOrdering([[320, 50], [640, 480], [336, 280], [200, 600]]);
            expect(ordering).to.deep.equal([16, 43, 65, 126]);
        });

        it('should sort MAS priority sizes in the proper order w/ rest ascending', () => {
            let ordering = masSizeOrdering([[320, 50], [160,600], [640, 480], [300, 250],[336, 280], [200, 600]]);
            expect(ordering).to.deep.equal([15, 9, 16, 43, 65, 126]);

            ordering = masSizeOrdering([[320, 50], [300, 250], [160,600], [640, 480],[336, 280], [200, 600], [728, 90]]);
            expect(ordering).to.deep.equal([15, 2, 9, 16, 43, 65, 126]);

            ordering = masSizeOrdering([[120, 600], [320, 50], [160,600], [640, 480],[336, 280], [200, 600], [728, 90]]);
            expect(ordering).to.deep.equal([2, 9, 8, 16, 43, 65, 126]);
        })
    });
});

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}