import { subModuleObj as rtdProvider } from 'modules/dynamicAdBoostRtdProvider.js';
import { loadExternalScript } from '../../../src/adloader.js';
import { expect } from 'chai';

const configWithParams = {
  params: {
    keyId: 'dynamic',
    adUnits: ['gpt-123'],
    threshold: 1
  }
};

const configWithoutRequiredParams = {
  params: {
    keyId: ''
  }
};

describe('dynamicAdBoost', function() {
  let clock;
  let sandbox;
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    clock = sandbox.useFakeTimers(Date.now());
  });
  afterEach(function () {
    sandbox.restore();
  });
  describe('init', function() {
    describe('initialize without expected params', function() {
      it('fails initalize when keyId is not present', function() {
        expect(rtdProvider.init(configWithoutRequiredParams)).to.be.false;
      })
    })

    describe('initialize with expected params', function() {
      it('successfully initialize with load script', function() {
        expect(rtdProvider.init(configWithParams)).to.be.true;
        clock.tick(1000);
        expect(loadExternalScript.called).to.be.true;
      })
    });
  });
})

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
    sandbox = sinon.sandbox.create();
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
