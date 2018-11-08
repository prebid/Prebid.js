const adloader = require('src/adloader');

let sandbox;

export let loadScript;
export let loadExternalScript;
export let loadScriptStub;
export let loadExternalScriptStub;

beforeEach(function() {
  sandbox = sinon.sandbox.create();
  loadScript = adloader.loadScript;
  loadExternalScript = adloader.loadExternalScript;
  loadScriptStub = sandbox.stub(adloader, 'loadScript').callsFake((...args) => {
    args[1]();
  });
  loadExternalScriptStub = sandbox.stub(adloader, 'loadExternalScript');
});

afterEach(function() {
  sandbox.restore();
});
