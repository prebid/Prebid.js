import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

const SUPPORTED_AD_TYPES = [BANNER, VIDEO];
const BIDDER_CODE = 'openx';
const BIDDER_CONFIG = 'hb_pb';
const BIDDER_VERSION = '3.0.2';

export const USER_ID_CODE_TO_QUERY_ARG = {
  britepoolid: 'britepoolid', // BritePool ID
  criteoId: 'criteoid', // CriteoID
  digitrustid: 'digitrustid', // DigiTrust
  id5id: 'id5id', // ID5 ID
  idl_env: 'lre', // LiveRamp IdentityLink
  lipb: 'lipbid', // LiveIntent ID
  netId: 'netid', // netID
  parrableid: 'parrableid', // Parrable ID
  pubcid: 'pubcid', // PubCommon ID
  tdid: 'ttduuid', // The Trade Desk Unified ID
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: 69,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function (bidRequest) {
    const hasDelDomainOrPlatform = bidRequest.params.delDomain || bidRequest.params.platform;
    if (utils.deepAccess(bidRequest, 'mediaTypes.banner') && hasDelDomainOrPlatform) {
      return !!bidRequest.params.unit || utils.deepAccess(bidRequest, 'mediaTypes.banner.sizes.length') > 0;
    }

    return !!(bidRequest.params.unit && hasDelDomainOrPlatform);
  },
  buildRequests: function (bidRequests, bidderRequest) {
    if (bidRequests.length === 0) {
      return [];
    }

    let requests = [];
    let [videoBids, bannerBids] = partitionByVideoBids(bidRequests);

    // build banner requests
    if (bannerBids.length > 0) {
      requests.push(buildOXBannerRequest(bannerBids, bidderRequest));
    }
    // build video requests
    if (videoBids.length > 0) {
      videoBids.forEach(videoBid => {
        requests.push(buildOXVideoRequest(videoBid, bidderRequest))
      });
    }

    return requests;
  },
  interpretResponse: function ({body: oxResponseObj}, serverRequest) {
    let mediaType = getMediaTypeFromRequest(serverRequest);

    return mediaType === VIDEO ? createVideoBidResponses(oxResponseObj, serverRequest.payload)
      : createBannerBidResponses(oxResponseObj, serverRequest.payload);
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    if (syncOptions.iframeEnabled || syncOptions.pixelEnabled) {
      let pixelType = syncOptions.iframeEnabled ? 'iframe' : 'image';
      let url = utils.deepAccess(responses, '0.body.ads.pixels') ||
        utils.deepAccess(responses, '0.body.pixels') ||
        generateDefaultSyncUrl(gdprConsent, uspConsent);

      return [{
        type: pixelType,
        url: url
      }];
    }
  },
  transformBidParams: function(params, isOpenRtb) {
    return utils.convertTypes({
      'unit': 'string',
      'customFloor': 'number'
    }, params);
  }
};

function generateDefaultSyncUrl(gdprConsent, uspConsent) {
  let url = 'https://u.openx.net/w/1.0/pd';
  let queryParamStrings = [];

  if (gdprConsent) {
    queryParamStrings.push('gdpr=' + (gdprConsent.gdprApplies ? 1 : 0));
    queryParamStrings.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
  }

  // CCPA
  if (uspConsent) {
    queryParamStrings.push('us_privacy=' + encodeURIComponent(uspConsent));
  }

  return `${url}${queryParamStrings.length > 0 ? '?' + queryParamStrings.join('&') : ''}`;
}

function isVideoRequest(bidRequest) {
  return (utils.deepAccess(bidRequest, 'mediaTypes.video') && !utils.deepAccess(bidRequest, 'mediaTypes.banner')) || bidRequest.mediaType === VIDEO;
}

