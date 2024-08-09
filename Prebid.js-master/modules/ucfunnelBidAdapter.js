import { generateUUID, _each } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO, NATIVE} from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { config } from '../src/config.js';

const COOKIE_NAME = 'ucf_uid';
const VER = 'ADGENT_PREBID-2018011501';
const BIDDER_CODE = 'ucfunnel';
const GVLID = 607;
const CURRENCY = 'USD';
const VIDEO_CONTEXT = {
  INSTREAM: 0,
  OUSTREAM: 2
}
const storage = getStorageManager({bidderCode: BIDDER_CODE});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  ENDPOINT: 'https://hb.aralego.com/header',
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  /**
   * Check if the bid is a valid zone ID in either number or string form
   * @param {object} bid the ucfunnel bid to validate
   * @return boolean for whether or not a bid is valid
   */
  isBidRequestValid: function(bid) {
    const isVideoMediaType = (bid.mediaTypes && bid.mediaTypes.video != null);
    const videoContext = (bid.mediaTypes && bid.mediaTypes.video != null) ? bid.mediaTypes.video.videoContext : '';

    if (typeof bid.params !== 'object' || typeof bid.params.adid != 'string') {
      return false;
    }

    if (isVideoMediaType && videoContext === 'outstream') {
      return false;
    }

    return true;
  },

  /**
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: function(bids, bidderRequest) {
    return bids.map(bid => {
      return {
        method: 'GET',
        url: spec.ENDPOINT,
        data: getRequestData(bid, bidderRequest),
        bidRequest: bid
      }
    });
  },

  /**
   * Format ucfunnel responses as Prebid bid responses
   * @param {ucfunnelResponseObj} ucfunnelResponse A successful response from ucfunnel.
   * @return {Bid[]} An array of formatted bids.
  */
  interpretResponse: function (ucfunnelResponseObj, request) {
    const bidRequest = request.bidRequest;
    const ad = ucfunnelResponseObj ? ucfunnelResponseObj.body : {};
    const videoPlayerSize = parseSizes(bidRequest);

    let bid = {
      requestId: bidRequest.bidId,
      cpm: ad.cpm || 0,
      creativeId: ad.crid || ad.ad_id || bidRequest.params.adid,
      dealId: ad.deal || null,
      currency: ad.currency || 'USD',
      netRevenue: true,
      ttl: 1800,
      meta: {}
    };

    if (bidRequest.params && bidRequest.params.bidfloor && ad.cpm && ad.cpm < bidRequest.params.bidfloor) {
      bid.cpm = 0;
    }
    if (ad.creative_type) {
      bid.mediaType = ad.creative_type;
      bid.meta.mediaType = ad.creative_type;
    }
    if (ad.adomain) {
      bid.meta.advertiserDomains = ad.adomain;
    }

    switch (ad.creative_type) {
      case NATIVE:
        let nativeAd = ad.native;
        Object.assign(bid, {
          width: 1,
          height: 1,
          native: {
            title: nativeAd.title,
            body: nativeAd.desc,
            cta: nativeAd.ctatext,
            sponsoredBy: nativeAd.sponsored,
            image: nativeAd.image || nativeAd.image.url,
            icon: nativeAd.icon || nativeAd.icon.url,
            clickUrl: nativeAd.clickUrl,
            clickTrackers: (nativeAd.clicktrackers) ? nativeAd.clicktrackers : [],
            impressionTrackers: nativeAd.impressionTrackers,
          }
        });
        break;
      case VIDEO:
        Object.assign(bid, {
          vastUrl: ad.vastUrl,
          vastXml: ad.vastXml
        });

        if (videoPlayerSize && videoPlayerSize.length === 2) {
          Object.assign(bid, {
            width: videoPlayerSize[0],
            height: videoPlayerSize[1]
          });
        }
        break;
      case BANNER:
      default:
        var size = parseSizes(bidRequest);
        Object.assign(bid, {
          width: ad.width || size[0],
          height: ad.height || size[1],
          ad: ad.adm || ''
        });
    }

    return [bid];
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent = {}, uspConsent) {
    let gdprApplies = (gdprConsent && gdprConsent.gdprApplies) ? '1' : '';
    let apiVersion = (gdprConsent) ? gdprConsent.apiVersion : '';
    let consentString = (gdprConsent) ? gdprConsent.consentString : '';
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://cdn.aralego.net/ucfad/cookie/sync.html' + getCookieSyncParameter(gdprApplies, apiVersion, consentString, uspConsent)
      }];
    } else if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: 'https://sync.aralego.com/idSync' + getCookieSyncParameter(gdprApplies, apiVersion, consentString, uspConsent)
      }];
    }
  }
};
registerBidder(spec);

