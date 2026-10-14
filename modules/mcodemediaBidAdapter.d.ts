import type { TeqBlazeBidParams } from '../libraries/teqblazeUtils/bidderUtils.js';

export type MCodeMediaBidderParams = TeqBlazeBidParams;

declare module '../src/adUnits' {
  interface BidderParams {
    mcodemedia: MCodeMediaBidderParams;
  }
}
