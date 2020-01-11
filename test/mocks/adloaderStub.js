
import * as adloader from 'src/adloader';

// this export is for adloader's tests against actual implementation
export let loadExternalScript = adloader.loadExternalScript;

<<<<<<< HEAD
export let loadExternalScript;
export let loadExternalScriptStub;

beforeEach(function() {
  sandbox = sinon.sandbox.create();
  loadExternalScript = adloader.loadExternalScript;
  loadExternalScriptStub = sandbox.stub(adloader, 'loadExternalScript').callsFake((...args) => {
    if (typeof args[2] === 'function') {
      args[2]();
    }
  });
});
=======
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
>>>>>>> upstream/master

beforeEach(function() {
  stub.restore();
  stub = createStub();
});
