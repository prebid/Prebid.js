import { config } from '../src/config.js';
import type { FloxisBaseBidParams } from '../libraries/floxisUtils/bidderUtils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { createFloxisSpec } from '../libraries/floxisUtils/bidderUtils.js';

export type AdapexBidParams = FloxisBaseBidParams;

declare module '../src/adUnits' {
  interface BidderParams {
    adapex: AdapexBidParams;
  }
}

export interface AdapexConfig {
  /** Set to false to disable timeout/error beacons; enabled by default. */
  enableTelemetry?: boolean;
}

declare module '../src/config' {
  interface Config {
    adapex?: AdapexConfig;
  }
}

const BIDDER_CODE = 'adapex';
const STORAGE_KEY = 'adpx_uid';
const GVLID = 1609;
const BID_HOST = 'hb.adapex.io';
const SYNC_ORIGIN = 'https://sync.adapex.io';

export const storage = getStorageManager({ bidderCode: BIDDER_CODE, deletionKey: STORAGE_KEY });

export const spec = createFloxisSpec({
  code: BIDDER_CODE,
  gvlid: GVLID,
  storage,
  storageKey: STORAGE_KEY,
  fallbackIdField: 'wlid',
  // Single-region deployment: routing params are not accepted, so every seat shares one host.
  resolveRoute: () => ({ region: 'us-e', partner: BIDDER_CODE }),
  getBidHost: () => BID_HOST,
  getSyncOrigin: () => SYNC_ORIGIN,
  telemetryOrigin: SYNC_ORIGIN,
  isTelemetryEnabled: () => config.getConfig('adapex')?.enableTelemetry !== false,
  pinSyncOrigin: true
});

registerBidder(spec);
