import {
  getCachedTopics,
  getTopics,
  getTopicsData,
  loadTopicsForBidders,
  processFpd,
  receiveMessage,
  reset,
  storeInLocalStorage,
  topicStorageName
} from '../../../modules/topicsFpdModule.js';
import * as utils from '../../../src/utils.js';

describe('topics', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'logWarn');
    reset();
  });

  afterEach(() => {
    sandbox.restore();
  });

  function expectWarning() {
    sinon.assert.calledOnce(utils.logWarn);
    sinon.assert.calledWithMatch(utils.logWarn, 'Topics API has been removed from Chrome');
  }

  it('exports the legacy storage name', () => {
    expect(topicStorageName).to.equal('prebid:topics');
  });

  it('does not return Topics API data', () => {
    expect(getTopicsData()).to.eql([]);
    expectWarning();
  });

  it('resolves getTopics with an empty result', () => {
    return getTopics({
      browsingTopics: sinon.stub().rejects(new Error('should not be called')),
      featurePolicy: {
        allowsFeature: sinon.stub().returns(true)
      }
    }).then((topics) => {
      expect(topics).to.eql([]);
      expectWarning();
    });
  });

  it('leaves first party data unchanged', () => {
    const global = { user: { data: [{ name: 'existing' }] } };
    return processFpd({}, { global }).then((result) => {
      expect(result).to.eql({ global });
      expect(global.user.data).to.eql([{ name: 'existing' }]);
      expectWarning();
    });
  });

  it('stubs bidder side effects', () => {
    expect(getCachedTopics()).to.eql([]);
    receiveMessage();
    storeInLocalStorage('bidder', []);
    loadTopicsForBidders();
    sinon.assert.calledOnce(utils.logWarn);
  });
});
