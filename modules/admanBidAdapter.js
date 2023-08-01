import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isFn, deepAccess, logMessage } from '../src/utils.js';
import {config} from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'adman';
const AD_URL = 'https://pub.admanmedia.com/?c=o&m=multi';
const URL_SYNC = 'https://sync.admanmedia.com';

function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId ||
    !bid.ttl || !bid.currency) {
    return false;
  }
  switch (bid['mediaType']) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.vastUrl);
    case NATIVE:
      return Boolean(bid.native && bid.native.title && bid.native.image && bid.native.impressionTrackers);
    default:
      return false;
  }
}

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.bidfloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });
    return bidFloor.floor;
  } catch (_) {
    return 0
  }
}

function getUserId(eids, id, source, uidExt) {
  if (id) {
    var uid = { id };
    if (uidExt) {
      uid.ext = uidExt;
    }
    eids.push({
      source,
      uids: [ uid ]
    });
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && !isNaN(bid.params.placementId));
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
    const content = deepAccess(bidderRequest, 'ortb2.site.content', config.getAnyConfig('ortb2.site.content'));

    let winTop = window;
    let location;
    // TODO: this odd try-catch block was copied in several adapters; it doesn't seem to be correct for cross-origin
    try {
      location = new URL(bidderRequest.refererInfo.page)
      winTop = window.top;
    } catch (e) {
      location = winTop.location;
      logMessage(e);
    };
    let placements = [];
    let request = {
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'language': (navigator && navigator.language) ? navigator.language : '',
      'secure': 1,
      'host': location.host,
      'page': location.pathname,
      'placements': placements
    };
    request.language.indexOf('-') != -1 && (request.language = request.language.split('-')[0])
    if (bidderRequest) {
      if (bidderRequest.uspConsent) {
        request.ccpa = bidderRequest.uspConsent;
      }
      if (bidderRequest.gdprConsent) {
        request.gdpr = bidderRequest.gdprConsent
      }
      if (content) {
        request.content = content;
      }
    }
    const len = validBidRequests.length;

    for (let i = 0; i < len; i++) {
      const bid = validBidRequests[i];
      const { params, bidId, mediaTypes } = bid;

      const placement = {
        placementId: params.placementId,
        bidId,
        eids: [],
        bidFloor: getBidFloor(bid)
      }

      if (bid.transactionId) {
        placement.ext = placement.ext || {};
        placement.ext.tid = bid.transactionId;
      }

      if (bid.schain) {
        placement.schain = bid.schain;
      }

      if (bid.userId) {
        getUserId(placement.eids, bid.userId.uid2 && bid.userId.uid2.id, 'uidapi.com');
        getUserId(placement.eids, bid.userId.lotamePanoramaId, 'lotame.com');
        getUserId(placement.eids, bid.userId.idx, 'idx.lat');
      }

      if (mediaTypes?.[BANNER]) {
        placement.traffic = BANNER;
        placement.sizes = mediaTypes[BANNER].sizes;
      } else if (mediaTypes?.[VIDEO]) {
        placement.traffic = VIDEO;
        placement.playerSize = mediaTypes[VIDEO].playerSize;
        placement.minduration = mediaTypes[VIDEO].minduration;
        placement.maxduration = mediaTypes[VIDEO].maxduration;
        placement.mimes = mediaTypes[VIDEO].mimes;
        placement.protocols = mediaTypes[VIDEO].protocols;
        placement.startdelay = mediaTypes[VIDEO].startdelay;
        placement.placement = mediaTypes[VIDEO].placement;
        placement.skip = mediaTypes[VIDEO].skip;
        placement.skipafter = mediaTypes[VIDEO].skipafter;
        placement.minbitrate = mediaTypes[VIDEO].minbitrate;
        placement.maxbitrate = mediaTypes[VIDEO].maxbitrate;
        placement.delivery = mediaTypes[VIDEO].delivery;
        placement.playbackmethod = mediaTypes[VIDEO].playbackmethod;
        placement.api = mediaTypes[VIDEO].api;
        placement.linearity = mediaTypes[VIDEO].linearity;
      }

      placements.push(placement);
    }

    return {
      method: 'POST',
      url: AD_URL,
      data: request
    };
  },

  interpretResponse: (serverResponse) => {
    let response = [];
    serverResponse = serverResponse.body;
    for (let i = 0; i < serverResponse.length; i++) {
      let resItem = serverResponse[i];
      if (isBidResponseValid(resItem)) {
        const advertiserDomains = resItem.adomain && resItem.adomain.length ? resItem.adomain : [];
        resItem.meta = { ...resItem.meta, advertiserDomains };

        response.push(resItem);
      }
    }
    return response;
  },

  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    let syncType = syncOptions.iframeEnabled ? 'iframe' : 'image';
    let syncUrl = URL_SYNC + `/${syncType}?pbjs=1`;
    if (gdprConsent && gdprConsent.consentString) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        syncUrl += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        syncUrl += `&gdpr=0&gdpr_consent=${gdprConsent.consentString}`;
      }
    }
    if (uspConsent && uspConsent.consentString) {
      syncUrl += `&ccpa_consent=${uspConsent.consentString}`;
    }

    const coppa = config.getConfig('coppa') ? 1 : 0;
    syncUrl += `&coppa=${coppa}`;

    return [{
      type: syncType,
      url: syncUrl
    }];
  }

};

registerBidder(spec);