function transformSizes(requestSizes) {
  if (typeof requestSizes === 'object' && requestSizes.length) {
    return requestSizes[0];
  }
}

function getCookieSyncParameter(gdprApplies, apiVersion, consentString, uspConsent) {
  let param = '?';
  if (gdprApplies == '1') {
    param = param + 'gdpr=1&';
  }
  if (apiVersion == 1) {
    param = param + 'euconsent=' + consentString + '&';
  } else if (apiVersion == 2) {
    param = param + 'euconsent-v2=' + consentString + '&';
  }
  if (uspConsent) {
    param = param + 'usprivacy=' + uspConsent;
  }
  return (param == '?') ? '' : param;
}

function parseSizes(bid) {
  let params = bid.params;
  if (bid.mediaType === VIDEO) {
    let size = [];
    if (params.video && params.video.playerWidth && params.video.playerHeight) {
      size = [
        params.video.playerWidth,
        params.video.playerHeight
      ];
      return size;
    }
  }

  return transformSizes(bid.sizes);
}

function getSupplyChain(schain) {
  var supplyChain = '';
  if (schain != null && schain.nodes) {
    supplyChain = schain.ver + ',' + schain.complete;
    for (let i = 0; i < schain.nodes.length; i++) {
      supplyChain += '!';
      supplyChain += (schain.nodes[i].asi) ? encodeURIComponent(schain.nodes[i].asi) : '';
      supplyChain += ',';
      supplyChain += (schain.nodes[i].sid) ? encodeURIComponent(schain.nodes[i].sid) : '';
      supplyChain += ',';
      supplyChain += (schain.nodes[i].hp) ? encodeURIComponent(schain.nodes[i].hp) : '';
      supplyChain += ',';
      supplyChain += (schain.nodes[i].rid) ? encodeURIComponent(schain.nodes[i].rid) : '';
      supplyChain += ',';
      supplyChain += (schain.nodes[i].name) ? encodeURIComponent(schain.nodes[i].name) : '';
      supplyChain += ',';
      supplyChain += (schain.nodes[i].domain) ? encodeURIComponent(schain.nodes[i].domain) : '';
    }
  }
  return supplyChain;
}

function getMediaType(mediaTypes) {
  if (mediaTypes != null && mediaTypes.banner) {
    return 'banner';
  } else if (mediaTypes != null && mediaTypes.video) {
    return 'video';
  } else if (mediaTypes != null && mediaTypes.native) {
    return 'native'
  }
  return 'banner';
}

function getFloor(bid, size, mediaTypes) {
  if (bid.params.bidfloor) {
    return bid.params.bidfloor;
  }
  if (typeof bid.getFloor === 'function') {
    var bidFloor = bid.getFloor({
      currency: CURRENCY,
      mediaType: getMediaType(mediaTypes),
      size: (size) ? [ size[0], size[1] ] : '*',
    });
    if (bidFloor.currency === CURRENCY) {
      return bidFloor.floor;
    }
  }
  return undefined;
}

