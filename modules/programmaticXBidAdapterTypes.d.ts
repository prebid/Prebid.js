import { VidazooBaseBidderParams } from "../libraries/vidazooUtils/vidazooTypes.ts";

export type ProgrammaticXBidRequestParams = VidazooBaseBidderParams

declare module '../src/adUnits' {
  interface BidderParams {
    programmaticX: ProgrammaticXBidRequestParams;
  }
}
