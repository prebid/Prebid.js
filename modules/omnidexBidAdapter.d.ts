import { VidazooBaseBidderParams } from "../libraries/vidazooUtils/vidazooTypes.ts";

export type OmnidexBidRequestParams = VidazooBaseBidderParams

declare module '../src/adUnits' {
  interface BidderParams {
    kueezrtb: OmnidexBidRequestParams;
  }
}
