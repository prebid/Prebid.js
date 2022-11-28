import {
  _each,
  _map,
  convertTypes,
  deepAccess,
  deepSetValue,
  inIframe,
  isArray,
  parseSizesInput,
  parseUrl
} from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {includes} from '../src/polyfill.js';

const SUPPORTED_AD_TYPES = [BANNER, VIDEO];
const VIDEO_TARGETING = ['startdelay', 'mimes', 'minduration', 'maxduration',
  'startdelay', 'skippable', 'playbackmethod', 'api', 'protocols', 'boxingallowed',
  'linearity', 'delivery', 'protocol', 'placement', 'minbitrate', 'maxbitrate'];
const BIDDER_CODE = 'openx';
const BIDDER_CONFIG = 'hb_pb';
const BIDDER_VERSION = '3.0.3';

const DEFAULT_CURRENCY = 'USD';

export const USER_ID_CODE_TO_QUERY_ARG = {
  britepoolid: 'britepoolid', // BritePool ID
  criteoId: 'criteoid', // CriteoID
  fabrickId: 'nuestarid', // Fabrick ID by Nuestar
  hadronId: 'audigentid', // Hadron ID from Audigent
  id5id: 'id5id', // ID5 ID
  idl_env: 'lre', // LiveRamp IdentityLink
  IDP: 'zeotapid', // zeotapIdPlus ID+
  idxId: 'idxid', // idIDx,
  intentIqId: 'intentiqid', // IntentIQ ID
  lipb: 'lipbid', // LiveIntent ID
  lotamePanoramaId: 'lotameid', // Lotame Panorama ID
  merkleId: 'merkleid', // Merkle ID
  netId: 'netid', // netID
  parrableId: 'parrableid', // Parrable ID
  pubcid: 'pubcid', // PubCommon ID
  quantcastId: 'quantcastid', // Quantcast ID
  tapadId: 'tapadid', // Tapad Id
  tdid: 'ttduuid', // The Trade Desk Unified ID
  uid2: 'uid2', // Unified ID 2.0
  admixerId: 'admixerid', // AdMixer ID
  deepintentId: 'deepintentid', // DeepIntent ID
  dmdId: 'dmdid', // DMD Marketing Corp ID
  nextrollId: 'nextrollid', // NextRoll ID
  novatiq: 'novatiqid', // Novatiq ID
  mwOpenLinkId: 'mwopenlinkid', // MediaWallah OpenLink ID
  dapId: 'dapid', // Akamai DAP ID
  amxId: 'amxid', // AMX RTB ID
  kpuid: 'kpuid', // Kinesso ID
  publinkId: 'publinkid', // Publisher Link
  naveggId: 'naveggid', // Navegg ID
  imuid: 'imuid', // IM-UID by Intimate Merger
  adtelligentId: 'adtelligentid' // Adtelligent ID
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: 69,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function (bidRequest) {
    const hasDelDomainOrPlatform = bidRequest.params.delDomain || bidRequest.params.platform;
    if (deepAccess(bidRequest, 'mediaTypes.banner') && hasDelDomainOrPlatform) {
      return !!bidRequest.params.unit || deepAccess(bidRequest, 'mediaTypes.banner.sizes.length') > 0;
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
      let url = deepAccess(responses, '0.body.ads.pixels') ||
        deepAccess(responses, '0.body.pixels') ||
        generateDefaultSyncUrl(gdprConsent, uspConsent);

      return [{
        type: pixelType,
        url: url
      }];
    }
  },
  transformBidParams: function(params, isOpenRtb) {
    return convertTypes({
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
  return (deepAccess(bidRequest, 'mediaTypes.video') && !deepAccess(bidRequest, 'mediaTypes.banner')) || bidRequest.mediaType === VIDEO;
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

    if (adUnit.adomain && length(adUnit.adomain) > 0) {
      bidResponse.meta.advertiserDomains = adUnit.adomain;
    } else {
      bidResponse.meta.advertiserDomains = [];
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
    body = tDoc.body;

    width = tWin.innerWidth || docEl.clientWidth || body.clientWidth;
    height = tWin.innerHeight || docEl.clientHeight || body.clientHeight;
  } else {
    width = tWin.innerWidth || docEl.clientWidth;
    height = tWin.innerHeight || docEl.clientHeight;
  }

  return `${width}x${height}`;
}

function formatCustomParms(customKey, customParams) {
  let value = customParams[customKey];
  if (isArray(value)) {
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
  const isInIframe = inIframe();
  let defaultParams;

  defaultParams = {
    ju: bidderRequest.refererInfo.page,
    ch: document.charSet || document.characterSet,
    res: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    ifr: isInIframe,
    tz: new Date().getTimezoneOffset(),
    tws: getViewportDimensions(isInIframe),
    be: 1,
    bc: bids[0].params.bc || `${BIDDER_CONFIG}_${BIDDER_VERSION}`,
    dddid: _map(bids, bid => bid.transactionId).join(','),
    nocache: new Date().getTime()
  };

  const userDataSegments = buildFpdQueryParams('user.data', bidderRequest.ortb2);
  if (userDataSegments.length > 0) {
    defaultParams.sm = userDataSegments;
  }

  const siteContentDataSegments = buildFpdQueryParams('site.content.data', bidderRequest.ortb2);
  if (siteContentDataSegments.length > 0) {
    defaultParams.scsm = siteContentDataSegments;
  }

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
  if (deepAccess(bids[0], 'crumbs.pubcid')) {
    deepSetValue(bids[0], 'userId.pubcid', deepAccess(bids[0], 'crumbs.pubcid'));
  }
  defaultParams = appendUserIdsToQueryParams(defaultParams, bids[0].userId);

  // supply chain support
  if (bids[0].schain) {
    defaultParams.schain = serializeSupplyChain(bids[0].schain);
  }

  return defaultParams;
}

function buildFpdQueryParams(fpdPath, ortb2) {
  const firstPartyData = deepAccess(ortb2, fpdPath);
  if (!Array.isArray(firstPartyData) || !firstPartyData.length) {
    return '';
  }
  const fpd = firstPartyData
    .filter(
      data => (Array.isArray(data.segment) &&
            data.segment.length > 0 &&
            data.name !== undefined &&
            data.name.length > 0)
    )
    .reduce((acc, data) => {
      const name = typeof data.ext === 'object' && data.ext.segtax ? `${data.name}/${data.ext.segtax}` : data.name;
      acc[name] = (acc[name] || []).concat(data.segment.map(seg => seg.id));
      return acc;
    }, {})
  return Object.keys(fpd)
    .map((name, _) => name + ':' + fpd[name].join('|'))
    .join(',')
}

function appendUserIdsToQueryParams(queryParams, userIds) {
  _each(userIds, (userIdObjectOrValue, userIdProviderKey) => {
    const key = USER_ID_CODE_TO_QUERY_ARG[userIdProviderKey];

    if (USER_ID_CODE_TO_QUERY_ARG.hasOwnProperty(userIdProviderKey)) {
      switch (userIdProviderKey) {
        case 'merkleId':
          queryParams[key] = userIdObjectOrValue.id;
          break;
        case 'uid2':
          queryParams[key] = userIdObjectOrValue.id;
          break;
        case 'lipb':
          queryParams[key] = userIdObjectOrValue.lipbid;
          if (Array.isArray(userIdObjectOrValue.segments) && userIdObjectOrValue.segments.length > 0) {
            const liveIntentSegments = 'liveintent:' + userIdObjectOrValue.segments.join('|');
            queryParams.sm = `${queryParams.sm ? queryParams.sm + ',' : ''}${liveIntentSegments}`;
          }
          break;
        case 'parrableId':
          queryParams[key] = userIdObjectOrValue.eid;
          break;
        case 'id5id':
          queryParams[key] = userIdObjectOrValue.uid;
          break;
        case 'novatiq':
          queryParams[key] = userIdObjectOrValue.snowflake;
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
  let auids = _map(bids, bid => bid.params.unit);

  queryParams.aus = _map(bids, bid => parseSizesInput(bid.mediaTypes.banner.sizes).join(',')).join('|');
  queryParams.divids = _map(bids, bid => encodeURIComponent(bid.adUnitCode)).join(',');
  // gpid
  queryParams.aucs = _map(bids, function (bid) {
    let gpid = deepAccess(bid, 'ortb2Imp.ext.data.pbadslot');
    return encodeURIComponent(gpid || '')
  }).join(',');

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
      let customParamsForBid = _map(Object.keys(bid.params.customParams), customKey => formatCustomParms(customKey, bid.params.customParams));
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

  enrichQueryWithFloors(queryParams, BANNER, bids);

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
  const videoMediaType = deepAccess(bid, `mediaTypes.video`);
  let queryParams = buildCommonQueryParamsFromBids([bid], bidderRequest);
  let oxVideoConfig = deepAccess(bid, 'params.video') || {};
  let context = deepAccess(bid, 'mediaTypes.video.context');
  let playerSize = deepAccess(bid, 'mediaTypes.video.playerSize');
  let width;
  let height;

  // normalize config for video size
  if (isArray(bid.sizes) && bid.sizes.length === 2 && !isArray(bid.sizes[0])) {
    width = parseInt(bid.sizes[0], 10);
    height = parseInt(bid.sizes[1], 10);
  } else if (isArray(bid.sizes) && isArray(bid.sizes[0]) && bid.sizes[0].length === 2) {
    width = parseInt(bid.sizes[0][0], 10);
    height = parseInt(bid.sizes[0][1], 10);
  } else if (isArray(playerSize) && playerSize.length === 2) {
    width = parseInt(playerSize[0], 10);
    height = parseInt(playerSize[1], 10);
  }

  let openRtbParams = {w: width, h: height};

  // legacy openrtb params could be in video, openrtb, or video.openrtb
  let legacyParams = bid.params.video || bid.params.openrtb || {};
  if (legacyParams.openrtb) {
    legacyParams = legacyParams.openrtb;
  }
  // support for video object or full openrtb object
  if (isArray(legacyParams.imp)) {
    legacyParams = legacyParams.imp[0].video;
  }
  Object.keys(legacyParams)
    .filter(param => includes(VIDEO_TARGETING, param))
    .forEach(param => openRtbParams[param] = legacyParams[param]);

  // 5.0 openrtb video params
  Object.keys(videoMediaType)
    .filter(param => includes(VIDEO_TARGETING, param))
    .forEach(param => openRtbParams[param] = videoMediaType[param]);

  let openRtbReq = {
    imp: [
      {
        video: openRtbParams
      }
    ]
  };

  queryParams['openrtb'] = JSON.stringify(openRtbReq);

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

  if (bid.params.test) {
    queryParams.vtest = 1;
  }

  let gpid = deepAccess(bid, 'ortb2Imp.ext.data.pbadslot');
  if (gpid) {
    queryParams.aucs = encodeURIComponent(gpid);
  }

  // each video bid makes a separate request
  enrichQueryWithFloors(queryParams, VIDEO, [bid]);

  return queryParams;
}

function createVideoBidResponses(response, {bid, startTime}) {
  let bidResponses = [];

  if (response !== undefined && response.vastUrl !== '' && response.pub_rev > 0) {
    let vastQueryParams = parseUrl(response.vastUrl).search || {};
    let bidResponse = {};
    bidResponse.requestId = bid.bidId;
    if (response.deal_id) {
      bidResponse.dealId = response.deal_id;
    }
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

function enrichQueryWithFloors(queryParams, mediaType, bids) {
  let customFloorsForAllBids = [];
  let hasCustomFloor = false;
  bids.forEach(function (bid) {
    let floor = getBidFloor(bid, mediaType);

    if (floor) {
      customFloorsForAllBids.push(floor);
      hasCustomFloor = true;
    } else {
      customFloorsForAllBids.push(0);
    }
  });
  if (hasCustomFloor) {
    queryParams.aumfs = customFloorsForAllBids.join(',');
  }
}

function getBidFloor(bidRequest, mediaType) {
  let floorInfo = {};
  const currency = config.getConfig('currency.adServerCurrency') || DEFAULT_CURRENCY;

  if (typeof bidRequest.getFloor === 'function') {
    floorInfo = bidRequest.getFloor({
      currency: currency,
      mediaType: mediaType,
      size: '*'
    });
  }
  let floor = floorInfo.floor || bidRequest.params.customFloor || 0;

  return Math.round(floor * 1000); // normalize to micro currency
}

registerBidder(spec);
