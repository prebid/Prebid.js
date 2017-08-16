import Adapter from 'modules/coxBidAdapter';
import bidManager from 'src/bidmanager';
import adLoader from 'src/adloader';
import {expect} from 'chai';

describe('CoxAdapter', () => {
  let adapter;
  let loadScriptStub;
  let addBidResponseSpy;

  let emitScript = (script) => {
    let node = document.createElement('script');
    node.type = 'text/javascript';
    node.appendChild(document.createTextNode(script));
    document.getElementsByTagName('head')[0].appendChild(node);
  };

  beforeEach(() => {
    adapter = new Adapter();
    addBidResponseSpy = sinon.spy(bidManager, 'addBidResponse');
  });

  afterEach(() => {
    loadScriptStub.restore();
    addBidResponseSpy.restore();
  });

  describe('response handling', () => {
    const normalResponse = 'cdsTag.__callback__({"zones":{"as2000005991707":{"ad" : "<h1>FOO<\/h1>","uid" : "","price" : 1.51,"floor" : 0,}},"tpCookieSync":"<h1>FOOKIE<\/h1>"})';
    const zeroPriceResponse = 'cdsTag.__callback__({"zones":{"as2000005991707":{"ad" : "<h1>DEFAULT FOO<\/h1>","uid" : "","price" : 0,"floor" : 0,}},"tpCookieSync":"<h1>FOOKIE<\/h1>"})';
    const incompleteResponse = 'cdsTag.__callback__({"zones":{},"tpCookieSync":"<h1>FOOKIE<\/h1>"})';

    const oneBidConfig = {
      bidderCode: 'cox',
      bids: [{
        bidder: 'cox',
        placementCode: 'FOO456789',
        sizes: [300, 250],
        params: { size: '300x250', id: 2000005991707, siteId: 2000100948180, env: 'PROD' },
      }]
    };

    // ===== 1
    it('should provide a correctly populated Bid given a valid response', () => {
      loadScriptStub = sinon.stub(adLoader, 'loadScript').callsFake(() => { emitScript(normalResponse); })

      adapter.callBids(oneBidConfig);

      let bid = addBidResponseSpy.args[0][1];
      expect(bid.cpm).to.equal(1.51);
      expect(bid.ad).to.be.a('string');
      expect(bid.bidderCode).to.equal('cox');
    });

    // ===== 2
    it('should provide an empty Bid given a zero-price response', () => {
      loadScriptStub = sinon.stub(adLoader, 'loadScript').callsFake(() => { emitScript(zeroPriceResponse); })

      adapter.callBids(oneBidConfig);

      let bid = addBidResponseSpy.args[0][1];
      expect(bid.cpm).to.not.be.ok
      expect(bid.ad).to.not.be.ok;
    });

    // ===== 3
    it('should provide an empty Bid given an incomplete response', () => {
      loadScriptStub = sinon.stub(adLoader, 'loadScript').callsFake(() => { emitScript(incompleteResponse); })

      adapter.callBids(oneBidConfig);

      let bid = addBidResponseSpy.args[0][1];
      expect(bid.cpm).to.not.be.ok
      expect(bid.ad).to.not.be.ok;
    });

    // ===== 4
    it('should not provide a Bid given no response', () => {
      loadScriptStub = sinon.stub(adLoader, 'loadScript').callsFake(() => { emitScript(''); });

      adapter.callBids(oneBidConfig);

      expect(addBidResponseSpy.callCount).to.equal(0);
    });
  });

  describe('request generation', () => {
    const missingBidsConfig = {
      bidderCode: 'cox',
      bids: null,
    };
    const missingParamsConfig = {
      bidderCode: 'cox',
      bids: [{
        bidder: 'cox',
        placementCode: 'FOO456789',
        sizes: [300, 250],
        params: null,
      }]
    };

    // ===== 5
    it('should not make an ad call given missing bids in config', () => {
      loadScriptStub = sinon.stub(adLoader, 'loadScript');

      adapter.callBids(missingBidsConfig);

      expect(loadScriptStub.callCount).to.equal(0);
    });

    // ===== 6
    it('should not make an ad call given missing params in config', () => {
      loadScriptStub = sinon.stub(adLoader, 'loadScript');

      adapter.callBids(missingParamsConfig);

      expect(loadScriptStub.callCount).to.equal(0);
    });
  });
});
