
import * as adloader from 'src/adloader';

let sandbox;

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

afterEach(function() {
  sandbox.restore();
});
