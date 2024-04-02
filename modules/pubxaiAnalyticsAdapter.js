import {
  deepAccess,
  parseSizesInput,
  getWindowLocation,
  buildUrl,
  cyrb53Hash,
} from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { getGlobal } from '../src/prebidGlobal.js';
import {
  getGptSlotInfoForAdUnitCode,
  getGptSlotForAdUnitCode,
} from '../libraries/gptUtils/gptUtils.js';

let initOptions;

const emptyUrl = '';
const analyticsType = 'endpoint';
const pubxaiAnalyticsVersion = 'v1.2.0';
const defaultHost = 'api.pbxai.com';
const auctionPath = '/analytics/auction';
const winningBidPath = '/analytics/bidwon';

/**
 * auctionCache is a global cache object which stores all auction histories
 * for the session. When getting a key from the auction cache, any
 * information already known about the auction or associated data (floor
 * data configured by prebid, browser data, user data etc) is added to
 * the cache automatically.
 */
export const auctionCache = new Proxy(
  {},
  {
    get: (target, name) => {
      if (!Object.hasOwn(target, name)) {
        target[name] = {
          bids: [],
          auctionDetail: {
            refreshRank: Object.keys(target).length,
            auctionId: name,
          },
          floorDetail: {},
          pageDetail: {
            host: getWindowLocation().host,
            path: getWindowLocation().pathname,
            search: getWindowLocation().search,
          },
          deviceDetail: {
            platform: navigator.platform,
            deviceType: getDeviceType(),
            deviceOS: getOS(),
            browser: getBrowser(),
          },
          userDetail: {
            userIdTypes: Object.keys(getGlobal().getUserIds?.() || {}),
          },
          consentDetail: {
            consentTypes: Object.keys(getGlobal().getConsentMetadata?.() || {}),
          },
          pmacDetail: JSON.parse(getStorage()?.getItem('pubx:pmac')) || {}, // {auction_1: {floor:0.23,maxBid:0.34,bidCount:3},auction_2:{floor:0.13,maxBid:0.14,bidCount:2}
          initOptions: {
            ...initOptions,
            auctionId: name, // back-compat
          },
          sentAs: [],
        };
      }
      return target[name];
    },
  }
);

/**
 * Fetch extra ad server data for a specific ad slot (bid)
 * @param {object} bid an output from extractBid
 * @returns {object} key value pairs from the adserver
 */
const getAdServerDataForBid = (bid) => {
  const gptSlot = getGptSlotForAdUnitCode(bid);
  if (gptSlot) {
    return Object.fromEntires(
      gptSlot
        .getTargetingKeys()
        .filter(
          (key) =>
            key.startsWith('pubx-') ||
            (key.startsWith('hb_') && (key.match(/_/g) || []).length === 1)
        )
        .map((key) => [key, gptSlot.getTargeting(key)])
    );
  }
  return {}; // TODO: support more ad servers
};

/**
 * Access sessionStorage
 * @returns {Storage}
 */
const getStorage = () => {
  try {
    return window.top['sessionStorage'];
  } catch (e) {
    return null;
  }
};

/**
 * extracts and derives valuable data from a prebid bidder bidResponse object
 * @param {object} bidResponse a prebid bidder bidResponse (see
 * https://docs.prebid.org/dev-docs/publisher-api-reference/getBidResponses.html)
 * @returns {object}
 */
const extractBid = (bidResponse) => {
  return {
    adUnitCode: bidResponse.adUnitCode,
    gptSlotCode:
      getGptSlotInfoForAdUnitCode(bidResponse.adUnitCode).gptSlot || null,
    auctionId: bidResponse.auctionId,
    bidderCode: bidResponse.bidder,
    cpm: bidResponse.cpm,
    creativeId: bidResponse.creativeId,
    dealId: bidResponse.dealId,
    currency: bidResponse.currency,
    floorData: bidResponse.floorData,
    mediaType: bidResponse.mediaType,
    netRevenue: bidResponse.netRevenue,
    requestTimestamp: bidResponse.requestTimestamp,
    responseTimestamp: bidResponse.responseTimestamp,
    status: bidResponse.status,
    sizes: parseSizesInput(bidResponse.size).toString(),
    statusMessage: bidResponse.statusMessage,
    timeToRespond: bidResponse.timeToRespond,
    transactionId: bidResponse.transactionId,
    bidId: bidResponse.bidId || bidResponse.requestId,
    placementId: bidResponse.params
      ? deepAccess(bidResponse, 'params.0.placementId')
      : null,
  };
};

