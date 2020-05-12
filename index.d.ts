interface Prebid {
  adServers: any;
  que: PrebidQue;
  bidderSettings: PrebidBidderSettings;
  libLoaded: boolean;

  getAdserverTargeting(): PrebidAdserverTargeting;
  getAdserverTargetingForAdUnitCode(
    adUnitCode: string
  ): PrebidAdUnitAdserverTargeting;
  getBidResponses(): PrebidBidResponses;
  getBidResponsesForAdUnitCode(adUnitCode: string): PrebidBidResponse;
  getHighestCpmBids(adUnitCode?: string): PrebidBidResponse[];
  getAllWinningBids(): PrebidBidResponse[];
  setTargetingForGPTAsync(adUnitCodes?: string[]): void;
  setTargetingForAst(): void;
  renderAd(doc: Document, id: string): void;
  removeAdUnit(adUnitCode: string): void;
  requestBids(request: PrebidRequest): void;
  addAdUnits(bidAdUnits: PrebidAdUnit | PrebidAdUnit[]): void;
  onEvent(event: PrebidEvent, handler: () => void, id?: string): void;
  offEvent(event: PrebidEvent, handler: () => void, id?: string): void;
  enableAnalytics(config: any): void;
  aliasBidder(adapterName: string, aliasedName: string): void;
  setConfig(options: PrebidConfig): void;
  getConfig(option: string, callback?: (config: any) => void): any;
  triggerUserSyncs(): void;
  markWinningBidAsUsed(options: { adUnitCode: string }): void;
}

interface PrebidQue {
  push(command: () => void): void;
}

interface PrebidAdserverTargeting {
  [adUnitCode: string]: PrebidAdUnitAdserverTargeting[];
}

interface PrebidAdUnitAdserverTargeting {
  [key: string]: string;
}

interface PrebidRequest {
  adUnitCodes?: string[];
  adUnits?: PrebidAdUnit[];
  timeout?: number;
  bidsBackHandler?: () => void;
  labels?: string[];
}

interface PrebidBidResponses {
  [key: string]: PrebidBidResponse;
}

interface PrebidBidResponse {
  bidder: string;
  adId: string;
  width: number;
  height: number;
  cpm: number;
  adResponse?: {
    tag_id: number;
  };
  requestTimestamp: number;
  responseTimestamp: number;
  timeToRespond: number;
  adUnitCode: string;
  statusMessage: string;
  dealId?: string;
}

interface PrebidAdUnit {
  code: string;
  bids?: PrebidAdUnitBid[];
  mediaTypes?: PrebidMediaType;
  labelAny?: string[];
  labelAll?: string[];
}

interface PrebidAdUnitBid {
  bidder: string;
  params: any;
  labelAny?: string[];
  labelAll?: string[];
}

interface PrebidMediaType {
  banner?: {
    sizes: PrebidSize;
  };
  native?: any;
  video?: any;
}

interface PrebidBidderSettings {
  [key: string]: PrebidBidderSetting;
}

interface PrebidBidderSetting {
  alwaysUseBid?: boolean;
  adserverTargeting?: PrebidBidderSettingAdServerTargeting[];
  bidCpmAdjustment?: (bidCPM: number, bid: PrebidBidResponse) => number;
  sendStandardTargeting?: boolean;
  suppressEmptyKeys?: boolean;
}

interface PrebidBidderSettingAdServerTargeting {
  key: string;
  val: (bidResponse: PrebidBidderSettingBidResponse) => string | undefined;
}

interface PrebidBidderSettingBidResponse {
  bidderCode: string;
  adId: string;
  pbLg: string;
  pbMg: string;
  pbHg: string;
  pbAg: string;
  pbDg: string;
  pbCg: string;
  size: string;
  width: number;
  height: number;
  adTag: string;
  cpm: number;
  dealId: string;
  source: string;
  mediaType: string;
  siteId: string;
  priceLevel: string;
}

