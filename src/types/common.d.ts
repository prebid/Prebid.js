import type {DeepPartial} from "./objects.d.ts";
import type {ORTBRequest} from "./ortb/request.d.ts";

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
   * Page view ID. Unique for a page view (one load of Prebid); can also be refreshed programmatically.
   * Shared across all requests and responses within the page view, for the same bidder.
   * Different bidders see a different page view ID.
   */
  pageViewId: Identifier;
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

export type ByAdUnit<T> = { [adUnit: AdUnitCode]: T };

export type StorageDisclosure = {
  /**
   * URL to a device storage disclosure document in TCF format
   * https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/Vendor%20Device%20Storage%20%26%20Operational%20Disclosures.md
   */
  disclosureURL?: string;
}
