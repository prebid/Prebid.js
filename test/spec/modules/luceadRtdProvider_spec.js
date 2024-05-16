// noinspection JSValidateTypes

import * as luceadRTD from 'modules/luceadRtdProvider.js';

describe('Lucead RTD submodule', function () {
  it('isDevEnv should return false', function() {
    expect(luceadRTD.isDevEnv()).to.equal(false);
  });

  it('init should return true', function() {
    expect(luceadRTD.init()).to.equal(true);
  });

  it('getBidRequestData should call callback', function() {
    const callback = sinon.spy();
    luceadRTD.getBidRequestData({}, callback, {}, {});
    expect(callback.called).to.equal(true);
  });
});