interface PrebidAnalytics {
  provider: string;
  options?: any;
}

interface PrebidConfig {
  debug?: boolean;
  bidderTimeout?: number;
  maxRequestsPerOrigin?: number;
  disableAjaxTimeout?: boolean;
  timeoutBuffer?: number;
  useBidCache?: boolean;
  enableSendAllBids?: boolean;
  bidderSequence?: "fixed" | "random";
  publisherDomain?: string;
  priceGranularity?:
    | "low"
    | "medium"
    | "high"
    | "auto"
    | "dense"
    | PrebidPriceGranularity;
  mediaTypePriceGranularity?: PrebidMediaTypePriceGranularity;
  cookieSyncDelay?: number;
  s2sConfig?: PrebidS2SConfig;
  userSync?: PrebidUserSyncConfig;
  sizeConfig?: PrebidSizeConfig[];
  consentManagement?: PrebidConsentManagementConfig;
  cache?: any;
  schain?: PrebidSupplyChain;
}

interface PrebidS2SConfig {
  accountId: string;
  bidders: string[];
  defaultVendor?: string;
  enabled?: boolean;
  timeout: number;
  adapter: string;
  endpoint: string;
  syncEndpoint: string;
  userSyncLimit?: number;
}

interface PrebidUserSyncConfig {
  syncEnabled?: boolean;
  filterSettings?: any;
  syncsPerBidder?: number;
  syncDelay?: number;
  enableOverride?: boolean;
  userIds?: UserIds[];
}

interface PrebidSupplyChain {
  validation: PrebidSupplyChainValidation;
  config: PrebidSupplyChainConfig;
}

interface PrebidSupplyChainConfig {
  ver: string;
  complete: PrebidNumberBoolean;
  nodes: PrebidSupplyChainNode[];
}

interface PrebidSupplyChainNode {
  asi: string;
  sid: string;
  hp: PrebidNumberBoolean;
}

interface UserIds {
  name: string;
  params?: UserIdsParams;
  storage: UserIdStorageSetting;
}

interface UserIdsParams {
  url?: string;
  pid?: string;
  partner?: string;
}

interface UserIdStorageSetting {
  type: string;
  name: string;
  expires?: number;
}

interface PrebidUserSyncFilterSettings {
  iframe?: PrebidUserSyncFilterSetting;
  image?: PrebidUserSyncFilterSetting;
}

interface PrebidUserSyncFilterSetting {
  bidders: string | string[];
  filter: "include" | "exclude";
}

interface PrebidSizeConfig {
  mediaQuery: string;
  sizesSupported: PrebidSize;
  labels: string[];
}

interface PrebidPriceGranularity {
  buckets?: PrebidPriceGranularityBucket[];
}

interface PrebidMediaTypePriceGranularity {
  video?: PrebidPriceGranularityBucket[];
  banner?: PrebidPriceGranularityBucket[];
  native?: PrebidPriceGranularityBucket[];
}

interface PrebidPriceGranularityBucket {
  precision: number;
  max: number;
  increment: number;
}

interface PrebidConsentManagementConfig {
  usp?: PrebidUspGdprOptionsConfig;
  gpdr?: PrebidUspGdprOptionsConfig;
}
interface PrebidUspGdprOptionsConfig {
  cmpApi?: string;
  timeout?: number;
  allowAuctionWithoutConsent?: boolean;
}

type PrebidSupplyChainValidation = "strict" | "relaxed" | "off";
type PrebidNumberBoolean = 1 | 0;
type PrebidSize = Array<[number, number]> | [number, number];
type PrebidEvent =
  | "auctionInit"
  | "auctionEnd"
  | "bidAdjustment"
  | "bidTimeout"
  | "bidRequested"
  | "bidResponse"
  | "bidWon"
  | "setTargeting"
  | "requestBids"
  | "addAdUnits";
