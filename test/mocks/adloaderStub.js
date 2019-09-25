
import * as adloader from 'src/adloader';

let sandbox;

export let loadExternalScript;
export let loadExternalScriptStub;

beforeEach(function() {
  sandbox = sinon.sandbox.create();
  loadExternalScript = adloader.loadExternalScript;
  loadExternalScriptStub = sandbox.stub(adloader, 'loadExternalScript');
});

afterEach(function() {
  sandbox.restore();
});
