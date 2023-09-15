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
const MODULE_NAME = 'fluctAnalyticsAdapter';
const url = 'https://an.adingo.jp';

/** AdUnit */
/** @typedef {{ code: string, dwid: string, path?: string, analytics?: { bidder: string, dwid: string }[], bids: Bid[], mediaTypes: MediaTypes, transactionId: string, ortb2Imp?: Ortb2Imp }} AdUnit */
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
/** @typedef {{ auctionId: string, auctionStart: number, bidderCode: string, bidderRequestId: string, bids: BidRequest[], refererInfo: { referer: string, reachedTop: boolean, isAmp: boolean, numIframes: number, stack: string[], start: number, timeout: number }}} BidRequestedEvent */
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
          Object.assign(cache.auctions[auctionId], auctionEndEvent);

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

          sendMessage(auctionId);
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
          clearTimeout(cache.timeouts[bid.auctionId]);
          cache.timeouts[bid.auctionId] = setTimeout(() => {
            sendMessage(bid.auctionId);
          }, Math.min(config.getConfig('timeoutBuffer') || 400, 400));
          break;
        }
        default:
          break;
      }
    } catch (error) {
      // console.error({ eventType, args, error })
      logError({ eventType, args, error, module: MODULE_NAME });
    }
  }
});

/** @type {(auctionId: string) => void} */
const sendMessage = (auctionId) => {
  let { adUnits, bids } = cache.auctions[auctionId];

  const payload = {
    auctionId: auctionId,
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

      if (!dwid) {
        logError(`[fluctAnalyticsAdapter] bid.dwid is undefined in adUnit ${adUnitCode}`, { bid, module: MODULE_NAME });
      }

      const { code, ortb2Imp } = find(adUnits, adUnit => adUnitCode === adUnit.code);
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
        adUnitCode,
        eidsSource: userIdAsEids?.map(userIdAsEid => userIdAsEid.source) ?? null,
        bidder,
        bidWon,
        cpm,
        creativeId,
        dwid,
        height,
        netRevenue,
        noBid,
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