function createBannerBidResponses(oxResponseObj, {bids, startTime}) {
  let adUnits = oxResponseObj.ads.ad;
  let bidResponses = [];
  for (let i = 0; i < adUnits.length; i++) {
    let adUnit = adUnits[i];
    let adUnitIdx = parseInt(adUnit.idx, 10);
    let bidResponse = {};

    bidResponse.requestId = bids[adUnitIdx].bidId;

    if (adUnit.pub_rev) {
      bidResponse.cpm = Number(adUnit.pub_rev) / 1000;
    } else {
      // No fill, do not add the bidresponse
      continue;
    }
    let creative = adUnit.creative[0];
    if (creative) {
      bidResponse.width = creative.width;
      bidResponse.height = creative.height;
    }
    bidResponse.creativeId = creative.id;
    bidResponse.ad = adUnit.html;
    if (adUnit.deal_id) {
      bidResponse.dealId = adUnit.deal_id;
    }
    // default 5 mins
    bidResponse.ttl = 300;
    // true is net, false is gross
    bidResponse.netRevenue = true;
    bidResponse.currency = adUnit.currency;

    // additional fields to add
    if (adUnit.tbd) {
      bidResponse.tbd = adUnit.tbd;
    }
    bidResponse.ts = adUnit.ts;

    bidResponse.meta = {};
    if (adUnit.brand_id) {
      bidResponse.meta.brandId = adUnit.brand_id;
    }

    if (adUnit.adv_id) {
      bidResponse.meta.dspid = adUnit.adv_id;
    }

    bidResponses.push(bidResponse);
  }
  return bidResponses;
}

function getViewportDimensions(isIfr) {
  let width;
  let height;
  let tWin = window;
  let tDoc = document;
  let docEl = tDoc.documentElement;
  let body;

  if (isIfr) {
    try {
      tWin = window.top;
      tDoc = window.top.document;
    } catch (e) {
      return;
    }
    docEl = tDoc.documentElement;
    body = tDoc.body;

    width = tWin.innerWidth || docEl.clientWidth || body.clientWidth;
    height = tWin.innerHeight || docEl.clientHeight || body.clientHeight;
  } else {
    docEl = tDoc.documentElement;
    width = tWin.innerWidth || docEl.clientWidth;
    height = tWin.innerHeight || docEl.clientHeight;
  }

  return `${width}x${height}`;
}

function formatCustomParms(customKey, customParams) {
  let value = customParams[customKey];
  if (utils.isArray(value)) {
    // if value is an array, join them with commas first
    value = value.join(',');
  }
  // return customKey=customValue format, escaping + to . and / to _
  return (customKey.toLowerCase() + '=' + value.toLowerCase()).replace('+', '.').replace('/', '_')
}

function partitionByVideoBids(bidRequests) {
  return bidRequests.reduce(function (acc, bid) {
    // Fallback to banner ads if nothing specified
    if (isVideoRequest(bid)) {
      acc[0].push(bid);
    } else {
      acc[1].push(bid);
    }
    return acc;
  }, [[], []]);
}

function getMediaTypeFromRequest(serverRequest) {
  return /avjp$/.test(serverRequest.url) ? VIDEO : BANNER;
}

function buildCommonQueryParamsFromBids(bids, bidderRequest) {
  const isInIframe = utils.inIframe();
  let defaultParams;

  defaultParams = {
    ju: config.getConfig('pageUrl') || bidderRequest.refererInfo.referer,
    ch: document.charSet || document.characterSet,
    res: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    ifr: isInIframe,
    tz: new Date().getTimezoneOffset(),
    tws: getViewportDimensions(isInIframe),
    be: 1,
    bc: bids[0].params.bc || `${BIDDER_CONFIG}_${BIDDER_VERSION}`,
    dddid: utils._map(bids, bid => bid.transactionId).join(','),
    nocache: new Date().getTime()
  };

  if (bids[0].params.platform) {
    defaultParams.ph = bids[0].params.platform;
  }

  if (bidderRequest.gdprConsent) {
    let gdprConsentConfig = bidderRequest.gdprConsent;

    if (gdprConsentConfig.consentString !== undefined) {
      defaultParams.gdpr_consent = gdprConsentConfig.consentString;
    }

    if (gdprConsentConfig.gdprApplies !== undefined) {
      defaultParams.gdpr = gdprConsentConfig.gdprApplies ? 1 : 0;
    }

    if (config.getConfig('consentManagement.cmpApi') === 'iab') {
      defaultParams.x_gdpr_f = 1;
    }
  }

  if (bidderRequest && bidderRequest.uspConsent) {
    defaultParams.us_privacy = bidderRequest.uspConsent;
  }

  // normalize publisher common id
  if (utils.deepAccess(bids[0], 'crumbs.pubcid')) {
    utils.deepSetValue(bids[0], 'userId.pubcid', utils.deepAccess(bids[0], 'crumbs.pubcid'));
  }
  defaultParams = appendUserIdsToQueryParams(defaultParams, bids[0].userId);

  // supply chain support
  if (bids[0].schain) {
    defaultParams.schain = serializeSupplyChain(bids[0].schain);
  }

  return defaultParams;
}

