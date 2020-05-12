import {lotameIdSubmodule} from 'modules/lotameIdSystem.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';

const responseHeader = { 'Content-Type': 'application/json' };

describe('LotameId', function() {
  let pixel = {};
  let logErrorStub;
  let imgStub;

  beforeEach(function () {
    imgStub = sinon.stub(window, 'Image').returns(pixel);
    logErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    pixel = {};
    imgStub.restore();
    logErrorStub.restore();
  });

  it('should call the remote server when getId is called', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = lotameIdSubmodule.getId({}).callback;
    submoduleCallback(callBackSpy);

    let request = server.requests[0];
    expect(request.url).to.be.eq(
      'https://mconrad.dev.lotame.com:5555/panorama/id'
    );
    request.respond(200, responseHeader, JSON.stringify({}));
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should retrieve the panorama id when decode is called', function() {
    var panoramaId = lotameIdSubmodule.decode({
      panorama_id: '1234'
    });
    expect(panoramaId).to.be.eql({
      'lotameId': '1234'
    });
  });
});
