import { VidazooBaseBidderParams } from "../libraries/vidazooUtils/vidazooTypes.ts";

export type Copper6BidRequestParams = VidazooBaseBidderParams

declare module '../src/adUnits' {
  interface BidderParams {
    copper6: Copper6BidRequestParams;
  }
}
