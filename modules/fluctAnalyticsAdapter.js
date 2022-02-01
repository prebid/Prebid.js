/* eslint-disable indent */
import { ajax } from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { config } from '../src/config.js'
import CONSTANTS from '../src/constants.json';
import {
  logInfo,
  generateUUID,
} from '../src/utils.js';
import find from 'core-js-pure/features/array/find.js';

const url = 'https://an.adingo.jp'

/**
 * @typedef {Object} BidResponse
 * @property {string} ad //: html tag
 * @property {string} adId
 * @property {string} adUnitCode //: 'div-gpt-ad-1612148277593-0'
 * @property {string} adUrl
 * @property {*} adserverTargeting
 * @property {string} auctionId
 * @property {string} bidder
 * @property {string} bidderCode
 * @property {number} cpm
 * @property {string} creativeId
 * @property {string} currency
 * @property {string} dealId
 * @property {number} height
 * @property {string} mediaType
 * @property {boolean} netRevenue
 * @property {number} originalCpm
 * @property {string} originalCurrency
 * @property {*} params
 * @property {string} pbAg
 * @property {string} pbCg
 * @property {string} pbDg
 * @property {string} pbHg
 * @property {string} pbLg
 * @property {string} pbMg
 * @property {string} pbLg
 * @property {string} requestId
 * @property {number} requestTimestamp
 * @property {number} responseTimestamp
 * @property {string} size
 * @property {string} source
 * @property {string} status
 * @property {string} statusMessage
 * @property {string} timeToRespond
 * @property {string} ttl
 * @property {number} width
 * @property {string|undefined} bidId //: exists when 'bidTimeout','noBid' event.
 *
 */

/**
 * @typedef {Object} Bid
 * @property {string} bidder
 * @property {*} params
 */

/**
 * @typedef {Object} Analytics
 * @property {string} bidder
 * @property {string} dwid
 */

/**
 * @typedef {Object} MediaTypes
 * @property {Object} banner
 * @property {string} banner.name
 * @property {Array<Array<number>>} sizes
 */

/**
 * @typedef {Object} AdUnit
 * @property {Array<Analytics>} analytics
 * @property {Array<Bid>} bids
 * @property {MediaTypes} mediaTypes
 * @property {Array<Array<number>>} sizes
 * @property {string} transactionId
 */

/**
 * @typedef {Object} PbAuction
 * @property {Array<string>} adUnitCodes //: ['div-gpt-ad-1612148277593-0']
 * @property {Array<AdUnit>} adUnits //: [{…}]
 * @property {number} auctionEnd - timestamp of when auction ended //: 1586675964364
 * @property {string} auctionId - Auction ID of the request this bid responded to
 * @property {string} auctionStatus //: 'inProgress'
 * @property {Array<*>} bidderRequests //: (2) [{…}, {…}]
 * @property {Array<BidResponse>} bidsReceived //: []
 * @property {string|undefined} labels //: undefined
 * @property {Array<BidResponse>} noBids //: []
 * @property {number} timeout //: 3000
 * @property {number} timestamp //: 1586675964364
 * @property {Array<BidResponse>} winningBids //: []
 * @property {Object<string, BidResponse>} bids
 */

/**
 * @typedef {Object} Gpt
 * @property {boolean} registered
 */

/**
 * @typedef {Object} Cache
 * @property {Object.<string, PbAuction>} auctions
 * @property {Object.<string, number>} timeouts
 * @property {Gpt} gpt
 */

/** @type Cache */
const cache = {
  auctions: {},
  timeouts: {},
  gpt: {},
};

/**
 * @param {string} id // auctionId or divId
 * @returns {boolean}
 */
const isBrowsiId = (id) => Boolean(id.match(/^browsi_/g))

let fluctAnalyticsAdapter = Object.assign(
  adapter({ url, analyticsType: 'endpoint' }), {
  track({ eventType, args }) {
    logInfo(`[${eventType}] ${Date.now()} :`, args);
    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT: {
        /** @type {PbAuction} */
        let auctionInitEvent = args
        cache.auctions[auctionInitEvent.auctionId] = { ...auctionInitEvent, bids: {} }
        if (!cache.gpt.registered) {
          cache.gpt.registered = true;
          window.googletag = window.googletag || { cmd: [] };
        }
        break;
      }
      case CONSTANTS.EVENTS.BID_TIMEOUT: {
        /** @type {BidResponse[]} */
        let timeoutEvent = args
        timeoutEvent.forEach(bid => {
          cache.auctions[bid.auctionId].bids[bid.bidId] = {
            ...bid,
            noBid: true,
            prebidWon: false,
            bidWon: false,
            timeout: true,
          }
        })
        break;
      }
      case CONSTANTS.EVENTS.AUCTION_END: {
        /** @type {PbAuction} */
        let auctionEndEvent = args
        let { adUnitCodes, auctionId, bidsReceived, noBids } = auctionEndEvent
        Object.assign(cache.auctions[auctionId], auctionEndEvent)

        let prebidWonBidRequestIds = adUnitCodes.map(adUnitCode =>
          bidsReceived.reduce((highestCpmBid, bid) =>
            adUnitCode === bid.adUnitCode
              ? highestCpmBid.cpm > bid.cpm ? highestCpmBid : bid
              : highestCpmBid
            , {}).requestId
        );

        [
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
        ].forEach(bid => {
          cache.auctions[auctionId].bids[bid.requestId || bid.bidId] = bid
        })
        if (!isBrowsiId(auctionId)) {
          sendMessage(auctionId)
        }
        break;
      }
      case CONSTANTS.EVENTS.BID_WON: {
        /** @type {Bid} */
        let bidWonEvent = args
        let { auctionId, requestId } = bidWonEvent
        clearTimeout(cache.timeouts[auctionId]);
        Object.assign(cache.auctions[auctionId].bids[requestId], bidWonEvent, {
          noBid: false,
          prebidWon: true,
          bidWon: true,
          timeout: false,
        })
        if (!isBrowsiId(auctionId)) {
          cache.timeouts[auctionId] = setTimeout(() => {
            sendMessage(auctionId);
          }, config.getConfig('bidderTimeout') || 3000);
        }
        break;
      }
      default:
        break;
    }
  }
});

