import type { AdUnitDefinition } from './adUnits.js';
import { getWindowSelf } from './utils.js';

declare global {
  interface Navigator {
    connection?: {
      effectiveType?: string;
    };
  }
}

export const BIDBOOST_RTD_NAME = 'bidboost';
export const BIDBOOST_ANALYTICS_CODE = 'bidboost';
export const ALL_BIDDERS = '*';

export interface BidboostAdditionalBid {
  bidder: string;
  [key: string]: unknown;
}

export type BidboostAdUnitDefinition = Partial<AdUnitDefinition> & {
  code: string;
  bids?: BidboostAdditionalBid[];
  [key: string]: unknown;
};

type PlacementMapper = (adUnit: BidboostAdUnitDefinition) => string;
type BidderMapper = (bidderCode: string) => string;

export interface BidboostModuleParamsInput {
  client?: string;
  site?: string;
  predictorUrl?: string;
  collectorUrl?: string;
  analyticsBatchWindowMs?: number;
  ignoredBidders?: string[];
  placementMapper?: PlacementMapper;
  bidderMapper?: BidderMapper;
  reverseBidderMapper?: BidderMapper;
  additionalBidders?: BidboostAdUnitDefinition[];
}

export interface BidboostModuleParams {
  client: string;
  site: string;
  predictorUrl: string;
  collectorUrl: string;
  analyticsBatchWindowMs: number;
  ignoredBidders: Set<string>;
  placementMapper: PlacementMapper;
  bidderMapper: BidderMapper;
  reverseBidderMapper: BidderMapper;
  additionalBidders: BidboostAdUnitDefinition[];
}

const BIDBOOST_DEFAULT_PREDICTOR_URL = 'https://predict.bidboost.net';
const BIDBOOST_DEFAULT_COLLECTOR_URL = 'https://collect.bidboost.net';

function defaultPlacementMapper(adUnit: BidboostAdUnitDefinition): string {
  return adUnit?.code as string;
}

function defaultBidderMapper(bidder: string): string {
  return bidder;
}

function normalizeAdditionalBidders(value?: BidboostAdUnitDefinition[]): BidboostAdUnitDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const adUnitByCode: Record<string, BidboostAdUnitDefinition & { bids: BidboostAdditionalBid[] }> = {};
  value.forEach((adUnit) => {
    const code = adUnit?.code;
    if (!code) {
      return;
    }

    const normalized = (adUnitByCode[code] ||= { code, bids: [] });
    const bidderSet = new Set(normalized.bids.map((bid) => bid.bidder).filter(Boolean));
    (Array.isArray(adUnit.bids) ? adUnit.bids : []).forEach((bid) => {
      if (!bid?.bidder || bidderSet.has(bid.bidder)) {
        return;
      }
      bidderSet.add(bid.bidder);
      normalized.bids.push(bid);
    });
  });

  return Object.keys(adUnitByCode).map((key) => adUnitByCode[key]);
}

export function toFiniteNumber(value: unknown, fallback: number): number;
export function toFiniteNumber(value: unknown, fallback: null): number | null;
export function toFiniteNumber(value: unknown, fallback: number | null): number | null {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeBidboostParams(params: BidboostModuleParamsInput = {}): BidboostModuleParams {
  return {
    client: typeof params.client === 'string' ? params.client : '',
    site: typeof params.site === 'string' ? params.site : '',
    predictorUrl: params.predictorUrl || BIDBOOST_DEFAULT_PREDICTOR_URL,
    collectorUrl: params.collectorUrl || BIDBOOST_DEFAULT_COLLECTOR_URL,
    analyticsBatchWindowMs: toFiniteNumber(params.analyticsBatchWindowMs, 1000),
    ignoredBidders: new Set(Array.isArray(params.ignoredBidders) ? params.ignoredBidders : []),
    placementMapper: typeof params.placementMapper === 'function' ? params.placementMapper : defaultPlacementMapper,
    bidderMapper: typeof params.bidderMapper === 'function' ? params.bidderMapper : defaultBidderMapper,
    reverseBidderMapper: typeof params.reverseBidderMapper === 'function' ? params.reverseBidderMapper : defaultBidderMapper,
    additionalBidders: normalizeAdditionalBidders(params.additionalBidders)
  };
}

export function hasRequiredParams(params?: { client?: string; site?: string } | null): boolean {
  return !!(params && params.client && params.client.trim().length > 0 && params.site && params.site.trim().length > 0);
}

export interface PredictorSnapshot {
  v: number;
  g: number;
  b: number;
  t: number;
  fa: number;
  m: Record<string, string>;
  r: unknown;
}

const predictorSnapshotByAuctionId: Record<string, PredictorSnapshot> = {};

export function setPredictorSnapshotForAuction(auctionId: string, snapshot: PredictorSnapshot): void {
  if (!auctionId || !snapshot) {
    return;
  }
  predictorSnapshotByAuctionId[auctionId] = snapshot;
}

export function peekPredictorSnapshotForAuction(auctionId: string): PredictorSnapshot | null {
  return predictorSnapshotByAuctionId[auctionId] || null;
}

export function consumePredictorSnapshotForAuction(auctionId: string): PredictorSnapshot | null {
  const snapshot = predictorSnapshotByAuctionId[auctionId] || null;
  if (snapshot) {
    delete predictorSnapshotByAuctionId[auctionId];
  }
  return snapshot;
}

const CONNECTION_TYPE_IDS = {
  '4g': 1,
  '3g': 2,
  '2g': 3,
  'slow-2g': 4
};

export function getConnectionType(): number {
  try {
    const connectionType = getWindowSelf()?.navigator?.connection?.effectiveType || '4g';
    return CONNECTION_TYPE_IDS[connectionType] || CONNECTION_TYPE_IDS['4g'];
  } catch (_e) {
    return CONNECTION_TYPE_IDS['4g'];
  }
}
