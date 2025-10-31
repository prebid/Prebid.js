import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { pbsExtensions } from '../libraries/pbsExtensions/pbsExtensions.js';
import { percentInView } from '../libraries/percentInView/percentInView.js';
import {
  mergeDeep,
  deepAccess,
  deepSetValue,
  logInfo,
  logWarn,
  insertUserSyncIframe,
  logError,
  isStr,
  generateUUID,
} from '../src/utils.js';

export const SID = window.excoPid || generateUUID();
export const ENDPOINT = 'https://v.ex.co/se/openrtb/hb/pbjs';
const SYNC_URL = 'https://cdn.ex.co/sync/e15e216-l/cookie_sync.html';

export const BIDDER_CODE = 'exco';
const VERSION = '0.0.3';
const CURRENCY = 'USD';

const SYNC = {
  done: false,
};

const EVENTS = {
  TYPE: 'exco-adapter',
  PING: 'exco-adapter-ping',
  PONG: 'exco-adapter-pong',
  subscribed: false,
};

export class AdapterHelpers {
  doSync(gdprConsent = { consentString: '', gdprApplies: false }, accountId) {
    insertUserSyncIframe(
      this.createSyncUrl(gdprConsent, accountId)
    );
  }

  createSyncUrl({ consentString, gppString, applicableSections, gdprApplies }, network) {
    try {
      const url = new URL(SYNC_URL);
      const networks = [ '368531133' ];

      if (network) {
        networks.push(network);
      }

      url.searchParams.set('pbv', '$prebid.version$');
      url.searchParams.set('network', networks.join(','));
      url.searchParams.set('gdpr', encodeURIComponent((Number(gdprApplies) || 0).toString()));
      url.searchParams.set('gdpr_consent', encodeURIComponent(consentString || ''));

      if (gppString && applicableSections?.length) {
        url.searchParams.set('gpp', encodeURIComponent(gppString));
        url.searchParams.set('gpp_sid', encodeURIComponent(applicableSections.join(',')));
      }

      return url.toString();
    } catch (error) { /* Do nothing */ }

    return null;
  }

  addOrtbFirstPartyData(data, bidRequests) {
    const params = bidRequests[0].params || {};
    const key = data.app ? 'app' : 'site';

    if (data[key] && data[key].publisher && params.publisherId) {
      mergeDeep(data[key].publisher, {
        id: bidRequests[0].params.publisherId
      });
    }
  }

  getExtData(bidRequests, bidderRequest) {
    return {
      version: VERSION,
      pbversion: '$prebid.version$',
      sid: SID,
      aid: bidRequests[0]?.auctionId || bidderRequest.bidderRequestId,
      rc: bidRequests[0]?.bidRequestsCount,
      brc: bidRequests[0]?.bidderRequestsCount,
    }
  }

  createRequest(converter, bidRequests, bidderRequest, mediaType) {
    const data = converter.toORTB({ bidRequests, bidderRequest, context: { mediaType } });

    data.ext[BIDDER_CODE] = this.getExtData(bidRequests, bidderRequest);

    return { method: 'POST', url: ENDPOINT, data };
  }

  isVideoBid(bid) {
    return deepAccess(bid, 'mediaTypes.video');
  }

  isBannerBid(bid) {
    return deepAccess(bid, 'mediaTypes.banner') || !this.isVideoBid(bid);
  }

  adoptVideoImp(imp, bidRequest) {
    imp.id = bidRequest.adUnitCode;

    if (bidRequest.params) {
      imp.tagId = bidRequest.params.tagId;
    }
  }

  adoptBannerImp(imp, bidRequest) {
    if (bidRequest.params) {
      imp.tagId = bidRequest.params.tagId;
    }
  }

  adoptBidResponse(bidResponse, bid, context) {
    bidResponse.bidderCode = BIDDER_CODE;

    if (!bid.vastXml && bid.mediaType === VIDEO) {
      bidResponse.vastXml = bidResponse.ad || bid.adm;
    }

    bidResponse.adUrl = bid.adUrl;
    bidResponse.nurl = bid.nurl;

    bidResponse.mediaType = bid.mediaType || VIDEO;
    bidResponse.meta.mediaType = bid.mediaType || VIDEO;
    bidResponse.meta.advertiserDomains = bidResponse.meta.advertiserDomains || [];

    bidResponse.creativeId = bidResponse.creativeId || `creative-${Date.now()}`;
    bidResponse.netRevenue = bid.netRevenue || true;
    bidResponse.currency = CURRENCY;

    bidResponse.cpm = bid.cpm;

    const { bidRequest } = context;

    bidResponse.width = bid.w || deepAccess(bidRequest, 'mediaTypes.video.w') || deepAccess(bidRequest, 'params.video.playerWidth');
    bidResponse.height = bid.h || deepAccess(bidRequest, 'mediaTypes.video.h') || deepAccess(bidRequest, 'params.video.playerHeight');

    if (deepAccess(bid, 'ext.bidder.rp.advid')) {
      deepSetValue(bidResponse, 'meta.advertiserId', bid.ext.bidder.rp.advid);
    }

    return bidResponse;
  }

