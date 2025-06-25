import { subModuleObj as rtdProvider } from 'modules/dynamicAdBoostRtdProvider.js';
import { expect } from 'chai';

describe('markViewed tests', function() {
  let sandbox;
  const mockObserver = {
    unobserve: sinon.spy()
  };
  const makeElement = (id) => {
    const el = document.createElement('div');
    el.setAttribute('id', id);
    return el;
  }
  const mockEntry = {
    target: makeElement('target_id')
  };

  beforeEach(function() {
    sandbox = sinon.createSandbox();
  })

  afterEach(function() {
    sandbox.restore()
  })

  it('markViewed returns a function', function() {
    expect(rtdProvider.markViewed(mockEntry, mockObserver)).to.be.a('function')
  });

  it('markViewed unobserves', function() {
    const func = rtdProvider.markViewed(mockEntry, mockObserver);
    func();
    expect(mockObserver.unobserve.calledOnce).to.be.true;
  });
})
