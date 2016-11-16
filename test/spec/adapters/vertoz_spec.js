import {expect} from 'chai';
import {assert} from 'chai';
import Adapter from '../../../src/adapters/vertoz';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';

describe('Vertoz Adapter', () => {
    let adapter;
    let sandbox;
    let bidsRequestBuff;
    const bidderRequest = {
        bidderCode: 'vertoz',
        bids: [{
            bidId: 'bidId1',
            bidder: 'vertoz',
            placementCode: 'foo',
            sizes: [
                [300, 250]
            ],
            params: {
                placementId: 'VZ-HB-123'
            }
        },{
            bidId: 'bidId2',
            bidder: 'vertoz',
            placementCode: 'bar',
            sizes: [
                [728, 90]
            ],
            params: {
                placementId: 'VZ-HB-456'
            }
        },{
            bidId: 'bidId3',
            bidder: 'vertoz',
            placementCode: 'coo',
            sizes: [
                [300, 600]
            ],
            params: {
                placementId: ''
            }
        }]
    };

    beforeEach(() => {
        adapter = new Adapter();
        sandbox = sinon.sandbox.create();
        bidsRequestBuff = pbjs._bidsRequested;
        pbjs._bidsRequested = [];
    });

    afterEach(() => {
        sandbox.restore();
        pbjs._bidsRequested = bidsRequestBuff;
    });

    describe('callBids', () => {
        beforeEach(() => {
            sandbox.stub(adLoader, 'loadScript');
            adapter.callBids(bidderRequest);
        });

        it('should be called twice', () => {
            sinon.assert.calledTwice(adLoader.loadScript);
        });

    });

    describe('Bid response', () => {
        let vzBidRequest;
        let bidderReponse = {
            "vzhPlacementId": "VZ-HB-123",
            "bid": "0fac1b8a-6ba0-4641-bd57-2899b1bedeae_0",
            "adWidth": "300",
            "adHeight": "250",
            "cpm": "1.00000000000000",
            "ad": "<div></div>",
            "slotBidId": "bidId1",
            "nurl": "<img></img>",
            "statusText": "vertoz:success"
        };

        beforeEach(() => {
            pbjs._bidsRequested.push(bidderRequest);
        });

        describe('success', () => {
            let firstBidReg;
            let adSpaceId;

            beforeEach(() => {
                sandbox.stub(bidManager, 'addBidResponse');
                pbjs.vzResponse(bidderReponse);
                firstBidReg = bidManager.addBidResponse.firstCall.args[1];
                adSpaceId = bidManager.addBidResponse.firstCall.args[0];
            });

            it('cpm to have property 1.000000', () => {
                expect(firstBidReg).to.have.property('cpm', 1.00);
            });
            it('adSpaceId should exist and be equal to placementCode', () => {
                expect(adSpaceId).to.equal("foo");
            });
            it('should have property ad', () => {
                expect(firstBidReg).to.have.property('ad');
            });
            it('should include the size to the bid object', () => {
                expect(firstBidReg).to.have.property('width', '300');
                expect(firstBidReg).to.have.property('height', '250');
            });

        });

        describe('failure', () => {
            let secondBidReg;
            let adSpaceId;
            let bidderResponse = {
                "vzhPlacementId": "VZ-HB-456",
                "slotBidId": "bidId2",
                "statusText": "vertoz:NO_BIDS"
            }

            beforeEach(() => {
                sandbox.stub(bidManager, 'addBidResponse');
                pbjs.vzResponse(bidderResponse);
                secondBidReg = bidManager.addBidResponse.firstCall.args[1];
                adSpaceId = bidManager.addBidResponse.firstCall.args[0];
            });

            it('should not have cpm property', () => {
                expect(secondBidReg.cpm).to.be.undefined;
            });
            it('adSpaceId should exist and be equal to placementCode', () => {
                expect(adSpaceId).to.equal("bar");
            });
            it('should not have ad property', () => {
                expect(secondBidReg.ad).to.be.undefined;
            });

        });

    });

});
