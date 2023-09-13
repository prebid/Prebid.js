import {deepAccess, isArray, logError, mergeDeep, deepSetValue} from '../src/utils.js';
import {getOrigin} from '../libraries/getOrigin/index.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {includes} from '../src/polyfill.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {config} from '../src/config.js';

const BIDDER_CODE = 'rtbhouse';
const REGIONS = ['prebid-eu', 'prebid-us', 'prebid-asia'];
const ENDPOINT_URL = 'creativecdn.com/bidder/prebid/bids';
const FLEDGE_ENDPOINT_URL = 'creativecdn.com/bidder/prebidfledge/bids';
const FLEDGE_SELLER_URL = 'https://fledge-ssp.creativecdn.com';
const FLEDGE_DECISION_LOGIC_URL = 'https://fledge-ssp.creativecdn.com/component-seller-prebid.js';

const DEFAULT_CURRENCY_ARR = ['USD']; // NOTE - USD is the only supported currency right now; Hardcoded for bids
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE];
const TTL = 55;
const GVLID = 16;

// Codes defined by OpenRTB Native Ads 1.1 specification
export const OPENRTB = {
  NATIVE: {
    IMAGE_TYPE: {
      ICON: 1,
      MAIN: 3,
    },
    ASSET_ID: {
      TITLE: 1,
      IMAGE: 2,
      ICON: 3,
      BODY: 4,
      SPONSORED: 5,
      CTA: 6
    },
    DATA_ASSET_TYPE: {
      SPONSORED: 1,
      DESC: 2,
      CTA_TEXT: 12,
    },
  }
};

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: TTL,
    currency: DEFAULT_CURRENCY_ARR[0]
  },
  imp(buildImp, bidRequest, context) {
    const { bidderRequest } = context;
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'tagid', bidRequest.adUnitCode.toString());

    mergeDeep(imp, mapImpression(bidRequest, bidderRequest));
    if (!imp.bidfloor && bidRequest.params.bidfloor) {
      imp.bidfloor = parseFloat(bidRequest.params.bidfloor);
      imp.bidfloorcur = DEFAULT_CURRENCY_ARR[0];
    }
    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    if (!('price' in bid)) return;
    if (bid.adm.indexOf('{') === 0) {
      // native bid, adding mtype bc the bidder doesn't provide it
      bid.mtype = 4; // ORTB native value
      let parsedBidAdm = JSON.parse(bid.adm);
      if (parsedBidAdm.native) {
        parsedBidAdm = parsedBidAdm.native;
      }
      bid.adm = parsedBidAdm;
    }
    const bidResponse = buildBidResponse(bid, context);
    bidResponse.creativeId = bid.adid;

    if (bid.ext) mergeDeep(bidResponse.ext, bid.ext);

    return bidResponse;
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    const response = buildResponse(bidResponses, ortbResponse, context);

    if (ortbResponse.bidid && isArray(ortbResponse?.ext?.igbid)) {
      // we have fledge response

      const fledgeAuctionConfigsObj = {};
      const { seller, decisionLogicUrl, sellerTimeout } = ortbResponse.ext;

      ortbResponse.ext.igbid.forEach((igbid) => {
        const perBuyerSignals = {};
        igbid.igbuyer.forEach(buyerItem => {
          perBuyerSignals[buyerItem.igdomain] = buyerItem.buyersignal
        });
        fledgeAuctionConfigsObj[igbid.impid] = {
          seller,
          decisionLogicUrl,
          interestGroupBuyers: Object.keys(perBuyerSignals),
          perBuyerSignals,
        };
        if (sellerTimeout) fledgeAuctionConfigsObj[igbid.impid].sellerTimeout = sellerTimeout;
      });

      const fledgeAuctionConfigs = Object.entries(fledgeAuctionConfigsObj).map(([bidId, cfg]) => {
        return {
          bidId,
          config: Object.assign({
            auctionSignals: {}
          }, cfg)
        }
      });
      return {
        bids: response.bids,
        fledgeAuctionConfigs,
      }
    }
    return response.bids;
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,

  isBidRequestValid: function (bid) {
    return !!(includes(REGIONS, bid.params.region) && bid.params.publisherId);
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const ortbRequest = converter.toORTB({ validBidRequests, bidderRequest });
    let computedEndpointUrl = ENDPOINT_URL;
    const firstBidRequest = validBidRequests[0];
    mergeDeep(ortbRequest, {
      site: mapSite(validBidRequests),
      test: firstBidRequest.params.test || 0,
    });
    if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
      const consentStr = (bidderRequest.gdprConsent.consentString)
        ? bidderRequest.gdprConsent.consentString.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '';
      const gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      deepSetValue(ortbRequest, 'regs.ext.gdpr', gdpr);
      deepSetValue(ortbRequest, 'user.ext.consent', consentStr);
    }
    if (firstBidRequest.schain) {
      const schain = mapSchain(firstBidRequest.schain);
      if (schain) {
        deepSetValue(ortbRequest, 'ext.schain', schain);
      }
    }

    if (bidderRequest.fledgeEnabled) {
      const fledgeConfig = config.getConfig('fledgeConfig') || {
        seller: FLEDGE_SELLER_URL,
        decisionLogicUrl: FLEDGE_DECISION_LOGIC_URL,
        sellerTimeout: 500
      };
      deepSetValue(ortbRequest, 'ext.fledge_config', fledgeConfig);
      computedEndpointUrl = FLEDGE_ENDPOINT_URL;
    }

    return {
      method: 'POST',
      url: 'https://' + firstBidRequest.params.region + '.' + computedEndpointUrl,
      data: ortbRequest
    };
  },

  interpretResponse: function (serverResponse, originalRequest) {
    if (!serverResponse.body) {
      serverResponse.body = {nbr: 0};
    } else if (isArray(serverResponse.body)) {
      // normalize response body (array of bids) to form an OpenRTB response object
      const seatbidBid = serverResponse.body;
      serverResponse.body = {
        seatbid: [{
          bid: seatbidBid,
          seat: BIDDER_CODE
        }]
      }
    }
    return converter.fromORTB({response: serverResponse.body, request: originalRequest.data})
  }
};
registerBidder(spec);

