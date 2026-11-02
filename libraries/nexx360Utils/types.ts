/** Per-SSP bid attempt for a specific impression */
export interface Nexx360SSPBid {
  ssp: string;
  status: 'bid' | 'noBid' | 'timeout' | 'error';
  responseTimeMs?: number;
  cpm?: number;
  currency?: string;
  size?: string;
  dealId?: string;
  bidId?: string;
  error?: string;
}

/** Auction summary for a single impression */
export interface Nexx360ImpressionAuction {
  impId: string;
  adUnitCode: string;
  bids: Nexx360SSPBid[];
  totalSsps: number;
  bidsReceived: number;
  timeouts: number;
  errors: number;
  auctionTimeMs: number;
  winner?: {
    ssp: string;
    cpm: number;
    currency: string;
  };
}

/** Server-side auction data attached to Nexx360 OpenRTB response ext */
export interface Nexx360ServerAuction {
  auctionId: string;
  timestamp: number;
  impressions: Nexx360ImpressionAuction[];
  totalImpressions: number;
  totalSspsCalled: number;
  totalBidsReceived: number;
  totalTimeouts: number;
  totalErrors: number;
  auctionTimeMs: number;
}

/** Top-level Nexx360 response extension */
export interface Nexx360ResponseExt {
  cookies?: unknown[];
  serverAuction?: Nexx360ServerAuction;
}
