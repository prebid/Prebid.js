import {expect} from 'chai';
import {cloneJson} from 'src/utils';
import adloader from 'src/adloader';
import bidmanager from 'src/bidmanager';
import LifestreetAdapter from 'modules/lifestreetBidAdapter';

const BIDDER_REQUEST = {
  auctionStart: new Date().getTime(),
  bidderCode: 'lifestreet',
  bidderRequestId: '42af176a304779',
  bids: [{
    bidId: '5b19582c30a2d9',
    bidder: 'lifestreet',
    bidderRequestId: '42af176a304779',
    params: {
      ad_size: '160x600',
      adkey: '78c',
      jstag_url: '//ads.lfstmedia.com/getad?site=285071',
      slot: 'slot166704',
      timeout: 1500
    },
    placementCode: 'bar',
    requestId: '6657bfa9-46b9-4ed8-9ce5-956f96efb13d',
    sizes: [[160, 600]]
  }],
  requestId: '6657bfa9-46b9-4ed8-9ce5-956f96efb13d',
  start: new Date().getTime() + 4,
  timeout: 3000
};

describe('LifestreetAdapter', () => {
  let adapter;
  beforeEach(() => adapter = new LifestreetAdapter());

  describe('callBids()', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    describe('request', () => {
      let tagRequests;
      let slotParams;
      let request;

      beforeEach(() => {
        tagRequests = [];
        request = cloneJson(BIDDER_REQUEST);
        sinon.stub(adloader, 'loadScript').callsFake((url, callback) => {
          tagRequests.push(url);
          callback();
        });
        slotParams = {};
        window.LSM_Slot = (params) => {
          slotParams = params;
        };
      });
      afterEach(() => {
        adloader.loadScript.restore();
        window.LSM_Slot = undefined;
      });

      it('parameters should present', () => {
        adapter.callBids({});
        expect(tagRequests).to.be.empty;
      });

      it('parameters do not have supported size', () => {
        request.bids[0].sizes = [[728, 90], [970, 90]];
        adapter.callBids(request);
        expect(tagRequests).to.be.empty;
      });

      it('tag when size is supported', () => {
        request.bids[0].sizes = [[728, 90], [970, 90], [160, 600]];
        adapter.callBids(request);
        expect(tagRequests.length).to.equal(1);
      });

      it('tag when one size is provided', () => {
        request.bids[0].sizes = [160, 600];
        adapter.callBids(request);
        expect(tagRequests.length).to.equal(1);
      });

      it('wrong size is provided', () => {
        request.bids[0].sizes = [160];
        adapter.callBids(request);
        expect(tagRequests).to.be.empty;
      });

      it('ad_size is not provided', () => {
        request.bids[0].params.ad_size = '';
        adapter.callBids(request);
        expect(tagRequests).to.be.empty;
      });

      it('slot is not provided', () => {
        request.bids[0].params.slot = '';
        adapter.callBids(request);
        expect(tagRequests).to.be.empty;
      });

      it('adkey is not provided', () => {
        request.bids[0].params.adkey = '';
        adapter.callBids(request);
        expect(tagRequests).to.be.empty;
      });

      it('jstag_url is not provided', () => {
        request.bids[0].params.jstag_url = '';
        adapter.callBids(request);
        expect(tagRequests).to.be.empty;
      });

      it('should request a tag', () => {
        window.LSM_Slot = undefined;
        adapter.callBids(request);
        expect(tagRequests.length).to.equal(1);
        expect(tagRequests[0]).to.contain('ads.lfstmedia.com/getad?site=285071');
      });

      it('LSM_Slot function should contain expected parameters', () => {
        adapter.callBids(request);
        expect(slotParams.ad_size).to.equal('160x600');
        expect(slotParams.adkey).to.equal('78c');
        expect(slotParams.slot).to.equal('slot166704');
        expect(slotParams._preload).to.equal('wait');
        expect(slotParams._hb_request).to.equal('prebidJS-1.0');
        expect(slotParams._timeout).to.equal(1500);
        expect(slotParams).to.have.ownProperty('_onload');
      });

      it('Default timeout should be 700 milliseconds', () => {
        request.bids[0].params.timeout = 0;
        adapter.callBids(request);
        expect(slotParams._timeout).to.equal(700);
      });
    });

    describe('response', () => {
      let slot;
      let price;
      let width;
      let height;

      beforeEach(() => {
        sinon.stub(bidmanager, 'addBidResponse');
        sinon.stub(adloader, 'loadScript').callsFake((url, callback) => {
          callback();
        });
        slot = {};
        price = 1.0;
        width = 160;
        height = 600;
        window.LSM_Slot = (params) => {
          params._onload(slot, '', price, width, height);
        };
      });
      afterEach(() => {
        bidmanager.addBidResponse.restore();
        adloader.loadScript.restore();
        window.LSM_Slot = undefined;
      });

      it('nobid for undefined LSM_Slot function', () => {
        window.LSM_Slot = undefined;
        adapter.callBids(BIDDER_REQUEST);
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        expect(bidmanager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(2);
      });

      it('nobid for error response', () => {
        slot.state = () => { return 'error'; };
        adapter.callBids(BIDDER_REQUEST);
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        expect(bidmanager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(2);
      });

      it('show existing slot', () => {
        let isShown = false;
        slot.state = () => { return 'loaded'; };
        slot.getSlotObjectName = () => { return ''; };
        slot.show = () => { isShown = true; };
        adapter.callBids(BIDDER_REQUEST);
        expect(bidmanager.addBidResponse.calledOnce).to.be.false;
        expect(isShown).to.be.true;
      });

      it('should bid', () => {
        slot.state = () => { return 'loaded'; };
        slot.getSlotObjectName = () => { return 'Test Slot'; };
        adapter.callBids(BIDDER_REQUEST);
        expect(bidmanager.addBidResponse.calledOnce).to.be.true;
        let bidResponse = bidmanager.addBidResponse.firstCall.args[1];
        expect(bidResponse.getStatusCode()).to.equal(1);
        expect(bidResponse.ad).to.equal(`<div id="LSM_AD"></div>
             <script type="text/javascript" src='//ads.lfstmedia.com/getad?site=285071'></script>
             <script>
              function receivedLSMMessage(ev) {
                var key = ev.message ? 'message' : 'data';
                var object = {};
                try {
                  object = JSON.parse(ev[key]);
                } catch (e) {
                  return;
                }
                if (object.message === 'LSMPrebid Response' && object.slotObject) {
                  var slot  = object.slotObject;
                  slot.__proto__ = slotapi.Slot.prototype;
                  slot.getProperties()['_onload'] = function(slot) {
                    if (slot.state() !== 'error') {
                      slot.show();
                    }
                  };
                  window[slot.getSlotObjectName()] = slot;
                  slot.showInContainer(document.getElementById("LSM_AD"));
                }
              }
              window.addEventListener('message', receivedLSMMessage, false);
              window.parent.postMessage(JSON.stringify({
                message: 'LSMPrebid Request',
                slotName: 'Test Slot'
              }), '*');
            </script>`);
        expect(bidResponse.cpm).to.equal(1.0);
        expect(bidResponse.width).to.equal(160);
        expect(bidResponse.height).to.equal(600);
      });
    });
  });
});
