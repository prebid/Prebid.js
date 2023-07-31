import {
  isArray,
  _each,
  createTrackPixelHtml,
  deepAccess,
  isStr,
  getBidIdParameter,
  triggerPixel,
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { config } from '../src/config.js';
import * as events from '../src/events.js';
import { BANNER } from '../src/mediaTypes.js';
import CONSTANTS from '../src/constants.json';

const BIDDER_CODE = 'setupad';
const ENDPOINT = 'https://prebid.setupad.io/openrtb2/auction';
const SYNC_ENDPOINT = 'https://prebid.setupad.io/cookie_sync?';
const REPORT_ENDPOINT =
  'https://adapter-analytics.azurewebsites.net/api/adapter-analytics';
const GVLID = 1060;
const TIME_TO_LIVE = 360;
let seat = null;

const sendingDataStatistic = initSendingDataStatistic();
events.on(CONSTANTS.EVENTS.AUCTION_INIT, () => {
  sendingDataStatistic.initEvents();
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  gvlid: GVLID,

  isBidRequestValid: function (bid) {
    return !!(bid.params.placement_id && isStr(bid.params.placement_id));
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const requests = [];
    window.nmmRefreshCounts = window.nmmRefreshCounts || {};
    _each(validBidRequests, function (bid) {
      window.nmmRefreshCounts[bid.adUnitCode] =
        window.nmmRefreshCounts[bid.adUnitCode] || 0;
      const id = getBidIdParameter('placement_id', bid.params);
      const accountId = getBidIdParameter('account_id', bid.params);
      const auctionId = bid.auctionId;
      const bidId = bid.bidId;
      let sizes = bid.sizes;
      if (sizes && !Array.isArray(sizes[0])) sizes = [sizes];

      const site = getSiteObj();
      const device = getDeviceObj();

      const payload = {
        id: bid?.bidderRequestId,
        ext: {
          prebid: {
            storedrequest: {
              id: accountId || 'default',
            },
          },

          setupad: {
            refresh_count: window.nmmRefreshCounts[bid.adUnitCode]++,
            elOffsets: getBoundingClient(bid),
            scrollTop: window.pageYOffset || document.documentElement.scrollTop,
          },
        },

        device,
        site,
        imp: [],
        test: 1,
      };

      const imp = {
        id: bid.adUnitCode,
        ext: {
          prebid: {
            storedrequest: { id },
          },
        },
      };

      if (deepAccess(bid, 'mediaTypes.banner')) {
        imp.banner = {
          format: (sizes || []).map((s) => {
            return { w: s[0], h: s[1] };
          }),
        };
      }

      payload.imp.push(imp);

      const gdprConsent = bidderRequest && bidderRequest.gdprConsent;
      const uspConsent = bidderRequest && bidderRequest.uspConsent;

      if (gdprConsent || uspConsent) {
        payload.regs = { ext: {} };

        if (uspConsent) payload.regs.ext.us_privacy = uspConsent;

        if (gdprConsent) {
          if (typeof gdprConsent.gdprApplies !== 'undefined') {
            payload.regs.ext.gdpr = gdprConsent.gdprApplies ? 1 : 0;
          }

          if (typeof gdprConsent.consentString !== 'undefined') {
            payload.user = {
              ext: { consent: gdprConsent.consentString },
            };
          }
        }
      }
      const params = bid.params;

      requests.push({
        method: 'POST',
        url: ENDPOINT,
        data: JSON.stringify(payload),
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

  interpretResponse: function (serverResponse, bidRequest) {
    const serverBody = serverResponse.body;
    const bidResponses = [];
    seat = serverBody.seatbid[0].seat;

    _each(serverBody.seatbid, (res) => {
      _each(res.bid, (bid) => {
        const requestId = bidRequest.bidId;
        const params = bidRequest.params;
        const { ad, adUrl } = getAd(bid);

        const bidResponse = {
          requestId,
          params,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          creativeId: bid.id,
          currency: serverBody.cur,
          netRevenue: true,
          ttl: TIME_TO_LIVE,
          meta: {
            advertiserDomains: bid.adomain || [],
          },
        };

        bidResponse.ad = ad;
        bidResponse.adUrl = adUrl;
        bidResponses.push(bidResponse);
      });
    });

    return bidResponses;
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    const syncs = [];
    if (isArray(responses)) {
      responses.forEach((response) => {
        if (syncOptions.pixelEnabled) {
          deepAccess(response, 'body.ext.sync.image', []).forEach((imgUrl) => {
            syncs.push({
              type: 'image',
              url: replaceUsersyncMacros(imgUrl, gdprConsent, uspConsent),
            });
          });
        }

        if (syncOptions.iframeEnabled) {
          deepAccess(response, 'body.ext.sync.iframe', []).forEach(
            (iframeUrl) => {
              syncs.push({
                type: 'iframe',
                url: replaceUsersyncMacros(iframeUrl, gdprConsent, uspConsent),
              });
            }
          );
        }
      });
    }

    if (!syncs.length) {
      let syncUrl = SYNC_ENDPOINT;
      if (gdprConsent && gdprConsent.gdprApplies) {
        syncUrl += 'gdpr=1&gdpr_consent=' + gdprConsent.consentString + '&';
      }
      if (uspConsent) syncUrl += 'us_privacy=' + uspConsent + '&';
      if (syncOptions.iframeEnabled) {
        syncs.push({ type: 'iframe', url: syncUrl + 'type=iframe' });
      }
      if (syncOptions.pixelEnabled) {
        syncs.push({ type: 'image', url: syncUrl + 'type=image' });
      }
    }
    return syncs;
  },

  getPixelUrl: function (eventName, bid, timestamp) {
    const bidder = bid.bidder || bid.bidderCode;
    const auctionId = bid.auctionId;
    if (bidder != BIDDER_CODE) return;

    let params;
    if (bid.params) {
      params = Array.isArray(bid.params) ? bid.params : [bid.params];
    } else {
      if (Array.isArray(bid.bids)) {
        params = bid.bids.map((singleBid) => singleBid.params);
      }
    }

    if (!params.length) return;

    const placementIdsArray = [];
    params.forEach((param) => {
      if (!param.placement_id) return;
      placementIdsArray.push(param.placement_id);
    });

    const placementIds =
      (placementIdsArray.length && placementIdsArray.join(';')) || '';

    if (!placementIds) return;

    let extraBidParams = '';
    // additional params on bidWon
    if (eventName === 'bidWon' || eventName === 'bidResponse') {
      extraBidParams = `&cpm=${bid.originalCpm}&currency=${bid.originalCurrency}`;
    }

    const url = `${REPORT_ENDPOINT}?event=${eventName}&bidder=${
      seat || bidder
    }&placementIds=${placementIds}&auctionId=${auctionId}${extraBidParams}&timestamp=${timestamp}`;

    return url;
  },
};

function replaceUsersyncMacros(url, gdprConsent, uspConsent) {
  const { consentString, gdprApplies } = gdprConsent || {};

  if (gdprApplies) {
    const gdpr = Number(gdprApplies);
    url = url.replace('{{.GDPR}}', gdpr);

    if (gdpr == 1 && consentString && consentString.length > 0) {
      url = url.replace('{{.GDPRConsent}}', consentString);
    }
  } else {
    url = url.replace('{{.GDPR}}', 0);
    url = url.replace('{{.GDPRConsent}}', '');
  }

  if (uspConsent) {
    url = url.replace('{{.USPrivacy}}', uspConsent);
  }

  return url;
}

function getAdEl(bid) {
  // best way I could think of to get El, is by matching adUnitCode to google slots...
  const slot =
    window.googletag &&
    window.googletag.pubads &&
    window.googletag
      .pubads()
      .getSlots()
      .find((slot) => slot.getAdUnitPath() === bid.adUnitCode);
  const slotElementId = slot && slot.getSlotElementId();
  if (!slotElementId) return null;
  return document.querySelector('#' + slotElementId);
}

function getBoundingClient(bid) {
  const el = getAdEl(bid);
  if (!el) return {};
  return el.getBoundingClientRect();
}

function getAd(bid) {
  let ad, adUrl, vastXml, vastUrl;

  switch (deepAccess(bid, 'ext.prebid.type')) {
    default:
      if (bid.adm && bid.nurl) {
        ad = bid.adm;
        ad += createTrackPixelHtml(decodeURIComponent(bid.nurl));
      } else if (bid.adm) {
        ad = bid.adm;
      } else if (bid.nurl) {
        adUrl = bid.nurl;
      }
  }

  return { ad, adUrl, vastXml, vastUrl };
}

function getSiteObj() {
  const refInfo = (getRefererInfo && getRefererInfo()) || {};

  return {
    page: refInfo.page,
    ref: refInfo.ref,
    domain: refInfo.domain,
  };
}

function getDeviceObj() {
  return {
    w:
      window.innerWidth ||
      window.document.documentElement.clientWidth ||
      window.document.body.clientWidth ||
      0,
    h:
      window.innerHeight ||
      window.document.documentElement.clientHeight ||
      window.document.body.clientHeight ||
      0,
  };
}

function initSendingDataStatistic() {
  class SendingDataStatistic {
    eventNames = [
      CONSTANTS.EVENTS.BID_TIMEOUT,
      CONSTANTS.EVENTS.BID_RESPONSE,
      CONSTANTS.EVENTS.BID_REQUESTED,
      CONSTANTS.EVENTS.NO_BID,
      CONSTANTS.EVENTS.BID_WON,
    ];

    disabledSending = false;
    enabledSending = false;
    eventHendlers = {};

    initEvents() {
      this.disabledSending =
        !!config.getBidderConfig()?.setupad?.disabledSendingStatisticData;
      if (this.disabledSending) {
        this.removeEvents();
      } else {
        this.createEvents();
      }
    }

    createEvents() {
      if (this.enabledSending) return;

      this.enabledSending = true;
      for (let eventName of this.eventNames) {
        if (!this.eventHendlers[eventName]) {
          this.eventHendlers[eventName] = this.eventHandler(eventName);
        }

        events.on(eventName, this.eventHendlers[eventName]);
      }
    }

    removeEvents() {
      if (!this.enabledSending) return;

      this.enabledSending = false;
      for (let eventName of this.eventNames) {
        if (!this.eventHendlers[eventName]) continue;

        events.off(eventName, this.eventHendlers[eventName]);
      }
    }

    eventHandler(eventName) {
      const eventHandlerFunc = this.getEventHandler(eventName);
      if (eventName == CONSTANTS.EVENTS.BID_TIMEOUT) {
        return (bids) => {
          if (this.disabledSending || !Array.isArray(bids)) return;

          for (let bid of bids) {
            eventHandlerFunc(bid);
          }
        };
      }

      return eventHandlerFunc;
    }

    getEventHandler(eventName) {
      return (bid) => {
        if (this.disabledSending) return;

        const url = spec.getPixelUrl(eventName, bid, Date.now());
        if (!url) return;
        triggerPixel(url);
      };
    }
  }

  return new SendingDataStatistic();
}

registerBidder(spec);