  replaceMacro(str) {
    return str.replace('[TIMESTAMP]', Date.now());
  }

  postToAllParentFrames = (message) => {
    window.parent.postMessage(message, '*');

    for (let i = 0; i < window.parent.frames.length; i++) {
      window.parent.frames[i].postMessage(message, '*');
    }
  }

  sendMessage(eventName, data = {}) {
    this.postToAllParentFrames({
      type: EVENTS.TYPE,
      eventName,
      metadata: data
    });
  }

  listenForMessages() {
    window.addEventListener('message', ({ data }) => {
      if (data && data.type === EVENTS.TYPE && data.eventName === EVENTS.PING) {
        const { href, sid } = data.metadata;

        if (href) {
          const frame = document.querySelector(`iframe[src*="${href}"]`);

          if (frame) {
            const viewPercent = percentInView(frame);
            this.sendMessage(EVENTS.PONG, { viewPercent, sid });
          }
        }
      }
    });
  }

  getEventUrl(data, eventName) {
    const bid = data[0];
    const params = {
      adapterVersion: VERSION,
      prebidVersion: '$prebid.version$',
      pageLoadUid: SID,
      eventName,
      extraData: {
        timepassed: bid.metrics.timeSince('requestBids'),
      }
    };

    if (bid) {
      params.adUnitCode = bid.adUnitCode;
      params.auctionId = bid.auctionId;
      params.bidId = bid.bidId;
      params.bidderRequestId = bid.bidderRequestId;
      params.bidderRequestsCount = bid.bidderRequestsCount;
      params.bidderWinsCount = bid.bidderWinsCount;
      params.maxBidderCalls = bid.maxBidderCalls;
      params.transactionId = bid.transactionId;

      if (bid.params && bid.params[0]) {
        params.publisherId = bid.params[0].publisherId;
        params.accountId = bid.params[0].accountId;
        params.tagId = bid.params[0].tagId;
      }

      if (bid.ortb2.device) {
        params.width = bid.ortb2.device.w;
        params.height = bid.ortb2.device.h;
      }

      if (bid.ortb2.site) {
        params.domain = bid.ortb2.site.domain;
        params.parentUrl = bid.ortb2.site.page;
        params.parentReferrer = bid.ortb2.site.referrer;
      }

      if (bid.ortb2.app) {
        params.environment = 'app';
      }
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'object' && Array.isArray(value) === false) {
        Object.entries(value).forEach(([k, v]) => {
          searchParams.append(`${key}.${k}`, v);
        });
      } else if (value !== undefined) {
        searchParams.append(key, value);
      }
    });

    return `https://v.ex.co/event?${searchParams}`;
  }

  triggerUrl(url) {
    fetch(url, { keepalive: true });
  }

  log(severity, message) {
    const msg = `${BIDDER_CODE.toUpperCase()}: ${message}`;

    if (severity === 'warn') {
      logWarn(msg);
    }
    if (severity === 'error') {
      logError(msg);
    }
    if (severity === 'info') {
      logInfo(msg);
    }
  }

  isDebugEnabled(url = '') {
    return config.getConfig('debug') || url.includes('exco_debug=true');
  }
}

const helpers = new AdapterHelpers();

/**
 * @description https://github.com/prebid/Prebid.js/blob/master/libraries/ortbConverter/README.md
 */
