import StoredRequestBidAdapterBase from './prebidServerBidAdapter/storedRequestBidAdapterBase.js'
import {registerBidder} from '../src/adapters/bidderFactory.js';

const StoredRequestBidAdapter = new StoredRequestBidAdapterBase({
  spec: {
    code: 'pbsGenericBidder',
  },
});

registerBidder(StoredRequestBidAdapter.spec);