/**
 * GPT slotから共通のpathを持つ、`browsi_`ではないadUnitCodeを返す
 * @param {Object.<string, string>} slots
 * @param {string} adUnitCode
 * @returns {string}
 */
export const getAdUnitCodeBeforeReplication = (slots, adUnitCode) => {
  const browsiCodePrefix = (adUnitCode.match(/^browsi_.*_(?=\d*$)/g) || [])[0]
  if (browsiCodePrefix) {
    const [, adUnitPath] = find(Object.entries(slots), ([code]) => code.match(new RegExp(`^${browsiCodePrefix}`), 'g'))
    const [orgAdUnitCode] = find(Object.entries(slots), ([code, path]) => !isBrowsiId(code) && path === adUnitPath) || [adUnitCode, adUnitPath]
    return orgAdUnitCode
  } else {
    return adUnitCode
  }
}

/**
 * 各adUnitCodeに対応したadUnitPathを取得する
 * @returns {Object.<string, string>}
 * @sample
 * ```
 * {
 *   'div-gpt-ad-1629864618640-0': '/62532913/p_fluctmagazine_320x50_surface_15377',
 *   'browsi_ad_0_ai_1_rc_0': '/62532913/p_fluctmagazine_320x50_surface_15377'
 * }
 * ```
 */
// eslint-disable-next-line no-undef
const getAdUnitMap = () => googletag.pubads().getSlots().reduce((prev, slot) => Object.assign(prev, { [slot.getSlotElementId()]: slot.getAdUnitPath() }), {})

/**
 * @param {Array<AdUnit>} adUnits
 * @param {string} adUnitCode
 * @param {string} bidder
 * @returns {string|null}
 */
const findDwIdByAdUnitCode = (adUnits, adUnitCode, bidder) => {
  const analytics = find(adUnits, adUnit => adUnit.code === adUnitCode).analytics
  const dwid = find(analytics, obj => obj.bidder === bidder).dwid
  return dwid
}

/**
 * @param {string} auctionId
 */
const sendMessage = (auctionId) => {
  let { adUnits, auctionEnd, auctionStatus, bids } = cache.auctions[auctionId]
  const slots = getAdUnitMap()

  adUnits = adUnits.map(adUnit => ({
    ...adUnit,
    analytics: find(Object.values(cache.auctions).flatMap(auction => auction.adUnits), _adUnit => _adUnit.code === getAdUnitCodeBeforeReplication(slots, adUnit.code)).analytics,
    bids: undefined
  }))

  let payload = {
    auctionId: isBrowsiId(auctionId) ? generateUUID() : auctionId,
    adUnits,
    bids: Object.values(bids).map(bid => {
      const { noBid, prebidWon, bidWon, timeout, adId, adUnitCode, adUrl, bidder, status, netRevenue, cpm, currency, originalCpm, originalCurrency, requestId, size, source, timeToRespond } = bid
      return {
        noBid,
        prebidWon,
        bidWon,
        timeout,
        dwid: findDwIdByAdUnitCode(adUnits, adUnitCode, bidder),
        status,
        adId,
        adUrl,
        adUnitCode: getAdUnitCodeBeforeReplication(slots, adUnitCode),
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
      }
    }),
    timestamp: Date.now(),
    auctionEnd,
    auctionStatus,
  };
  ajax(url, () => logInfo(`[sendMessage] ${Date.now()} :`, payload), JSON.stringify(payload), { contentType: 'application/json', method: 'POST' });
};

window.addEventListener('browsiImpression', (data) => {
  const adUnitCode = Object.entries(getAdUnitMap())
    .reduce((prev, [code, path]) => {
      return data.detail.adUnit === path && isBrowsiId(code)
        ? code
        : prev
    }, '')
  const auction = find(Object.values(cache.auctions), auction => auction.adUnitCodes.includes(adUnitCode))
  sendMessage(auction.auctionId)
})

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
