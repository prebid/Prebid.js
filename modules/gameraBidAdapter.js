// Copy to modules/gameraBidAdapter.js in a pinned Prebid source build.
// Review candidate, not a claim of acceptance into Prebid's official distribution.
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { config } from "../src/config.js";
import { logError } from "../src/utils.js";
import { registerModule } from "../src/prebidGlobal.js";
import {
  createAuctionSpec,
  hasAuctionConsent
} from "../libraries/gameraBidder/auction.js";

// Disclosed optional data provider. No tracker/SDK code is downloaded by this adapter.
const owner = {};
const provider = () => globalThis.window?.gamera?.bidderDataV1;
export const spec = createAuctionSpec({
  bundled: true,
  getConfig: (key) => config.getConfig(key),
  getContext: (bid, request) => provider()?.getContext?.(bid, request, owner),
  getPublisherHostname: () => provider()?.getPublisherHostname?.(),
  onConsent: (consent) => {
    if (!hasAuctionConsent(consent)) {
      provider()?.stop?.(owner);
    }
  },
  onSession: (session, hostname, consent, request) =>
    provider()?.acceptSession?.(session, hostname, consent, owner, request.gameraAuction),
  logError
});

// Bundled adapters follow publisher ad-unit definitions; never enroll extra units.
config.getConfig("gameraPublisher", () => spec.gameraV1.syncConfig());
registerBidder(spec);
registerModule("gameraBidAdapter");
