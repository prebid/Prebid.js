import {gdprDataHandler} from 'src/adapterManager.js';

export function mockGdprConsent(sandbox, getConsentData = () => null) {
  sandbox.stub(gdprDataHandler, 'enabled').get(() => true)
  sandbox.stub(gdprDataHandler, 'promise').get(() => Promise.resolve(getConsentData()));
  sandbox.stub(gdprDataHandler, 'getConsentData').callsFake(getConsentData)
}

beforeEach(() => {
  gdprDataHandler.reset();
})
