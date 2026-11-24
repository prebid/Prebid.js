// Shared between the Stack Up RTD provider, which records what it did for each
// auction, and analytics modules, which read it back. Modules cannot import from
// one another, so the per-auction record lives here.

type BrandSafetyBlock = unknown; // TODO: define properly when we have real data
type EmotionBlock = unknown; // TODO: define properly when we have real data

interface Ortb2Segment {
  id: string;
  name?: string;
  value?: string;
  ext?: { confidence?: number };
}

interface Ortb2DataBlock<TSegtax extends number> {
  id?: string;
  name: string;
  ext?: {
    segtax?: TSegtax;
    [key: string]: unknown;
  };
  segment: Ortb2Segment[];
}

export type Ortb2ContentSegment = Ortb2DataBlock<6 | 9 | 502>;

export type Ortb2UserSegment = Ortb2DataBlock<4 | 501>;

export interface EnrichmentSnapshot {
  articleId: string;
  fetchedAt: number; // unix ms when enrichment landed
  source: "api" | "cache";
  site: {
    cattax?: number;
    pagecat?: string[];
    // Comma-separated keywords.
    keywords?: string;
    // Publisher-level data, present only when the publisher's agreement with
    // Stack Up includes it.
    ext?: { data: Record<string, unknown> };
    content: {
      id?: string;
      title?: string;
      data: Ortb2ContentSegment[];
      ext?: Record<string, unknown> & {
        brand_safety?: BrandSafetyBlock;
        emotion?: EmotionBlock;
      };
    };
  };
  user: {
    data: Ortb2UserSegment[];
  };
}

/**
 * What the RTD provider did for one auction:
 * - `enriched`: the snapshot was merged into the auction's ortb2;
 * - `timedOut`: the auction was released before the enrichment was available;
 * - `noConsent`: consent for the auction did not allow enrichment;
 * - `unavailable`: there was no enrichment to add (no article, or the fetch
 *   failed). An auction gets no record at all when the module did not
 *   initialise (missing params, or consent already denied at init);
 * - `error`: merging the enrichment failed.
 */
export type AuctionEnrichmentStatus =
  | "enriched"
  | "timedOut"
  | "noConsent"
  | "unavailable"
  | "error";

export interface AuctionEnrichment {
  auctionId: string;
  status: AuctionEnrichmentStatus;
  /**
   * The snapshot merged into the auction, set only when `status` is `enriched`.
   * Its `user.data` is empty when activity controls kept our user.data out.
   * It is shared with the RTD provider and later auctions, so it must not be modified.
   */
  enrichment: Readonly<EnrichmentSnapshot> | null;
}

// Enough for an analytics module to read a record before it is evicted (bid won
// events can arrive long after the auction, and pages may run an auction per ad
// slot), while keeping long-lived SPA sessions bounded. Records are small: the
// snapshot they point to is shared, not copied.
const MAX_AUCTIONS = 50;

const byAuctionId = new Map<string, AuctionEnrichment>();

export function recordAuctionEnrichment(record: AuctionEnrichment): void {
  byAuctionId.set(record.auctionId, record);
  // Map iteration follows insertion order, so the first key is the oldest
  if (byAuctionId.size > MAX_AUCTIONS) {
    byAuctionId.delete(byAuctionId.keys().next().value);
  }
}

export function getAuctionEnrichment(
  auctionId: string
): AuctionEnrichment | undefined {
  return byAuctionId.get(auctionId);
}

export function auctionEnrichmentCount(): number {
  return byAuctionId.size;
}

export function resetAuctionEnrichments(): void {
  byAuctionId.clear();
}
