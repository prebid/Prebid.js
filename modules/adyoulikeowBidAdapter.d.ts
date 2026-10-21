import { OneBidTechBidderParams } from '../libraries/onebidtechUtils/onebidtechTypes.ts';

export type AdyoulikeOWBidRequestParams = OneBidTechBidderParams;

declare module '../src/adUnits' {
  interface BidderParams {
    adyoulikeow: AdyoulikeOWBidRequestParams;
  }
}
