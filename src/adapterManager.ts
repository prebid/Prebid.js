/** @module adaptermanger */

import {
  deepClone,
  flatten,
  generateUUID,
  getBidderCodes,
  getDefinedParams,
  getUniqueIdentifierStr,
  getUserConfiguredParams,
  groupBy,
  internal,
  isArray,
  isPlainObject,
  isValidMediaTypes,
  logError,
  logInfo,
  logMessage,
  logWarn,
  mergeDeep,
  shuffle,
  timestamp,
  uniques,
} from './utils.js';
import {decorateAdUnitsWithNativeParams, nativeAdapters} from './native.js';
import {newBidder} from './adapters/bidderFactory.js';
import {ajaxBuilder} from './ajax.js';
import {config, RANDOM} from './config.js';
import {hook} from './hook.js';
import {
  type AdUnit,
  type AdUnitBid,
  type AdUnitBidderBid, type AdUnitModuleBid,
  getAuctionsCounter,
  getBidderRequestsCounter,
  getBidderWinsCounter,
  getRequestsCounter,
  incrementAuctionsCounter,
  incrementBidderRequestsCounter,
  incrementBidderWinsCounter,
  incrementRequestsCounter
} from './adUnits.js';
import {getRefererInfo, type RefererInfo} from './refererDetection.js';
import {GDPR_GVLIDS, gdprDataHandler, gppDataHandler, uspDataHandler,} from './consentHandler.js';
import * as events from './events.js';
import {EVENTS, S2S} from './constants.js';
import {type Metrics, useMetrics} from './utils/perfMetrics.js';
import {auctionManager} from './auctionManager.js';
import {MODULE_TYPE_ANALYTICS, MODULE_TYPE_BIDDER, MODULE_TYPE_PREBID} from './activities/modules.js';
import {isActivityAllowed} from './activities/rules.js';
import {ACTIVITY_FETCH_BIDS, ACTIVITY_REPORT_ANALYTICS} from './activities/activities.js';
import {ACTIVITY_PARAM_ANL_CONFIG, ACTIVITY_PARAM_S2S_NAME, activityParamsBuilder} from './activities/params.js';
import {redactor} from './activities/redactor.js';
import {EVENT_TYPE_IMPRESSION, parseEventTrackers, TRACKER_METHOD_IMG} from './eventTrackers.js';
import type {
  AdUnitCode,
  BidderCode,
  BidSource,
  ContextIdentifiers,
  Identifier,
  ORTBFragments,
  Size, StorageDisclosure
} from "./types/common.d.ts";
import type {DeepPartial} from "./types/objects.d.ts";
import type {ORTBRequest} from "./types/ortb/request.d.ts";
import type {
  AnalyticsConfig,
  AnalyticsProvider, AnalyticsProviderConfig,
} from "../libraries/analyticsAdapter/AnalyticsAdapter.ts";
import {getGlobal} from "./prebidGlobal.ts";

export {gdprDataHandler, gppDataHandler, uspDataHandler, coppaDataHandler} from './consentHandler.js';

export const PBS_ADAPTER_NAME = 'pbsBidAdapter';
export const PARTITIONS = {
  CLIENT: 'client',
  SERVER: 'server'
}

export const dep = {
  isAllowed: isActivityAllowed,
  redact: redactor
}

const _bidderRegistry = {};
const _aliasRegistry: { [aliasCode: BidderCode]: BidderCode } = {};
const _analyticsRegistry: { [P in AnalyticsProvider]?: { adapter: AnalyticsAdapter<P>, gvlid?: number }} = {};

let _s2sConfigs = [];
config.getConfig('s2sConfig', config => {
  if (config && config.s2sConfig) {
    _s2sConfigs = isArray(config.s2sConfig) ? config.s2sConfig : [config.s2sConfig];
  }
});

const activityParams = activityParamsBuilder((alias) => adapterManager.resolveAlias(alias));

function getConfigName(s2sConfig) {
  // According to our docs, "module" bid (stored impressions)
  // have params.configName referring to s2sConfig.name,
  // but for a long while this was checking against s2sConfig.configName.
  // Keep allowing s2sConfig.configName to avoid the breaking change
  return s2sConfig.configName ?? s2sConfig.name;
}

export function s2sActivityParams(s2sConfig) {
  return activityParams(MODULE_TYPE_PREBID, PBS_ADAPTER_NAME, {
    [ACTIVITY_PARAM_S2S_NAME]: getConfigName(s2sConfig)
  });
}

