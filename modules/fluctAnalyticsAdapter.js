/* eslint-disable no-console */
/* eslint-disable indent */
import { ajax } from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { config } from '../src/config.js';
import { EVENTS } from '../src/constants.json';
import {
  logInfo,
  logError,
  generateUUID,
  deepClone,
  isGptPubadsDefined,
} from '../src/utils.js';
import * as _find from 'core-js-pure/features/array/find.js';
import $$PREBID_GLOBAL$$ from '../src/prebid.js';
/** @type {<T>(array: T[], predicate: (value: T, index: number, obj: T[]) => boolean, thisArg?: any) => T} */
const find = _find;

const url = 'https://an.adingo.jp';

/** @typedef {{ad: string, adId: string, adUnitCode: string, adUrl: string, adserverTargeting: any, auctionId: string, bidder: string, bidderCode: string, cpm: number, creativeId: string, currency: string, dealId: string, height: number, mediaType: string, netRevenue: boolean, originalCpm: number, originalCurrency: string, params: any, pbAg: string, pbCg: string, pbDg: string, pbHg: string, pbLg: string, pbMg: string, pbLg: string, requestId: string, requestTimestamp: number, responseTimestamp: number, size: string, source: string, status: string, statusMessage: string, timeToRespond: string, ttl: string, width: number, bidId?: string}} BidResponse */
/** @typedef {{bidder: string, params: any}} Bid */
/** @typedef {{code: string, _code?: string, path?: string, analytics?: {bidder: string, dwid: string}[], bids?: Bid[], mediaTypes: {banner: {name: string, sizes: number[][]}}, sizes: number[][], transactionId: string}} AdUnit */
/** @typedef {BidResponse & {noBid: boolean, prebidWon: boolean, bidWon: boolean, timeout: boolean}} ModBidResponse */
/** @typedef {{adUnitCodes: string[], adUnits: AdUnit[], auctionEnd: number, auctionId: string, auctionStatus: string, bidderRequests: any[], bidsReceived: BidResponse[], labels?: string, noBids: BidResponse[], timeout: number, timestamp: number, winningBids: BidResponse[], bids: {[requestId: string]: ModBidResponse}}} PbAuction */
/** @typedef {{registered: boolean}} Gpt */
/** @typedef {{[divId: string]: string }} Slots `{divId: adUnitPath}` */
/** @type {{auctions: {[auctionId: string]: PbAuction}, adUnits: {[adUnitCode: string]: AdUnit}, gpt: Gpt, timeouts: {[auctionId: string]: number}}} */
const cache = {
  auctions: {},
  gpt: {},
  timeouts: {},
};
$$PREBID_GLOBAL$$.fluct = { cache: cache }; /** for debug */

/** @type {(id: string) => boolean} */
const isBrowsiId = (id) => Boolean(id.match(/^browsi_/g));

/**
 * 各adUnitCodeに対応したadUnitPathを取得する
 * @type {() => Slots}
 * @sample
 * ```
 * {
 *   'div-gpt-ad-1629864618640-0': '/62532913/p_fluctmagazine_320x50_surface_15377',
 *   'browsi_ad_0_ai_1_rc_0': '/62532913/p_fluctmagazine_320x50_surface_15377'
 * }
 * ```
 */
const getAdUnitMap = () => window.googletag.pubads().getSlots().reduce((prev, slot) => Object.assign(prev, { [slot.getSlotElementId()]: slot.getAdUnitPath() }), {});

/** @type {(_adUnit: AdUnit, adUnits: AdUnit[], slots: Slots) => AdUnit} */
export const convertReplicatedAdUnit = (_adUnit, adUnits = $$PREBID_GLOBAL$$.adUnits, slots = getAdUnitMap()) => {
  /** @type {AdUnit} */
  const adUnit = deepClone(_adUnit);

  /** browsi枠: */
  if (!adUnit.analytics) {
    /** `adUnit.analytics`が存在しない場合、`adUnit.path`も存在しない */
    const adUnitPath = slots[adUnit.code];
    try {
      /**
       * browsi枠は`adUnit.path`を持たない
       * 共通のadUnitPathを持つ（複製元の）枠を探す
       */
      const { analytics, code, mediaTypes: { banner: { name } } } = find(adUnits, adUnit => adUnitPath.match(new RegExp(`${adUnit.path}$`)));
      adUnit.analytics = analytics;
      adUnit._code = adUnit.code; /** 変換前: `browsi_ad_..` */
      adUnit.code = code;
      adUnit.mediaTypes.banner.name = name;
    } catch (_error) {
      logError(JSON.stringify({
        message: '対応するDWIDを持つ枠が見つかりませんでした。',
        adUnitCode: adUnit.code,
        adUnitPath,
      }));
    }
  }
  adUnit.bids = undefined;
  return adUnit;
};

