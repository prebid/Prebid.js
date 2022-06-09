import { config } from 'src/config';
import { onePlusXSubmodule } from 'modules/1plusXRtdProvider';

describe('1plusXRtdProvider', () => {
  before(() => {
    config.resetConfig();
  })

  after(() => { })

  describe('onePlusXSubmodule', () => {
    it('init is successfull', () => {
      const initResult = onePlusXSubmodule.init();
      expect(initResult).to.be.true;
    })
  })
})
