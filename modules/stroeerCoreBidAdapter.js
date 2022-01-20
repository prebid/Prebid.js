import { getWindowSelf, getWindowTop, buildUrl, logError, isStr, isEmpty, deepAccess } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const GVL_ID = 136;
const BIDDER_CODE = 'stroeerCore';
const DEFAULT_HOST = 'hb.adscale.de';
const DEFAULT_PATH = '/dsh';
const DEFAULT_PORT = '';
const FIVE_MINUTES_IN_SECONDS = 300;
const USER_SYNC_IFRAME_URL = 'https://js.adscale.de/pbsync.html';

const isSecureWindow = () => getWindowSelf().location.protocol === 'https:';
const isMainPageAccessible = () => getMostAccessibleTopWindow() === getWindowTop();

function getTopWindowReferrer() {
  try {
    return getWindowTop().document.referrer;
  } catch (e) {
    return getWindowSelf().referrer;
  }
}

function getMostAccessibleTopWindow() {
  let res = getWindowSelf();

  try {
    while (getWindowTop().top !== res && res.parent.location.href.length) {
      res = res.parent;
    }
  } catch (ignore) {
  }

  return res;
}

function elementInView(elementId) {
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

function _buildUrl({host: hostname = DEFAULT_HOST, port = DEFAULT_PORT, securePort, path: pathname = DEFAULT_PATH}) {
  if (securePort) {
    port = securePort;
  }

  return buildUrl({protocol: 'https', hostname, port, pathname});
}

function getGdprParams(gdprConsent) {
  if (gdprConsent) {
    const consentString = encodeURIComponent(gdprConsent.consentString || '')
    const isGdpr = gdprConsent.gdprApplies ? 1 : 0;

    return `?gdpr=${isGdpr}&gdpr_consent=${consentString}`
  } else {
    return '';
  }
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: (function () {
    const validators = [];

    const createValidator = (checkFn, errorMsgFn) => {
      return (bidRequest) => {
        if (checkFn(bidRequest)) {
          return true;
        } else {
          logError(`invalid bid: ${errorMsgFn(bidRequest)}`, 'ERROR');
          return false;
        }
      }
    };

    function isBanner(bidReq) {
      return (!bidReq.mediaTypes && !bidReq.mediaType) ||
        (bidReq.mediaTypes && bidReq.mediaTypes.banner) ||
        bidReq.mediaType === BANNER;
    }

    validators.push(createValidator((bidReq) => isBanner(bidReq),
      bidReq => `bid request ${bidReq.bidId} is not a banner`));
    validators.push(createValidator((bidReq) => typeof bidReq.params === 'object',
      bidReq => `bid request ${bidReq.bidId} does not have custom params`));
    validators.push(createValidator((bidReq) => isStr(bidReq.params.sid),
      bidReq => `bid request ${bidReq.bidId} does not have a sid string field`));

    return function (bidRequest) {
      return validators.every(f => f(bidRequest));
    }
  }()),

  buildRequests: function (validBidRequests = [], bidderRequest) {
    const anyBid = bidderRequest.bids[0];

    const payload = {
      id: bidderRequest.auctionId,
      bids: [],
      ref: getTopWindowReferrer(),
      ssl: isSecureWindow(),
      mpa: isMainPageAccessible(),
      timeout: bidderRequest.timeout - (Date.now() - bidderRequest.auctionStart)
    };

    const userIds = anyBid.userId;

    if (!isEmpty(userIds)) {
      payload.user = {
        euids: userIds
      };
    }

    const gdprConsent = bidderRequest.gdprConsent;

    if (gdprConsent && gdprConsent.consentString != null && gdprConsent.gdprApplies != null) {
      payload.gdpr = {
        consent: bidderRequest.gdprConsent.consentString, applies: bidderRequest.gdprConsent.gdprApplies
      };
    }

    function bidSizes(bid) {
      return deepAccess(bid, 'mediaTypes.banner.sizes') || bid.sizes /* for prebid < 3 */ || [];
    }

    validBidRequests.forEach(bid => {
      payload.bids.push({
        bid: bid.bidId, sid: bid.params.sid, siz: bidSizes(bid), viz: elementInView(bid.adUnitCode)
      });
    });

    return {
      method: 'POST', url: _buildUrl(anyBid.params), data: payload
    }
  },

  interpretResponse: function (serverResponse) {
    const bids = [];

    if (serverResponse.body && typeof serverResponse.body === 'object') {
      serverResponse.body.bids.forEach(bidResponse => {
        bids.push({
          requestId: bidResponse.bidId,
          cpm: bidResponse.cpm || 0,
          width: bidResponse.width || 0,
          height: bidResponse.height || 0,
          ad: bidResponse.ad,
          ttl: FIVE_MINUTES_IN_SECONDS,
          currency: 'EUR',
          netRevenue: true,
          creativeId: '',
          meta: {
            advertiserDomains: bidResponse.adomain
          },
        });
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

registerBidder(spec);
