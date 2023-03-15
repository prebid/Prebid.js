import StoredRequestBidAdapterBase from './prebidServerBidAdapter/storedRequestBidAdapterBase.js'
import {registerBidder} from '../src/adapters/bidderFactory.js';

const RelevantAdapter = new StoredRequestBidAdapterBase({
  accountIdRequired: true,
  spec: {
    gvlid: 1100,
    code: 'relevantdigital',
  },
});

registerBidder(RelevantAdapter.spec);
