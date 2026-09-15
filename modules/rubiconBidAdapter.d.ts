export interface RubiconVideoParams {
  playerWidth?: number;
  playerHeight?: number;
  size_id?: number;
  language?: string;
  [key: string]: unknown;
}

/** Parameters accepted by the Rubicon bidder adapter. */
export interface RubiconBidderParams {
  accountId: number | string;
  siteId: number | string;
  zoneId: number | string;
  floor?: number | string;
  userId?: string;
  latLong?: [number | string, number | string];
  position?: 'atf' | 'btf';
  keywords?: string | string[];
  visitor?: Record<string, unknown>;
  inventory?: Record<string, unknown>;
  video?: RubiconVideoParams;
  /** Rubicon size IDs, such as 15 for 300x250 or 57 for 970x250. */
  sizes?: number[];
  playerWidth?: number;
  playerHeight?: number;
  bidonmultiformat?: boolean;
  referrer?: string;
  secure?: boolean;
}

declare module '../src/adUnits' {
  interface BidderParams {
    rubicon: RubiconBidderParams;
  }
}
