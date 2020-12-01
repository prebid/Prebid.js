import {sharedIdSubmodule} from 'modules/SharedIdSystem.js';
import {server} from '../../mocks/xhr.js';
const responseHeader = {'Content-Type': 'application/json'}

describe('SharedId submodule', function () {
  it('getId() should complete successfully', function() {
    let submoduleCallback = sharedIdSubmodule.getId().callback;
    let callBackSpy = sinon.spy();
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://id-qa.sharedid.org/id');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });
  it('Optout of sharedId submodule', function () {
    const response = sharedIdSubmodule.optout();
    expect(response).to.have.deep.nested.property('id')
    expect(response).to.be.an('object');
    expect(response.id).to.have.all.keys('id', 'ts', 'uoo');
    expect(response.id.uoo).to.be.true;
    expect(response.id.id).to.equal('00000000000000000000000000');
  });
});
