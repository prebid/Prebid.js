import { VidazooBaseBidderParams } from "../libraries/vidazooUtils/vidazooTypes.ts";

export type OpaMarketplaceBidRequestParams = VidazooBaseBidderParams

declare module '../src/adUnits' {
  interface BidderParams {
    opamarketplace: OpaMarketplaceBidRequestParams;
  }
}
