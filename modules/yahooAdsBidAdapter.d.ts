/** ORTB video fields that `bidOverride.imp.video` can override. */
export interface YahooAdsVideoOverride {
  mimes?: string[];
  w?: number;
  h?: number;
  maxbitrate?: number;
  maxduration?: number;
  minduration?: number;
  api?: number[];
  delivery?: number | number[];
  pos?: number;
  playbackmethod?: number | number[];
  placement?: number;
  plcmt?: number;
  linearity?: number;
  protocols?: number[];
  startdelay?: number;
  /** Set to 1 for rewarded video. */
  rewarded?: number;
  podid?: string;
  podseq?: number;
  maxseq?: number;
  poddur?: number;
  slotinpod?: number;
  mincpmpersec?: number;
}

/** Last-resort overrides of values otherwise taken from first party data. */
export interface YahooAdsBidOverride {
  /** Request currency. */
  cur?: string;
  imp?: {
    /** Bid floor, used when the price floors module provides none. */
    bidfloor?: number;
    secure?: number;
    video?: YahooAdsVideoOverride;
  };
  site?: {
    /** External site ID (pubId mode only). */
    id?: string;
  };
  device?: {
    ip?: string;
  };
}

/** Parameters shared by every Yahoo Advertising inventory mode. */
export interface YahooAdsCommonParams {
  /** Overrides of ORTB request fields. */
  bidOverride?: YahooAdsBidOverride;
  /** Custom key-values; values are strings, numbers, or arrays of either. */
  kvp?: Record<string, string | number | string[] | number[]>;
  /** Bid TTL in seconds (1-3599); `setConfig({yahooAds: {ttl}})` takes precedence. */
  ttl?: number;
  /** @deprecated Use `bidOverride.device.ip`. */
  ext?: { ip?: string };
  /** End-to-end test mode settings. */
  testing?: {
    /** Use Yahoo's test inventory; makes `dcn`/`pos`/`pubId` unnecessary. */
    e2etest?: boolean;
    renderer?: {
      /** Delay in ms before the outstream renderer runs. */
      setTimeout?: number;
    };
  };
}

/** DCN & POS inventory mapping (default). */
export interface YahooAdsDcnPosParams extends YahooAdsCommonParams {
  /** Site/app ID provided by Yahoo Advertising. */
  dcn: string;
  /** Placement ID provided by Yahoo Advertising. */
  pos: string;
}

/** Publisher ID inventory mapping. */
export interface YahooAdsPubIdParams extends YahooAdsCommonParams {
  /** Publisher external ID provided by Yahoo Advertising. */
  pubId: string;
  /** External site ID to target. */
  siteId?: string;
  /** External placement ID to target. */
  placementId?: string;
}

/** End-to-end test mode, which needs no inventory IDs. */
export interface YahooAdsE2eTestParams extends YahooAdsCommonParams {
  testing: YahooAdsCommonParams['testing'] & { e2etest: true };
}

/** Parameters accepted by the Yahoo Advertising bidder adapter: either `dcn` and `pos`, or `pubId`. */
export type YahooAdsBidParams = YahooAdsDcnPosParams | YahooAdsPubIdParams | YahooAdsE2eTestParams;

declare module '../src/adUnits' {
  interface BidderParams {
    yahooAds: YahooAdsBidParams;
    yahoossp: YahooAdsBidParams;
    yahooAdvertising: YahooAdsBidParams;
  }
}
