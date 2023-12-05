import {
  _each,
  createTrackPixelHtml,
  deepAccess,
  deepSetValue,
  getBidIdParameter,
  getDefinedParams,
  getWindowTop,
  isArray,
  isStr,
  logMessage,
  parseGPTSingleSizeArrayToRtbSize,
  parseUrl,
  triggerPixel,
} from '../src/utils.js';

import CONSTANTS from '../src/constants.json';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import * as events from '../src/events.js';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getRefererInfo} from '../src/refererDetection.js';

const NM_VERSION = '3.0.0';
const GVLID = 1060;
const BIDDER_CODE = 'nextMillennium';
const ENDPOINT = 'https://pbs.nextmillmedia.com/openrtb2/auction';
const TEST_ENDPOINT = 'https://test.pbs.nextmillmedia.com/openrtb2/auction';
const SYNC_ENDPOINT = 'https://cookies.nextmillmedia.com/sync?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&us_privacy={{.USPrivacy}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}&type={{.TYPE_PIXEL}}';
const REPORT_ENDPOINT = 'https://report2.hb.brainlyads.com/statistics/metric';
const TIME_TO_LIVE = 360;

const VIDEO_PARAMS = [
  'api',
  'linearity',
  'maxduration',
  'mimes',
  'minduration',
  'placement',
  'playbackmethod',
  'protocols',
  'startdelay',
];

const ALLOWED_ORTB2_PARAMETERS = [
  'site.pagecat',
  'site.content.cat',
  'site.content.language',
];

const sendingDataStatistic = initSendingDataStatistic();
events.on(CONSTANTS.EVENTS.AUCTION_INIT, auctionInitHandler);

const EXPIRENCE_WURL = 20 * 60000;
const wurlMap = {};
cleanWurl();

