import { OneBidTechBidderParams } from '../libraries/onebidtechUtils/onebidtechTypes.ts';

export type TruvidBidRequestParams = OneBidTechBidderParams;

declare module '../src/adUnits' {
  interface BidderParams {
    truvid: TruvidBidRequestParams;
  }
}
