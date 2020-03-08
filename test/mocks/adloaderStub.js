
import * as adloader from 'src/adloader.js';

// this export is for adloader's tests against actual implementation
export let loadExternalScript = adloader.loadExternalScript;

let stub = createStub();

function createStub() {
  return sinon.stub(adloader, 'loadExternalScript').callsFake((...args) => {
    if (typeof args[2] === 'function') {
      args[2]();
    } else if (typeof args[3] === 'function') {
      args[3]();
    }
    return document.createElement('script');
  });
}

beforeEach(function() {
  stub.restore();
  stub = createStub();
});
