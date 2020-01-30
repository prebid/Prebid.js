import { liveIntentIdSubmodule, reset as resetLiveIntentIdSubmodule } from 'modules/liveIntentIdSystem';
import * as utils from 'src/utils';
import * as liveConnect from 'live-connect-js/cjs/live-connect';
import { uspDataHandler } from '../../../src/adapterManager';

const assert = require('assert');

const PUBLISHER_ID = '89899';

describe('LiveIntentId', function() {
  let logErrorStub;
  let lcStub;
  let consentDataStub;
  const fireStub = sinon.stub();
  const resolveStub = sinon.stub();
  const lcClient = { fire: fireStub, resolve: resolveStub };

  const defaultConfigParams = { publisherId: PUBLISHER_ID };

  beforeEach(function() {
    logErrorStub = sinon.stub(utils, 'logError');
    lcStub = sinon.stub(liveConnect, 'LiveConnect');
    lcStub.returns(lcClient);
    consentDataStub = sinon.stub(uspDataHandler, 'getConsentData');
  });

  afterEach(function() {
    logErrorStub.restore();
    lcStub.restore();
    consentDataStub.restore();
    fireStub.resetHistory();
    resolveStub.resetHistory();
    resetLiveIntentIdSubmodule();
  });

  it('should log an error if no configParams were passed when getId', function() {
    liveIntentIdSubmodule.getId();
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should log an error if publisherId configParam was not passed when getId', function() {
    liveIntentIdSubmodule.getId({});
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should initialize LiveConnect with the config params when getId', function() {
    liveIntentIdSubmodule.getId({
      ...defaultConfigParams,
      ...{
        appId: 'a-0001',
        identifiersToResolve: ['id1', 'id2'],
        url: 'https://dummy.liveintent.com',
        storage: {
          expires: 3
        }
      }
    });

    expect(lcStub.calledOnce).to.be.true;
    assert.deepEqual(lcStub.getCall(0).args[0], {
      wrapperName: 'prebid',
      appId: 'a-0001',
      identifiersToResolve: ['id1', 'id2'],
      identityResolutionConfig: {
        source: 'prebid',
        publisherId: PUBLISHER_ID,
        url: 'https://dummy.liveintent.com',
        expirationDays: 3
      }
    });
  });

  it('should initialize LiveConnect with a source if it is passed in params when getId', function() {
    liveIntentIdSubmodule.getId({
      ...defaultConfigParams,
      ...{
        partner: 'test-partner'
      }
    });

    expect(lcStub.calledOnce).to.be.true;
    expect(lcStub.getCall(0).args[0].identityResolutionConfig.source).to.be.eq('test-partner');
  });

  it('should initialize LiveConnect with a us privacy string when getId', function() {
    consentDataStub.returns('1YNY');

    liveIntentIdSubmodule.getId(defaultConfigParams);

    expect(lcStub.calledOnce).to.be.true;
    expect(lcStub.getCall(0).args[0].usPrivacyString).to.be.eq('1YNY');
  });

  it('should return function that resolves an identifier when getId', function() {
    const result = liveIntentIdSubmodule.getId(defaultConfigParams);

    assert.deepEqual(result, { callback: resolveStub });
  });

  it('should fire an event when getId', function() {
    liveIntentIdSubmodule.getId(defaultConfigParams);

    expect(fireStub.calledOnce).to.be.true;
  });

  it('should log an error if publisherId configParam was not passed when decode', function() {
    liveIntentIdSubmodule.decode({}, {});
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should initialize LiveConnect with the config params when decode', function() {
    liveIntentIdSubmodule.decode({}, {
      ...defaultConfigParams,
      ...{
        appId: 'a-0001',
        identifiersToResolve: ['id1', 'id2'],
        url: 'https://dummy.liveintent.com',
        storage: {
          expires: 3
        }
      }
    });

    expect(lcStub.calledOnce).to.be.true;
    assert.deepEqual(lcStub.getCall(0).args[0], {
      wrapperName: 'prebid',
      appId: 'a-0001',
      identifiersToResolve: ['id1', 'id2'],
      identityResolutionConfig: {
        source: 'prebid',
        publisherId: PUBLISHER_ID,
        url: 'https://dummy.liveintent.com',
        expirationDays: 3
      }
    });
  });

  it('should initialize LiveConnect with a source if it is passed in params when decode', function() {
    liveIntentIdSubmodule.decode({}, {
      ...defaultConfigParams,
      ...{
        partner: 'test-partner'
      }
    });

    expect(lcStub.calledOnce).to.be.true;
    expect(lcStub.getCall(0).args[0].identityResolutionConfig.source).to.be.eq('test-partner');
  });

  it('should initialize LiveConnect with a us privacy string when decode', function() {
    consentDataStub.returns('1YNY');

    liveIntentIdSubmodule.decode({}, defaultConfigParams);

    expect(lcStub.calledOnce).to.be.true;
    expect(lcStub.getCall(0).args[0].usPrivacyString).to.be.eq('1YNY');
  });

  it('should not initialize LiveConnect when decode and the config is not set', function() {
    liveIntentIdSubmodule.decode({});

    expect(lcStub.called).to.be.false;
  });

  it('should return a decoded identifier', function() {
    const result = liveIntentIdSubmodule.decode(
      {
        unifiedId: 'id123',
        additionalData: 'data'
      }
    );

    assert.deepEqual(result, {
      lipb: {
        lipbid: 'id123',
        additionalData: 'data'
      }
    });
  });

  it('should not return a decoded identifier when the unifiedId is not present in the value', function() {
    const result = liveIntentIdSubmodule.decode(
      {
        additionalData: 'data'
      }
    );

    expect(result).to.be.undefined;
  });

  it('should fire an event when decode', function() {
    liveIntentIdSubmodule.decode({}, defaultConfigParams);

    expect(fireStub.calledOnce).to.be.true;
  });

  it('should fire an event only once', function() {
    liveIntentIdSubmodule.getId(defaultConfigParams);
    liveIntentIdSubmodule.decode({}, defaultConfigParams);
    liveIntentIdSubmodule.getId(defaultConfigParams);
    liveIntentIdSubmodule.decode({}, defaultConfigParams);

    expect(fireStub.calledOnce).to.be.true;
  });

  it('should initialize LiveConnect only once', function() {
    liveIntentIdSubmodule.getId(defaultConfigParams);
    liveIntentIdSubmodule.decode({}, defaultConfigParams);
    liveIntentIdSubmodule.getId(defaultConfigParams);
    liveIntentIdSubmodule.decode({}, defaultConfigParams);

    expect(lcStub.calledOnce).to.be.true;
  });
});