export interface BaseBidRequest extends ContextIdentifiers, Pick<AdUnit, typeof ADUNIT_BID_PROPERTIES[number] | 'mediaTypes' | 'ortb2Imp'> {
  /**
   * Unique ID for this request.
   */
  bidId: Identifier;
  /**
   * ID of the BidderRequest containing this request.
   */
  bidderRequestId: Identifier;
  metrics: Metrics;
  src: BidSource;
  /**
   * The code of the ad unit associated with this request.
   */
  adUnitCode: AdUnitCode;
  /**
   * @deprecated - use mediaType specific size parameters instead.
   */
  sizes: Size | Size[];
  /**
   * The number of auctions that took place involving the ad unit associated with this request.
   */
  auctionsCount: number;
  /**
   * How many times the ad unit code associated with this request took part in an auction. This differs
   * from `auctionsCount` when twin ad units are used.
   */
  bidRequestsCount: number;
  /**
   * The number of client (but not s2s) requests that were generated for the combination of ad unit and bidder
   * associated with this request.
   */
  bidderRequestsCount: number;
  /**
   * The number of times a bid from the same bidder and for the same ad unit as this request has won.
   */
  bidderWinsCount: number;
  deferBilling: AdUnit['deferBilling'];
  /**
   * "Global" (not adUnit-specific) first party data for this request. This
   * is an alias for the enclosing BidderRequest's `.ortb2`; adUnit-specific
   * FPD is in `ortb2Imp`.
   */
  ortb2: DeepPartial<ORTBRequest>;
}

export interface StoredBidRequest extends BaseBidRequest, Omit<{[K in keyof AdUnitBidderBid<BidderCode>]?: undefined}, keyof BaseBidRequest> {
  bidder: null;
  src: typeof S2S.SRC;
}
type BidderBidRequest<BIDDER extends BidderCode> = BaseBidRequest & AdUnitBidderBid<BIDDER>;

export type BidRequest<BIDDER extends (BidderCode | null)> = BIDDER extends null ? StoredBidRequest : BidderBidRequest<BIDDER>;

export interface BaseBidderRequest<BIDDER extends BidderCode | null> {
  /**
   * Unique ID for this request.
   */
  bidderRequestId: Identifier;
  auctionId: Identifier;
  pageViewId: Identifier;
  /**
   * The bidder associated with this request, or null in the case of stored impressions.
   */
  bidderCode: BIDDER;
  /**
   * Bid requests (one per ad unit) included in this request.
   */
  bids: BidRequest<BIDDER>[];
  /**
   * First party data for this request.
   */
  ortb2: DeepPartial<ORTBRequest>;
  /**
   * Auction start timestamp.
   */
  auctionStart: number;
  /**
   * Request timeout in milliseconds.
   */
  timeout: number;
  refererInfo: RefererInfo;
  metrics: Metrics;
  gdprConsent?: ReturnType<typeof gdprDataHandler['getConsentData']>;
  uspConsent?: ReturnType<typeof uspDataHandler['getConsentData']>;
  gppConsent?: ReturnType<typeof gppDataHandler['getConsentData']>;
}

export interface S2SBidderRequest<BIDDER extends BidderCode | null> extends BaseBidderRequest<BIDDER> {
  src: typeof S2S.SRC;
  uniquePbsTid: Identifier;
  adUnitsS2SCopy: PBSAdUnit[];
}

export interface ClientBidderRequest<BIDDER extends BidderCode> extends BaseBidderRequest<BIDDER> {
  src: 'client';
}

export type BidderRequest<BIDDER extends BidderCode | null> = ClientBidderRequest<BIDDER> | S2SBidderRequest<BIDDER>;

const ADUNIT_BID_PROPERTIES = [
  'nativeParams',
  'nativeOrtbRequest',
  'renderer',
] as const;

type GetBidsOptions<SRC extends BidSource, BIDDER extends BidderCode | null> = {
  bidderCode: BIDDER;
  auctionId: Identifier;
  bidderRequestId: Identifier;
  adUnits: (SRC extends typeof S2S.SRC ? PBSAdUnit : AdUnit)[]
  src: SRC;
  metrics: Metrics,
  getTid: ReturnType<typeof tidFactory>;
}

export type AliasBidderOptions = {
  /**
   * IAB Global Vendor List ID for this alias for use with the TCF control module.
   */
  gvlid?: number;
  /**
   * Flag determining if the GVL ID of the original adapter should be re-used.
   */
  useBaseGvlid?: boolean;
  /**
   * If true, the alias will not be communicated to Prebid Server.
   */
  skipPbsAliasing?: boolean
}

export type AnalyticsAdapter<P extends AnalyticsProvider> = StorageDisclosure & {
  code?: P;
  enableAnalytics(config: AnalyticsConfig<P>): void;
  gvlid?: number | ((config: AnalyticsConfig<P>) => number);
}

