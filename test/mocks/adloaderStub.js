import * as adloader from 'src/adloader.js';

// these exports are for adloader's tests against actual implementation
export const loadExternalScript = adloader.loadExternalScript;
export const fetchExternalScript = adloader.fetchExternalScript;

export let loadExternalScriptStub = createStub();
export let fetchExternalScriptStub = createFetchStub();

function createStub() {
  return sinon.stub(adloader, 'loadExternalScript').callsFake((...args) => {
    const callback = args[3];
    if (typeof callback === 'function') {
      callback();
    } else {
      callback?.success?.();
    }
    return document.createElement('script');
  });
}

function createFetchStub() {
  return sinon.stub(adloader, 'fetchExternalScript').resolves();
}

beforeEach(function() {
  loadExternalScriptStub.restore();
  loadExternalScriptStub = createStub();
  fetchExternalScriptStub.restore();
  fetchExternalScriptStub = createFetchStub();
});
