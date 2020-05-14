import {lotameIdSubmodule, storage} from 'modules/lotameIdSystem.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';

const responseHeader = { 'Content-Type': 'application/json' };

describe('LotameId', function() {
  let logErrorStub;
  let getCookieStub;
  let setCookieStub;
  let getLocalStorageStub;
  let setLocalStorageStub;
  let removeFromLocalStorageStub;

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
    getCookieStub = sinon.stub(storage, 'getCookie');
    setCookieStub = sinon.stub(storage, 'setCookie');
    getLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    setLocalStorageStub = sinon.stub(storage, 'setDataInLocalStorage');
    removeFromLocalStorageStub = sinon.stub(
      storage,
      'removeDataFromLocalStorage'
    );
  });

  afterEach(function () {
    logErrorStub.restore();
    getCookieStub.restore();
    setCookieStub.restore();
    getLocalStorageStub.restore();
    setLocalStorageStub.restore();
    removeFromLocalStorageStub.restore();
  });

  it('should call the remote server when getId is called', function () {
    getCookieStub.withArgs('_lota_pano').returns(JSON.stringify({
      refreshSeconds: 10
    }));
    let callBackSpy = sinon.spy();
    let submoduleCallback = lotameIdSubmodule.getId({}).callback;
    submoduleCallback(callBackSpy);

    let request = server.requests[0];
    expect(request.url).to.be.eq(
      'https://mconrad.dev.lotame.com:5555/panorama/id'
    );
    request.respond(
      200,
      responseHeader,
      JSON.stringify({
        profile_id: '4ec137245858469eb94a4e248f238694',
        panorama_id:
          'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a',
      })
    );
    expect(callBackSpy.calledOnce).to.be.true;

    // Check the calls to storage
  });

  it('should retrieve the panorama id when decode is called', function() {
    var panoramaId = lotameIdSubmodule.decode('1234');
    expect(panoramaId).to.be.eql('1234');
  });
});
