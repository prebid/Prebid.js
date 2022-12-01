import {
  convertCamelToUnderscore,
  convertTypes,
  getBidRequest,
  isArray,
  isEmpty,
  logError,
  transformBidderParamKeywords
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {auctionManager} from '../src/auctionManager.js';
import {find, includes} from '../src/polyfill.js';
import {getStorageManager} from '../src/storageManager.js';
import {ajax} from '../src/ajax.js';
import {hasPurpose1Consent} from '../src/utils/gpdr.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'craft';
const URL_BASE = 'https://gacraft.jp/prebid-v3';
const TTL = 360;
const storage = getStorageManager({bidderCode: BIDDER_CODE});

export const spec = {
  code: BIDDER_CODE,
  aliases: ['craft'],
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    return !!bid.params.sitekey && !!bid.params.placementId && !isAmp();
  },

  buildRequests: function(bidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    bidRequests = convertOrtbRequestToProprietaryNative(bidRequests);

    const tags = bidRequests.map(bidToTag);
    const schain = bidRequests[0].schain;
    const payload = {
      tags: [...tags],
      ua: navigator.userAgent,
      sdk: {
        version: '$prebid.version$'
      },
      schain: schain
    };
    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr_consent = {
        consent_string: bidderRequest.gdprConsent.consentString,
        consent_required: bidderRequest.gdprConsent.gdprApplies
      };
    }
    if (bidderRequest && bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent;
    }
    if (bidderRequest && bidderRequest.refererInfo) {
      let refererinfo = {
        // TODO: this collects everything it finds, except for the canonical URL
        rd_ref: bidderRequest.refererInfo.topmostLocation,
        rd_top: bidderRequest.refererInfo.reachedTop,
        rd_ifs: bidderRequest.refererInfo.numIframes,
      };
      if (bidderRequest.refererInfo.stack) {
        refererinfo.rd_stk = bidderRequest.refererInfo.stack.join(',');
      }
      payload.referrer_detection = refererinfo;
    }
    const request = formatRequest(payload, bidderRequest);
    return request;
  },

  interpretResponse: function(serverResponse, {bidderRequest}) {
    try {
      serverResponse = serverResponse.body;
      const bids = [];
      if (!serverResponse) {
        return [];
      }
      if (serverResponse.error) {
        let errorMessage = `in response for ${bidderRequest.bidderCode} adapter`;
        if (serverResponse.error) {
          errorMessage += `: ${serverResponse.error}`;
        }
        logError(errorMessage);
        return bids;
      }
      if (serverResponse.tags) {
        serverResponse.tags.forEach(serverBid => {
          const rtbBid = getRtbBid(serverBid);
          if (rtbBid) {
            if (rtbBid.cpm !== 0 && includes(this.supportedMediaTypes, rtbBid.ad_type)) {
              const bid = newBid(serverBid, rtbBid, bidderRequest);
              bid.mediaType = parseMediaType(rtbBid);
              bids.push(bid);
            }
          }
        });
      }
      return bids;
    } catch (e) {
      return [];
    }
  },

  transformBidParams: function(params, isOpenRtb) {
    params = convertTypes({
      'sitekey': 'string',
      'placementId': 'string',
      'keywords': transformBidderParamKeywords
    }, params);
    if (isOpenRtb) {
      if (isPopulatedArray(params.keywords)) {
        params.keywords.forEach(deleteValues);
      }
      Object.keys(params).forEach(paramKey => {
        let convertedKey = convertCamelToUnderscore(paramKey);
        if (convertedKey !== paramKey) {
          params[convertedKey] = params[paramKey];
          delete params[paramKey];
        }
      });
    }
    return params;
  },

  onBidWon: function(bid) {
    ajax(bid._prebidWon, null, null, {
      method: 'POST',
      contentType: 'application/json'
    });
  }
};

function isPopulatedArray(arr) {
  return !!(isArray(arr) && arr.length > 0);
}

function deleteValues(keyPairObj) {
  if (isPopulatedArray(keyPairObj.value) && keyPairObj.value[0] === '') {
    delete keyPairObj.value;
  }
}

function formatRequest(payload, bidderRequest) {
  let options = {};
  if (!hasPurpose1Consent(bidderRequest?.gdprConsent)) {
    options = {
      withCredentials: false
    };
  }

  const payloadString = JSON.stringify(payload);
  return {
    method: 'POST',
    url: `${URL_BASE}/${payload.tags[0].sitekey}`,
    data: payloadString,
    bidderRequest,
    options
  };
}

function newBid(serverBid, rtbBid, bidderRequest) {
  const bidRequest = getBidRequest(serverBid.uuid, [bidderRequest]);
  const bid = {
    requestId: serverBid.uuid,
    cpm: rtbBid.cpm,
    currency: 'JPY',
    width: rtbBid.rtb.banner.width,
    height: rtbBid.rtb.banner.height,
    ad: rtbBid.rtb.banner.content,
    ttl: TTL,
    creativeId: rtbBid.creative_id,
    netRevenue: false, // ???
    dealId: rtbBid.deal_id,
    meta: null,
    _adUnitCode: bidRequest.adUnitCode,
    _bidKey: serverBid.bid_key,
    _prebidWon: serverBid.won_url,
  };
  return bid;
}

function bidToTag(bid) {
  const tag = {};
  for (var k in bid.params) {
    tag[k] = bid.params[k];
  }
  try {
    if (storage.hasLocalStorage()) {
      tag.uid = JSON.parse(storage.getDataFromLocalStorage(`${bid.params.sitekey}_uid`));
    }
  } catch (e) {
  }
  tag.sizes = bid.sizes;
  tag.primary_size = tag.sizes[0];
  tag.ad_types = [];
  tag.uuid = bid.bidId;
  if (!isEmpty(bid.params.keywords)) {
    let keywords = transformBidderParamKeywords(bid.params.keywords);
    if (keywords.length > 0) {
      keywords.forEach(deleteValues);
    }
    tag.keywords = keywords;
  }
  let adUnit = find(auctionManager.getAdUnits(), au => bid.transactionId === au.transactionId);
  if (adUnit && adUnit.mediaTypes && adUnit.mediaTypes.banner) {
    tag.ad_types.push(BANNER);
  }

  if (tag.ad_types.length === 0) {
    delete tag.ad_types;
  }

  return tag;
}

function getRtbBid(tag) {
  return tag && tag.ads && tag.ads.length && find(tag.ads, ad => ad.rtb);
}

function parseMediaType(rtbBid) {
  const adType = rtbBid.ad_type;
  if (adType === VIDEO) {
    return VIDEO;
  } else if (adType === NATIVE) {
    return NATIVE;
  } else {
    return BANNER;
  }
}

function isAmp() {
  try {
    const ampContext = window.context || window.parent.context;
    if (ampContext && ampContext.pageViewId) {
      return ampContext;
    }
    return false;
  } catch (e) {
    return false;
  }
}

registerBidder(spec);
