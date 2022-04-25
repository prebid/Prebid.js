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
} from '../src/utils.js';
import * as _find from 'core-js-pure/features/array/find.js';
import $$PREBID_GLOBAL$$ from '../src/prebid.js';
/** @type {<T>(array: T[], predicate: (value: T, index: number, obj: T[]) => boolean, thisArg?: any) => T} */
const find = _find;

const url = 'https://an.adingo.jp';

/** @typedef {{ad: string, adId: string, adUnitCode: string, adUrl: string, adserverTargeting: any, auctionId: string, bidder: string, bidderCode: string, cpm: number, creativeId: string, currency: string, dealId: string, height: number, mediaType: string, netRevenue: boolean, originalCpm: number, originalCurrency: string, params: any, pbAg: string, pbCg: string, pbDg: string, pbHg: string, pbLg: string, pbMg: string, pbLg: string, requestId: string, requestTimestamp: number, responseTimestamp: number, size: string, source: string, status: string, statusMessage: string, timeToRespond: string, ttl: string, width: number, bidId?: string}} BidResponse */
/** @typedef {{bidder: string, params: any}} Bid */
/** @typedef {{code: string, dwid: string, path?: string, bids?: Bid[], mediaTypes: {banner: {name: string, sizes: number[][]}}, sizes: number[][], transactionId: string}} AdUnit */
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
          let { adUnitCodes, auctionId, bidderRequests, bidsReceived, noBids } = auctionEndEvent;
          Object.assign(cache.auctions[auctionId], auctionEndEvent, { aidSuffix: isBrowsiId(auctionId) ? generateUUID() : undefined });

          let prebidWonBidRequestIds = adUnitCodes.map(adUnitCode =>
            bidsReceived.reduce((highestCpmBid, bid) =>
              adUnitCode === bid.adUnitCode
                ? highestCpmBid.cpm > bid.cpm ? highestCpmBid : bid
                : highestCpmBid
              , {}).requestId
          );

          const requestBids = []
          bidderRequests.forEach(bidderRequest => bidderRequest.bids.forEach(bid => requestBids.push(bid)))

          const bidResults = [
            ...bidsReceived.map(bid => ({
              ...bid,
              noBid: false,
              prebidWon: prebidWonBidRequestIds.includes(bid.requestId),
              bidWon: false,
              timeout: false,
              dwid: (find(requestBids, requestBid => requestBid.bidId === bid.requestId) || {}).dwid,
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
          /** @type {{ adId: string, bid: Bid, doc: any }} */
          let adRenderSucceededEvent = args;
          let { bid: { auctionId, requestId } } = adRenderSucceededEvent;
          Object.assign(cache.auctions[auctionId].bids[requestId], bidWonEvent, {
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
  const payload = {
    auctionId: aidSuffix ? `${auctionId}_${aidSuffix}` : auctionId,
    adUnits,
    bids: Object.values(bids).map(bid => {
      const { noBid, prebidWon, bidWon, timeout, dwid, adId, adUnitCode, adUrl, bidder, status, netRevenue, cpm, currency, originalCpm, originalCurrency, requestId, size, source, timeToRespond } = bid;
      return {
        noBid,
        prebidWon,
        bidWon,
        timeout,
        dwid,
        status,
        adId,
        adUrl,
        adUnitCode,
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