function getRequestData(bid, bidderRequest) {
  const size = parseSizes(bid);
  const language = navigator.language;
  const dnt = (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0;
  const userIdTdid = (bid.userId && bid.userId.tdid) ? bid.userId.tdid : '';
  const supplyChain = getSupplyChain(bid.schain);
  const bidFloor = getFloor(bid, size, bid.mediaTypes);
  // general bid data
  let bidData = {
    ver: VER,
    ifr: 0,
    bl: language,
    je: 1,
    dnt: dnt,
    adid: bid.params.adid,
    tdid: userIdTdid,
    schain: supplyChain
  };

  if (bidFloor) {
    bidData.fp = bidFloor;
  }

  addUserId(bidData, bid.userId);
  try {
    bidData.host = window.top.location.hostname;
    bidData.u = config.getConfig('publisherDomain') || window.top.location.href;
    bidData.xr = 0;
  } catch (e) {
    bidData.host = window.location.hostname;
    bidData.u = config.getConfig('publisherDomain') || bidderRequest.refererInfo.referrer || document.referrer || window.location.href;
    bidData.xr = 1;
  }

  if (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
    bidData.ao = window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1];
  }

  if (storage.cookiesAreEnabled()) {
    let ucfUid = '';
    if (storage.getCookie(COOKIE_NAME) != undefined) {
      ucfUid = storage.getCookie(COOKIE_NAME);
      bidData.ucfUid = ucfUid;
    } else {
      ucfUid = generateUUID();
      bidData.ucfUid = ucfUid;
      storage.setCookie(COOKIE_NAME, ucfUid);
    }
  }

  if (size != undefined && size.length == 2) {
    bidData.w = size[0];
    bidData.h = size[1];
  }

  if (bidderRequest && bidderRequest.uspConsent) {
    Object.assign(bidData, {
      usprivacy: bidderRequest.uspConsent
    });
  }
  if (bid.mediaTypes && bid.mediaTypes.video != null) {
    const videoContext = bid.mediaTypes.video.context;
    switch (videoContext) {
      case 'outstream':
        bidData.atype = VIDEO_CONTEXT.OUSTREAM;
        break;
      case 'instream':
      default:
        bidData.atype = VIDEO_CONTEXT.INSTREAM;
        break;
    }
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    if (bidderRequest.gdprConsent.apiVersion == 1) {
      Object.assign(bidData, {
        gdpr: bidderRequest.gdprConsent.gdprApplies ? 1 : 0,
        euconsent: bidderRequest.gdprConsent.consentString
      });
    } else if (bidderRequest.gdprConsent.apiVersion == 2) {
      Object.assign(bidData, {
        gdpr: bidderRequest.gdprConsent.gdprApplies ? 1 : 0,
        'euconsent-v2': bidderRequest.gdprConsent.consentString
      });
    }
  }

  if (config.getConfig('coppa')) {
    bidData.coppa = true;
  }

  return bidData;
}

function addUserId(bidData, userId) {
  bidData['eids'] = '';
  _each(userId, (userIdObjectOrValue, userIdProviderKey) => {
    switch (userIdProviderKey) {
      case 'haloId':
        if (userIdObjectOrValue.haloId) {
          bidData[userIdProviderKey + 'haloId'] = userIdObjectOrValue.haloId;
        }
        if (userIdObjectOrValue.auSeg) {
          bidData[userIdProviderKey + '_auSeg'] = userIdObjectOrValue.auSeg;
        }
        break;
      case 'parrableId':
        if (userIdObjectOrValue.eid) {
          bidData[userIdProviderKey + '_eid'] = userIdObjectOrValue.eid;
        }
        break;
      case 'id5id':
        if (userIdObjectOrValue.uid) {
          bidData[userIdProviderKey + '_uid'] = userIdObjectOrValue.uid;
        }
        if (userIdObjectOrValue.ext && userIdObjectOrValue.ext.linkType) {
          bidData[userIdProviderKey + '_linkType'] = userIdObjectOrValue.ext.linkType;
        }
        break;
      case 'uid2':
        if (userIdObjectOrValue.id) {
          bidData['eids'] = (bidData['eids'].length > 0)
            ? (bidData['eids'] + '!' + userIdProviderKey + ',' + userIdObjectOrValue.id)
            : (userIdProviderKey + ',' + userIdObjectOrValue.id);
        }
        break;
      case 'connectid':
        if (userIdObjectOrValue) {
          bidData['eids'] = (bidData['eids'].length > 0)
            ? (bidData['eids'] + '!verizonMediaId,' + userIdObjectOrValue)
            : ('verizonMediaId,' + userIdObjectOrValue);
        }
        break;
      case 'flocId':
        if (userIdObjectOrValue.id) {
          bidData['cid'] = userIdObjectOrValue.id;
        }
        break;
      default:
        bidData[userIdProviderKey] = userIdObjectOrValue;
        break;
    }
  });

  return bidData;
}
