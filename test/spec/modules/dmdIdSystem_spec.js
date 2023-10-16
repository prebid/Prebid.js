import * as utils from '../../../src/utils.js';
import { server } from 'test/mocks/xhr.js';
import { dmdIdSubmodule } from 'modules/dmdIdSystem.js';

describe('Dmd ID System', function () {
  let logErrorStub;
  const config = {
    params: {
      api_key: '33344ffjddk22k22k222k22234k',
      api_url: 'https://aix.hcn.health/api/v1/auths'
    }
  };

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    logErrorStub.restore();
  });

  it('should log an error if no configParams were passed into getId', function () {
    dmdIdSubmodule.getId();
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should log an error if configParams doesnot have api_key passed to getId', function () {
    dmdIdSubmodule.getId({params: {}});
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should log an error if configParams has invalid api_key passed into getId', function () {
    dmdIdSubmodule.getId({params: {api_key: 123}});
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should not log an error if configParams has valid api_key passed into getId', function () {
    dmdIdSubmodule.getId({params: {api_key: '3fdbe297-3690-4f5c-9e11-ee9186a6d77c'}});
    expect(logErrorStub.calledOnce).to.be.false;
  });

  it('should return undefined if empty value passed into decode', function () {
    expect(dmdIdSubmodule.decode()).to.be.undefined;
  });

  it('should return undefined if invalid dmd-dgid passed into decode', function () {
    expect(dmdIdSubmodule.decode(123)).to.be.undefined;
  });

  it('should return dmdId if valid dmd-dgid passed into decode', function () {
    let data = { 'dmdId': 'U12345' };
    expect(dmdIdSubmodule.decode('U12345')).to.deep.equal(data);
  });

  it('should return cacheObj if cacheObj is passed into getId', function () {
    let data = { 'dmdId': 'U12345' };
    expect(dmdIdSubmodule.getId(config, {}, { cookie: 'dmd-dgid' })).to.deep.equal({ cookie: 'dmd-dgid' });
    expect(server.requests.length).to.eq(0);
  });

  it('Should invoke callback with response from API call', function () {
    const callbackSpy = sinon.spy();
    const domain = utils.getWindowLocation()
    const callback = dmdIdSubmodule.getId(config).callback;
    callback(callbackSpy);
    const request = server.requests[0];
    expect(request.method).to.eq('GET');
    expect(request.requestHeaders['x-domain']).to.be.eq(domain);
    expect(request.url).to.eq(config.params.api_url);
    request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ dgid: 'U12345' }));
    expect(callbackSpy.lastCall.lastArg).to.deep.equal('U12345');
  });

  it('Should log error if API response is not valid', function () {
    const callbackSpy = sinon.spy();
    const domain = utils.getWindowLocation()
    const callback = dmdIdSubmodule.getId(config).callback;
    callback(callbackSpy);
    const request = server.requests[0];
    expect(request.method).to.eq('GET');
    expect(request.requestHeaders['x-domain']).to.be.eq(domain);
    expect(request.url).to.eq(config.params.api_url);
    request.respond(400, { 'Content-Type': 'application/json' }, undefined);
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('Should log error if API call throws error', function () {
    const callbackSpy = sinon.spy();
    const callback = dmdIdSubmodule.getId(config).callback;
    callback(callbackSpy);
    const request = server.requests[0];
    expect(request.url).to.eq(config.params.api_url);
    request.error();
    expect(logErrorStub.calledOnce).to.be.true;
  });
});
