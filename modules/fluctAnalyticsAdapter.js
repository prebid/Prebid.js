/* eslint-disable no-console */
/* eslint-disable indent */
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import { EVENTS } from '../src/constants.json';
import { find } from '../src/polyfill.js';
import $$PREBID_GLOBAL$$ from '../src/prebid.js';
import {
  deepClone,
  generateUUID,
  isGptPubadsDefined,
  logError,
  logInfo,
} from '../src/utils.js';
/** @type {<T>(array: T[], predicate: (value: T, index: number, obj: T[]) => boolean, thisArg?: any) => T} */

const url = 'https://an.adingo.jp';

/** AdUnit */
/** @typedef {{ code: string, originalCode?: string, dwid: string, path?: string, analytics?: { bidder: string, dwid: string }[], bids: Bid[], mediaTypes: MediaTypes, transactionId: string, ortb2Imp?: Ortb2Imp }} AdUnit */
/** @typedef {{ banner: { name: string, sizes?: [number, number][], sizeConfig?: { minViewPort: [number, number], sizes: [number, number][] }[] }, video: any }} MediaTypes */
/** @typedef {{ ext: { data: { adserver?: { name: string, adSlot: string }, pbadslot: string } } }} Ortb2Imp */
/** @typedef {{ [key: string]: string|number }[] } Params */
/** @typedef {{ source: string, uids: { id: string, atype: number, ext?: { linkType: number } }[] }} UserIdAsEid */

/** Bid */
/** @typedef {{ adUnitCode: string, auctionId: string, bidder: string, userIdAsEids?: UserIdAsEid[] }} Bid */
/** @typedef {{ noBid: boolean, bidWon: boolean, prebidWon: boolean, timeout: boolean, dwid: string }} BidFlag */
/** @typedef { Bid & { bidId: string, bidRequestsCount: number, bidderRequestId: string, bidderRequestsCount: number, bidderWinsCount: number, mediaTypes: MediaTypes, params: Params, sizes: [number, number][], src: string, transactionId: string, dwid: string }} BidRequest */
/** @typedef { Bid & { ad: string, adId: string, adUrl: string, adserverTargeting: AdserverTargeting, bidderCode: string, cpm: number, creativeId: string, currency: string, dealId?: string, height: number, mediaType: string, netRevenue: boolean, originalCpm: number, originalCurrency: string, pbAg: string, pbCg: string, pbDg: string, pbHg: string, pbLg: string, pbMg: string, pbLg: string, requestId: string, requestTimestamp: number, responseTimestamp: number, size: string, source: string, statusMessage: string, timeToRespond: number, ts?: string, ttl: string, width: number }} BidResponse */
/** @typedef {{ fbs_adid: string, fbs_adomain: string, fbs_bidder: string, fbs_format: string, fbs_pb: string, fbs_size: string, fbs_source: string }} AdserverTargeting */

/** Prebid Events */
/** @typedef
 * {
 *    { auctionId: string,
 *    auctionStart: number,
 *    bidderCode: string,
 *    bidderRequestId: string, bids: BidRequest[], refererInfo: { referer: string, reachedTop: boolean, isAmp: boolean, numIframes: number, stack: string[], start: number, timeout: number }}} BidRequestedEvent */
/** @typedef {(Bid & { bidId: string, params: Params })[]} BidTimeoutEvent */
/** @typedef { BidRequest } NoBidEvent */
/** @typedef {{ adUnitCodes: string[], adUnits: AdUnit[], auctionEnd: number, auctionId: string, auctionStatus: string, bidderRequests: BidRequestedEvent[], bidsReceived: BidResponse[], labels?: string, noBids: BidRequest[], timeout: number, timestamp: number, winningBids: BidResponse[] }} AuctionEvent */
/** @typedef {(BidResponse & { params: Params, status: string })} BidWonEvent */
/** @typedef {(BidResponse & { adId: string, bid: BidResponse & { params: Params, status: string }})} AdRenderSucceededEvent */

/** @type {{ auctions: { [auctionId: string]: AuctionEvent & { aidSuffix?: string, bids: { [requestId: string]: BidWonEvent & BidFlag }}}, gpt: { registered: boolean }, timeouts: { [auctionId: string]: number }, bidRequests: { [bidId: string]: BidRequest }}} */
const cache = {
  auctions: {},
  gpt: {},
  timeouts: {},
  bidRequests: {},
};
$$PREBID_GLOBAL$$.fluct = { cache: cache }; /** for debug */

/** @type {(id: string) => boolean} */
const isBrowsiId = (id) => Boolean(id.match(/^browsi_/g));

/**
 * 各adUnitCodeに対応したadUnitPathを取得する
 * @type {() => {[divId: string]: string }}
 * @sample
 * ```
 * {
 *   'div-gpt-ad-1629864618640-0': '/62532913/p_fluctmagazine_320x50_surface_15377',
 *   'browsi_ad_0_ai_1_rc_0': '/62532913/p_fluctmagazine_320x50_surface_15377'
 * }
 * ```
 */
