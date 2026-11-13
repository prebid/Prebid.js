import {
  type BidderSpec,
  registerBidder,
} from "../src/adapters/bidderFactory.js";
import { createFerioBidderSpec } from "../libraries/ferioUtils/bidderUtils.js";

const BIDDER_CODE = "lunamediahb";
const LUNAMEDIAHB_ENDPOINT = "https://lunamedia.bid/prebid";
const LUNAMEDIAHB_GVLID = 998;

export interface LunamediaHBBidParams {
  publisherId: string;
  adUnitId: string;
  tenantId: string;
}

declare module "../src/adUnits" {
  interface BidderParams {
    [BIDDER_CODE]: LunamediaHBBidParams;
  }
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  ...createFerioBidderSpec({
    code: BIDDER_CODE,
    endpoint: LUNAMEDIAHB_ENDPOINT,
    requiredParams: ["tenantId"],
  }),
  gvlid: LUNAMEDIAHB_GVLID,
};

registerBidder(spec);
