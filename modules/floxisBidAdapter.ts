import type { FloxisBaseBidParams } from '../libraries/floxisUtils/bidderUtils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { createFloxisSpec, isValidHostLabel } from '../libraries/floxisUtils/bidderUtils.js';

export interface FloxisBidParams extends FloxisBaseBidParams {
  /** Exchange region; defaults to us-e. */
  region?: string;
  /** Regional host prefix; defaults to floxis. */
  partner?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    floxis: FloxisBidParams;
  }
}

const BIDDER_CODE = 'floxis';
const GVLID = 1609;
const DEFAULT_REGION = 'us-e';

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

// Only the us-e trackers host is provisioned for telemetry.
const TELEMETRY_ORIGIN = 'https://px-us-e.floxis.tech';

export const spec = createFloxisSpec({
  code: BIDDER_CODE,
  gvlid: GVLID,
  storage,
  storageKey: 'flx_uid',
  fallbackIdField: 'floxisId',
  resolveRoute: (params) => ({
    region: params.region || DEFAULT_REGION,
    partner: params.partner || BIDDER_CODE
  }),
  // Bidding host: the supply partner's regional subdomain (floxis itself has no partner prefix).
  getBidHost(region, partner) {
    if (!isValidHostLabel(region) || !isValidHostLabel(partner)) return null;
    const label = partner === BIDDER_CODE ? region : `${partner}-${region}`;
    return isValidHostLabel(label) ? `${label}.floxis.tech` : null;
  },
  // Cookie-sync host is Floxis-operated and region-scoped (px-<region>.floxis.tech), independent of
  // the partner subdomain used for bidding. The trackers /sync endpoint resolves seat -> supply partner.
  getSyncOrigin: (region) => (isValidHostLabel(region) && isValidHostLabel(`px-${region}`) ? `https://px-${region}.floxis.tech` : null),
  telemetryOrigin: TELEMETRY_ORIGIN,
  // Fallback when the response body carries no ext.sync: the server echoes seat + region in this header.
  syncHeader: 'x-floxis-sync'
});

registerBidder(spec);
