import { VidazooBaseBidderParams } from "../libraries/vidazooUtils/vidazooTypes.ts";

export interface VidazooBidRequestParams extends VidazooBaseBidderParams {
  /**
   * Host define the domain+TLD in the bid request URL for alias adapters
   */
  host?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    vidazoo: VidazooBidRequestParams;
  }
}
