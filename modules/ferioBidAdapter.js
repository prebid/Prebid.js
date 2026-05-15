import { registerBidder } from "../src/adapters/bidderFactory.js";
import { createFerioBidderSpec } from "../libraries/ferioUtils/bidderUtils.js";

const BIDDER_CODE = "ferio";
const FERIO_ENDPOINT = "https://ferio.bid/pbjs/bid";

export const spec = createFerioBidderSpec({
  code: BIDDER_CODE,
  endpoint: FERIO_ENDPOINT,
  requiredParams: ["tenantId"],
});

registerBidder(spec);
