import { subModuleObj as rtdProvider } from 'modules/dynamicAdBoostRtdProvider.js';
import { expect } from 'chai';
import { getGlobal } from 'src/prebidGlobal.js';
import { MODULE_TYPE_RTD } from 'src/activities/modules.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

describe('Dynamic Ad Boost RTD provider', function() {
  let sandbox;
  let clock;
  let observer;
  let handleIntersection;
  let originalAdUnits;
  let nextId = 0;

  function entry(intersectionRatio, isIntersecting = true) {
    const target = document.createElement('div');
    target.id = `dynamic-ad-boost-test-${nextId++}`;
    return { target, intersectionRatio, isIntersecting };
  }

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers({ now: Date.UTC(2026, 0, 1) });
    observer = { unobserve: sandbox.spy(), disconnect: sandbox.spy() };
    sandbox.stub(window, 'IntersectionObserver').callsFake(function(callback, options) {
      handleIntersection = callback;
      return observer;
    });
    originalAdUnits = getGlobal().adUnits;
  });

  afterEach(function() {
    getGlobal().adUnits = originalAdUnits;
    sandbox.restore();
  });

  it('initializes a viewability observer with a 50% threshold', function() {
    expect(rtdProvider.init()).to.be.true;
    expect(window.IntersectionObserver.calledOnceWithExactly(sinon.match.func, { threshold: 0.5 })).to.be.true;
    expect(loadExternalScriptStub.called).to.be.false;
  });

  it('loads the hostname-specific RTD script once after one second and disconnects the observer', function() {
    rtdProvider.init();
    clock.tick(999);
    expect(loadExternalScriptStub.called).to.be.false;
    expect(observer.disconnect.called).to.be.false;

    clock.tick(1);
    expect(loadExternalScriptStub.calledOnceWithExactly(
      `https://adxbid.info/rtd-${window.location.hostname}.js`, MODULE_TYPE_RTD, 'dynamicAdBoost'
    )).to.be.true;
    expect(observer.disconnect.calledOnce).to.be.true;

    clock.tick(10000);
    expect(loadExternalScriptStub.calledOnce).to.be.true;
    expect(observer.disconnect.calledOnce).to.be.true;
  });

  it('waits for the start time if the system clock moves backwards', function() {
    rtdProvider.init();
    clock.setSystemTime(Date.now() - 2000);
    clock.tick(1000);
    expect(loadExternalScriptStub.called).to.be.false;

    clock.tick(1000);
    expect(loadExternalScriptStub.calledOnce).to.be.true;
  });

  it('adds only intersecting entries above the viewability threshold to bid requests', function() {
    const visible = entry(0.75);
    const atThreshold = entry(0.5);
    const belowThreshold = entry(0.25);
    const notIntersecting = entry(0.9, false);
    const adUnits = [visible, atThreshold, belowThreshold, notIntersecting].map(({ target }) => ({ code: target.id }));
    const callback = sandbox.spy();
    rtdProvider.init();

    handleIntersection([]);
    handleIntersection([visible, atThreshold, belowThreshold, notIntersecting]);
    rtdProvider.getBidRequestData({ adUnits }, callback);

    expect(adUnits[0].ortb2Imp).to.deep.equal({ ext: { data: { dynamicAdBoost: { [visible.target.id]: 0.75 } } } });
    adUnits.slice(1).forEach(adUnit => expect(adUnit).not.to.have.property('ortb2Imp'));
    expect(callback.calledOnceWithExactly()).to.be.true;
  });

  it('preserves existing impression data and uses the latest viewability ratio', function() {
    const visible = entry(0.6);
    const adUnit = { code: visible.target.id, ortb2Imp: { ext: { data: { existing: 'value' } }, instl: 1 } };
    rtdProvider.init();
    handleIntersection([visible]);
    handleIntersection([{ ...visible, intersectionRatio: 0.9 }]);

    rtdProvider.getBidRequestData({ adUnits: [adUnit] }, sandbox.spy());

    expect(adUnit.ortb2Imp).to.deep.equal({
      ext: { data: { existing: 'value', dynamicAdBoost: { [visible.target.id]: 0.9 } } },
      instl: 1
    });
  });

  it('falls back to global ad units when a bid request has none', function() {
    const visible = entry(0.8);
    getGlobal().adUnits = [{ code: visible.target.id }];
    const callback = sandbox.spy();
    rtdProvider.init();
    handleIntersection([visible]);

    rtdProvider.getBidRequestData({}, callback);

    expect(getGlobal().adUnits[0].ortb2Imp.ext.data.dynamicAdBoost).to.deep.equal({ [visible.target.id]: 0.8 });
    expect(callback.calledOnceWithExactly()).to.be.true;
  });

  it('uses request ad units instead of global ad units', function() {
    const visible = entry(0.8);
    const globalAdUnit = { code: visible.target.id };
    getGlobal().adUnits = [globalAdUnit];
    rtdProvider.init();
    handleIntersection([visible]);

    rtdProvider.getBidRequestData({ adUnits: [] }, sandbox.spy());

    expect(globalAdUnit).not.to.have.property('ortb2Imp');
  });

  it('completes a request when ad units are not an array', function() {
    const callback = sandbox.spy();
    rtdProvider.getBidRequestData({ adUnits: {} }, callback);
    expect(callback.calledOnceWithExactly()).to.be.true;
  });

  it('completes a request when neither request nor global ad units exist', function() {
    getGlobal().adUnits = undefined;
    const callback = sandbox.spy();
    rtdProvider.getBidRequestData({}, callback);
    expect(callback.calledOnceWithExactly()).to.be.true;
  });

  it('returns a callback that unobserves the entry target when invoked', function() {
    const visible = entry(0.75);
    const markViewed = rtdProvider.markViewed(visible, observer);
    expect(markViewed).to.be.a('function');
    expect(observer.unobserve.called).to.be.false;

    markViewed();

    expect(observer.unobserve.calledOnceWithExactly(visible.target)).to.be.true;
  });
});
