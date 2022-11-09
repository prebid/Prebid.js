import {gdprDataHandler} from 'src/adapterManager.js';
import {GreedyPromise} from '../../src/utils/promise.js';

export function mockGdprConsent(sandbox, getConsentData = () => null) {
  const s1 = sandbox.stub(gdprDataHandler, 'enabled').get(() => true)
  const s2 = sandbox.stub(gdprDataHandler, 'promise').get(() => GreedyPromise.resolve(getConsentData()));
  const s3 = sandbox.stub(gdprDataHandler, 'getConsentData').callsFake(getConsentData)
  return function unMock() {
    s1.restore();
    s2.restore();
    s3.restore();
  }
}

beforeEach(() => {
  gdprDataHandler.reset();
})
