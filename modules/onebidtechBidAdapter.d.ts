import { OneBidTechBidderParams } from '../libraries/onebidtechUtils/onebidtechTypes.ts';

export type OneBidTechBidRequestParams = OneBidTechBidderParams;

declare module '../src/adUnits' {
  interface BidderParams {
    onebidtech: OneBidTechBidRequestParams;
  }
}