const getAdUnitMap = () => window.googletag.pubads().getSlots().reduce((prev, slot) => Object.assign(prev, { [slot.getSlotElementId()]: slot.getAdUnitPath() }), {});

/**
 * Browsiが新たに枠を生成してオークションを行った場合、その枠にはanalytics (各bidderのDWID情報) の情報が紐づかない
 * そのため、新たに生成された枠に対して、複製元の枠のanalytics情報をコピーする
 * @param {AdUnit} adUnit - 複製元の枠
 * @param {AdUnit[]} [adUnits=$$PREBID_GLOBAL$$.adUnits] - 複製元の枠を含む全ての枠
 * @param {{ [divId: string]: string }} [divIdToUnitPathMap=getAdUnitMap()] - 紐付けに使用する複製元の枠を含む全ての枠のdivIdとadUnitPathのマッピング
 * @returns {AdUnit | undefined} - 複製元の枠のanalytics情報をコピーした枠
 * */
export const convertReplicatedAdUnit = (adUnit, adUnits = $$PREBID_GLOBAL$$.adUnits, divIdToUnitPathMap = getAdUnitMap()) => {
  /** 既にanalytics情報が紐付けられている場合は何もしない */
  if (adUnit.analytics) {
    return adUnit;
  }

  /** `adUnit.analytics`が存在しない場合、GAMの広告ユニットのフルパス (adUnitPath) を用いて紐付けを行う */
  const adUnitPath = divIdToUnitPathMap[adUnit.code];
  if (!adUnitPath) {
    logError(JSON.stringify({
      message: `複製枠のdivId (${adUnit.code}) に対応するGAMユニットのフルパスを取得できません。`,
      adUnitCode: adUnit.code,
    }));
    return adUnit;
  }

    /** `複製枠と共通のadUnitPathを持つ配信設定を探す */
  const originalAdUnit = find(adUnits, adUnit => adUnitPath.match(new RegExp(`${adUnit.path}$`)));
  if (!originalAdUnit) {
    logError(JSON.stringify({
      message: `複製枠のadUnitPath (${adUnitPath}) を元に複製元の配信設定が取得できません。`,
      replicationAdUnitCode: adUnit.code,
      replicationAdUnitPath: adUnitPath,
    }));
    return adUnit;
  }


  /** @type {AdUnit} */
  const _adUnit = deepClone(adUnit);
  try {
    const { analytics, bids, code, mediaTypes: { banner: { name } } } = originalAdUnit;
    _adUnit.analytics = analytics;
    _adUnit.bids = bids;
    _adUnit.originalCode = adUnit.code; /** 変換前: `browsi_ad_..` */
    _adUnit.code = code;
    _adUnit.mediaTypes.banner.name = name;
  } catch (_error) {
    logError(JSON.stringify({
      message: '複製元枠のanalytics情報を複製枠に移し替える際に問題が発生しました。',
      error: {
        name: _error.name,
        message: _error.message
      },
      adUnitCode: _adUnit.code,
      adUnitPath,
    }));
  }
  return _adUnit;
};

/** @type {(event: { slot: { getSlotElementId: () => string }}) => void} */
const browsiEventListener = (event) => {
  const divId = event.slot.getSlotElementId();
  if (isBrowsiId(divId)) {
    const auction = find(Object.values(cache.auctions), auction => auction.adUnitCodes.every(adUnitCode => adUnitCode === divId));
    auction && sendMessage(auction.auctionId);
  }
}