function appendUserIdsToQueryParams(queryParams, userIds) {
  utils._each(userIds, (userIdObjectOrValue, userIdProviderKey) => {
    const key = USER_ID_CODE_TO_QUERY_ARG[userIdProviderKey];

    if (USER_ID_CODE_TO_QUERY_ARG.hasOwnProperty(userIdProviderKey)) {
      switch (userIdProviderKey) {
        case 'digitrustid':
          queryParams[key] = utils.deepAccess(userIdObjectOrValue, 'data.id');
          break;
        case 'lipb':
          queryParams[key] = userIdObjectOrValue.lipbid;
          break;
        default:
          queryParams[key] = userIdObjectOrValue;
      }
    }
  });

  return queryParams;
}

function serializeSupplyChain(supplyChain) {
  return `${supplyChain.ver},${supplyChain.complete}!${serializeSupplyChainNodes(supplyChain.nodes)}`;
}

function serializeSupplyChainNodes(supplyChainNodes) {
  const supplyChainNodePropertyOrder = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];

  return supplyChainNodes.map(supplyChainNode => {
    return supplyChainNodePropertyOrder.map(property => supplyChainNode[property] || '')
      .join(',');
  }).join('!');
}

function buildOXBannerRequest(bids, bidderRequest) {
  let customParamsForAllBids = [];
  let hasCustomParam = false;
  let queryParams = buildCommonQueryParamsFromBids(bids, bidderRequest);
  let auids = utils._map(bids, bid => bid.params.unit);

  queryParams.aus = utils._map(bids, bid => utils.parseSizesInput(bid.mediaTypes.banner.sizes).join(',')).join('|');
  queryParams.divIds = utils._map(bids, bid => encodeURIComponent(bid.adUnitCode)).join(',');

  if (auids.some(auid => auid)) {
    queryParams.auid = auids.join(',');
  }

  if (bids.some(bid => bid.params.doNotTrack)) {
    queryParams.ns = 1;
  }

  if (config.getConfig('coppa') === true || bids.some(bid => bid.params.coppa)) {
    queryParams.tfcd = 1;
  }

  bids.forEach(function (bid) {
    if (bid.params.customParams) {
      let customParamsForBid = utils._map(Object.keys(bid.params.customParams), customKey => formatCustomParms(customKey, bid.params.customParams));
      let formattedCustomParams = window.btoa(customParamsForBid.join('&'));
      hasCustomParam = true;
      customParamsForAllBids.push(formattedCustomParams);
    } else {
      customParamsForAllBids.push('');
    }
  });
  if (hasCustomParam) {
    queryParams.tps = customParamsForAllBids.join(',');
  }

  let customFloorsForAllBids = [];
  let hasCustomFloor = false;
  bids.forEach(function (bid) {
    if (bid.params.customFloor) {
      customFloorsForAllBids.push((Math.round(bid.params.customFloor * 100) / 100) * 1000);
      hasCustomFloor = true;
    } else {
      customFloorsForAllBids.push(0);
    }
  });
  if (hasCustomFloor) {
    queryParams.aumfs = customFloorsForAllBids.join(',');
  }

  let url = queryParams.ph
    ? `https://u.openx.net/w/1.0/arj`
    : `https://${bids[0].params.delDomain}/w/1.0/arj`;

  return {
    method: 'GET',
    url: url,
    data: queryParams,
    payload: {'bids': bids, 'startTime': new Date()}
  };
}