/** @typedef {{slot: {getSlotElementId: () => string}}} GptEvent */
/** @type {(event: GptEvent) => void} */
const browsiEventListener = (event) => {
  const divId = event.slot.getSlotElementId();
  if (isBrowsiId(divId)) {
    const auction = find(Object.values(cache.auctions), auction =>
      auction.adUnitCodes.every(adUnitCode => adUnitCode === divId));
    sendMessage(auction.auctionId);
  }
}

let fluctAnalyticsAdapter = Object.assign(
  adapter({ url, analyticsType: 'endpoint' }), {
  track({ eventType, args }) {
    logInfo(`[${eventType}] ${Date.now()} :`, args);
    try {
      switch (eventType) {
        case EVENTS.AUCTION_INIT: {
          /** @type {PbAuction} */
          let auctionInitEvent = args;
          cache.auctions[auctionInitEvent.auctionId] = { ...auctionInitEvent, bids: {} };
          if (!cache.gpt.registered && isGptPubadsDefined()) {
            window.googletag.pubads().addEventListener('slotOnload', browsiEventListener)
            cache.gpt.registered = true;
          }
          break;
        }
        case EVENTS.BID_TIMEOUT: {
          /** @type {BidResponse[]} */
          let timeoutEvent = args;
          timeoutEvent.forEach(bid => {
            cache.auctions[bid.auctionId].bids[bid.bidId] = {
              ...bid,
              noBid: true,
              prebidWon: false,
              bidWon: false,
              timeout: true,
            };
          });
          break;
        }
        case EVENTS.AUCTION_END: {
          /** @type {PbAuction} */
          let auctionEndEvent = args;
          let { adUnitCodes, auctionId, bidsReceived, noBids } = auctionEndEvent;
          Object.assign(cache.auctions[auctionId], auctionEndEvent, { aidSuffix: isBrowsiId(auctionId) ? generateUUID() : undefined });

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
          if (!isBrowsiId(auctionId))
            sendMessage(auctionId);
          break;
        }
        case EVENTS.BID_WON: {
          /** @type {Bid} */
          let bidWonEvent = args;
          let { auctionId, requestId } = bidWonEvent;
          Object.assign(cache.auctions[auctionId].bids[requestId], bidWonEvent, {
            noBid: false,
            prebidWon: true,
            bidWon: true,
            timeout: false,
          });
          /** 複数の `BID_WON` イベントをまとめて送信する */
          clearTimeout(cache.timeouts[auctionId]);
          cache.timeouts[auctionId] = setTimeout(() => {
            sendMessage(auctionId);
          }, Math.min(config.getConfig('timeoutBuffer') || 400, 400));
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
  let { adUnits, auctionEnd, aidSuffix, auctionStatus, bids } = cache.auctions[auctionId];
  adUnits = adUnits.map(adUnit => convertReplicatedAdUnit(adUnit, $$PREBID_GLOBAL$$.adUnits));

  const payload = {
    auctionId: aidSuffix ? `${auctionId}_${aidSuffix}` : auctionId,
    adUnits,
    bids: Object.values(bids).map(bid => {
      const { noBid, prebidWon, bidWon, timeout, adId, adUnitCode, adUrl, bidder, status, netRevenue, cpm, currency, originalCpm, originalCurrency, requestId, size, source, timeToRespond } = bid;
      const adUnit = find(adUnits, adUnit => [adUnit._code, adUnit.code].includes(adUnitCode));
      return {
        noBid,
        prebidWon,
        bidWon,
        timeout,
        dwid: find(adUnit.analytics, param => param.bidder === bidder)?.dwid,
        status,
        adId,
        adUrl,
        adUnitCode: adUnit.code,
        bidder,
        netRevenue,
        cpm,
        currency,
        originalCpm,
        originalCurrency,
        requestId,
        size,
        source,
        timeToRespond,
        bid: {
          ...bid,
          ad: undefined
        },
      };
    }),
    timestamp: Date.now(),
    auctionEnd,
    auctionStatus,
  }
  ajax(url, () => logInfo(`[sendMessage] ${Date.now()} :`, payload), JSON.stringify(payload), { contentType: 'application/json', method: 'POST' });
}

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
