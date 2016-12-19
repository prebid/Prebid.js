import {expect} from 'chai';
import _ from 'lodash';
var utils = require('../../../src/utils');
import sekindoUMAdapter from '../../../src/adapters/sekindoUM';
var bidManager = require('src/bidmanager');


describe("sekindoUM Adapter Tests", () => {

    let _sekindoUMAdapter;
    var addBidResponseSpy;

    const bidderRequest = {
        bidderCode: 'sekindoUM',
        bids: [{
            bidder: 'sekindoUM',
            bidId: 'sekindo_bidId',
            bidderRequestId: 'sekindo_bidderRequestId',
            requestId: 'sekindo_requestId',
            placementCode: 'foo',
            params: {
                spaceId: 14071
            }
        }]
    };

     beforeEach(() => {
         pbjs._bidsRequested = [];
        _sekindoUMAdapter = new sekindoUMAdapter();
     });

     afterEach(() => {
         pbjs._bidsRequested = [];
     });


    describe('sekindoUM callBids', () => {

        beforeEach(() => {
            _sekindoUMAdapter.callBids(bidderRequest);
            });

        it('Verify sekindo hidden iframe was created', () => {
            //expect('#skIfr_'+bidderRequest.bids[0].bidId).dom.to.have.style('display', 'none');
            //expect('#skIfr_'+bidderRequest.bids[0].bidId).dom.to.have.attribute('height', '0');
            //expect('#skIfr_'+bidderRequest.bids[0].bidId).dom.to.have.attribute('width', '0');
            expect(document.getElementById('skIfr_'+bidderRequest.bids[0].bidId).style.display).to.equal('none');
            expect(document.getElementById('skIfr_'+bidderRequest.bids[0].bidId).height).to.equal('0');
            expect(document.getElementById('skIfr_'+bidderRequest.bids[0].bidId).width).to.equal('0');


        });
    });


    describe('Should submit bid responses correctly', function () {

        beforeEach(function () {
            addBidResponseSpy = sinon.stub(bidManager, 'addBidResponse');
            $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);
            _sekindoUMAdapter = new sekindoUMAdapter();
        });

        afterEach(function () {
            addBidResponseSpy.restore();
        });

        it('Should correctly submit valid bid to the bid manager', function () {
            var HB_bid = {
                adId : 'sekindoUM_bidId',
                cpm :0.23,
                width : 300,
                height : 250,
                ad : '<h1>test ad</h1>'
            };

            $$PREBID_GLOBAL$$.sekindoCB(bidderRequest.bids[0].bidId, HB_bid);
            var firstBid = addBidResponseSpy.getCall(0).args[1];
            var placementCode1 = addBidResponseSpy.getCall(0).args[0];

            expect(firstBid.getStatusCode()).to.equal(1);
            expect(firstBid.bidderCode).to.equal('sekindoUM');
            expect(firstBid.cpm).to.equal(0.23);
            expect(firstBid.ad).to.equal('<h1>test ad</h1>');
            expect(placementCode1).to.equal('foo');

            expect(addBidResponseSpy.getCalls().length).to.equal(1);
        });
    });


});