events.on(CONSTANTS.EVENTS.BID_WON, bidWonHandler);

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  gvlid: GVLID,

  isBidRequestValid: function(bid) {
    return !!(
      (bid.params.placement_id && isStr(bid.params.placement_id)) || (bid.params.group_id && isStr(bid.params.group_id))
    );
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const requests = [];
    window.nmmRefreshCounts = window.nmmRefreshCounts || {};

    _each(validBidRequests, function(bid) {
      window.nmmRefreshCounts[bid.adUnitCode] = window.nmmRefreshCounts[bid.adUnitCode] || 0;
      const id = getPlacementId(bid);
      const auctionId = bid.auctionId;
      const bidId = bid.bidId;

      const site = getSiteObj();
      const device = getDeviceObj();

      const postBody = {
        id: bidderRequest?.bidderRequestId,
        ext: {
          prebid: {
            storedrequest: {
              id,
            },
          },

          nextMillennium: {
            nm_version: NM_VERSION,
            refresh_count: window.nmmRefreshCounts[bid.adUnitCode]++,
            elOffsets: getBoundingClient(bid),
            scrollTop: window.pageYOffset || document.documentElement.scrollTop,
          },
        },

        device,
        site,
        imp: [],
      };

      postBody.imp.push(getImp(bid, id));
      setConsentStrings(postBody, bidderRequest);
      setOrtb2Parameters(postBody, bidderRequest?.ortb2);

      const urlParameters = parseUrl(getWindowTop().location.href).search;
      const isTest = urlParameters['pbs'] && urlParameters['pbs'] === 'test';
      const params = bid.params;

      requests.push({
        method: 'POST',
        url: isTest ? TEST_ENDPOINT : ENDPOINT,
        data: JSON.stringify(postBody),
        options: {
          contentType: 'text/plain',
          withCredentials: true,
        },

        bidId,
        params,
        auctionId,
      });
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    const response = serverResponse.body;
    const bidResponses = [];

    _each(response.seatbid, (resp) => {
      _each(resp.bid, (bid) => {
        const requestId = bidRequest.bidId;
        const params = bidRequest.params;
        const auctionId = bidRequest.auctionId;
        const wurl = deepAccess(bid, 'ext.prebid.events.win');

        // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
        addWurl({auctionId, requestId, wurl});

        const {ad, adUrl, vastUrl, vastXml} = getAd(bid);

        const bidResponse = {
          requestId,
          params,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          creativeId: bid.adid,
          currency: response.cur,
          netRevenue: true,
          ttl: TIME_TO_LIVE,
          meta: {
            advertiserDomains: bid.adomain || [],
          },
        };

        if (vastUrl || vastXml) {
          bidResponse.mediaType = VIDEO;

          if (vastUrl) bidResponse.vastUrl = vastUrl;
          if (vastXml) bidResponse.vastXml = vastXml;
        } else {
          bidResponse.ad = ad;
          bidResponse.adUrl = adUrl;
        };

        bidResponses.push(bidResponse);
      });
    });

    return bidResponses;
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent, gppConsent) {
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) return [];

    const pixels = [];
    const getSetPixelFunc = type => url => { pixels.push({type, url: replaceUsersyncMacros(url, gdprConsent, uspConsent, gppConsent, type)}) };
    const getSetPixelsFunc = type => response => { deepAccess(response, `body.ext.sync.${type}`, []).forEach(getSetPixelFunc(type)) };

    const setPixel = (type, url) => { (getSetPixelFunc(type))(url) };
    const setPixelImages = getSetPixelsFunc('image');
    const setPixelIframes = getSetPixelsFunc('iframe');

    if (isArray(responses)) {
      responses.forEach(response => {
        if (syncOptions.pixelEnabled) setPixelImages(response);
        if (syncOptions.iframeEnabled) setPixelIframes(response);
      })
    }

    if (!pixels.length) {
      if (syncOptions.pixelEnabled) setPixel('image', SYNC_ENDPOINT);
      if (syncOptions.iframeEnabled) setPixel('iframe', SYNC_ENDPOINT);
    }

    return pixels;
  },

  getUrlPixelMetric(eventName, bid) {
    const bidder = bid.bidder || bid.bidderCode;
    if (bidder != BIDDER_CODE) return;

    let params;
    if (bid.params) {
      params = Array.isArray(bid.params) ? bid.params : [bid.params];
    } else {
      if (Array.isArray(bid.bids)) params = bid.bids.map(bidI => bidI.params);
    };

    if (!params.length) return;

    const placementIdsArray = [];
    const groupIdsArray = [];
    params.forEach(paramsI => {
      if (paramsI.group_id) {
        groupIdsArray.push(paramsI.group_id);
      } else {
        if (paramsI.placement_id) placementIdsArray.push(paramsI.placement_id);
      };
    });

    const placementIds = (placementIdsArray.length && `&placements=${placementIdsArray.join(';')}`) || '';
    const groupIds = (groupIdsArray.length && `&groups=${groupIdsArray.join(';')}`) || '';

    if (!(groupIds || placementIds)) {
      return;
    };

    const url = `${REPORT_ENDPOINT}?event=${eventName}&bidder=${bidder}&source=pbjs${groupIds}${placementIds}`;

    return url;
  },
};

export function getImp(bid, id) {
  const imp = {
    id: bid.adUnitCode,
    ext: {
      prebid: {
        storedrequest: {
          id,
        },
      },
    },
  };

  const banner = deepAccess(bid, 'mediaTypes.banner');
  if (banner) {
    imp.banner = {
      format: (banner?.sizes || []).map(s => { return {w: s[0], h: s[1]} }),
    };
  };

  const video = deepAccess(bid, 'mediaTypes.video');
  if (video) {
    imp.video = getDefinedParams(video, VIDEO_PARAMS);
    if (video.playerSize) {
      imp.video = Object.assign(imp.video, parseGPTSingleSizeArrayToRtbSize(video.playerSize) || {});
    } else if (video.w && video.h) {
      imp.video.w = video.w;
      imp.video.h = video.h;
    };
  };

  return imp;
};

