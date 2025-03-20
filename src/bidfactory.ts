import {getUniqueIdentifierStr} from './utils.js';
import type {BidderCode, BidSource, Currency, Identifier} from "./types/common.d.ts";
import {MediaType} from "./mediaTypes.ts";
import type {DSAResponse} from "./types/ortb/ext/dsa.d.ts";
import type {EventTrackerResponse} from "./types/ortb/native/eventtrackers.d.ts";
import {Metrics} from "./utils/perfMetrics.ts";
import {Renderer} from './Renderer.js';
import {type BID_STATUS} from "./constants.ts";
import type {DemandChain} from "./types/ortb/ext/dchain.d.ts";

type ContextIdentifiers = {
    /**
     * Auction ID. Unique for any given auction, but shared across all requests and responses within that auction.
     */
    auctionId: Identifier;
    /**
     * Transaction ID. Unique for any given impression opportunity (every auction presents an opportunity for each slot),
     * but shared across all bid requests and responses for that impression opportunity.
     */
    transactionId: Identifier;
    /**
     * Ad unit ID. Similar to transaction IDs in that any slot and auction pair will have different IDs, but unlike transactions,
     * twin ad units will have different ad unit IDs.
     */
    adUnitId: Identifier;
}

type BidIdentifiers = ContextIdentifiers & {
    src: BidSource;
    bidder: BidderCode;
    bidId: Identifier;
};

function statusMessage(statusCode) {
    switch (statusCode) {
        case 0:
            return 'Pending';
        case 1:
            return 'Bid available';
        case 2:
            return 'Bid returned empty or error response';
        case 3:
            return 'Bid timed out';
    }
}

/**
 * Bid metadata.
 */
export interface BidMeta {
    [key: string]: unknown;
    /**
     * Advertiser domains (corresponds to ORTB `bid.adomain`).
     */
    advertiserDomains?: string[];
    /**
     * Primary category ID (corresponds to ORTB `bid.cat[0]`).
     */
    primaryCatId?: string;
    /**
     * IDs of all other categories (corresponds to ORTB `bid.cat.slice(1)`).
     */
    secondaryCatIds?: string[];
    /**
     * Creative attributes (corresponds to ORTB `bid.attr`).
     */
    attr?: number[];
    /**
     * DSA transparency information.
     */
    dsa?: DSAResponse;
    /**
     * Demand chain object.
     */
    dchain?: DemandChain
}

/**
 * Bid responses as provided by adapters; core then transforms these into `Bid`s
 */
export interface BaseBidResponse {
    bidderCode?: BidderCode;
    /**
     * This bid's BidRequest's `.bidId`.
     */
    requestId: Identifier;
    mediaType: MediaType;
    cpm: number;
    currency: Currency;
    /**
     * The time to live for this bid response in seconds
     */
    ttl: number;
    creativeId: string;
    /**
     * True if the CPM is the one this bidder will pay
     */
    netRevenue: boolean;
    /**
     * If the bid is associated with a Deal, this field contains the deal ID.
     * @see https://docs.prebid.org/adops/deals.html
     */
    dealId?: string;
    meta?: BidMeta;
    /**
     * If true, and deferred billing was requested for this bid, its creative will not be rendered
     * until billing is explicitly triggered with `pbjs.triggerBilling()`.
     * Useful to avoid premature firing of trackers embedded in the creative.
     */
    deferRendering?: boolean;
    /**
     * Event trackers for this bid.
     */
    eventtrackers?: EventTrackerResponse[];
}


export interface BannerBidResponseProperties {
    mediaType: 'banner';
    /**
     * Ad markup. Required unless adUrl is provided.
     */
    ad?: string;
    /**
     * Ad URL. Required unless ad is provided.
     */
    adUrl?: string;
}


export interface VideoBidResponseProperties {
    mediaType: 'video';
}

export interface NativeBidResponseProperties {
    mediaType: 'native';
}

export type BannerBidResponse = BaseBidResponse & BannerBidResponseProperties;
export type VideoBidResponse = BaseBidResponse & VideoBidResponseProperties;
export type NativeBidResponse = BaseBidResponse & NativeBidResponseProperties;

export type BidResponse = BannerBidResponse | VideoBidResponse | NativeBidResponse;

export interface BaseBid extends ContextIdentifiers, Required<Pick<BaseBidResponse, 'meta' | 'deferRendering'>> {
    /**
     * This bid's BidRequest's `.bidId`. Can be null in some `allowUnknownBidderCodes` scenarios.
     */
    requestId: Identifier | null;
    metrics: Metrics;
    renderer?: Renderer;
    source: BidSource;
    width: number;
    height: number;
    adId: Identifier;
    getSize(): string;
    getStatusCode(): number;
    statusMessage: ReturnType<typeof statusMessage>;
    status?: (typeof BID_STATUS)[keyof typeof BID_STATUS]
    bidderCode: BidderCode;
    adapterCode?: BidderCode;
    /**
     * CPM of this bid before currency conversions or adjustments.
     */
    originalCpm?: number;
    /**
     * Currency for `originalCpm`.
     */
    originalCurrency?: Currency;
    /**
     * If true, this bid will not fire billing trackers until they are explicitly
     * triggered with `pbjs.triggerBilling()`.
     */
    deferBilling: boolean;
}

export interface BannerBidProperties {
    mediaType: 'banner';
}

export interface NativeBidProperties {
    mediaType: 'native';
}

export interface VideoBidProperties {
    mediaType: 'video';
}


type BidFrom<RESP, PROPS> = BaseBid & Omit<RESP, keyof BaseBid | keyof PROPS> & PROPS;

export type BannerBid = BidFrom<BannerBidResponse, BannerBidProperties>;
export type VideoBid = BidFrom<VideoBidResponse, VideoBidProperties>;
export type NativeBid = BidFrom<NativeBidResponse, NativeBidProperties>;
export type Bid = BannerBid | VideoBid | NativeBid;


// eslint-disable-next-line @typescript-eslint/no-redeclare
function Bid(statusCode: number, {src = 'client', bidder = '', bidId, transactionId, adUnitId, auctionId}: Partial<BidIdentifiers> = {}) {
  var _bidSrc = src;
  var _statusCode = statusCode || 0;

  Object.assign(this, {
    bidderCode: bidder,
    width: 0,
    height: 0,
    statusMessage: statusMessage(_statusCode),
    adId: getUniqueIdentifierStr(),
    requestId: bidId,
    transactionId,
    adUnitId,
    auctionId,
    mediaType: 'banner',
    source: _bidSrc
  })


  this.getStatusCode = function () {
    return _statusCode;
  };

  // returns the size of the bid creative. Concatenation of width and height by ‘x’.
  this.getSize = function () {
    return this.width + 'x' + this.height;
  };
}

export function createBid(statusCode: number, identifiers?: Partial<BidIdentifiers>): Partial<Bid> {
  return new Bid(statusCode, identifiers);
}


