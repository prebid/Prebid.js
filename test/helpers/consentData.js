import {gdprDataHandler, gppDataHandler} from 'src/adapterManager.js';
import {PbPromise} from '../../src/utils/promise.js';

export function mockGdprConsent(sandbox, getConsentData = () => null) {
  sandbox.stub(gdprDataHandler, 'enabled').get(() => true)
  sandbox.stub(gdprDataHandler, 'promise').get(() => PbPromise.resolve(getConsentData()));
  sandbox.stub(gdprDataHandler, 'getConsentData').callsFake(getConsentData)
}

beforeEach(() => {
  gdprDataHandler.reset();
  gppDataHandler.reset();
})