export function setConsentStrings(postBody = {}, bidderRequest) {
  const gdprConsent = bidderRequest?.gdprConsent;
  const uspConsent = bidderRequest?.uspConsent;
  let gppConsent = bidderRequest?.gppConsent?.gppString && bidderRequest?.gppConsent;
  if (!gppConsent && bidderRequest?.ortb2?.regs?.gpp) gppConsent = bidderRequest?.ortb2?.regs;

  if (gdprConsent || uspConsent || gppConsent) {
    postBody.regs = { ext: {} };

    if (uspConsent) {
      postBody.regs.ext.us_privacy = uspConsent;
    };

    if (gppConsent) {
      postBody.regs.gpp = gppConsent?.gppString || gppConsent?.gpp;
      postBody.regs.gpp_sid = bidderRequest.gppConsent?.applicableSections || gppConsent?.gpp_sid;
    };

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies !== 'undefined') {
        postBody.regs.ext.gdpr = gdprConsent.gdprApplies ? 1 : 0;
      };

      if (typeof gdprConsent.consentString !== 'undefined') {
        postBody.user = {
          ext: { consent: gdprConsent.consentString },
        };
      };
    };
  };
};

export function setOrtb2Parameters(postBody, ortb2 = {}) {
  for (let parameter of ALLOWED_ORTB2_PARAMETERS) {
    const value = deepAccess(ortb2, parameter);
    if (value) deepSetValue(postBody, parameter, value);
  }
}

export function replaceUsersyncMacros(url, gdprConsent = {}, uspConsent = '', gppConsent = {}, type = '') {
  const { consentString = '', gdprApplies = false } = gdprConsent;
  const gdpr = Number(gdprApplies);
  url = url
    .replace('{{.GDPR}}', gdpr)
    .replace('{{.GDPRConsent}}', consentString)
    .replace('{{.USPrivacy}}', uspConsent)
    .replace('{{.GPP}}', gppConsent.gppString || '')
    .replace('{{.GPPSID}}', (gppConsent.applicableSections || []).join(','))
    .replace('{{.TYPE_PIXEL}}', type);

  return url;
};

function getAdEl(bid) {
  // best way I could think of to get El, is by matching adUnitCode to google slots...
  const slot = window.googletag && window.googletag.pubads && window.googletag.pubads().getSlots().find(slot => slot.getAdUnitPath() === bid.adUnitCode);
  const slotElementId = slot && slot.getSlotElementId();
  if (!slotElementId) return null;
  return document.querySelector('#' + slotElementId);
}

function getBoundingClient(bid) {
  const el = getAdEl(bid);
  if (!el) return {};
  return el.getBoundingClientRect();
}

function getPlacementId(bid) {
  const groupId = getBidIdParameter('group_id', bid.params);
  const placementId = getBidIdParameter('placement_id', bid.params);
  if (!groupId) return placementId;

  let windowTop = getTopWindow(window);
  let sizes = [];
  if (bid.mediaTypes) {
    if (bid.mediaTypes.banner) sizes = bid.mediaTypes.banner.sizes;
    if (bid.mediaTypes.video) sizes = [bid.mediaTypes.video.playerSize];
  };

  const host = (windowTop && windowTop.location && windowTop.location.host) || '';
  return `g${groupId};${sizes.map(size => size.join('x')).join('|')};${host}`;
}

function getTopWindow(curWindow, nesting = 0) {
  if (nesting > 10) {
    return curWindow;
  };

  try {
    if (curWindow.parent.document) {
      return getTopWindow(curWindow.parent.window, ++nesting);
    };
  } catch (err) {
    return curWindow;
  };
}

function getAd(bid) {
  let ad, adUrl, vastXml, vastUrl;

  switch (deepAccess(bid, 'ext.prebid.type')) {
    case VIDEO:
      if (bid.adm.substr(0, 4) === 'http') {
        vastUrl = bid.adm;
      } else {
        vastXml = bid.adm;
      };

      break;
    default:
      if (bid.adm && bid.nurl) {
        ad = bid.adm;
        ad += createTrackPixelHtml(decodeURIComponent(bid.nurl));
      } else if (bid.adm) {
        ad = bid.adm;
      } else if (bid.nurl) {
        adUrl = bid.nurl;
      };
  }

  return {ad, adUrl, vastXml, vastUrl};
}