function getBids<SRC extends BidSource, BIDDER extends BidderCode | null>({bidderCode, auctionId, bidderRequestId, adUnits, src, metrics, getTid}: GetBidsOptions<SRC, BIDDER>): BidRequest<BIDDER>[] {
  return adUnits.reduce((result, adUnit) => {
    const bids = adUnit.bids.filter(bid => bid.bidder === bidderCode);
    if (bidderCode == null && bids.length === 0 && (adUnit as PBSAdUnit).s2sBid != null) {
      bids.push({bidder: null});
    }
    result.push(
      bids.reduce((bids: BidRequest<BIDDER>[], bid: BidRequest<BIDDER>) => {
        const [tid, tidSource] = getTid(bid.bidder, adUnit.transactionId, bid.ortb2Imp?.ext?.tid ?? adUnit.ortb2Imp?.ext?.tid);
        bid = Object.assign({}, bid,
          {
            ortb2Imp: mergeDeep(
              {},
              adUnit.ortb2Imp,
              bid.ortb2Imp,
              {ext: {tid, tidSource}})
          },
          getDefinedParams(adUnit, ADUNIT_BID_PROPERTIES),
        );

        const mediaTypes = bid.mediaTypes == null ? adUnit.mediaTypes : bid.mediaTypes

        if (isValidMediaTypes(mediaTypes)) {
          bid = Object.assign({}, bid, {
            mediaTypes
          });
        } else {
          logError(
            `mediaTypes is not correctly configured for adunit ${adUnit.code}`
          );
        }

        if (src === 'client') {
          incrementBidderRequestsCounter(adUnit.code, bidderCode);
        }

        bids.push(Object.assign({}, bid, {
          adUnitCode: adUnit.code,
          transactionId: adUnit.transactionId,
          adUnitId: adUnit.adUnitId,
          sizes: mediaTypes?.banner?.sizes || mediaTypes?.video?.playerSize || [],
          bidId: (bid as any).bid_id || generateUUID(),
          bidderRequestId,
          auctionId,
          src,
          metrics,
          auctionsCount: getAuctionsCounter(adUnit.code),
          bidRequestsCount: getRequestsCounter(adUnit.code),
          bidderRequestsCount: getBidderRequestsCounter(adUnit.code, bid.bidder),
          bidderWinsCount: getBidderWinsCounter(adUnit.code, bid.bidder),
          deferBilling: !!adUnit.deferBilling
        }));
        return bids;
      }, [])
    );
    return result;
  }, []).reduce(flatten, []).filter(val => val !== '');
}

/**
 * Filter an adUnit's  bids for building client and/or server requests
 *
 * @param bids an array of bids as defined in an adUnit
 * @param s2sConfig null if the adUnit is being routed to a client adapter; otherwise the s2s adapter's config
 * @returns the subset of `bids` that are pertinent for the given `s2sConfig`
 */
export const filterBidsForAdUnit = hook('sync', function(bids, s2sConfig, {getS2SBidders = getS2SBidderSet} = {}) {
  if (s2sConfig == null) {
    return bids;
  } else {
    const serverBidders = getS2SBidders(s2sConfig);
    return bids.filter((bid: BidRequest<any>) => {
      if (!serverBidders.has(bid.bidder)) return false;
      if (bid.s2sConfigName == null) return true;
      const configName = getConfigName(s2sConfig);
      const allowedS2SConfigs = Array.isArray(bid.s2sConfigName) ? bid.s2sConfigName : [bid.s2sConfigName];
      return allowedS2SConfigs.includes(configName);
    })
  }
}, 'filterBidsForAdUnit');

type PBSAdUnitBid = AdUnitBid & {
  bid_id?: Identifier;
};

type PBSAdUnit = Omit<AdUnit, 'bids'> & {
  s2sBid?: PBSAdUnitBid;
  bids: PBSAdUnitBid[];
};

function getAdUnitCopyForPrebidServer(adUnits: AdUnit[], s2sConfig) {
  let adUnitsCopy = deepClone(adUnits) as PBSAdUnit[];
  let hasModuleBids = false;

  adUnitsCopy.forEach((adUnit) => {
    // filter out client side bids
    const s2sBids = adUnit.bids.filter((b) => b.module === PBS_ADAPTER_NAME && (
      (b as AdUnitModuleBid).params?.configName === getConfigName(s2sConfig)
    ));
    if (s2sBids.length === 1) {
      adUnit.s2sBid = s2sBids[0];
      hasModuleBids = true;
      adUnit.ortb2Imp = mergeDeep({}, adUnit.s2sBid.ortb2Imp, adUnit.ortb2Imp);
    } else if (s2sBids.length > 1) {
      logWarn('Multiple "module" bids for the same s2s configuration; all will be ignored', s2sBids);
    }
    adUnit.bids = filterBidsForAdUnit(adUnit.bids, s2sConfig)
      .map((bid) => {
        bid.bid_id = getUniqueIdentifierStr();
        return bid;
      });
  });
  adUnitsCopy = adUnitsCopy.filter(adUnit => {
    if (s2sConfig.filterBidderlessCalls) {
      if (adUnit.bids.length === 1 && adUnit.bids[0].bidder == null) return false;
    }
    return adUnit.bids.length !== 0 || adUnit.s2sBid != null;
  });

  // don't send empty requests
  return {adUnits: adUnitsCopy, hasModuleBids};
}

function getAdUnitCopyForClientAdapters(adUnits: AdUnit[]) {
  let adUnitsClientCopy = deepClone(adUnits);
  adUnitsClientCopy.forEach((adUnit) => {
    adUnit.bids = filterBidsForAdUnit(adUnit.bids, null);
  });

  // don't send empty requests
  adUnitsClientCopy = adUnitsClientCopy.filter(adUnit => {
    return adUnit.bids.length !== 0;
  });

  return adUnitsClientCopy;
}

/**
 * Filter and/or modify media types for ad units based on the given labels.
 *
 * This should return adUnits that are active for the given labels, modified to have their `mediaTypes`
 * conform to size mapping configuration. If different bids for the same adUnit should use different `mediaTypes`,
 * they should be exposed under `adUnit.bids[].mediaTypes`.
 */
