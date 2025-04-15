import type {BidderCode, AdUnitCode} from "./types/common.d.ts";

const REQUESTS = 'requests';
const WINS = 'wins';
const AUCTIONS = 'auctions';

let adUnits = {};
export function reset() {
  adUnits = {}
}

function ensureAdUnit(adunit, bidderCode?) {
  let adUnit = adUnits[adunit] = adUnits[adunit] || { bidders: {} };
  if (bidderCode) {
    return adUnit.bidders[bidderCode] = adUnit.bidders[bidderCode] || {}
  }
  return adUnit;
}

type AdUnitCounter = (adUnit: AdUnitCode) => number;
type BidderCounter = (adUnit: AdUnitCode, bidderCode: BidderCode) => number;
type Counter<BY_BIDDER extends boolean> = BY_BIDDER extends true ? BidderCounter : AdUnitCounter;

function incrementer<BY_BIDDER extends boolean>(counter): Counter<BY_BIDDER> {
    return function (adUnit, bidder?) {
        const counters = ensureAdUnit(adUnit, bidder);
        counters[counter] = (counters[counter] ?? 0) + 1;
        return counters[counter];
    }
}

function getter<BY_BIDDER extends boolean>(counter): Counter<BY_BIDDER> {
    return function (adUnit, bidder?) {
        return ensureAdUnit(adUnit, bidder)[counter] ?? 0;
    }
}

/**
 * Increments and returns current Adunit counter
 */
export const incrementRequestsCounter = incrementer<false>(REQUESTS);

/**
 * Increments and returns current Adunit requests counter for a bidder
 */
export const incrementBidderRequestsCounter = incrementer<true>(REQUESTS);

/**
 * Increments and returns current Adunit wins counter for a bidder
 */
export const incrementBidderWinsCounter = incrementer<true>(WINS);

/**
 * Increments and returns current Adunit auctions counter
 */
export const incrementAuctionsCounter = incrementer<false>(AUCTIONS);

/**
 * Returns current Adunit counter
 */
export const getRequestsCounter = getter<false>(REQUESTS);

/**
 * Returns current Adunit requests counter for a specific bidder code
 */
export const getBidderRequestsCounter = getter<false>(REQUESTS)

/**
 * Returns current Adunit requests counter for a specific bidder code
 */
export const getBidderWinsCounter = getter<true>(WINS);

/**
 * Returns current Adunit auctions counter
 */
export const getAuctionsCounter = getter<false>(AUCTIONS);
