import {buildUrl, deepAccess, getWindowSelf, getWindowTop, isEmpty, isStr, logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

const GVL_ID = 136;
const BIDDER_CODE = 'stroeerCore';
const DEFAULT_HOST = 'hb.adscale.de';
const DEFAULT_PATH = '/dsh';
const DEFAULT_PORT = '';
const FIVE_MINUTES_IN_SECONDS = 300;
const USER_SYNC_IFRAME_URL = 'https://js.adscale.de/pbsync.html';

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: (function () {
    const validators = [];

    const createValidator = (checkFn, msg) => {
      return (bidRequest) => {
        if (checkFn(bidRequest)) {
          return true;
        } else {
          logWarn(`${BIDDER_CODE}: Bid setup for ${bidRequest.adUnitCode} is invalid: ${msg}`);
          return false;
        }
      }
    };

    const hasValidMediaType = bidReq => hasBanner(bidReq) || hasVideo(bidReq);

    validators.push(createValidator((bidReq) => hasValidMediaType(bidReq),
      'the media type is invalid'));
    validators.push(createValidator((bidReq) => typeof bidReq.params === 'object',
      'the custom params does not exist'));
    validators.push(createValidator((bidReq) => isStr(bidReq.params.sid),
      'the sid field must be a string'));

    return function (bidRequest) {
      return validators.every(f => f(bidRequest));
    }
  }()),

  buildRequests: function (validBidRequests = [], bidderRequest) {
    const anyBid = bidderRequest.bids[0];

    const refererInfo = bidderRequest.refererInfo;

    const basePayload = {
      id: bidderRequest.auctionId,
      ref: refererInfo.ref,
      ssl: isSecureWindow(),
      mpa: isMainPageAccessible(),
      timeout: bidderRequest.timeout - (Date.now() - bidderRequest.auctionStart),
      url: refererInfo.page,
      schain: anyBid.schain
    };

    const userIds = anyBid.userId;

    if (!isEmpty(userIds)) {
      basePayload.user = {
        euids: userIds
      };
    }

    const gdprConsent = bidderRequest.gdprConsent;

    if (gdprConsent && gdprConsent.consentString != null && gdprConsent.gdprApplies != null) {
      basePayload.gdpr = {
        consent: bidderRequest.gdprConsent.consentString, applies: bidderRequest.gdprConsent.gdprApplies
      };
    }

    const bannerBids = validBidRequests
      .filter(hasBanner)
      .map(mapToPayloadBannerBid);

    const videoBids = validBidRequests
      .filter(hasVideo)
      .map(mapToPayloadVideoBid);

    return {
      method: 'POST',
      url: buildEndpointUrl(anyBid.params),
      data: {...basePayload, bids: [...bannerBids, ...videoBids]}
    };
  },

  interpretResponse: function (serverResponse) {
    const bids = [];

    if (serverResponse.body && typeof serverResponse.body === 'object') {
      serverResponse.body.bids.forEach(bidResponse => {
        const mediaType = bidResponse.vastXml != null ? VIDEO : BANNER;

        const bid = {
          requestId: bidResponse.bidId,
          cpm: bidResponse.cpm || 0,
          width: bidResponse.width || 0,
          height: bidResponse.height || 0,
          ttl: FIVE_MINUTES_IN_SECONDS,
          currency: 'EUR',
          netRevenue: true,
          creativeId: '',
          meta: {
            advertiserDomains: bidResponse.adomain
          },
          mediaType,
        };

        if (mediaType === VIDEO) {
          bid.vastXml = bidResponse.vastXml;
        } else {
          bid.ad = bidResponse.ad;
        }

        bids.push(bid);
      });
    }

    return bids;
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent) {
    if (serverResponses.length > 0 && syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: USER_SYNC_IFRAME_URL + getGdprParams(gdprConsent)
      }];
    }

    return [];
  }
};

const isSecureWindow = () => getWindowSelf().location.protocol === 'https:';

const isMainPageAccessible = () => {
  try {
    return !!getWindowTop().location.href;
  } catch (ignore) {
    return false;
  }
}

const elementInView = (elementId) => {
  const resolveElement = (elId) => {
    const win = getWindowSelf();

    return win.document.getElementById(elId);
  };

  const visibleInWindow = (el, win) => {
    const rect = el.getBoundingClientRect();
    const inView = (rect.top + rect.height >= 0) && (rect.top <= win.innerHeight);

    if (win !== win.parent) {
      return inView && visibleInWindow(win.frameElement, win.parent);
    }

    return inView;
  };

  try {
    return visibleInWindow(resolveElement(elementId), getWindowSelf());
  } catch (e) {
    // old browser, element not found, cross-origin etc.
  }
  return undefined;
}

const buildEndpointUrl = ({host: hostname = DEFAULT_HOST, port = DEFAULT_PORT, securePort, path: pathname = DEFAULT_PATH}) => {
  if (securePort) {
    port = securePort;
  }

  return buildUrl({protocol: 'https', hostname, port, pathname});
}

const getGdprParams = gdprConsent => {
  if (gdprConsent) {
    const consentString = encodeURIComponent(gdprConsent.consentString || '')
    const isGdpr = gdprConsent.gdprApplies ? 1 : 0;

    return `?gdpr=${isGdpr}&gdpr_consent=${consentString}`
  } else {
    return '';
  }
}

const hasBanner = bidReq => {
  return (!bidReq.mediaTypes && !bidReq.mediaType) ||
    (bidReq.mediaTypes && bidReq.mediaTypes.banner) ||
    bidReq.mediaType === BANNER;
}

const hasVideo = bidReq => {
  const mediaTypes = bidReq.mediaTypes;
  return mediaTypes &&
    mediaTypes.video &&
    ['instream', 'outstream'].indexOf(mediaTypes.video.context) > -1;
};

const mapToPayloadBaseBid = (bidRequest) => ({
  bid: bidRequest.bidId,
  sid: bidRequest.params.sid,
  viz: elementInView(bidRequest.adUnitCode),
});

const mapToPayloadBannerBid = (bidRequest) => ({
  ban: {
    siz: deepAccess(bidRequest, 'mediaTypes.banner.sizes') || [],
  },
  ...mapToPayloadBaseBid(bidRequest)
});

const mapToPayloadVideoBid = (bidRequest) => {
  const video = deepAccess(bidRequest, 'mediaTypes.video') || {};
  return {
    vid: {
      ctx: video.context,
      siz: video.playerSize,
      mim: video.mimes,
    },
    ...mapToPayloadBaseBid(bidRequest)
  };
};

registerBidder(spec);
