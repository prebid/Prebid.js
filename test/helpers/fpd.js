import {dep, enrichFPD} from 'src/fpd/enrichment.js';
import {GreedyPromise} from '../../src/utils/promise.js';
import {deepClone} from '../../src/utils.js';
import {gdprDataHandler, uspDataHandler} from '../../src/adapterManager.js';

export function mockFpdEnrichments(sandbox, overrides = {}) {
  overrides = Object.assign({}, {
    // override window getters, required for ChromeHeadless, apparently it sees window.self !== window
    getWindowTop() {
      return window
    },
    getWindowSelf() {
      return window
    },
    getHighEntropySUA() {
      return GreedyPromise.resolve()
    }
  }, overrides)
  Object.entries(overrides)
    .filter(([k]) => dep[k])
    .forEach(([k, v]) => {
      sandbox.stub(dep, k).callsFake(v);
    });
  Object.entries({
    gdprConsent: gdprDataHandler,
    uspConsent: uspDataHandler,
  }).forEach(([ovKey, handler]) => {
    const v = overrides[ovKey];
    if (v) {
      sandbox.stub(handler, 'getConsentData').callsFake(v);
    }
  })
}

export function addFPDEnrichments(ortb2 = {}, overrides) {
  const sandbox = sinon.sandbox.create();
  mockFpdEnrichments(sandbox, overrides)
  return enrichFPD(GreedyPromise.resolve(deepClone(ortb2))).finally(() => sandbox.restore());
}

export const syncAddFPDEnrichments = synchronize(addFPDEnrichments);

export function addFPDToBidderRequest(bidderRequest, overrides) {
  overrides = Object.assign({}, {
    getRefererInfo() {
      return bidderRequest.refererInfo || {};
    },
    gdprConsent() {
      return bidderRequest.gdprConsent;
    },
    uspConsent() {
      return bidderRequest.uspConsent;
    }
  }, overrides);
  return addFPDEnrichments(bidderRequest.ortb2 || {}, overrides).then(ortb2 => {
    return {
      ...bidderRequest,
      ortb2
    }
  });
}

export const syncAddFPDToBidderRequest = synchronize(addFPDToBidderRequest);

function synchronize(fn) {
  return function () {
    let result;
    fn.apply(this, arguments).then(res => { result = res });
    return result;
  }
}
