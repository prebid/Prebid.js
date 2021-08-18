import { naveggIdSubmodule } from 'modules/naveggIdSystem.js';

describe('naveggId', function () {
  describe('should NOT find navegg id', function () {
    let id = naveggIdSubmodule.getId();

    expect(id).to.be.undefined;
  });
});