function buildOXVideoRequest(bid, bidderRequest) {
  let oxVideoParams = generateVideoParameters(bid, bidderRequest);
  let url = oxVideoParams.ph
    ? `https://u.openx.net/v/1.0/avjp`
    : `https://${bid.params.delDomain}/v/1.0/avjp`;
  return {
    method: 'GET',
    url: url,
    data: oxVideoParams,
    payload: {'bid': bid, 'startTime': new Date()}
  };
}

function generateVideoParameters(bid, bidderRequest) {
  let queryParams = buildCommonQueryParamsFromBids([bid], bidderRequest);
  let oxVideoConfig = utils.deepAccess(bid, 'params.video') || {};
  let context = utils.deepAccess(bid, 'mediaTypes.video.context');
  let playerSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
  let width;
  let height;

  // normalize config for video size
  if (utils.isArray(bid.sizes) && bid.sizes.length === 2 && !utils.isArray(bid.sizes[0])) {
    width = parseInt(bid.sizes[0], 10);
    height = parseInt(bid.sizes[1], 10);
  } else if (utils.isArray(bid.sizes) && utils.isArray(bid.sizes[0]) && bid.sizes[0].length === 2) {
    width = parseInt(bid.sizes[0][0], 10);
    height = parseInt(bid.sizes[0][1], 10);
  } else if (utils.isArray(playerSize) && playerSize.length === 2) {
    width = parseInt(playerSize[0], 10);
    height = parseInt(playerSize[1], 10);
  }

  Object.keys(oxVideoConfig).forEach(function (key) {
    if (key === 'openrtb') {
      oxVideoConfig[key].w = width || oxVideoConfig[key].w;
      oxVideoConfig[key].v = height || oxVideoConfig[key].v;
      queryParams[key] = JSON.stringify(oxVideoConfig[key]);
    } else if (!(key in queryParams) && key !== 'url') {
      // only allow video-related attributes
      queryParams[key] = oxVideoConfig[key];
    }
  });

  queryParams.auid = bid.params.unit;
  // override prebid config with openx config if available
  queryParams.vwd = width || oxVideoConfig.vwd;
  queryParams.vht = height || oxVideoConfig.vht;

  if (context === 'outstream') {
    queryParams.vos = '101';
  }

  if (oxVideoConfig.mimes) {
    queryParams.vmimes = oxVideoConfig.mimes;
  }

  return queryParams;
}

function createVideoBidResponses(response, {bid, startTime}) {
  let bidResponses = [];

  if (response !== undefined && response.vastUrl !== '' && response.pub_rev > 0) {
    let vastQueryParams = utils.parseUrl(response.vastUrl).search || {};
    let bidResponse = {};
    bidResponse.requestId = bid.bidId;
    // default 5 mins
    bidResponse.ttl = 300;
    // true is net, false is gross
    bidResponse.netRevenue = true;
    bidResponse.currency = response.currency;
    bidResponse.cpm = parseInt(response.pub_rev, 10) / 1000;
    bidResponse.width = parseInt(response.width, 10);
    bidResponse.height = parseInt(response.height, 10);
    bidResponse.creativeId = response.adid;
    bidResponse.vastUrl = response.vastUrl;
    bidResponse.mediaType = VIDEO;

    // enrich adunit with vast parameters
    response.ph = vastQueryParams.ph;
    response.colo = vastQueryParams.colo;
    response.ts = vastQueryParams.ts;

    bidResponses.push(bidResponse);
  }

  return bidResponses;
}

registerBidder(spec);
