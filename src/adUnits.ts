import type {AdUnitCode, BidderCode} from "./types/common.d.ts";
import type {ORTBImp} from "./types/ortb/request.d.ts";
import type {Bid} from "./bidfactory.ts";
import type {BannerMediaType} from "./banner.ts";
import type {MediaTypes} from "./mediaTypes.ts";

export interface RendererConfig {
    /**
     * URL to the renderer script that will be loaded before invoking `render`.
     */
    url?: string

    /**
     * Function that tells Prebid.js how to invoke the renderer script to render a bid.
     */
    render(bid: Bid): void;

    /**
     * if set to true, this renderer config will be used only when the bid adapter doesn't provide its own renderer.
     */
    backupOnly?: boolean;
}

export interface BidderParams {
    [bidder: BidderCode]: { [param: string]: unknown };
}

export interface BaseMediaType {
    /**
     * Custom renderer. Takes precedence over adUnit.renderer, but applies only to this media type.
     */
    renderer?: RendererConfig;
}

export interface BaseAdUnitBid {
    /**
     * Used for conditional ads (sizeMapping or sizeMappingV2 modules).
     */
    labelAny?: string[];
    /**
     * Used for conditional ads (sizeMapping or sizeMappingV2 modules).
     */
    labelAll?: string[];
    /**
     * Custom renderer. Takes precedence over adUnit.renderer, but applies only to this bidder or module.
     */
    renderer?: RendererConfig;
    /**
     * OpenRTB first-party data specific to this bidder or module. This is merged with, and takes precedence over, adUnit.ortb2Imp.
     */
    ortb2Imp?: Partial<ORTBImp>;
}

export interface AdUnitBidderBid<BIDDER extends BidderCode> extends BaseAdUnitBid {
    /**
     * Unique code identifying the bidder.
     */
    bidder: BIDDER;
    /**
     * Bid request parameters for a given bidder.
     */
    params: BidderParams[BIDDER];
}

export type AdUnitModuleBidders = 'pbsBidAdapter';

export interface AdUnitModuleBid<MODULE extends AdUnitModuleBidders> extends BaseAdUnitBid {
    /**
     * Module code - for requesting bids from modules that are not bid adapters
     */
    module: MODULE;
    params?: {
        /**
         * Name given to a PBS configuration. Used to identify specific PBS instances when multiple are in use.
         */
        configName?: string;
    }
}

export type AdUnitBid = AdUnitModuleBid<AdUnitModuleBidders> | AdUnitBidderBid<BidderCode>;

export interface AdUnitRequest {
    /**
     * An identifier you create and assign to this ad unit.
     * Generally this is set to the ad slot name or the div element ID.
     * Used by setTargetingForGPTAsync() to match which auction is for which ad slot.
     */
    code: AdUnitCode;
    /**
     * Bid requests representing demand partners and associated parameters.
     */
    bids?: AdUnitBid[];
    mediaTypes?: MediaTypes;
    /**
     * TTL buffer override for this adUnit.
     */
    ttlBuffer?: number;
    /**
     * Used to signal OpenRTB Imp objects at the adUnit grain.
     * Similar to the global ortb2 field used for global first party data configuration, but specific to this adunit.
     */
    ortb2Imp?: Partial<ORTBImp>;
    /**
     * Custom renderer, typically used for outstream video
     */
    renderer?: RendererConfig;

    /**
     * Used to flag adUnits as being separately billable. This allows for a publisher to trigger billing manually for winning bids. See pbjs.triggerBilling and onBidBillable for more info.
     */
    deferBilling?: boolean;
}

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
