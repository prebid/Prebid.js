import * as medianetRTD from '../../../modules/medianetRtdProvider.js';
import * as sinon from 'sinon';
import { assert } from 'chai';

let sandbox;
let setDataSpy;
let getTargetingDataSpy;
let onPrebidRequestBidSpy;

const conf = {
  dataProviders: [{
    'name': 'medianet',
    'params': {
      'cid': 'customer_id',
    }
  }]
};

describe('medianet realtime module', function () {
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    window.mnjs = window.mnjs || {};
    window.mnjs.que = window.mnjs.que || [];
    window.mnjs.setData = setDataSpy = sandbox.spy();
    window.mnjs.getTargetingData = getTargetingDataSpy = sandbox.spy();
    window.mnjs.onPrebidRequestBid = onPrebidRequestBidSpy = sandbox.spy();
  });

  afterEach(function () {
    sandbox.restore();
    window.mnjs = {};
  });

  it('init should return false when customer id is passed', function () {
    assert.equal(medianetRTD.medianetRtdModule.init({}), false);
  });

  it('init should return true when customer id is passed', function () {
    assert.equal(medianetRTD.medianetRtdModule.init(conf.dataProviders[0]), true);
  });

  it('init should pass config to js when loaded', function () {
    medianetRTD.medianetRtdModule.init(conf.dataProviders[0]);

    const command = window.mnjs.que.pop();
    assert.isFunction(command);
    command();

    assert.equal(setDataSpy.called, true);
    assert.equal(setDataSpy.args[0][0].name, 'initIRefresh');
  });

  it('auctionInit should pass information to js when loaded', function () {
    const auctionObject = {adUnits: []};
    medianetRTD.medianetRtdModule.onAuctionInitEvent(auctionObject);

    const command = window.mnjs.que.pop();
    assert.isFunction(command);
    command();

    assert.equal(setDataSpy.called, true);
    assert.equal(setDataSpy.args[0][0].name, 'auctionInit');
    assert.deepEqual(setDataSpy.args[0][0].data, {auction: auctionObject});
  });

  describe('getTargeting should work correctly', function () {
    it('should return empty if not loaded', function () {
      window.mnjs.loaded = false;
      assert.deepEqual(medianetRTD.medianetRtdModule.getTargetingData([]), {});
    });

    it('should return ad unit codes when ad units are present', function () {
      const adUnitCodes = ['code1', 'code2'];
      assert.deepEqual(medianetRTD.medianetRtdModule.getTargetingData(adUnitCodes), {
        code1: {'mnadc': 'code1'},
        code2: {'mnadc': 'code2'},
      });
    });

    it('should call mnjs.getTargetingData if loaded', function () {
      window.mnjs.loaded = true;
      medianetRTD.medianetRtdModule.getTargetingData([]);
      assert.equal(getTargetingDataSpy.called, true);
    });
  });

  describe('getBidRequestData should work correctly', function () {
    it('callback should be called when we are not interested in request', function () {
      const requestBidsProps = {
        adUnits: [{
          code: 'code1', bids: [],
        }],
        adUnitCodes: ['code1'],
      };
      const callbackSpy = sandbox.spy();
      medianetRTD.medianetRtdModule.getBidRequestData(requestBidsProps, callbackSpy, conf.dataProviders[0], {});

      const command = window.mnjs.que.pop();
      assert.isFunction(command);
      command();

      assert.equal(onPrebidRequestBidSpy.called, true, 'onPrebidRequest should always be called');
      assert.equal(callbackSpy.called, true, 'when onPrebidRequest returns nothing callback should be called immediately');
    });

    it('we should wait for callback till onComplete', function () {
      const requestBidsProps = {
        adUnits: [{
          code: 'code1', bids: [],
        }],
        adUnitCodes: ['code1'],
      };

      const refreshInformation = {
        mnrf: '1',
        mnrfc: 2,
      };

      const callbackSpy = sandbox.spy();
      const onCompleteSpy = sandbox.spy();
      window.mnjs.onPrebidRequestBid = onPrebidRequestBidSpy = () => {
        onPrebidRequestBidSpy.called = true;
        return {onComplete: onCompleteSpy};
      };
      medianetRTD.medianetRtdModule.getBidRequestData(requestBidsProps, callbackSpy, conf.dataProviders[0], {});

      const command = window.mnjs.que.pop();
      assert.isFunction(command);
      command();

      assert.equal(callbackSpy.called, false, 'callback should not be called, as we are returning a request from onPrebidRequestBid');
      assert.equal(onPrebidRequestBidSpy.called, true, 'onPrebidRequestBid should be called once');
      assert.equal(onCompleteSpy.called, true, 'onComplete should be passed callback');
      assert.isFunction(onCompleteSpy.args[0][0], 'onCompleteSpy first argument error callback should be a function');
      assert.isFunction(onCompleteSpy.args[0][1], 'onCompleteSpy second argument success callback should be a function');
      onCompleteSpy.args[0][0]();
      assert.equal(callbackSpy.callCount, 1, 'callback should be called when error callback is triggered');
      onCompleteSpy.args[0][1]({}, {
        'code1': {ext: {refresh: refreshInformation}}
      });
      assert.equal(callbackSpy.callCount, 2, 'callback should be called when success callback is triggered');
      assert.isObject(requestBidsProps.adUnits[0].ortb2Imp, 'ORTB object should be set');
      assert.deepEqual(requestBidsProps.adUnits[0].ortb2Imp.ext.refresh, refreshInformation, 'ORTB should have refresh information should be set');
    });
  });
});
