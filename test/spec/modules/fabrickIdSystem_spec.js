import * as utils from '../../../src/utils';
import {server} from '../../mocks/xhr';

import * as fabrickIdSystem from 'modules/fabrickIdSystem';

const defaultConfigParams = {
  apiKey: '123',
  e: 'abc',
  p: ['def', 'hij'],
  url: 'http://localhost:9999/test/mocks/fabrickId.json?'
};
const responseHeader = {'Content-Type': 'application/json'}
const fabrickIdSubmodule = fabrickIdSystem.fabrickIdSubmodule;

describe('Fabrick ID System', function() {
  let logErrorStub;

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    logErrorStub.restore();
    fabrickIdSubmodule.getRefererInfoOverride = null;
  });

  it('should log an error if no configParams were passed into getId', function () {
    fabrickIdSubmodule.getId();
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should error on json parsing', function() {
    let submoduleCallback = fabrickIdSubmodule.getId(defaultConfigParams).callback;
    let callBackSpy = sinon.spy();
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    request.respond(
      200,
      responseHeader,
      '] this is not json {'
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should truncate the params', function() {
    let configParams = Object.assign({}, defaultConfigParams, {
      refererInfo: {
        referer: 'r'.repeat(300),
        stack: ['s-0'],
        canonicalUrl: 'cu-0'
      }
    });
    let submoduleCallback = fabrickIdSubmodule.getId(configParams).callback;
    let callBackSpy = sinon.spy();
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.match(new RegExp(`r=${'r'.repeat(200)}&r=`));
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(logErrorStub.calledOnce).to.be.false;
  });

  it('should complete successfully', function() {
    let configParams = Object.assign({}, defaultConfigParams, {
      refererInfo: {
        referer: 'r-0',
        stack: ['s-0'],
        canonicalUrl: 'cu-0'
      }
    });
    let submoduleCallback = fabrickIdSubmodule.getId(configParams).callback;
    let callBackSpy = sinon.spy();
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.match(/r=r-0&r=s-0&r=cu-0&r=http/);
    request.respond(
      200,
      responseHeader,
      // TODO - actually check the value
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(logErrorStub.calledOnce).to.be.false;
  });
});
