import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { createFloxisSpec } from '../libraries/floxisUtils/bidderUtils.js';

const BIDDER_CODE = 'adapex';
const GVLID = 1609;
const BID_HOST = 'hb.adapex.io';
const SYNC_ORIGIN = 'https://sync.adapex.io';

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

export const spec = createFloxisSpec({
  code: BIDDER_CODE,
  gvlid: GVLID,
  storage,
  storageKey: 'adpx_uid',
  fallbackIdField: 'fpid',
  // Single-region deployment: routing params are not accepted, so every seat shares one host.
  resolveRoute: () => ({ region: 'us-e', partner: BIDDER_CODE }),
  getBidHost: () => BID_HOST,
  getSyncOrigin: () => SYNC_ORIGIN,
  telemetryOrigin: SYNC_ORIGIN,
  pinSyncOrigin: true
});

registerBidder(spec);
