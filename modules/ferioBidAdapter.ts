import {
  type BidderSpec,
  registerBidder,
} from "../src/adapters/bidderFactory.js";
import { createFerioBidderSpec } from "../libraries/ferioUtils/bidderUtils.js";

const BIDDER_CODE = "ferio";
const FERIO_ENDPOINT = "https://ferio.bid/pbjs/bid";
const MYFEATURE_BIDDER_CODE = "myfeature";
const MYFEATURE_ENDPOINT = "https://featuretv.bid/prebid";

export interface FerioBidParams {
  publisherId: string;
  adUnitId: string;
  tenantId: string;
}

declare module "../src/adUnits" {
  interface BidderParams {
    [BIDDER_CODE]: FerioBidParams;
    [MYFEATURE_BIDDER_CODE]: FerioBidParams;
  }
}

export const spec: BidderSpec<typeof BIDDER_CODE> = createFerioBidderSpec({
  code: BIDDER_CODE,
  endpoint: FERIO_ENDPOINT,
  requiredParams: ["tenantId"],
  aliases: [
    {
      code: MYFEATURE_BIDDER_CODE,
      endpoint: MYFEATURE_ENDPOINT,
      skipPbsAliasing: true,
    },
  ],
});

registerBidder(spec);
