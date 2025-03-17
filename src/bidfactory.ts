import { getUniqueIdentifierStr } from './utils.js';
import type {BidderCode, BidSource, Currency, Identifier} from "./types/common.d.ts";
import {MediaType} from "./mediaTypes.ts";
import type {DSAResponse} from "./types/ortb/ext/dsa.d.ts";
import type {EventTrackerResponse} from "./types/ortb/native/eventtrackers.d.ts";
import {Metrics} from "./utils/perfMetrics.ts";
import {Renderer} from './Renderer.js';

type ContextIdentifiers = {
    transactionId: Identifier;
    adUnitId: Identifier;
    auctionId: Identifier;
}

type BidIdentifiers = ContextIdentifiers & {
    src: BidSource;
    bidder: BidderCode;
    bidId: Identifier;
};

// TODO: status is always "1" in practice.
enum BidStatus {
    Pending = 0,
    Available,
    Error,
    Timeout,
}

function statusMessage(statusCode: BidStatus) {
    switch (statusCode) {
        case BidStatus.Pending:
            return 'Pending';
        case BidStatus.Available:
            return 'Bid available';
        case BidStatus.Error:
            return 'Bid returned empty or error response';
        case BidStatus.Timeout:
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
}

/**
 * Bid responses as provided by adapters; core then transforms these into `Bid`s
 */
export interface BaseBidResponse {
    bidderCode?: BidderCode;
    requestId?: Identifier;
    mediaType: MediaType;
    cpm: number;
    ttl: number;
    creativeId: string;
    currency: Currency;
    netRevenue: boolean;
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

export interface BaseBid extends ContextIdentifiers {
    metrics: Metrics;
    renderer?: Renderer;
    source: BidSource;
    bidderCode: BidderCode;
    width: number;
    height: number;
    statusMessage: ReturnType<typeof statusMessage>;
    adId: Identifier;
    getSize(): string;
    getStatusCode(): BidStatus;
    adapterCode?: BidderCode;
    originalCpm?: number;
    originalCurrency?: Currency;
    cpm: number;
    currency: Currency;
    meta: BidMeta;
    /**
     * If true, this bid will not fire billing trackers until they are explicitly
     * triggered with `pbjs.triggerBilling()`.
     */
    deferBilling: boolean;
    deferRendering: boolean;
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
function Bid(statusCode: BidStatus, {src = 'client', bidder = '', bidId, transactionId, adUnitId, auctionId}: Partial<BidIdentifiers> = {}) {
  var _bidSrc = src;
  var _statusCode = statusCode || BidStatus.Pending;

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