export const setupAdUnitMediaTypes = hook('sync', (adUnits, labels) => {
  return adUnits;
}, 'setupAdUnitMediaTypes')

/**
 * @param {{}|Array<{}>} s2sConfigs
 * @returns {Set<String>} a set of all the bidder codes that should be routed through the S2S adapter(s)
 *                        as defined in `s2sConfigs`
 */
export function getS2SBidderSet(s2sConfigs) {
  if (!isArray(s2sConfigs)) s2sConfigs = [s2sConfigs];
  // `null` represents the "no bid bidder" - when an ad unit is meant only for S2S adapters, like stored impressions
  const serverBidders = new Set([null]);
  s2sConfigs.filter((s2s) => s2s && s2s.enabled)
    .flatMap((s2s) => s2s.bidders)
    .forEach((bidder) => serverBidders.add(bidder));
  return serverBidders;
}

/**
 * @param {Array} adUnits - The ad units to be processed.
 * @param {Object} s2sConfigs - The server-to-server configurations.
 * @returns {Object} - An object containing arrays of bidder codes for client and server.
 * @returns {Object} return.client - Array of bidder codes that should be routed to client adapters.
 * @returns {Object} return.server - Array of bidder codes that should be routed to server adapters.
 */
export function _partitionBidders (adUnits, s2sConfigs, {getS2SBidders = getS2SBidderSet} = {}) {
  const serverBidders = getS2SBidders(s2sConfigs);
  return getBidderCodes(adUnits).reduce((memo, bidder) => {
    const partition = serverBidders.has(bidder) ? PARTITIONS.SERVER : PARTITIONS.CLIENT;
    memo[partition].push(bidder);
    return memo;
  }, {[PARTITIONS.CLIENT]: [], [PARTITIONS.SERVER]: []})
}

export const partitionBidders = hook('sync', _partitionBidders, 'partitionBidders');

declare module './events' {
  interface Events {
    /**
     * Fired once per auction, just before bid requests are generated.
     */
    [EVENTS.BEFORE_REQUEST_BIDS]: [AdUnit[]];
    /**
     * Fired once for each bidder in each auction (or twice for bidders that are configured for both client and s2s).
     */
    [EVENTS.BID_REQUESTED]: [BidderRequest<BidderCode>];
  }
}

declare module './hook' {
  interface NamedHooks {
    makeBidRequests: typeof adapterManager.makeBidRequests;
  }
}

function tidFactory() {
  const consistent = !!config.getConfig('consistentTIDs');
  let tidSource, getTid;
  if (consistent) {
    tidSource = 'pbjsStable';
    getTid = (saneTid) => saneTid
  } else {
    tidSource = 'pbjs';
    getTid = (() => {
      const tids = {};
      return (saneTid, bidderCode) => {
        if (!tids.hasOwnProperty(bidderCode)) {
          tids[bidderCode] = {};
        }
        if (!tids[bidderCode].hasOwnProperty(saneTid)) {
          tids[bidderCode][saneTid] = `u${generateUUID()}`;
        }
        return tids[bidderCode][saneTid];
      }
    })();
  }
  return function (bidderCode, saneTid, fpdTid) {
    return [
      fpdTid ?? getTid(saneTid, bidderCode),
      fpdTid != null ? 'pub' : tidSource
    ]
  }
}

