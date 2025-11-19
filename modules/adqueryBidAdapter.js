import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {buildUrl, logInfo, logMessage, parseSizesInput, triggerPixel, getWinDimensions} from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 * @typedef {import('../src/adapters/bidderFactory.js').TimedOutBid} TimedOutBid
 */

const ADQUERY_GVLID = 902;
const ADQUERY_BIDDER_CODE = 'adquery';
const ADQUERY_BIDDER_DOMAIN_PROTOCOL = 'https';
const ADQUERY_BIDDER_DOMAIN = 'bidder.adquery.io';
const ADQUERY_STATIC_DOMAIN_PROTOCOL = 'https';
const ADQUERY_STATIC_DOMAIN = 'api.adquery.io';
const ADQUERY_USER_SYNC_DOMAIN = ADQUERY_BIDDER_DOMAIN;
const ADQUERY_DEFAULT_CURRENCY = 'PLN';
const ADQUERY_NET_REVENUE = true;
const ADQUERY_TTL = 360;

/** @type {BidderSpec} */
export const spec = {
  code: ADQUERY_BIDDER_CODE,
  gvlid: ADQUERY_GVLID,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * @param {object} bid
   * @return {boolean}
   */
  isBidRequestValid: (bid) => {
    const video = bid.mediaTypes && bid.mediaTypes.video;
    if (video) {
      return !!(video.playerSize && video.context === 'outstream');  // Focus on outstream
    }

    return !!(bid && bid.params && bid.params.placementId && bid.mediaTypes.banner.sizes)
  },

  /**
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    const requests = [];

    const adqueryRequestUrl = buildUrl({
      protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/prebid/bid',
    });

    for (let i = 0, len = bidRequests.length; i < len; i++) {
      const bid = bidRequests[i];
      const isVideo = bid.mediaTypes && bid.mediaTypes.video && bid.mediaTypes.video.context === 'outstream';

      let requestUrl = adqueryRequestUrl;

      if (isVideo) {
        // Optionally use a dedicated video endpoint if your server differentiates
        requestUrl = buildUrl({
          protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
          hostname: ADQUERY_BIDDER_DOMAIN,
          pathname: '/openrtb2/auction2', // Adjust if your server has a specific video endpoint
        });
      }

      const request = {
        method: 'POST',
        url: requestUrl, // ADQUERY_BIDDER_DOMAIN_PROTOCOL + '://' + ADQUERY_BIDDER_DOMAIN + '/prebid/bid',
        data: buildRequest(bid, bidderRequest, isVideo),
        options: {
          withCredentials: false,
          crossOrigin: true
        },
        bidId: bid.bidId // Add bidId for mapping responses
      };

      requests.push(request);
    }
    return requests;
  },

  /**
   * @param {*} response
   * @param {ServerRequest} request
   * @return {Bid[]}
   */
  interpretResponse: (response, request) => {
    const bidResponses = [];

    const bidRequest = request.data;

    if (response?.body?.seatbid) {
      response.body.seatbid.forEach(seat => {
        seat.bid.forEach(bid => {
          logMessage('bidObj', bid);
          const imp = bidRequest.imp.find(i => i.id === bid.impid) || bidRequest.imp[0];

          // Only video is the target here
          if (!imp.video) {
            logMessage('bidObj NOT VIDEO', bid);
            return;
          }

          const bidResponse = {
            requestId: bid.impid,
            mediaType: 'video',
            cpm: bid.price,
            currency: response.body.cur || 'USD',
            ttl: 3600, // video żyje dłużej
            creativeId: bid.crid || bid.id,
            netRevenue: true,
            dealId: bid.dealid || undefined,

            // VAST – priority: inline XML > admurl > nurl as a wrapper
            vastXml: bid.adm || null,
            vastUrl: bid.admurl || (bid.adm ? null : bid.nurl) || null,

            width: bid.w || imp.video.w || 640,
            height: bid.h || imp.video.h || 360,

            meta: {
              advertiserDomains: bid.adomain && bid.adomain.length ? bid.adomain : [],
              networkName: seat.seat || undefined,
              mediaType: 'video'
            }
          };

          bidResponses.push(bidResponse);
        });
      });
    }

    const res = response && response.body && response.body.data;

    if (!res) {
      return bidResponses;
    }

    const bidResponse = {
      requestId: res.requestId,
      cpm: res.cpm,
      width: res.mediaType.width,
      height: res.mediaType.height,
      creativeId: res.creationId,
      dealId: res.dealid || '',
      currency: res.currency || ADQUERY_DEFAULT_CURRENCY,
      netRevenue: ADQUERY_NET_REVENUE,
      ttl: ADQUERY_TTL,
      referrer: '',
      ad: '<script src="' + res.adqLib + '"></script>' + res.tag,
      mediaType: res.mediaType.name || 'banner',
      meta: {
        advertiserDomains: res.adDomains && res.adDomains.length ? res.adDomains : [],
        mediaType: res.mediaType.name || 'banner',
      }
    };
    bidResponses.push(bidResponse);
    logInfo('bidResponses', bidResponses);

    return bidResponses;
  },

  /**
   * @param {TimedOutBid} timeoutData
   */
  onTimeout: (timeoutData) => {
    if (timeoutData == null) {
      return;
    }
    logInfo('onTimeout ', timeoutData);
    const params = {
      bidder: timeoutData.bidder,
      bId: timeoutData.bidId,
      adUnitCode: timeoutData.adUnitCode,
      timeout: timeoutData.timeout,
      auctionId: timeoutData.auctionId,
    };
    const adqueryRequestUrl = buildUrl({
      protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/prebid/eventTimeout',
      search: params
    });
    triggerPixel(adqueryRequestUrl);
  },

  /**
   * @param {Bid} bid
   */
  onBidWon: (bid) => {
    logInfo('onBidWon', bid);
    const copyOfBid = { ...bid }
    delete copyOfBid.ad
    const shortBidString = JSON.stringify(copyOfBid);
    const encodedBuf = window.btoa(shortBidString);

    const params = {
      q: encodedBuf,
    };
    const adqueryRequestUrl = buildUrl({
      protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/prebid/eventBidWon',
      search: params
    });
    triggerPixel(adqueryRequestUrl);
  },

  /**
   * @param {Bid} bid
   */
  onSetTargeting: (bid) => {
    logInfo('onSetTargeting', bid);

    const params = {
      bidder: bid.bidder,
      width: bid.width,
      height: bid.height,
      bid: bid.adId,
      mediaType: bid.mediaType,
      cpm: bid.cpm,
      requestId: bid.requestId,
      adUnitCode: bid.adUnitCode
    };

    const adqueryRequestUrl = buildUrl({
      protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/prebid/eventSetTargeting',
      search: params
    });
    triggerPixel(adqueryRequestUrl);
  },
  /**
   * Retrieves user synchronization URLs based on provided options and consents.
   *
   * @param {object} syncOptions - Options for synchronization.
   * @param {object[]} serverResponses - Array of server responses.
   * @param {object} gdprConsent - GDPR consent object.
   * @param {object} uspConsent - USP consent object.
   * @returns {object[]} - Array of synchronization URLs.
   */
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    logMessage('getUserSyncs', syncOptions, serverResponses, gdprConsent, uspConsent);
    const syncData = {
      'gdpr': gdprConsent && gdprConsent.gdprApplies ? 1 : 0,
      'gdpr_consent': gdprConsent && gdprConsent.consentString ? gdprConsent.consentString : '',
      'ccpa_consent': uspConsent && uspConsent.uspConsent ? uspConsent.uspConsent : '',
    };

    if (window.qid) { // only for new users (new qid)
      syncData.qid = window.qid;
    }

    const syncUrlObject = {
      protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
      hostname: ADQUERY_USER_SYNC_DOMAIN,
      pathname: '/prebid/userSync',
      search: syncData
    };

    if (syncOptions.iframeEnabled) {
      syncUrlObject.protocol = ADQUERY_STATIC_DOMAIN_PROTOCOL;
      syncUrlObject.hostname = ADQUERY_STATIC_DOMAIN;
      syncUrlObject.pathname = '/user-sync-iframe.html';

      return [{
        type: 'iframe',
        url: buildUrl(syncUrlObject)
      }];
    }

    return [{
      type: 'image',
      url: buildUrl(syncUrlObject)
    }];
  }
};

