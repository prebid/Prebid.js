import { growthCodeIdSubmodule } from 'modules/growthCodeIdSystem.js';
import * as utils from 'src/utils.js';

import { server } from 'test/mocks/xhr.js';
import { uspDataHandler } from 'src/adapterManager.js';
import {admixerIdSubmodule} from '../../../modules/admixerIdSystem';

const getIdParams = {params: {
  pid: 'TEST01',
  url: 'http://localhost:8080/pb?',
  publisher_id: '_sharedid',
  publisher_id_storage: 'html5',
}};

describe('growthCodeIdSystem', () => {
  let logErrorStub;

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    logErrorStub.restore();
  });

  describe('name', () => {
    it('should expose the name of the submodule', () => {
      expect(growthCodeIdSubmodule.name).to.equal('growthCodeId');
    });
  });

  it('should NOT call the growthcode id endpoint if gdpr applies but consent string is missing', function () {
    let submoduleCallback = growthCodeIdSubmodule.getId(getIdParams, { gdprApplies: true });
    expect(submoduleCallback).to.be.undefined;
  });

  it('should log an error if pid configParam was not passed when getId', function () {
    growthCodeIdSubmodule.getId();
    expect(logErrorStub.callCount).to.be.equal(1);
  });

  it('should call the growthcode id endpoint', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = growthCodeIdSubmodule.getId(getIdParams).callback;
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
})
