// noinspection JSValidateTypes

import {onScriptResult} from 'modules/luceadRtdProvider.js';
import * as luceadRTD from 'modules/luceadRtdProvider.js';
import {loadExternalScript} from 'src/adloader.js';

describe('Lucead RTD submodule', function () {
  it('isDevEnv should return false', function() {
    expect(luceadRTD.isDevEnv()).to.equal(false);
  });

  it('init should return true', function() {
    expect(luceadRTD.init()).to.equal(true);
  });

  it('getBidRequestData should call loadExternalScript', function() {
    luceadRTD.getBidRequestData()
    expect(loadExternalScript.called).to.be.true;
  });

  it('onScriptResult should call callback', function() {
    window.lucead_rtd = async() => {
      return {
        categories: ['a', 'b'],
      }
    };

    const callback = sinon.spy();
    const reqBidsConfigObj = {ortb2Fragments: {bidder: {}}};

    luceadRTD.onScriptResult(
      {callback, reqBidsConfigObj, config: {}, userConsent: {}},
      {categories: ['a']}
    );

    expect(callback.called).to.be.true;
  });

  it('onBidRequestEvent should alter bidRequests', function() {
    const bidderCode = 'lucead';
    luceadRTD.onBidRequestEvent({bidderCode});
    expect(luceadRTD?.bidRequests[bidderCode]).to.exist.and.to.be.an('object');
  });
});
