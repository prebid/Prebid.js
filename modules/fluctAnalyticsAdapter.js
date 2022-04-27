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

/** @typedef {{ [key: string]: string|number }[] } Params */
/** @typedef {{ banner: { name: string, sizes?: [number, number][], sizeConfig?: { minViewPort: [number, number], sizes: [number, number][] }[] }, video: any } MediaTypes */
/** @typedef {{ adUnitCode: string, auctionId: string, bidder: string }} Bid */
/** @typedef {{ code: string, _code?: string, dwid: string, path?: string, analytics?: { bidder: string, dwid: string }[], bids: Bid[], mediaTypes: MediaTypes, transactionId: string } AdUnit */
/** @typedef {{ noBid: boolean, bidWon: boolean, prebidWon: boolean, timeout: boolean, dwid: string }} BidFlag */
/** @typedef { Bid & { bidId: string, bidRequestsCount: number, bidderRequestId: string, bidderRequestsCount: number, bidderWinsCount: number, mediaTypes: MediaTypes, params: Params, sizes: [number, number][], src: string, transactionId: string, dwid: string }} BidRequest */
/** @typedef { Bid & { ad: string, adId: string, adUrl: string, adserverTargeting: { [fbs_key: string]: string }, bidderCode: string, cpm: number, creativeId: string, currency: string, dealId?: string, height: number, mediaType: string, netRevenue: boolean, originalCpm: number, originalCurrency: string, pbAg: string, pbCg: string, pbDg: string, pbHg: string, pbLg: string, pbMg: string, pbLg: string, requestId: string, requestTimestamp: number, responseTimestamp: number, size: string, source: string, statusMessage: string, timeToRespond: number, ts?: string, ttl: string, width: number }} BidResponse */

/** @typedef {{ auctionId: string, auctionStart: number, bidderCode: string, bidderRequestId: string, bids: BidRequest[], refererInfo: { referer: string, reachedTop: boolean, isAmp: boolean, numIframes: number, stack: string[], start: number, timeout: number }}} BidRequestedEvent */
/** @typedef {(Bid & { bidId: string, params: Params })[]} BidTimeoutEvent */
/** @typedef { BidRequest } NoBidEvent */
/** @typedef {{ adUnitCodes: string[], adUnits: AdUnit[], auctionEnd: number, auctionId: string, auctionStatus: string, bidderRequests: BidRequestedEvent[], bidsReceived: BidResponse[], labels?: string, noBids: BidRequest[], timeout: number, timestamp: number, winningBids: BidResponse[] }} AuctionEvent */
/** @typedef {(BidResponse & { params: Params, status: string })} BidWonEvent */
/** @typedef {(BidResponse & { adId: string, bid: BidResponse })} AdRenderSucceededEvent */

/** @type {{ auctions: { [auctionId: string]: AuctionEvent & { aidSuffix?: string, bids: { [requestId: string]: BidResponse & BidFlag }}}, gpt: { registered: boolean }, timeouts: { [auctionId: string]: number }, bidRequests: { [bidId: string]: BidRequest }}} */
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

/** @type {(_adUnit: AdUnit, adUnits: AdUnit[], slots: { [divId: string]: string }) => AdUnit} */
export const convertReplicatedAdUnit = (_adUnit, adUnits = $$PREBID_GLOBAL$$.adUnits, slots = getAdUnitMap()) => {
  /** @type {AdUnit} */
  const adUnit = deepClone(_adUnit);

  /** @deprecated browsi枠: */
  if (!adUnit.analytics) {
    /** `adUnit.analytics`が存在しない場合、`adUnit.path`も存在しない */
    const adUnitPath = slots[adUnit.code];
    try {
      /**
       * browsi枠は`adUnit.path`を持たない
       * 共通のadUnitPathを持つ（複製元の）枠を探す
       */
      const { analytics, bids, code, mediaTypes: { banner: { name } } } = find(adUnits, adUnit => adUnitPath.match(new RegExp(`${adUnit.path}$`)));
      adUnit.analytics = analytics;
      adUnit.bids = bids;
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
  return adUnit;
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
          let { bid: { auctionId, requestId } } = adRenderSucceededEvent;
          Object.assign(cache.auctions[auctionId].bids[requestId], {
            noBid: false,
            prebidWon: true,
            bidWon: true,
            timeout: false,
          });
          /** オークション単位で `AD_RENDER_SUCCEEDED` イベントをまとめて送信する */
          if (isBrowsiId(auctionId)) {
            /** 原則1オークション:1枠 */
            sendMessage(auctionId);
          } else {
            clearTimeout(cache.timeouts[auctionId]);
            cache.timeouts[auctionId] = setTimeout(() => {
              sendMessage(auctionId);
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
  let { adUnits, auctionEnd, aidSuffix, auctionStatus, bids } = cache.auctions[auctionId];
  adUnits = adUnits.map(adUnit => convertReplicatedAdUnit(adUnit, $$PREBID_GLOBAL$$.adUnits));

  const payload = {
    auctionId: aidSuffix ? `${auctionId}_${aidSuffix}` : auctionId,
    adUnits,
    bids: Object.values(bids).map(bid => {
      const { noBid, prebidWon, bidWon, timeout, dwid, adId, adUnitCode, adUrl, bidder, statusMessage, netRevenue, cpm, currency, originalCpm, originalCurrency, requestId, size, source, timeToRespond } = bid;
      const adUnit = find(adUnits, adUnit => [adUnit._code, adUnit.code].includes(adUnitCode));

      return {
        noBid,
        prebidWon,
        bidWon,
        timeout,
        dwid: dwid || (find(adUnit.analytics, param => param.bidder === bidder) || {}).dwid,
        status: statusMessage,
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
        /** @deprecated */
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