function getSiteObj() {
  const refInfo = (getRefererInfo && getRefererInfo()) || {};

  return {
    page: refInfo.page,
    ref: refInfo.ref,
    domain: refInfo.domain
  };
}

function getDeviceObj() {
  return {
    w: window.innerWidth || window.document.documentElement.clientWidth || window.document.body.clientWidth || 0,
    h: window.innerHeight || window.document.documentElement.clientHeight || window.document.body.clientHeight || 0,
  };
}

function getKeyWurl({auctionId, requestId}) {
  return `${auctionId}-${requestId}`;
}

function addWurl({wurl, requestId, auctionId}) {
  if (!wurl) return;

  const expirence = Date.now() + EXPIRENCE_WURL;
  const key = getKeyWurl({auctionId, requestId});
  wurlMap[key] = {wurl, expirence};
}

function removeWurl({auctionId, requestId}) {
  const key = getKeyWurl({auctionId, requestId});
  delete wurlMap[key];
}

function getWurl({auctionId, requestId}) {
  const key = getKeyWurl({auctionId, requestId});
  return wurlMap[key] && wurlMap[key].wurl;
}

function bidWonHandler(bid) {
  const {auctionId, requestId} = bid;
  const wurl = getWurl({auctionId, requestId});
  if (wurl) {
    logMessage(`(nextmillennium) Invoking image pixel for wurl on BID_WIN: "${wurl}"`);
    triggerPixel(wurl);
    removeWurl({auctionId, requestId});
  };
}

function auctionInitHandler() {
  sendingDataStatistic.initEvents();
}

function cleanWurl() {
  const dateNow = Date.now();
  Object.keys(wurlMap).forEach(key => {
    if (dateNow >= wurlMap[key].expirence) {
      delete wurlMap[key];
    };
  });

  setTimeout(cleanWurl, 60000);
}

function initSendingDataStatistic() {
  class SendingDataStatistic {
    eventNames = [
      CONSTANTS.EVENTS.BID_TIMEOUT,
      CONSTANTS.EVENTS.BID_RESPONSE,
      CONSTANTS.EVENTS.BID_REQUESTED,
      CONSTANTS.EVENTS.NO_BID,
    ];

    disabledSending = false;
    enabledSending = false;
    eventHendlers = {};

    initEvents() {
      this.disabledSending = !!config.getBidderConfig()?.nextMillennium?.disabledSendingStatisticData;
      if (this.disabledSending) {
        this.removeEvents();
      } else {
        this.createEvents();
      };
    }

    createEvents() {
      if (this.enabledSending) return;

      this.enabledSending = true;
      for (let eventName of this.eventNames) {
        if (!this.eventHendlers[eventName]) {
          this.eventHendlers[eventName] = this.eventHandler(eventName);
        };

        events.on(eventName, this.eventHendlers[eventName]);
      };
    }

    removeEvents() {
      if (!this.enabledSending) return;

      this.enabledSending = false;
      for (let eventName of this.eventNames) {
        if (!this.eventHendlers[eventName]) continue;

        events.off(eventName, this.eventHendlers[eventName]);
      };
    }

    eventHandler(eventName) {
      const eventHandlerFunc = this.getEventHandler(eventName);
      if (eventName == CONSTANTS.EVENTS.BID_TIMEOUT) {
        return bids => {
          if (this.disabledSending || !Array.isArray(bids)) return;

          for (let bid of bids) {
            eventHandlerFunc(bid);
          };
        }
      };

      return eventHandlerFunc;
    }

    getEventHandler(eventName) {
      return bid => {
        if (this.disabledSending) return;

        const url = spec.getUrlPixelMetric(eventName, bid);
        if (!url) return;
        triggerPixel(url);
      };
    }
  };

  return new SendingDataStatistic();
}

registerBidder(spec);