let fluctAnalyticsAdapter = Object.assign(
  adapter({ url, analyticsType: 'endpoint' }), {
  track({ eventType, args }) {
    logInfo(`[${eventType}] ${Date.now()} :`, args);
    try {
      switch (eventType) {
        case EVENTS.AUCTION_INIT: {
          /** @type {AuctionEvent} */
          let auctionInitEvent = args;
          cache.auctions[auctionInitEvent.auctionId] = { ...auctionInitEvent, bids: {} };
          if (!cache.gpt.registered && isGptPubadsDefined()) {
            window.googletag.pubads().addEventListener('slotOnload', browsiEventListener)
            cache.gpt.registered = true;
          }
          break;
        }
        case EVENTS.BID_REQUESTED: {
          /** @type {BidRequestedEvent} */
          let bidRequestedEvent = args;
          bidRequestedEvent.bids.forEach(bid => { cache.bidRequests[bid.bidId] = bid });
          break;
        }
        case EVENTS.BID_TIMEOUT: {
          /** @type {BidTimeoutEvent} */
          let timeoutEvent = args;
          timeoutEvent.forEach(bid => {
            cache.auctions[bid.auctionId].bids[bid.bidId] = {
              ...bid,
              noBid: true,
              prebidWon: false,
              bidWon: false,
              timeout: true,
              dwid: (cache.bidRequests[bid.bidId] || {}).dwid,
            };
          });
          break;
        }
        case EVENTS.AUCTION_END: {
          /** @type {AuctionEvent} */
          let auctionEndEvent = args;
          let { adUnitCodes, auctionId, bidsReceived, noBids } = auctionEndEvent;
          Object.assign(cache.auctions[auctionId], auctionEndEvent, { aidSuffix: isBrowsiId(auctionId) ? generateUUID() : undefined });

          /** @type {string[]} */
          let prebidWonBidRequestIds = adUnitCodes.map(adUnitCode =>
            bidsReceived.reduce((highestCpmBid, bid) =>
              adUnitCode === bid.adUnitCode
                ? highestCpmBid.cpm > bid.cpm ? highestCpmBid : bid
                : highestCpmBid
              , {}).requestId
          );

          const bidResults = [
            ...bidsReceived.map(bid => ({
              ...bid,
              noBid: false,
              prebidWon: prebidWonBidRequestIds.includes(bid.requestId),
              bidWon: false,
              timeout: false,
              dwid: (cache.bidRequests[bid.requestId] || {}).dwid,
            })),
            ...noBids.map(bid => ({
              ...bid,
              noBid: true,
              prebidWon: false,
              bidWon: false,
              timeout: false,
            })),
          ];
          bidResults.forEach(bid => cache.auctions[auctionId].bids[bid.requestId || bid.bidId] = bid);

          /** browsi auction の場合 `browsiEventListener` から送信する */
          if (!isBrowsiId(auctionId)) {
            sendMessage(auctionId);
          }
          break;
        }
        case EVENTS.AD_RENDER_SUCCEEDED: {
          /** @type {AdRenderSucceededEvent} */
          let adRenderSucceededEvent = args;
          let { bid } = adRenderSucceededEvent;
          Object.assign(cache.auctions[bid.auctionId].bids[bid.requestId], bid, {
            noBid: false,
            prebidWon: true,
            bidWon: true,
            timeout: false,
          });
          /** オークション単位で `AD_RENDER_SUCCEEDED` イベントをまとめて送信する */
          if (isBrowsiId(bid.auctionId)) {
            /** 原則1オークション:1枠 */
            sendMessage(bid.auctionId);
          } else {
            clearTimeout(cache.timeouts[bid.auctionId]);
            cache.timeouts[bid.auctionId] = setTimeout(() => {
              sendMessage(bid.auctionId);
            }, Math.min(config.getConfig('timeoutBuffer') || 400, 400));
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      // console.error({ eventType, args, error })
      logError({ eventType, args, error });
    }
  }
});

/** @type {(auctionId: string) => void} */
const sendMessage = (auctionId) => {
  let { adUnits, aidSuffix, bids } = cache.auctions[auctionId];
  adUnits = adUnits.map(adUnit => convertReplicatedAdUnit(adUnit, $$PREBID_GLOBAL$$.adUnits));

  const payload = {
    auctionId: aidSuffix ? `${auctionId}_${aidSuffix}` : auctionId,
    bids: Object.values(bids).map(bid => {
      const {
        adserverTargeting,
        adUnitCode,
        bidder,
        bidWon,
        cpm,
        creativeId,
        dwid,
        height,
        netRevenue,
        noBid,
        prebidWon,
        timeout,
        timeToRespond,
        userIdAsEids,
        width
      } = bid;

      const { analytics, code, originalCode, ortb2Imp } = find(adUnits, adUnit => [adUnit.originalCode, adUnit.code].includes(adUnitCode));
      return {
        adserverTargeting: {
          fbs_adid: adserverTargeting?.fbs_adid ?? null,
          fbs_adomain: adserverTargeting?.fbs_adomain ?? null,
          fbs_bidder: adserverTargeting?.fbs_bidder ?? null,
          fbs_format: adserverTargeting?.fbs_format ?? null,
          fbs_pb: adserverTargeting?.fbs_pb ?? null,
          fbs_size: adserverTargeting?.fbs_size ?? null,
          fbs_source: adserverTargeting?.fbs_source ?? null,
        },
        adUnitCode: code,
        eidsSource: userIdAsEids?.map(userIdAsEid => userIdAsEid.source) ?? null,
        bidder,
        bidWon,
        cpm,
        creativeId,
        dwid: dwid || (find(analytics, param => param.bidder === bidder) || {}).dwid,
        height,
        netRevenue,
        noBid,
        originalAdUnitCode: originalCode,
        pbadslot: ortb2Imp?.ext?.data?.pbadslot ?? null,
        prebidWon,
        timeout,
        timeToRespond,
        width,
      };
    }),
    timestamp: Date.now(),
  }
  ajax(url, () => logInfo(`[sendMessage] ${Date.now()} :`, payload), JSON.stringify(payload), { contentType: 'application/json', method: 'POST' });
};

fluctAnalyticsAdapter.originEnableAnalytics = fluctAnalyticsAdapter.enableAnalytics;
fluctAnalyticsAdapter.enableAnalytics = (config) => {
  fluctAnalyticsAdapter.initOptions = config.options;
  fluctAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: fluctAnalyticsAdapter,
  code: 'fluct',
});

export default fluctAnalyticsAdapter;
