import { naveggIdSubmodule, storage } from 'modules/naveggIdSystem.js';

describe('naveggId', function () {
  it('should NOT find navegg id', function () {
    let id = naveggIdSubmodule.getId();

    expect(id).to.be.undefined;
  });

  it('getId() should return "test-nid" id from cookie OLD_NAVEGG_ID', function() {
    sinon.stub(storage, 'getCookie').withArgs('nid').returns('test-nid');
    let id = naveggIdSubmodule.getId();
    expect(id).to.be.deep.equal({id: 'test-nid'})
  })

  it('getId() should return "test-nvggid" id from local storage NAVEGG_ID', function() {
    sinon.stub(storage, 'getDataFromLocalStorage').withArgs('nvggid').returns('test-ninvggidd');
    let id = naveggIdSubmodule.getId();
    expect(id).to.be.deep.equal({id: 'test-ninvggidd'})
  })
});
