import { growthCodeIdSubmodule } from 'modules/growthCodeIdSystem.js';
import * as utils from 'src/utils.js';

import { server } from 'test/mocks/xhr.js';
import { uspDataHandler } from 'src/adapterManager.js';

describe('growthCodeIdSystem', () => {
  describe('name', () => {
    it('should expose the name of the submodule', () => {
      expect(growthCodeIdSubmodule.name).to.equal('growthCodeId');
    });
  });
})
