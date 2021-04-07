import {admixerIdSubmodule} from 'modules/admixerIdSystem.js';
import * as utils from 'src/utils.js';
import {server} from 'test/mocks/xhr.js';
import {getStorageManager} from '../../../src/storageManager.js';

export const storage = getStorageManager();

const pid = '4D393FAC-B6BB-4E19-8396-0A4813607316';
const getIdParams = {params: {pid: pid}};
describe('admixerId tests', function () {
  let logErrorStub;

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    logErrorStub.restore();
  });

  it('should log an error if pid configParam was not passed when getId', function () {
    admixerIdSubmodule.getId();
    expect(logErrorStub.callCount).to.be.equal(1);

    admixerIdSubmodule.getId({});
    expect(logErrorStub.callCount).to.be.equal(2);

    admixerIdSubmodule.getId({params: {}});
    expect(logErrorStub.callCount).to.be.equal(3);

    admixerIdSubmodule.getId({params: {pid: 123}});
    expect(logErrorStub.callCount).to.be.equal(4);
  });

  it('should NOT call the admixer id endpoint if gdpr applies but consent string is missing', function () {
    let submoduleCallback = admixerIdSubmodule.getId(getIdParams, { gdprApplies: true });
    expect(submoduleCallback).to.be.undefined;
  });

  it('should call the admixer id endpoint', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = admixerIdSubmodule.getId(getIdParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq(`https://inv-nets.admixer.net/cntcm.aspx?ssp=${pid}`);
    request.respond(
      200,
      {},
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should call callback with user id', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = admixerIdSubmodule.getId(getIdParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq(`https://inv-nets.admixer.net/cntcm.aspx?ssp=${pid}`);
    request.respond(
      200,
      {},
      JSON.stringify({setData: {visitorid: '571058d70bce453b80e6d98b4f8a81e3'}})
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.be.eq('571058d70bce453b80e6d98b4f8a81e3');
  });

  it('should continue to callback if ajax response 204', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = admixerIdSubmodule.getId(getIdParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq(`https://inv-nets.admixer.net/cntcm.aspx?ssp=${pid}`);
    request.respond(
      204
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.be.undefined;
  });
});