const adapterManager = {
  bidderRegistry: _bidderRegistry,
  analyticsRegistry: _analyticsRegistry,
  /**
   * Map from alias codes to the bidder code they alias.
   */
  aliasRegistry: _aliasRegistry,
  makeBidRequests: hook('sync', function (
    adUnits: AdUnit[],
    auctionStart: number,
    auctionId: Identifier,
    cbTimeout: number,
    labels: string[],
    ortb2Fragments: ORTBFragments = {},
    auctionMetrics: Metrics
  ): BidderRequest<BidderCode>[] {
    auctionMetrics = useMetrics(auctionMetrics);
    /**
     * emit and pass adunits for external modification
     * @see {@link https://github.com/prebid/Prebid.js/issues/4149|Issue}
     */
    events.emit(EVENTS.BEFORE_REQUEST_BIDS, adUnits);
    if (FEATURES.NATIVE) {
      decorateAdUnitsWithNativeParams(adUnits);
    }
    adUnits
      .map(adUnit => adUnit.code)
      .filter(uniques)
      .forEach(incrementAuctionsCounter);

    adUnits.forEach(au => {
      if (!isPlainObject(au.mediaTypes)) {
        au.mediaTypes = {};
      }
      // filter out bidders that cannot participate in the auction
      au.bids = au.bids.filter((bid) => !bid.bidder || dep.isAllowed(ACTIVITY_FETCH_BIDS, activityParams(MODULE_TYPE_BIDDER, bid.bidder)))
      incrementRequestsCounter(au.code);
    });

    adUnits = setupAdUnitMediaTypes(adUnits, labels);

    let {[PARTITIONS.CLIENT]: clientBidders, [PARTITIONS.SERVER]: serverBidders} = partitionBidders(adUnits, _s2sConfigs);

    if (config.getConfig('bidderSequence') === RANDOM) {
      clientBidders = shuffle(clientBidders);
    }
    const refererInfo = getRefererInfo();

    const bidRequests: BidderRequest<any>[] = [];

    const ortb2 = ortb2Fragments.global || {};
    const bidderOrtb2 = ortb2Fragments.bidder || {};

    const getTid = tidFactory();

    function addOrtb2<T extends BidderRequest<any>>(bidderRequest: Partial<T>, s2sActivityParams?): T {
      const redact = dep.redact(
        s2sActivityParams != null
          ? s2sActivityParams
          : activityParams(MODULE_TYPE_BIDDER, bidderRequest.bidderCode)
      );
      const [tid, tidSource] = getTid(bidderRequest.bidderCode, bidderRequest.auctionId, bidderOrtb2[bidderRequest.bidderCode]?.source?.tid ?? ortb2.source?.tid);
      const fpd = Object.freeze(redact.ortb2(mergeDeep(
        {},
        ortb2,
        bidderOrtb2[bidderRequest.bidderCode],
        {
          source: {
            tid,
            ext: {tidSource}
          }
        }
      )));
      bidderRequest.ortb2 = fpd;
      bidderRequest.bids = bidderRequest.bids.map((bid) => {
        bid.ortb2 = fpd;
        return redact.bidRequest(bid);
      })
      return bidderRequest as T;
    }

    const pbjsInstance = getGlobal();

    function getPageViewIdForBidder(bidderCode: string | null): string {
      if (!pbjsInstance.pageViewIdPerBidder.has(bidderCode)) {
        pbjsInstance.pageViewIdPerBidder.set(bidderCode, generateUUID());
      }
      return pbjsInstance.pageViewIdPerBidder.get(bidderCode);
    }

    _s2sConfigs.forEach(s2sConfig => {
      const s2sParams = s2sActivityParams(s2sConfig);
      if (s2sConfig && s2sConfig.enabled && dep.isAllowed(ACTIVITY_FETCH_BIDS, s2sParams)) {
        const {adUnits: adUnitsS2SCopy, hasModuleBids} = getAdUnitCopyForPrebidServer(adUnits, s2sConfig);

        // uniquePbsTid is so we know which server to send which bids to during the callBids function
        const uniquePbsTid = generateUUID();

        (serverBidders.length === 0 && hasModuleBids ? [null] : serverBidders).forEach(bidderCode => {
          const bidderRequestId = generateUUID();
          const pageViewId = getPageViewIdForBidder(bidderCode);
          const metrics = auctionMetrics.fork();
          const bidderRequest = addOrtb2({
            bidderCode,
            auctionId,
            bidderRequestId,
            pageViewId,
            uniquePbsTid,
            bids: getBids({
              bidderCode,
              auctionId,
              bidderRequestId,
              'adUnits': deepClone(adUnitsS2SCopy),
              src: S2S.SRC,
              metrics,
              getTid,
            }),
            auctionStart: auctionStart,
            timeout: s2sConfig.timeout,
            src: S2S.SRC,
            refererInfo,
            metrics,
          }, s2sParams);
          if (bidderRequest.bids.length !== 0) {
            bidRequests.push(bidderRequest);
          }
        });

        // update the s2sAdUnits object and remove all bids that didn't pass sizeConfig/label checks from getBids()
        // this is to keep consistency and only allow bids/adunits that passed the checks to go to pbs
        adUnitsS2SCopy.forEach((adUnitCopy) => {
          const validBids = adUnitCopy.bids.filter((adUnitBid) =>
            bidRequests.find(request =>
              request.bids.find((reqBid) => reqBid.bidId === adUnitBid.bid_id)));
          adUnitCopy.bids = validBids;
        });

        bidRequests.forEach((request: S2SBidderRequest<any>) => {
          if (request.adUnitsS2SCopy === undefined) {
            request.adUnitsS2SCopy = adUnitsS2SCopy.filter(au => au.bids.length > 0 || au.s2sBid != null);
          }
        });
      }
    });

    // client adapters
    const adUnitsClientCopy = getAdUnitCopyForClientAdapters(adUnits);
    clientBidders.forEach(bidderCode => {
      const bidderRequestId = generateUUID();
      const pageViewId = getPageViewIdForBidder(bidderCode);
      const metrics = auctionMetrics.fork();
      const bidderRequest = addOrtb2({
        bidderCode,
        auctionId,
        pageViewId,
        bidderRequestId,
        bids: getBids({
          bidderCode,
          auctionId,
          bidderRequestId,
          'adUnits': deepClone(adUnitsClientCopy),
          src: 'client',
          metrics,
          getTid,
        }),
        auctionStart: auctionStart,
        timeout: cbTimeout,
        refererInfo,
        metrics,
      });
      const adapter = _bidderRegistry[bidderCode];
      if (!adapter) {
        logError(`Trying to make a request for bidder that does not exist: ${bidderCode}`);
      }

      if (adapter && bidderRequest.bids && bidderRequest.bids.length !== 0) {
        bidRequests.push(bidderRequest);
      }
    });

    bidRequests.forEach(bidRequest => {
      if (gdprDataHandler.getConsentData()) {
        bidRequest['gdprConsent'] = gdprDataHandler.getConsentData();
      }
      if (uspDataHandler.getConsentData()) {
        bidRequest['uspConsent'] = uspDataHandler.getConsentData();
      }
      if (gppDataHandler.getConsentData()) {
        bidRequest['gppConsent'] = gppDataHandler.getConsentData();
      }
    });
    return bidRequests;
  }, 'makeBidRequests'),
  callBids(adUnits, bidRequests, addBidResponse, doneCb, requestCallbacks, requestBidsTimeout, onTimelyResponse, ortb2Fragments = {}) {
    if (!bidRequests.length) {
      logWarn('callBids executed with no bidRequests.  Were they filtered by labels or sizing?');
      return;
    }

    const [clientBidderRequests, serverBidderRequests] = bidRequests.reduce((partitions, bidRequest) => {
      partitions[Number(typeof bidRequest.src !== 'undefined' && bidRequest.src === S2S.SRC)].push(bidRequest);
      return partitions;
    }, [[], []]);

    var uniqueServerBidRequests = [];
    serverBidderRequests.forEach(serverBidRequest => {
      var index = -1;
      for (var i = 0; i < uniqueServerBidRequests.length; ++i) {
        if (serverBidRequest.uniquePbsTid === uniqueServerBidRequests[i].uniquePbsTid) {
          index = i;
          break;
        }
      }
      if (index <= -1) {
        uniqueServerBidRequests.push(serverBidRequest);
      }
    });

    let counter = 0;

    _s2sConfigs.forEach((s2sConfig) => {
      if (s2sConfig && uniqueServerBidRequests[counter] && getS2SBidderSet(s2sConfig).has(uniqueServerBidRequests[counter].bidderCode)) {
        // s2s should get the same client side timeout as other client side requests.
        const s2sAjax = ajaxBuilder(requestBidsTimeout, requestCallbacks ? {
          request: requestCallbacks.request.bind(null, 's2s'),
          done: requestCallbacks.done
        } : undefined);
        const adaptersServerSide = s2sConfig.bidders;
        const s2sAdapter = _bidderRegistry[s2sConfig.adapter];
        const uniquePbsTid = uniqueServerBidRequests[counter].uniquePbsTid;
        const adUnitsS2SCopy = uniqueServerBidRequests[counter].adUnitsS2SCopy;

        const uniqueServerRequests = serverBidderRequests.filter(serverBidRequest => serverBidRequest.uniquePbsTid === uniquePbsTid);

        if (s2sAdapter) {
          const s2sBidRequest = {'ad_units': adUnitsS2SCopy, s2sConfig, ortb2Fragments, requestBidsTimeout};
          if (s2sBidRequest.ad_units.length) {
            const doneCbs = uniqueServerRequests.map(bidRequest => {
              bidRequest.start = timestamp();
              return function (timedOut, ...args) {
                if (!timedOut) {
                  onTimelyResponse(bidRequest.bidderRequestId);
                }
                doneCb.apply(bidRequest, [timedOut, ...args]);
              }
            });

            const bidders = getBidderCodes(s2sBidRequest.ad_units).filter((bidder) => adaptersServerSide.includes(bidder));
            logMessage(`CALLING S2S HEADER BIDDERS ==== ${bidders.length > 0 ? bidders.join(', ') : 'No bidder specified, using "ortb2Imp" definition(s) only'}`);

            // fire BID_REQUESTED event for each s2s bidRequest
            uniqueServerRequests.forEach(bidRequest => {
              // add the new sourceTid
              events.emit(EVENTS.BID_REQUESTED, { ...bidRequest, tid: bidRequest.auctionId });
            });

            // make bid requests
            s2sAdapter.callBids(
              s2sBidRequest,
              serverBidderRequests,
              addBidResponse,
              (timedOut) => doneCbs.forEach(done => done(timedOut)),
              s2sAjax
            );
          }
        } else {
          logError('missing ' + s2sConfig.adapter);
        }
        counter++;
      }
    });

    // handle client adapter requests
    clientBidderRequests.forEach(bidderRequest => {
      bidderRequest.start = timestamp();
      const adapter = _bidderRegistry[bidderRequest.bidderCode];
      config.runWithBidder(bidderRequest.bidderCode, () => {
        logMessage(`CALLING BIDDER`);
        events.emit(EVENTS.BID_REQUESTED, bidderRequest);
      });
      const ajax = ajaxBuilder(requestBidsTimeout, requestCallbacks ? {
        request: requestCallbacks.request.bind(null, bidderRequest.bidderCode),
        done: requestCallbacks.done
      } : undefined);
      const adapterDone = doneCb.bind(bidderRequest);
      try {
        config.runWithBidder(
          bidderRequest.bidderCode,
          adapter.callBids.bind(
            adapter,
            bidderRequest,
            addBidResponse,
            adapterDone,
            ajax,
            () => onTimelyResponse(bidderRequest.bidderRequestId),
            config.callbackWithBidder(bidderRequest.bidderCode)
          )
        );
      } catch (e) {
        logError(`${bidderRequest.bidderCode} Bid Adapter emitted an uncaught error when parsing their bidRequest`, {e, bidRequest: bidderRequest});
        adapterDone();
      }
    })
  },
  videoAdapters: [],
  registerBidAdapter(bidAdapter, bidderCode, {supportedMediaTypes = []} = {}) {
    if (bidAdapter && bidderCode) {
      if (typeof bidAdapter.callBids === 'function') {
        _bidderRegistry[bidderCode] = bidAdapter;
        GDPR_GVLIDS.register(MODULE_TYPE_BIDDER, bidderCode, bidAdapter.getSpec?.().gvlid);

        if (FEATURES.VIDEO && supportedMediaTypes.includes('video')) {
          adapterManager.videoAdapters.push(bidderCode);
        }
        if (FEATURES.NATIVE && supportedMediaTypes.includes('native')) {
          nativeAdapters.push(bidderCode);
        }
      } else {
        logError('Bidder adaptor error for bidder code: ' + bidderCode + 'bidder must implement a callBids() function');
      }
    } else {
      logError('bidAdapter or bidderCode not specified');
    }
  },
  aliasBidAdapter(bidderCode: BidderCode, alias: BidderCode, options?: AliasBidderOptions) {
    const existingAlias = _bidderRegistry[alias];

    if (typeof existingAlias === 'undefined') {
      const bidAdapter = _bidderRegistry[bidderCode];
      if (typeof bidAdapter === 'undefined') {
        // check if alias is part of s2sConfig and allow them to register if so (as base bidder may be s2s-only)
        const nonS2SAlias = [];
        _s2sConfigs.forEach(s2sConfig => {
          if (s2sConfig.bidders && s2sConfig.bidders.length) {
            const s2sBidders = s2sConfig && s2sConfig.bidders;
            if (!(s2sConfig && s2sBidders.includes(alias))) {
              nonS2SAlias.push(bidderCode);
            } else {
              _aliasRegistry[alias] = bidderCode;
            }
          }
        });
        nonS2SAlias.forEach(bidderCode => {
          logError('bidderCode "' + bidderCode + '" is not an existing bidder.', 'adapterManager.aliasBidAdapter');
        });
      } else {
        try {
          let newAdapter;
          const supportedMediaTypes = getSupportedMediaTypes(bidderCode);
          // Have kept old code to support backward compatibilitiy.
          // Remove this if loop when all adapters are supporting bidderFactory. i.e When Prebid.js is 1.0
          if (bidAdapter.constructor.prototype !== Object.prototype) {
            newAdapter = new bidAdapter.constructor();
            newAdapter.setBidderCode(alias);
          } else {
            const { useBaseGvlid = false } = options || {};
            const spec = bidAdapter.getSpec();
            const gvlid = useBaseGvlid ? spec.gvlid : options?.gvlid;
            if (gvlid == null && spec.gvlid != null) {
              logWarn(`Alias '${alias}' will NOT re-use the GVL ID of the original adapter ('${spec.code}', gvlid: ${spec.gvlid}). Functionality that requires TCF consent may not work as expected.`)
            }

            const skipPbsAliasing = options && options.skipPbsAliasing;
            newAdapter = newBidder(Object.assign({}, spec, { code: alias, gvlid, skipPbsAliasing }));
            _aliasRegistry[alias] = bidderCode;
          }
          adapterManager.registerBidAdapter(newAdapter, alias, {
            supportedMediaTypes
          });
        } catch (e) {
          logError(bidderCode + ' bidder does not currently support aliasing.', 'adapterManager.aliasBidAdapter');
        }
      }
    } else {
      logMessage('alias name "' + alias + '" has been already specified.');
    }
  },
  resolveAlias(alias) {
    let code = alias;
    let visited;
    while (_aliasRegistry[code] && (!visited || !visited.has(code))) {
      code = _aliasRegistry[code];
      (visited = visited || new Set()).add(code);
    }
    return code;
  },
  registerAnalyticsAdapter<P extends AnalyticsProvider>({adapter, code, gvlid}: {
    adapter: AnalyticsAdapter<P>,
    code: P,
    gvlid?: number
  }) {
    if (adapter && code) {
      if (typeof adapter.enableAnalytics === 'function') {
        adapter.code = code;
        _analyticsRegistry[code] = { adapter, gvlid };
        GDPR_GVLIDS.register(MODULE_TYPE_ANALYTICS, code, gvlid);
      } else {
        logError(`Prebid Error: Analytics adaptor error for analytics "${code}"
        analytics adapter must implement an enableAnalytics() function`);
      }
    } else {
      logError('Prebid Error: analyticsAdapter or analyticsCode not specified');
    }
  },
  enableAnalytics(
    config: AnalyticsConfig<keyof AnalyticsProviderConfig>
            | AnalyticsConfig<AnalyticsProvider>
            | AnalyticsConfig<AnalyticsProvider>[]
  ) {
    if (!isArray(config)) {
      config = [config];
    }

    config.forEach(adapterConfig => {
      const entry = _analyticsRegistry[adapterConfig.provider];
      if (entry && entry.adapter) {
        if (dep.isAllowed(ACTIVITY_REPORT_ANALYTICS, activityParams(MODULE_TYPE_ANALYTICS, adapterConfig.provider, {[ACTIVITY_PARAM_ANL_CONFIG]: adapterConfig}))) {
          entry.adapter.enableAnalytics(adapterConfig);
        }
      } else {
        logError(`Prebid Error: no analytics adapter found in registry for '${adapterConfig.provider}'.`);
      }
    });
  },
  getBidAdapter(bidder) {
    return _bidderRegistry[bidder];
  },
  getAnalyticsAdapter(code) {
    return _analyticsRegistry[code];
  },
  callTimedOutBidders(adUnits, timedOutBidders, cbTimeout) {
    timedOutBidders = timedOutBidders.map((timedOutBidder) => {
      // Adding user configured params & timeout to timeout event data
      timedOutBidder.params = getUserConfiguredParams(adUnits, timedOutBidder.adUnitCode, timedOutBidder.bidder);
      timedOutBidder.timeout = cbTimeout;
      return timedOutBidder;
    });
    timedOutBidders = groupBy(timedOutBidders, 'bidder');

    Object.keys(timedOutBidders).forEach((bidder) => {
      tryCallBidderMethod(bidder, 'onTimeout', timedOutBidders[bidder]);
    });
  },
  callBidWonBidder(bidder, bid, adUnits) {
    // Adding user configured params to bidWon event data
    bid.params = getUserConfiguredParams(adUnits, bid.adUnitCode, bid.bidder);
    incrementBidderWinsCounter(bid.adUnitCode, bid.bidder);
    tryCallBidderMethod(bidder, 'onBidWon', bid);
  },
  triggerBilling: (() => {
    const BILLED = new WeakSet();
    return (bid) => {
      if (!BILLED.has(bid)) {
        BILLED.add(bid);
        (parseEventTrackers(bid.eventtrackers)[EVENT_TYPE_IMPRESSION]?.[TRACKER_METHOD_IMG] || [])
          .forEach((url) => internal.triggerPixel(url));
        tryCallBidderMethod(bid.bidder, 'onBidBillable', bid);
      }
    }
  })(),
  callSetTargetingBidder(bidder, bid) {
    tryCallBidderMethod(bidder, 'onSetTargeting', bid);
  },
  callBidViewableBidder(bidder, bid) {
    tryCallBidderMethod(bidder, 'onBidViewable', bid);
  },
  callBidderError(bidder, error, bidderRequest) {
    const param = { error, bidderRequest };
    tryCallBidderMethod(bidder, 'onBidderError', param);
  },
  callAdRenderSucceededBidder(bidder, bid) {
    tryCallBidderMethod(bidder, 'onAdRenderSucceeded', bid);
  },
  callOnInterventionBidder(bidder, bid, intervention) {
    const param = { bid, intervention }
    tryCallBidderMethod(bidder, 'onIntervention', param);
  },
  /**
   * Ask every adapter to delete PII.
   * See https://github.com/prebid/Prebid.js/issues/9081
   */
  callDataDeletionRequest: hook('sync', function (...args) {
    const method = 'onDataDeletionRequest';
    Object.keys(_bidderRegistry)
      .filter((bidder) => !_aliasRegistry.hasOwnProperty(bidder))
      .forEach(bidder => {
        const target = getBidderMethod(bidder, method);
        if (target != null) {
          const bidderRequests = auctionManager.getBidsRequested().filter((br) =>
            resolveAlias(br.bidderCode) === bidder
          );
          invokeBidderMethod(bidder, method, ...target, bidderRequests, ...args);
        }
      });
    Object.entries(_analyticsRegistry).forEach(([name, entry]: any) => {
      const fn = entry?.adapter?.[method];
      if (typeof fn === 'function') {
        try {
          fn.apply(entry.adapter, args);
        } catch (e) {
          logError(`error calling ${method} of ${name}`, e);
        }
      }
    });
  })

}