function mapImpression(bidRequest) {
  if (isBannerBid(bidRequest)) return {banner: mapBanner(bidRequest)}
  if (isNativeBid(bidRequest)) return {native: mapNative(bidRequest)}
}

function isBannerBid(bidRequest) {
  return deepAccess(bidRequest, `mediaTypes.${BANNER}`)
}
function isNativeBid(bidRequest) {
  return deepAccess(bidRequest, `mediaTypes.${NATIVE}`)
}

function mapBanner(bidRequest) {
  const banner = {};
  if (isBannerBid(bidRequest)) {
    let sizes = deepAccess(bidRequest, `mediaTypes.${BANNER}.sizes`);

    if (sizes) {
      banner.w = sizes[0][0];
      banner.h = sizes[0][1];
    }
  }
  return { ...banner }
}

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {object} Site by OpenRTB 2.5 §3.2.13
 */
function mapSite(slot) {
  let pubId = 'unknown';
  let channel = null;
  if (slot && slot.length > 0) {
    pubId = slot[0].params.publisherId;
    channel = slot[0].params.channel &&
    slot[0].params.channel
      .toString()
      .slice(0, 50);
  }
  let siteData = {
    publisher: {
      id: pubId.toString(),
    },
    name: getOrigin()
  };
  if (channel) {
    siteData.channel = channel;
  }
  return siteData;
}

/**
 * @param {object} schain object set by Publisher
 * @returns {object} OpenRTB SupplyChain object
 */
function mapSchain(schain) {
  if (!schain) {
    return null;
  }
  if (!validateSchain(schain)) {
    logError('RTB House: required schain params missing');
    return null;
  }
  return schain;
}

/**
 * @param {object} schain object set by Publisher
 * @returns {object} bool
 */
function validateSchain(schain) {
  if (!schain.nodes) {
    return false;
  }
  const requiredFields = ['asi', 'sid', 'hp'];
  return schain.nodes.every(node => {
    return requiredFields.every(field => node[field]);
  });
}

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {object} Request by OpenRTB Native Ads 1.1 §4
 */
function mapNative(bidRequest) {
  const native = {}
  if (isNativeBid(bidRequest)) {
    mergeDeep(native, {
      request: {
        assets: mapNativeAssets(bidRequest),
      },
      ver: '1.2'
    })
  }
  return { ...native }
}

/**
 * @param {object} slot Slot config by Prebid
 * @returns {array} Request Assets by OpenRTB Native Ads 1.1 §4.2
 */
function mapNativeAssets(slot) {
  const params = slot.nativeParams || deepAccess(slot, 'mediaTypes.native');
  const assets = [];
  if (params.title) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.TITLE,
      required: params.title.required ? 1 : 0,
      title: {
        len: params.title.len || 25
      }
    })
  }
  if (params.image) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.IMAGE,
      required: params.image.required ? 1 : 0,
      img: mapNativeImage(params.image, OPENRTB.NATIVE.IMAGE_TYPE.MAIN)
    })
  }
  if (params.icon) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.ICON,
      required: params.icon.required ? 1 : 0,
      img: mapNativeImage(params.icon, OPENRTB.NATIVE.IMAGE_TYPE.ICON)
    })
  }
  if (params.sponsoredBy) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.SPONSORED,
      required: params.sponsoredBy.required ? 1 : 0,
      data: {
        type: OPENRTB.NATIVE.DATA_ASSET_TYPE.SPONSORED,
        len: params.sponsoredBy.len
      }
    })
  }
  if (params.body) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.BODY,
      required: params.body.request ? 1 : 0,
      data: {
        type: OPENRTB.NATIVE.DATA_ASSET_TYPE.DESC,
        len: params.body.len
      }
    })
  }
  if (params.cta) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.CTA,
      required: params.cta.required ? 1 : 0,
      data: {
        type: OPENRTB.NATIVE.DATA_ASSET_TYPE.CTA_TEXT,
        len: params.cta.len
      }
    })
  }
  return assets;
}

/**
 * @param {object} image Prebid native.image/icon
 * @param {int} type Image or icon code
 * @returns {object} Request Image by OpenRTB Native Ads 1.1 §4.4
 */
function mapNativeImage(image, type) {
  const img = {type: type};
  if (image.aspect_ratios) {
    const ratio = image.aspect_ratios[0];
    const minWidth = ratio.min_width || 100;
    img.wmin = minWidth;
    img.hmin = (minWidth / ratio.ratio_width * ratio.ratio_height);
  }
  if (image.sizes) {
    const size = isArray(image.sizes[0]) ? image.sizes[0] : image.sizes;
    img.w = size[0];
    img.h = size[1];
  }
  return img
}
