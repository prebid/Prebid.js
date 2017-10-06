import { expect } from 'chai';
import AdapterManager from 'src/adaptermanager';
import { getAdUnits } from 'test/fixtures/fixtures';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

const CONFIG = {
  enabled: true,
  endpoint: CONSTANTS.S2S.DEFAULT_ENDPOINT,
  timeout: 1000,
  maxBids: 1,
  adapter: 'prebidServer',
  bidders: ['appnexus']
};
var prebidServerAdapterMock = {
  bidder: 'prebidServer',
  callBids: sinon.stub(),
  setConfig: sinon.stub(),
  queueSync: sinon.stub()
};

describe('adapterManager tests', () => {
  describe('S2S tests', () => {
    var stubGetStorageItem;
    var stubSetStorageItem;

    beforeEach(() => {
      AdapterManager.setS2SConfig(CONFIG);
      AdapterManager.bidderRegistry['prebidServer'] = prebidServerAdapterMock;

      prebidServerAdapterMock.callBids.reset();
    });

    it('invokes callBids on the S2S adapter', () => {
      AdapterManager.callBids({adUnits: getAdUnits()});
      sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
    });

    it('invokes callBids with only s2s bids', () => {
      const adUnits = getAdUnits();
      // adUnit without appnexus bidder
      adUnits.push({
        'code': '123',
        'sizes': [300, 250],
        'bids': [
          {
            'bidder': 'adequant',
            'params': {
              'publisher_id': '1234567',
              'bidfloor': 0.01
            }
          }
        ]
      });
      AdapterManager.callBids({adUnits: adUnits});
      const requestObj = prebidServerAdapterMock.callBids.firstCall.args[0];
      expect(requestObj.ad_units.length).to.equal(2);
      sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
    });
  }); // end s2s tests

  describe('The setBidderSequence() function', () => {
    let spy;

    beforeEach(() => {
      spy = sinon.spy(utils, 'logWarn')
    });

    afterEach(() => {
      utils.logWarn.restore();
    });

    it('should log a warning on invalid values', () => {
      AdapterManager.setBidderSequence('unrecognized sequence');
      expect(spy.calledOnce).to.equal(true);
    });

    it('should not log warnings when given recognized values', () => {
      AdapterManager.setBidderSequence('fixed');
      AdapterManager.setBidderSequence('random');
      expect(spy.called).to.equal(false);
    });
  })

  describe('aliasBidderAdaptor', function() {
    const CODE = 'sampleBidder';

    // Note: remove this describe once Prebid is 1.0
    describe('old way', function() {
      let originalRegistry;

      function SampleAdapter() {
        return Object.assign(this, {
          callBids: sinon.stub(),
          setBidderCode: sinon.stub()
        });
      }

      before(() => {
        originalRegistry = AdapterManager.bidderRegistry;
        AdapterManager.bidderRegistry[CODE] = new SampleAdapter();
      });

      after(() => {
        AdapterManager.bidderRegistry = originalRegistry;
      });

      it('should add alias to registry', () => {
        const alias = 'testalias';
        AdapterManager.aliasBidAdapter(CODE, alias);
        expect(AdapterManager.bidderRegistry).to.have.property(alias);
      });
    });

    describe('using bidderFactory', function() {
      let spec;

      beforeEach(() => {
        spec = {
          code: CODE,
          isBidRequestValid: () => {},
          buildRequests: () => {},
          interpretResponse: () => {},
          getUserSyncs: () => {}
        };
      });

      it('should add alias to registry when original adapter is using bidderFactory', function() {
        let thisSpec = Object.assign(spec, { supportedMediaTypes: ['video'] });
        registerBidder(thisSpec);
        const alias = 'aliasBidder';
        AdapterManager.aliasBidAdapter(CODE, alias);
        expect(AdapterManager.bidderRegistry).to.have.property(alias);
        expect(AdapterManager.videoAdapters).to.include(alias);
      });
    });
  });
});