/**
 * Track the events emitted by prebid and handle each case. See https://docs.prebid.org/dev-docs/publisher-api-reference/getEvents.html for more info
 * @param {object} event the prebid event emmitted
 * @param {string} event.eventType the type of the event
 * @param {object} event.args the arguments of the emitted event
 */
const track = ({ eventType, args }) => {
  switch (eventType) {
    // handle invalid bids, and remove them from the adUnit cache
    case CONSTANTS.EVENTS.BID_TIMEOUT:
      args.map(extractBid).forEach((bid) => {
        bid.renderStatus = 3;
        auctionCache[bid.auctionId].bids.push(bid);
      });
      break;
    // handle valid bid responses and record them as part of an auction
    case CONSTANTS.EVENTS.BID_RESPONSE:
      const bid = Object.assign(extractBid(args), { renderStatus: 2 });
      auctionCache[bid.auctionId].bids.push(bid);
      break;
    // capture extra information from the auction, and if there were no bids
    // (and so no chance of a win) send the auction
    case CONSTANTS.EVENTS.AUCTION_END:
      Object.assign(
        auctionCache[args.auctionId].floorDetail,
        args.adUnits
          .map((i) => i?.bids.length && i.bids[0]?.floorData)
          .find((i) => i) || {}
      );
      auctionCache[args.auctionId].deviceDetail.cdep = args.bidderRequests
        .map((bidRequest) => bidRequest.ortb2?.device?.ext?.cdep)
        .find((i) => i);
      Object.assign(auctionCache[args.auctionId].auctionDetail, {
        adUnitCodes: args.adUnits.map((i) => i.code),
        timestamp: args.timestamp,
      });
      if (
        auctionCache[args.auctionId].bids.every((bid) => bid.renderStatus === 3)
      ) {
        send(args.auctionId);
      }
      break;
    // send the prebid winning bid back to pubx
    case CONSTANTS.EVENTS.BID_WON:
      const winningBid = extractBid(args);
      const floorDetail = auctionCache[winningBid.auctionId].floorDetail;
      Object.assign(winningBid, {
        floorProvider: floorDetail?.floorProvider || null,
        floorFetchStatus: floorDetail?.fetchStatus || null,
        floorLocation: floorDetail?.location || null,
        floorModelVersion: floorDetail?.modelVersion || null,
        floorSkipRate: floorDetail?.skipRate || 0,
        isFloorSkipped: floorDetail?.skipped || false,
        isWinningBid: true,
        renderedSize: args.size,
        renderStatus: 4,
      });
      winningBid.adServerData = getAdServerDataForBid(winningBid);
      auctionCache[winningBid.auctionId].winningBid = winningBid;
      send(winningBid.auctionId);
      break;
    // do nothing
    default:
      break;
  }
};

/**
 * Get the approximate device type from the user agent
 * @returns {string}
 */
export const getDeviceType = () => {
  if (
    /ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(
      navigator.userAgent.toLowerCase()
    )
  ) {
    return 'tablet';
  }
  if (
    /iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(
      navigator.userAgent.toLowerCase()
    )
  ) {
    return 'mobile';
  }
  return 'desktop';
};

/**
 * Get the approximate browser type from the user agent (or vendor if available)
 * @returns {string}
 */