function getSupportedMediaTypes(bidderCode) {
  const supportedMediaTypes = [];
  if (FEATURES.VIDEO && adapterManager.videoAdapters.includes(bidderCode)) supportedMediaTypes.push('video');
  if (FEATURES.NATIVE && nativeAdapters.includes(bidderCode)) supportedMediaTypes.push('native');
  return supportedMediaTypes;
}

function getBidderMethod(bidder, method): [string, string] {
  const adapter = _bidderRegistry[bidder];
  const spec = adapter?.getSpec && adapter.getSpec();
  if (spec && spec[method] && typeof spec[method] === 'function') {
    return [spec, spec[method]]
  }
}

function invokeBidderMethod(bidder, method, spec, fn, ...params) {
  try {
    logInfo(`Invoking ${bidder}.${method}`);
    config.runWithBidder(bidder, fn.bind(spec, ...params));
  } catch (e) {
    logWarn(`Error calling ${method} of ${bidder}`);
  }
}

function tryCallBidderMethod(bidder, method, param) {
  if (param?.source !== S2S.SRC) {
    const target = getBidderMethod(bidder, method);
    if (target != null) {
      invokeBidderMethod(bidder, method, ...target, param);
    }
  }
}

function resolveAlias(alias) {
  const seen = new Set();
  while (_aliasRegistry.hasOwnProperty(alias) && !seen.has(alias)) {
    seen.add(alias);
    alias = _aliasRegistry[alias];
  }
  return alias;
}

export default adapterManager;
