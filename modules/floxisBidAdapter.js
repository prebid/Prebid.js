import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { createFloxisSpec, isValidHostLabel } from '../libraries/floxisUtils/bidderUtils.js';

const BIDDER_CODE = 'floxis';
const GVLID = 1609;
const DEFAULT_REGION = 'us-e';

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

// Telemetry event host is pinned to px-us-e regardless of bid region. Only us-e is provisioned;
// a beacon to an unprovisioned host would lose the very signal meant to catch misconfiguration.
// SHIPPING-INTENT: switch to region-derived host (px-<region>) when px-eu and px-apac are provisioned.
const TELEMETRY_ORIGIN = 'https://px-us-e.floxis.tech';

export const spec = createFloxisSpec({
  code: BIDDER_CODE,
  gvlid: GVLID,
  storage,
  storageKey: 'flx_uid',
  resolveRoute: (params) => ({
    region: params.region || DEFAULT_REGION,
    partner: params.partner || BIDDER_CODE
  }),
  // Bidding host: the supply partner's regional subdomain (floxis itself has no partner prefix).
  getBidHost(region, partner) {
    if (!isValidHostLabel(region) || !isValidHostLabel(partner)) return null;
    return partner === BIDDER_CODE
      ? `${region}.floxis.tech`
      : `${partner}-${region}.floxis.tech`;
  },
  // Cookie-sync host is Floxis-operated and region-scoped (px-<region>.floxis.tech), independent of
  // the partner subdomain used for bidding. The trackers /sync endpoint resolves seat -> supply partner.
  getSyncOrigin: (region) => (isValidHostLabel(region) ? `https://px-${region}.floxis.tech` : null),
  telemetryOrigin: TELEMETRY_ORIGIN
});

registerBidder(spec);
