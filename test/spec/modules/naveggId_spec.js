import { naveggIdSubmodule } from 'modules/naveggId.js';

describe('naveggId', function () {
  describe('should NOT find navegg id', function () {
    let id = naveggIdSubmodule.getId();

    expect(id).to.be.undefined;
  });
});
