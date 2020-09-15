import { quantcastIdSubmodule, storage } from 'modules/quantcastIdSystem.js';

describe('QuantcastId module', function () {
  beforeEach(function() {
    storage.setCookie('__qca', '', 'Thu, 01 Jan 1970 00:00:00 GMT');
  });

  it('getId() should return a quantcast id when the Quantcast first party cookie exists', function () {
    storage.setCookie('__qca', 'P0-TestFPA');

    const id = quantcastIdSubmodule.getId();
    expect(id).to.be.deep.equal({id: {quantcastId: 'P0-TestFPA'}});
  });

  it('getId() should return an empty id when the Quantcast first party cookie is missing', function () {
    const id = quantcastIdSubmodule.getId();
    expect(id).to.be.deep.equal({id: undefined});
  });
});
