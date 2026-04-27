import { VidazooBaseBidderParams } from "../libraries/vidazooUtils/vidazooTypes.ts";

export type TagorasBidRequestParams = VidazooBaseBidderParams

declare module '../src/adUnits' {
  interface BidderParams {
    tagoras: TagorasBidRequestParams;
  }
}
