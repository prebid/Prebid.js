
import * as adloader from 'src/adloader';

// this export is for adloader's tests against actual implementation
export let loadExternalScript = adloader.loadExternalScript;

let stub = createStub();

function createStub() {
  return sinon.stub(adloader, 'loadExternalScript').callsFake((...args) => {
    if (typeof args[2] === 'function') {
      args[2]();
    }
  });
}

beforeEach(function() {
  stub.restore();
  stub = createStub();
});