export const getBrowser = () => {
  if (
    /Chrome/.test(navigator.userAgent) &&
    /Google Inc/.test(navigator.vendor)
  ) {
    return 'Chrome';
  } else if (navigator.userAgent.match('CriOS')) return 'Chrome';
  else if (/Firefox/.test(navigator.userAgent)) return 'Firefox';
  else if (/Edg/.test(navigator.userAgent)) return 'Microsoft Edge';
  else if (
    /Safari/.test(navigator.userAgent) &&
    /Apple Computer/.test(navigator.vendor)
  ) {
    return 'Safari';
  } else if (
    /Trident/.test(navigator.userAgent) ||
    /MSIE/.test(navigator.userAgent)
  ) {
    return 'Internet Explorer';
  } else return 'Others';
};

/**
 * Get the approximate OS from the user agent (or app version, if available)
 * @returns {string}
 */
export const getOS = () => {
  if (navigator.userAgent.indexOf('Android') != -1) return 'Android';
  if (navigator.userAgent.indexOf('like Mac') != -1) return 'iOS';
  if (navigator.userAgent.indexOf('Win') != -1) return 'Windows';
  if (navigator.userAgent.indexOf('Mac') != -1) return 'Macintosh';
  if (navigator.userAgent.indexOf('Linux') != -1) return 'Linux';
  if (navigator.appVersion.indexOf('X11') != -1) return 'Unix';
  return 'Others';
};

/**
 * If true, send data back to pubxai
 * @param {string} auctionId
 * @param {number} samplingRate
 * @returns {boolean}
 */
const shouldFireEventRequest = (auctionId, samplingRate = 1) => {
  return parseInt(cyrb53Hash(auctionId)) % samplingRate === 0;
};

/**
 * Send auction data back to pubx.ai
 * @param {string} auctionId the auction to send
 */
const send = (auctionId) => {
  const auctionData = Object.assign({}, auctionCache[auctionId]);
  if (!shouldFireEventRequest(auctionId, initOptions.samplingRate)) {
    return;
  }
  [
    {
      path: winningBidPath,
      requiredKeys: [
        'winningBid',
        'pageDetail',
        'deviceDetail',
        'floorDetail',
        'auctionDetail',
        'userDetail',
        'consentDetail',
        'pmacDetail',
        'initOptions',
      ],
      eventType: 'win',
    },
    {
      path: auctionPath,
      requiredKeys: [
        'bids',
        'pageDetail',
        'deviceDetail',
        'floorDetail',
        'auctionDetail',
        'userDetail',
        'consentDetail',
        'pmacDetail',
        'initOptions',
      ],
      eventType: 'auction',
    },
  ].forEach(({ path, requiredKeys, eventType }) => {
    const data = Object.fromEntries(
      requiredKeys.map((key) => [key, auctionData[key]])
    );
    if (
      auctionCache[auctionId].sentAs.includes(eventType) ||
      !requiredKeys.every((key) => !!auctionData[key])
    ) {
      return;
    }
    const pubxaiAnalyticsRequestUrl = buildUrl({
      protocol: 'https',
      hostname:
        (auctionData.initOptions && auctionData.initOptions.hostName) ||
        defaultHost,
      pathname: path,
      search: {
        auctionTimestamp: auctionData.auctionDetail.timestamp,
        pubxaiAnalyticsVersion: pubxaiAnalyticsVersion,
        prebidVersion: getGlobal().version,
      },
    });
    const payload = new Blob([JSON.stringify(data)], {
      type: 'text/json',
    });
    navigator.sendBeacon(pubxaiAnalyticsRequestUrl, payload);
    auctionCache[auctionId].sentAs.push(eventType);
  });
};

var pubxaiAnalyticsAdapter = Object.assign(
  adapter({
    emptyUrl,
    analyticsType,
  }),
  { track }
);
pubxaiAnalyticsAdapter.track = track;

pubxaiAnalyticsAdapter.originEnableAnalytics =
  pubxaiAnalyticsAdapter.enableAnalytics;
pubxaiAnalyticsAdapter.enableAnalytics = (config) => {
  initOptions = config.options;
  pubxaiAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: pubxaiAnalyticsAdapter,
  code: 'pubxai',
});

export default pubxaiAnalyticsAdapter;
