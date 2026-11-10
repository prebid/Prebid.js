/** Parameters shared by every GumGum placement. */
export interface GumgumBaseBidParams {
  /** Zone (tracking) ID, for bids tracking a single domain or site. */
  zone?: string;
  /** Publisher ID, for bids tracking multiple domains or sites. */
  pubId?: number | string;
  /** Slot ID; makes a `zone`/`pubId` bid a slot placement. */
  slot?: number | string;
  /** Native placement ID. */
  native?: number | string;
  /** Product type, e.g. `'skins'`. */
  product?: string;
  /** Static CPM floor in USD, used when the floors module provides none. */
  bidfloor?: number;
  /** Iris.tv segments, comma separated. */
  iriscat?: string;
  /** Iris.tv ID. */
  irisid?: string;
  /** CSS selector of the ad slot element. */
  selector?: string;
  /** @deprecated Legacy in-screen zone ID; use `zone`. */
  inScreen?: string;
  /** @deprecated Legacy in-screen publisher ID; use `pubId`. */
  inScreenPubID?: number | string;
  /** @deprecated Legacy slot ID; use `zone` with `slot`. */
  inSlot?: number | string;
  /** @deprecated Legacy ICV (native) ID; use `zone` with `native`. */
  ICV?: number | string;
  /** @deprecated Legacy video zone ID; use `zone`. */
  video?: string;
  /** @deprecated Legacy in-video zone ID; use `zone`. */
  inVideo?: string;
  /** @deprecated Legacy video publisher ID; use `pubId`. */
  videoPubID?: number | string;
}

/** The adapter rejects a bid unless at least one of these placement identifiers is set. */
export type GumgumPlacementId =
  | { zone: string }
  | { pubId: number | string }
  | { inScreen: string }
  | { inScreenPubID: number | string }
  | { inSlot: number | string }
  | { ICV: number | string }
  | { video: string }
  | { inVideo: string }
  | { videoPubID: number | string };

/** Parameters accepted by the GumGum bidder adapter. */
export type GumgumBidParams = GumgumBaseBidParams & GumgumPlacementId;

declare module '../src/adUnits' {
  interface BidderParams {
    gumgum: GumgumBidParams;
    gg: GumgumBidParams;
  }
}
