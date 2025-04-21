import type {DeepPartial} from "./objects";
import type {ORTBRequest} from "./ortb/request";

/**
 * Prebid-generated identifier.
 */
export type Identifier = string;
/**
 * A bidder code.
 */
export type BidderCode = string;
export type BidSource = 's2s' | 'client';
export type Currency = string;
export type AdUnitCode = string;
export type Size = [number, number];
export type ContextIdentifiers = {
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
export type ORTBFragments = {
    /**
     * Global first party data for this auction.
     */
    global?: DeepPartial<ORTBRequest>;
    /**
     * Bidder-specific first party data for this auction (mapped by bidder).
     */
    bidder?: {
        [bidderCode: BidderCode]: DeepPartial<ORTBRequest>
    }
}
