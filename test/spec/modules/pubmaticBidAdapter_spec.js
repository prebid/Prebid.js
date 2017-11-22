import {
  expect
} from 'chai';
import * as utils from 'src/utils';
import PubMaticAdapter from 'modules/pubmaticBidAdapter';
import bidmanager from 'src/bidmanager';
import constants from 'src/constants.json';

let getDefaultBidRequest = () => {
  return {
    bidderCode: 'pubmatic',
    requestId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
    bidderRequestId: '7101db09af0db2',
    start: new Date().getTime(),
    bids: [{
      bidder: 'pubmatic',
      bidId: '84ab500420319d',
      bidderRequestId: '7101db09af0db2',
      requestId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
      placementCode: 'DIV_1',
      params: {
        placement: 1234567,
        network: '9599.1'
      }
    }]
  };
};

describe('PubMaticAdapter', () => {
  let adapter;

  function createBidderRequest({
    bids,
    params
  } = {}) {
    var bidderRequest = getDefaultBidRequest();
    if (bids && Array.isArray(bids)) {
      bidderRequest.bids = bids;
    }
    if (params) {
      bidderRequest.bids.forEach(bid => bid.params = params);
    }
    return bidderRequest;
  }

  beforeEach(() => adapter = new PubMaticAdapter());

  describe('callBids()', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    describe('user syncup', () => {
      beforeEach(() => {
        sinon.stub(utils, 'insertElement');
      });

      afterEach(() => {
        utils.insertElement.restore();
      });

      it('usersync is initiated', () => {
        adapter.callBids(createBidderRequest({
          params: {
            publisherId: 9999,
            adSlot: 'abcd@728x90',
            age: '20'
          }
        }));
        utils.insertElement.calledOnce.should.be.true;
        expect(utils.insertElement.getCall(0).args[0].src).to.equal('http://ads.pubmatic.com/AdServer/js/showad.js#PIX&kdntuid=1&p=9999');
      });
    });

    describe('bid request', () => {
      beforeEach(() => {
        sinon.stub(utils, 'createContentToExecuteExtScriptInFriendlyFrame', function() {
          return '';
        });
      });

      afterEach(() => {
        utils.createContentToExecuteExtScriptInFriendlyFrame.restore();
      });

      it('requires parameters to be made', () => {
        adapter.callBids({});
        utils.createContentToExecuteExtScriptInFriendlyFrame.calledOnce.should.be.false;
      });

      it('for publisherId 9990 call is made to gads.pubmatic.com', () => {
        var bidRequest = createBidderRequest({
          params: {
            publisherId: 9990,
            adSlot: '     abcd@728x90',
            age: '20',
            wiid: 'abcdefghijk',
            profId: '1234',
            verId: '12',
            pmzoneid: 'abcd123, efg345',
            dctr: 'key=1234,5678'
          }
        });
        adapter.callBids(bidRequest);
        var callURL = utils.createContentToExecuteExtScriptInFriendlyFrame.getCall(0).args[0];
        expect(bidRequest.bids[0].params.adSlot).to.equal('abcd@728x90');
        expect(callURL).to.contain('gads.pubmatic.com/AdServer/AdCallAggregator?');
        expect(callURL).to.contain('SAVersion=1100');
        expect(callURL).to.contain('wp=PreBid');
        expect(callURL).to.contain('js=1');
        expect(callURL).to.contain('screenResolution=');
        expect(callURL).to.contain('wv=' + constants.REPO_AND_VERSION);
        expect(callURL).to.contain('ranreq=');
        expect(callURL).to.contain('inIframe=');
        expect(callURL).to.contain('pageURL=');
        expect(callURL).to.contain('refurl=');
        expect(callURL).to.contain('kltstamp=');
        expect(callURL).to.contain('timezone=');
        expect(callURL).to.contain('age=20');
        expect(callURL).to.contain('adslots=%5Babcd%40728x90%5D');
        expect(callURL).to.contain('kadpageurl=');
        expect(callURL).to.contain('wiid=abcdefghijk');
        expect(callURL).to.contain('profId=1234');
        expect(callURL).to.contain('verId=12');
        expect(callURL).to.contain('pmZoneId=abcd123%2C%20efg345');
        expect(callURL).to.contain('dctr=key%3D1234%2C5678');
      });

      it('for publisherId 9990 call is made to gads.pubmatic.com, age passed as int not being passed ahead', () => {
        adapter.callBids(createBidderRequest({
          params: {
            publisherId: 9990,
            adSlot: 'abcd@728x90',
            age: 20,
            wiid: 'abcdefghijk',
            profId: '1234',
            verId: '12',
            pmzoneid: {},
            dctr: 1234
          }
        }));
        var callURL = utils.createContentToExecuteExtScriptInFriendlyFrame.getCall(0).args[0];
        expect(callURL).to.contain('gads.pubmatic.com/AdServer/AdCallAggregator?');
        expect(callURL).to.not.contain('age=20');
        expect(callURL).to.not.contain('dctr=1234');
      });

      it('for publisherId 9990 call is made to gads.pubmatic.com, invalid data for pmzoneid', () => {
        adapter.callBids(createBidderRequest({
          params: {
            publisherId: 9990,
            adSlot: 'abcd@728x90',
            age: '20',
            wiid: 'abcdefghijk',
            profId: '1234',
            verId: '12',
            pmzoneid: {},
            dctr: 1234
          }
        }));
        var callURL = utils.createContentToExecuteExtScriptInFriendlyFrame.getCall(0).args[0];
        expect(callURL).to.contain('gads.pubmatic.com/AdServer/AdCallAggregator?');
        expect(callURL).to.not.contain('pmZoneId=');
      });
    });

    describe('#handlePubmaticCallback: ', () => {
      beforeEach(() => {
        sinon.stub(utils, 'createContentToExecuteExtScriptInFriendlyFrame', function() {
          return '';
        });
        sinon.stub(bidmanager, 'addBidResponse');
      });

      afterEach(() => {
        utils.createContentToExecuteExtScriptInFriendlyFrame.restore();
        bidmanager.addBidResponse.restore();
      });

      it('exists and is a function', () => {
        expect($$PREBID_GLOBAL$$.handlePubmaticCallback).to.exist.and.to.be.a('function');
      });

      it('empty response, arguments not passed', () => {
        adapter.callBids(createBidderRequest({
          params: {
            publisherId: 9999,
            adSlot: 'abcd@728x90',
            age: '20'
          }
        }));
        $$PREBID_GLOBAL$$.handlePubmaticCallback();
        expect(bidmanager.addBidResponse.callCount).to.equal(0);
      });

      it('empty response', () => {
        adapter.callBids(createBidderRequest({
          params: {
            publisherId: 9999,
            adSlot: 'abcd@728x90',
            age: '20'
          }
        }));
        $$PREBID_GLOBAL$$.handlePubmaticCallback({}, {});
        sinon.assert.called(bidmanager.addBidResponse);
        expect(bidmanager.addBidResponse.firstCall.args[0]).to.equal('DIV_1');
        var theBid = bidmanager.addBidResponse.firstCall.args[1];
        expect(theBid.bidderCode).to.equal('pubmatic');
        expect(theBid.getStatusCode()).to.equal(2);
      });

      it('not empty response', () => {
        adapter.callBids(createBidderRequest({
          params: {
            publisherId: 9999,
            adSlot: 'abcd@728x90:0',
            age: '20'
          }
        }));
        $$PREBID_GLOBAL$$.handlePubmaticCallback({
          'abcd@728x90:0': {
            'ecpm': 10,
            'creative_tag': 'hello',
            'tracking_url': 'http%3a%2f%2fhaso.pubmatic.com%2fads%2f9999%2fGRPBID%2f2.gif%3ftrackid%3d12345',
            'width': 728,
            'height': 90,
            'deal_channel': 5
          }
        }, {
          'abcd@728x90:0': 'bidstatus;1;bid;10.0000;bidid;abcd@728x90:0;wdeal;PMERW36842'
        });
        sinon.assert.called(bidmanager.addBidResponse);
        expect(bidmanager.addBidResponse.firstCall.args[0]).to.equal('DIV_1');
        var theBid = bidmanager.addBidResponse.firstCall.args[1];
        expect(theBid.bidderCode).to.equal('pubmatic');
        expect(theBid.adSlot).to.equal('abcd@728x90:0');
        expect(theBid.cpm).to.equal(10);
        expect(theBid.width).to.equal(728);
        expect(theBid.height).to.equal(90);
        expect(theBid.dealId).to.equal('PMERW36842');
        expect(theBid.dealChannel).to.equal('PREF');
      });

      it('not empty response, without dealChannel', () => {
        adapter.callBids(createBidderRequest({
          params: {
            publisherId: 9999,
            adSlot: 'abcd@728x90',
            age: '20'
          }
        }));
        $$PREBID_GLOBAL$$.handlePubmaticCallback({
          'abcd@728x90': {
            'ecpm': 10,
            'creative_tag': 'hello',
            'tracking_url': 'http%3a%2f%2fhaso.pubmatic.com%2fads%2f9999%2fGRPBID%2f2.gif%3ftrackid%3d12345',
            'width': 728,
            'height': 90
          }
        }, {
          'abcd@728x90': 'bidstatus;1;bid;10.0000;bidid;abcd@728x90:0;wdeal;PMERW36842'
        });
        sinon.assert.called(bidmanager.addBidResponse);
        expect(bidmanager.addBidResponse.firstCall.args[0]).to.equal('DIV_1');
        var theBid = bidmanager.addBidResponse.firstCall.args[1];
        expect(theBid.bidderCode).to.equal('pubmatic');
        expect(theBid.adSlot).to.equal('abcd@728x90');
        expect(theBid.cpm).to.equal(10);
        expect(theBid.width).to.equal(728);
        expect(theBid.height).to.equal(90);
        expect(theBid.dealId).to.equal('PMERW36842');
        expect(theBid.dealChannel).to.equal(null);
      });
    });
  });
});
