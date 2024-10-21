import { naveggIdSubmodule, storage } from 'modules/naveggIdSystem.js';

describe('naveggId', function () {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(storage, 'getDataFromLocalStorage');
  });
  afterEach(() => {
    sandbox.restore();
  });

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
    storage.getDataFromLocalStorage.callsFake(() => 'test-ninvggidd')

    let id = naveggIdSubmodule.getId();
    expect(id).to.be.deep.equal({id: 'test-ninvggidd'})
  })

  it('getId() should return "test-nvggid" id from local storage NAV0', function() {
    storage.getDataFromLocalStorage.callsFake(() => 'nvgid-nav0')

    let id = naveggIdSubmodule.getId();
    expect(id).to.be.deep.equal({id: 'nvgid-nav0'})
  })

  it('getId() should return "test-nvggid" id from local storage NVG0', function() {
    storage.getDataFromLocalStorage.callsFake(() => 'nvgid-nvg0')

    let id = naveggIdSubmodule.getId();
    expect(id).to.be.deep.equal({id: 'nvgid-nvg0'})
  })
});
