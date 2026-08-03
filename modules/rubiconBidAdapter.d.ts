import type { Size } from '../src/types/common.d.ts';

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
  latLong?: [number, number];
  position?: 'atf' | 'btf';
  keywords?: string | string[];
  visitor?: Record<string, unknown>;
  inventory?: Record<string, unknown>;
  video?: RubiconVideoParams;
  sizes?: Size[];
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