export const converter = ortbConverter({
  request(buildRequest, imps, bidderRequest, context) {
    const data = buildRequest(imps, bidderRequest, context);

    if (data.cur && !data.cur.includes('USD')) {
      helpers.log('warn', 'Warning - EX.CO adapter is supporting USD only. processing with USD');
    }

    data.cur = [CURRENCY];
    data.test = helpers.isDebugEnabled(window.location.href) ? 1 : 0;

    helpers.addOrtbFirstPartyData(data, context.bidRequests || []);

    return data;
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    imp.secure = window.location.protocol === 'http:' ? 0 : 1;

    if (imp.video) {
      helpers.adoptVideoImp(imp, bidRequest)
    }

    if (imp.banner) {
      helpers.adoptBannerImp(imp, bidRequest);
    }

    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    return helpers.adoptBidResponse(bidResponse, bid, context);
  },
  context: {
    ttl: 3000,
  },
  processors: pbsExtensions
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {import('../src/auction.js').BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    const props = ['accountId', 'publisherId', 'tagId'];
    const missing = props.filter(prop => !bid.params[prop]);
    const nonStr = props.filter(prop => !isStr(bid.params[prop]));
    const existingLegacy = ['cId', 'pId'].filter(prop => bid.params[prop]);
    const message = `Bid will not be sent for ad unit '${bid.adUnitCode}'`;
    const suggestion = 'wrap it in quotes in your config';

    if (existingLegacy.length) {
      existingLegacy.forEach(prop => {
        helpers.log('warn', `Warn: '${prop}' was deprecated.`);
      });
    }

    if (missing.length) {
      missing.forEach(prop => {
        helpers.log('warn', `Error: '${prop}' is missing. ${message}`);
      });

      return false;
    }

    if (nonStr.length) {
      nonStr.forEach(prop => {
        helpers.log('warn', `Error: '${prop}' must be a string (${suggestion}). ${message}`);
      });

      return false;
    }

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {import('../src/auction.js').Bid[]} bids - an array of bids
   * @param {import('../src/auction.js').BidderRequest} bidderRequest - bidder request object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bids, bidderRequest) {
    const videoBids = bids.filter(bid => helpers.isVideoBid(bid));
    const bannerBids = bids.filter(bid => helpers.isBannerBid(bid));
    const requests = [];

    if (bannerBids.length) {
      requests.push(
        helpers.createRequest(converter, bannerBids, bidderRequest, BANNER)
      );
    }

    if (videoBids.length) {
      requests.push(
        helpers.createRequest(converter, videoBids, bidderRequest, VIDEO)
      );
    }

    return requests;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {object} response A successful response from the server.
   * @return {import('../src/auction.js').Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (response, request) {
    const body = response?.body?.Result || response?.body || {};
    const converted = converter.fromORTB({response: body, request: request?.data});
    const bids = converted.bids || [];

    if (bids.length && !EVENTS.subscribed) {
      EVENTS.subscribed = true;
      helpers.listenForMessages();
    }

    return bids;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {import('../src/adapters/bidderFactory.js').SyncOptions} syncOptions Which user syncs are allowed?
   * @param {object[]} serverResponses List of server's responses.
   * @return {import('../src/adapters/bidderFactory.js').UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent
  ) {
    const result = [];

    const collectSyncs = (syncs) => {
      if (syncs) {
        syncs.forEach(sync => {
          if (syncOptions.iframeEnabled && sync.type === 'iframe') {
            result.push({ type: sync.type, url: sync.url });
          } else if (syncOptions.pixelEnabled && ['image', 'pixel'].includes(sync.type)) {
            result.push({ type: 'image', url: sync.url });
          }
        });
      }
    }

    serverResponses.forEach(response => {
      const { body = {} } = response;
      const { ext } = body;

      if (ext && ext.syncs) {
        collectSyncs(ext.syncs);
      }

      if (ext && ext.usersync) {
        Object.keys(ext.usersync).forEach(key => {
          collectSyncs(ext.usersync[key].syncs);
        });
      }
    });

    if (syncOptions.iframeEnabled && !SYNC.done) {
      helpers.doSync(gdprConsent);
      SYNC.done = true;
    }

    return result;
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {Object} data - Contains timeout specific data
   */
  onTimeout: function (data) {
    const eventUrl = helpers.getEventUrl(data, 'mcd_bidder_auction_timeout');

    if (eventUrl) {
      helpers.triggerUrl(eventUrl);
    }
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {import('../src/auction.js').BidResponse} bid - The bid that won the auction
   */
  onBidWon: function (bid) {
    if (bid == null) {
      return;
    }

    if (bid.hasOwnProperty('nurl') && bid.nurl.length > 0) {
      const url = helpers.replaceMacro(bid.nurl)
        .replace('ad_auction_won', 'ext_auction_won');
      helpers.triggerUrl(url);
    }
  },
};

registerBidder(spec);
