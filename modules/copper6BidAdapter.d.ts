import { VidazooBaseBidderParams } from "../libraries/vidazooUtils/vidazooTypes.ts";

export type Copper6BidRequestParams = VidazooBaseBidderParams

declare module '../src/adUnits' {
  interface BidderParams {
    copper6ssp: Copper6BidRequestParams;
  }
}
