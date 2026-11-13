import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import type { Bid } from '../src/bidfactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { isStr, logError, logWarn, replaceAuctionPrice } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { buildRequests, interpretResponse } from '../libraries/onebidtechUtils/utils.js';
import type { OneBidTechBidderParams } from '../libraries/onebidtechUtils/onebidtechTypes.ts';

const BIDDER_CODE = 'truvid';
const ENDPOINT_URL = 'https://us-e.tru-bid.com/ssp/placement';
const GVLID = 862;

export type TruvidBidRequestParams = OneBidTechBidderParams;

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: TruvidBidRequestParams;
  }
}

type BidWithNurl = Bid & { nurl?: string };

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid(bid) {
    if (!bid || !bid.params || !bid.params.placementId) {
      return false;
    }

    const placementId = bid.params.placementId;
    const isValidPlacement = isStr(placementId) && placementId.length > 0;
    if (!isValidPlacement) {
      logWarn(`${BIDDER_CODE}: missing or invalid required params.placementId`);
      return false;
    }
    return true;
  },

  buildRequests(validBidRequests, bidderRequest) {
    return buildRequests(validBidRequests, bidderRequest, ENDPOINT_URL);
  },

  interpretResponse,

  onBidWon(bid: Bid) {
    const { nurl } = bid as BidWithNurl;
    if (nurl && isStr(nurl)) {
      const winUrl = replaceAuctionPrice(nurl, bid.originalCpm || bid.cpm);
      ajax(winUrl, null, null, { method: 'GET', withCredentials: false, keepalive: true });
    }
  },

  onTimeout(timeoutData) {
    logError(`${BIDDER_CODE}: bid timed out`, timeoutData);
  }
};

registerBidder(spec);
