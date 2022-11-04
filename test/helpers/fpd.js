import {dep, enrichFPD} from 'src/fpd/enrichment.js';
import {GreedyPromise} from '../../src/utils/promise.js';
import {deepClone} from '../../src/utils.js';

export function addFPDEnrichments(ortb2 = {}, overrides = {}) {
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
  const sandbox = sinon.sandbox.create();
  Object.entries(overrides).forEach(([k, v]) => {
    sandbox.stub(dep, k).callsFake(v);
  });
  return enrichFPD(GreedyPromise.resolve(deepClone(ortb2))).finally(() => sandbox.restore());
}

export const syncAddFPDEnrichments = synchronize(addFPDEnrichments);

export function addFPDToBidderRequest(bidderRequest, overrides) {
  overrides = Object.assign({}, {
    getRefererInfo() {
      return bidderRequest.refererInfo || {};
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
