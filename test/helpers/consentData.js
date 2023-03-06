import {gdprDataHandler} from 'src/adapterManager.js';
import {GreedyPromise} from '../../src/utils/promise.js';

export function mockGdprConsent(sandbox, getConsentData = () => null) {
  sandbox.stub(gdprDataHandler, 'promise').get(() => GreedyPromise.resolve(getConsentData()));
  sandbox.stub(gdprDataHandler, 'getConsentData').callsFake(getConsentData)
}
