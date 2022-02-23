import {ready, loadSession, getConfig, reset} from '../../src/debugging.js';

describe('Debugging', () => {
  let load;

  beforeEach(() => {
    load = sinon.stub();
  });

  after(() => {
    reset();
  });

  Object.entries({
    'session': () => loadSession({storage: {getItem: () => 'someConfig'}, load}),
    'setConfig': () => getConfig({debugging: {enabled: true}}, {load})
  }).forEach(([test, action]) => {
    it(`should load debugging module on configuration from ${test}`, (done) => {
      let resolver, loaded = false;
      load.returns(new Promise((resolve) => {
        resolver = resolve;
      }));
      ready().then(() => { loaded = true; });
      action();
      expect(load.called).to.be.true;
      expect(loaded).to.be.false;
      resolver();
      setTimeout(() => {
        expect(loaded).to.be.true;
        done();
      });
    })
  });
});