function buildRequest(validBidRequests, bidderRequest, isVideo = false) {
  const bid = validBidRequests;
  logInfo('buildRequest: ', bid);

  let userId = null;
  if (window.qid) {
    userId = window.qid;
  }

  if (bid.userId && bid.userId.qid) {
    userId = bid.userId.qid
  }

  if (!userId) {
    // onetime User ID
    const ramdomValues = Array.from(window.crypto.getRandomValues(new Uint32Array(4)));
    userId = ramdomValues.map(val => val.toString(36)).join('').substring(0, 20);
    logMessage('generated onetime User ID: ', userId);
    window.qid = userId;
  }

  let pageUrl = '';
  if (bidderRequest && bidderRequest.refererInfo) {
    pageUrl = bidderRequest.refererInfo.page || '';
  }

  if (isVideo) {
    const baseRequest = {
      id: bid.bidId,
      cur: ['USD'],
      site: {
        page: bidderRequest.refererInfo.page,
        domain: bidderRequest.refererInfo.domain
      },
      tmax: bidderRequest.timeout,
      // Add GDPR/CCPA consent if applicable
      regs: bidderRequest.gdprConsent ? {
        ext: {
          gdpr: bidderRequest.gdprConsent.gdprApplies ? 1 : 0,
          consent: bidderRequest.gdprConsent.consentString
        }
      } : {},
      // === USER ===
      user: {
        id: bidderRequest.userId ? bidderRequest.userId.uid2?.id : undefined,
        buyeruid: bidderRequest.userId ? bidderRequest.userId.id5id?.uid : undefined,
        // Dodaj inne ID: liveramp, criteo, etc.
        ext: bidderRequest.userId ? {
          eids: bidderRequest.userIdAsEids // Prebid 7+ format
        } : undefined
      },

      // === DEVICE ===
      device: {
        ua: navigator.userAgent,
        ip: bidderRequest.ip || undefined, // Jeśli masz IP (np. z serwera)
        dnt: navigator.doNotTrack === '1' ? 1 : 0,
        language: navigator.language || navigator.browserLanguage || '',
        js: 1, // JavaScript enabled
        // Opcjonalnie: w, h (viewport), ppi, pxratio
        w: getWinDimensions().visualViewport.height,
        h: getWinDimensions().visualViewport.width,
        // Dla mobile:
        ...(isMobile() && {
          os: getOS(),
          osv: getOSVersion(),
          make: getDeviceMake(),
          model: getDeviceModel(),
          connectiontype: getConnectionType()
        })
      },
    };
    // Video-specific impression object
    const videoParams = bid.mediaTypes.video;
    baseRequest.imp = [{
      bidfloorcur: 'USD',
      id: bid.bidId,
      video: {
        w: videoParams.playerSize[0][0], // Width
        h: videoParams.playerSize[0][1], // Height
        mimes: videoParams.mimes || ['video/mp4', 'video/webm'],
        protocols: videoParams.protocols || [2, 3, 5, 6, 7, 8], // VAST protocols
        placement: 2, // Outstream
        startdelay: videoParams.startdelay || 0,
        skip: videoParams.skip || 0,
        api: videoParams.api || [2], // VPAID 2.0
        // Add other video params: minduration, maxduration, etc.
      },
      ext: {
        bidder: bid.params // Pass custom adquery params
      }
    }];

    return baseRequest;
  }

  return {
    v: '$prebid.version$',
    placementCode: bid.params.placementId,
    auctionId: null,
    type: bid.params.type,
    adUnitCode: bid.adUnitCode,
    bidQid: userId,
    bidId: bid.bidId,
    bidder: bid.bidder,
    bidPageUrl: pageUrl,
    bidderRequestId: bid.bidderRequestId,
    bidRequestsCount: bid.bidRequestsCount,
    bidderRequestsCount: bid.bidderRequestsCount,
    sizes: parseSizesInput(bid.mediaTypes.banner.sizes).toString(),
  };
}

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent);
}

function getOS() {
  const ua = navigator.userAgent;
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'Mac OS X';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

function getOSVersion() {
  const match = navigator.userAgent.match(/(Android|iPhone OS)[\s/]?([\d._]+)/i);
  logMessage('getOSVersion', match)
  return match ? match[2].replace(/_/g, '.') : undefined;
}

function getDeviceMake() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'Apple';
  if (/iPad/.test(ua)) return 'Apple';
  if (/Samsung/.test(ua)) return 'Samsung';
  if (/Huawei/.test(ua)) return 'Huawei';
  return undefined;
}

function getDeviceModel() {
  const ua = navigator.userAgent;
  const match = ua.match(/\(([^;]+);[\s/]?([^)]+)\)/);
  logMessage('getDeviceModel', match)
  return match ? match[2] : undefined;
}

function getConnectionType() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return undefined;
  const type = conn.effectiveType || conn.type;
  const map = { '4g': 5, '3g': 4, '2g': 3, 'slow-2g': 2 };
  return map[type] || undefined;
}

registerBidder(spec);
