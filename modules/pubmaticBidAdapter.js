import { logWarn, isStr, isArray, deepAccess, deepSetValue, isBoolean, isInteger, logInfo, logError, deepClone, uniques, generateUUID, isPlainObject, isFn, getWindowTop } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE, ADPOD } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';
import { isViewabilityMeasurable, getViewability } from '../libraries/percentInView/percentInView.js';
import { bidderSettings } from '../src/bidderSettings.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { NATIVE_ASSET_TYPES, NATIVE_IMAGE_TYPES, PREBID_NATIVE_DATA_KEYS_TO_ORTB, NATIVE_KEYS_THAT_ARE_NOT_ASSETS, NATIVE_KEYS } from '../src/constants.js';
import { addDealCustomTargetings, addPMPDeals } from '../libraries/dealUtils/dealUtils.js';
import { getConnectionType } from '../libraries/connectionInfo/connectionUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 */

const BIDDER_CODE = 'pubmatic';
const LOG_WARN_PREFIX = 'PubMatic: ';
const ENDPOINT = 'https://hbopenbid.pubmatic.com/translator?source=prebid-client';
const USER_SYNC_URL_IFRAME = 'https://ads.pubmatic.com/AdServer/js/user_sync.html?kdntuid=1&p=';
const USER_SYNC_URL_IMAGE = 'https://image8.pubmatic.com/AdServer/ImgSync?p=';
const DEFAULT_CURRENCY = 'USD';
const AUCTION_TYPE = 1;
const UNDEFINED = undefined;
const DEFAULT_WIDTH = 0;
const DEFAULT_HEIGHT = 0;
const PUBLICATION = 'pubmatic'; // Your publication on Blue Billywig, potentially with environment (e.g. publication.bbvms.com or publication.test.bbvms.com)
const RENDERER_URL = 'https://pubmatic.bbvms.com/r/'.concat('$RENDERER', '.js'); // URL of the renderer application
const MSG_VIDEO_PLCMT_MISSING = 'Video.plcmt param missing';
const PREBID_NATIVE_DATA_KEY_VALUES = Object.values(PREBID_NATIVE_DATA_KEYS_TO_ORTB);
const DEFAULT_TTL = 360;
const DEFAULT_GZIP_ENABLED = true;
const CUSTOM_PARAMS = {
  'kadpageurl': '', // Custom page url
  'gender': '', // User gender
  'yob': '', // User year of birth
  'lat': '', // User location - Latitude
  'lon': '', // User Location - Longitude
  'wiid': '' // OpenWrap Wrapper Impression ID
};

const dealChannel = {
  1: 'PMP',
  5: 'PREF',
  6: 'PMPG'
};

const MEDIATYPE_TTL = {
  'banner': 360,
  'video': 1800,
  'native': 1800
};

let conf = {};
let blockedIabCategories = [];
let allowedIabCategories = [];
let pubId = 0;
export let cpmAdjustment;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL
  },
  imp(buildImp, bidRequest, context) {
    const { kadfloor, currency, adSlot = '', deals, dctr, pmzoneid, hashedKey } = bidRequest.params;
    const { adUnitCode, mediaTypes, rtd, ortb2 } = bidRequest;
    const imp = buildImp(bidRequest, context);

    // Check if the imp object does not have banner, video, or native

    if (!imp.hasOwnProperty('banner') && !imp.hasOwnProperty('video') && !imp.hasOwnProperty('native')) {
      return null;
    }
    imp.ext = imp.ext || {};
    imp.ext.pbcode = adUnitCode;
    if (deals) addPMPDeals(imp, deals, LOG_WARN_PREFIX);
    if (dctr) addDealCustomTargetings(imp, dctr, LOG_WARN_PREFIX);
    const customTargetings = shouldAddDealTargeting(ortb2);
    if (customTargetings) {
      const targetingValues = Object.values(customTargetings).filter(Boolean);
      if (targetingValues.length) {
        imp.ext['key_val'] = imp.ext['key_val']
          ? `${imp.ext['key_val']}|${targetingValues.join('|')}`
          : targetingValues.join('|');
      }
    }
    if (rtd?.jwplayer) addJWPlayerSegmentData(imp, rtd.jwplayer);
    imp.bidfloor = _parseSlotParam('kadfloor', kadfloor);
    imp.bidfloorcur = currency ? _parseSlotParam('currency', currency) : DEFAULT_CURRENCY;
    setFloorInImp(imp, bidRequest);
    if (imp.hasOwnProperty('banner')) updateBannerImp(imp.banner, adSlot);
    if (imp.hasOwnProperty('video')) updateVideoImp(mediaTypes?.video, adUnitCode, imp);
    if (imp.hasOwnProperty('native')) updateNativeImp(imp, mediaTypes?.native);
    if (imp.hasOwnProperty('banner') || imp.hasOwnProperty('video')) addViewabilityToImp(imp, adUnitCode, bidRequest?.sizes);
    if (pmzoneid) imp.ext.pmZoneId = pmzoneid;
    setImpTagId(imp, adSlot.trim(), hashedKey);
    setImpFields(imp);
    // check for battr data types
    ['banner', 'video', 'native'].forEach(key => {
      if (imp[key]?.battr && !Array.isArray(imp[key].battr)) {
        delete imp[key].battr;
      }
    });
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    // Optimize the imps array before building the request
    const optimizedImps = optimizeImps(imps, bidderRequest);
    const request = buildRequest(optimizedImps, bidderRequest, context);
    if (blockedIabCategories.length || request.bcat) {
      const validatedBCategories = validateBlockedCategories([...(blockedIabCategories || []), ...(request.bcat || [])]);
      if (validatedBCategories.length) request.bcat = validatedBCategories;
    }
    if (allowedIabCategories.length || request.acat) {
      const validatedACategories = validateAllowedCategories([...(allowedIabCategories || []), ...(request.acat || [])]);
      if (validatedACategories.length) request.acat = validatedACategories;
    }
    reqLevelParams(request);
    updateUserSiteDevice(request, context?.bidRequests);
    addExtenstionParams(request, bidderRequest);
    const marketPlaceEnabled = bidderRequest?.bidderCode
      ? bidderSettings.get(bidderRequest.bidderCode, 'allowAlternateBidderCodes') : undefined;
    if (marketPlaceEnabled) updateRequestExt(request, bidderRequest);
    if (bidderRequest?.ortb2?.ext?.prebid?.previousauctioninfo) {
      deepSetValue(request, 'ext.previousAuctionInfo', bidderRequest.ortb2.ext.prebid.previousauctioninfo);
    }
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    if (bidResponse.meta) bidResponse.meta.mediaType = bidResponse.mediaType;
    updateResponseWithCustomFields(bidResponse, bid, context);
    const { mediaType, playerWidth, playerHeight } = bidResponse;
    const { params, adUnitCode, mediaTypes } = context?.bidRequest;
    if (mediaType === VIDEO) {
      if (!bidResponse.width) bidResponse.width = playerWidth;
      if (!bidResponse.height) bidResponse.height = playerHeight;
      const { context, maxduration } = mediaTypes[mediaType];
      if (context === 'outstream' && params.outstreamAU && adUnitCode) {
        bidResponse.rendererCode = params.outstreamAU;
        bidResponse.renderer = BB_RENDERER.newRenderer(bidResponse.rendererCode, adUnitCode);
      }
      assignDealTier(bidResponse, context, maxduration);
    }
    if (mediaType === NATIVE && bid.adm) {
      try {
        const adm = JSON.parse(bid.adm.replace(/\\/g, ''));
        bidResponse.native = { ortb: { ...adm.native } };
      } catch (ex) {
        logWarn(`${LOG_WARN_PREFIX}Error: Cannot parse native response for ad response: ${bid.adm}`);
        return;
      }
      bidResponse.width = bid.w || DEFAULT_WIDTH;
      bidResponse.height = bid.h || DEFAULT_HEIGHT;
    }
    return bidResponse;
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    return buildResponse(bidResponses, ortbResponse, context);
  },
  overrides: {
    imp: {
      bidfloor: false,
      extBidfloor: false
    },
    bidResponse: {
      native: false
    }
  }
});

export const shouldAddDealTargeting = (ortb2) => {
  const imSegmentData = ortb2?.user?.ext?.data?.im_segments;
  const iasBrandSafety = ortb2?.site?.ext?.data?.['ias-brand-safety'];
  const hasImSegments = imSegmentData && isArray(imSegmentData) && imSegmentData.length;
  const hasIasBrandSafety = typeof iasBrandSafety === 'object' && Object.keys(iasBrandSafety).length;
  const result = {};
  if (hasImSegments) result.im_segments = `im_segments=${imSegmentData.join(',')}`;
  if (hasIasBrandSafety) result['ias-brand-safety'] = Object.entries(iasBrandSafety).map(([key, value]) => `${key}=${value}`).join('|');
  return Object.keys(result).length ? result : undefined;
}

export function _calculateBidCpmAdjustment(bid) {
  if (!bid) return;

  const { originalCurrency, currency, cpm, originalCpm, meta } = bid;
  const convertedCpm = originalCurrency !== currency && isFn(bid.getCpmInNewCurrency)
    ? bid.getCpmInNewCurrency(originalCurrency)
    : cpm;

  const mediaType = bid.mediaType;
  const metaMediaType = meta?.mediaType;

  cpmAdjustment = cpmAdjustment || {
    currency,
    originalCurrency,
    adjustment: []
  };

  const adjustmentValue = Number(((originalCpm - convertedCpm) / originalCpm).toFixed(2));

  const adjustmentEntry = {
    cpmAdjustment: adjustmentValue,
    mediaType,
    metaMediaType,
    cpm: convertedCpm,
    originalCpm
  };

  const existingIndex = cpmAdjustment?.adjustment?.findIndex(
    (entry) => entry?.mediaType === mediaType && entry?.metaMediaType === metaMediaType
  );

  existingIndex !== -1
    ? cpmAdjustment.adjustment.splice(existingIndex, 1, adjustmentEntry)
    : cpmAdjustment.adjustment.push(adjustmentEntry);
}

const handleImageProperties = asset => {
  const imgProps = {};
  if (asset.aspect_ratios && isArray(asset.aspect_ratios) && asset.aspect_ratios.length) {
    const { min_width: minWidth, min_height: minHeight } = asset.aspect_ratios[0];
    if (isInteger(minWidth) && isInteger(minHeight)) {
      imgProps.wmin = minWidth;
      imgProps.hmin = minHeight;
    }
    // eslint-disable-next-line camelcase
    imgProps.ext = { aspectratios: asset.aspect_ratios.filter(({ ratio_width, ratio_height }) => ratio_width && ratio_height).map(({ ratio_width, ratio_height }) => `${ratio_width}:${ratio_height}`) };
  }
  imgProps.w = asset.w || asset.width;
  imgProps.h = asset.h || asset.height;
  if (asset.sizes && asset.sizes.length === 2 && isInteger(asset.sizes[0]) && isInteger(asset.sizes[1])) {
    imgProps.w = asset.sizes[0];
    imgProps.h = asset.sizes[1];
    delete imgProps.wmin;
    delete imgProps.hmin;
  }
  asset.ext && (imgProps.ext = asset.ext);
  asset.mimes && (imgProps.mimes = asset.mimes);
  return imgProps;
}

const toOrtbNativeRequest = legacyNativeAssets => {
  const ortb = { ver: '1.2', assets: [] };
  for (const key in legacyNativeAssets) {
    if (NATIVE_KEYS_THAT_ARE_NOT_ASSETS.includes(key)) continue;
    if (!NATIVE_KEYS.hasOwnProperty(key) && !PREBID_NATIVE_DATA_KEY_VALUES.includes(key)) {
      logWarn(`${LOG_WARN_PREFIX}: Unrecognized asset: ${key}. Ignored.`);
      continue;
    }

    const asset = legacyNativeAssets[key];
    const required = asset.required && isBoolean(asset.required) ? 1 : 0;
    const ortbAsset = { id: ortb.assets.length, required };

    if (key in PREBID_NATIVE_DATA_KEYS_TO_ORTB) {
      ortbAsset.data = { type: NATIVE_ASSET_TYPES[PREBID_NATIVE_DATA_KEYS_TO_ORTB[key]], ...asset.len && { len: asset.len }, ...asset.ext && { ext: asset.ext } };
    } else if (key === 'icon' || key === 'image') {
      ortbAsset.img = {
        type: key === 'icon' ? NATIVE_IMAGE_TYPES.ICON : NATIVE_IMAGE_TYPES.MAIN,
        ...handleImageProperties(asset)
      };
    } else if (key === 'title') {
      ortbAsset.title = { len: asset.len || 140, ...asset.ext && { ext: asset.ext } };
    } else if (key === 'ext') {
      ortbAsset.ext = asset;
      delete ortbAsset.required;
    }
    ortb.assets.push(ortbAsset);
  }
  return ortb;
}

const setImpFields = imp => {
  imp.displaymanager ||= 'Prebid.js';
  imp.displaymanagerver ||= '$prebid.version$';
  const gptAdSlot = imp.ext?.data?.adserver?.adslot;
  if (gptAdSlot) imp.ext.dfp_ad_unit_code = gptAdSlot;
  // Delete ext.data in case of no-adserver
  if (imp.ext?.data && Object.keys(imp.ext.data).length === 0) delete imp.ext.data
}

function removeGranularFloor(imp, mediaTypes) {
  mediaTypes.forEach(mt => {
    if (imp[mt]?.ext && imp[mt].ext.bidfloor === imp.bidfloor && imp[mt].ext.bidfloorcur === imp.bidfloorcur) {
      delete imp[mt].ext;
    }
  })
}

const setFloorInImp = (imp, bid) => {
  let bidFloor = -1;
  const requestedMediatypes = Object.keys(bid.mediaTypes);
  const isMultiFormatRequest = requestedMediatypes.length > 1
  if (typeof bid.getFloor === 'function' && !config.getConfig('pubmatic.disableFloors')) {
    [BANNER, VIDEO, NATIVE].forEach(mediaType => {
      if (!imp.hasOwnProperty(mediaType)) return;

      const sizes = (mediaType === 'banner'
        ? imp[mediaType]?.format?.map(({ w, h }) => [w, h])
        : ['*']) || ['*'];

      sizes.forEach(size => {
        const floorInfo = bid.getFloor({ currency: imp.bidfloorcur, mediaType, size });
        logInfo(LOG_WARN_PREFIX, 'floor from floor module returned for mediatype:', mediaType, ' and size:', size, ' is: currency', floorInfo.currency, 'floor', floorInfo.floor);

        if (isPlainObject(floorInfo) && floorInfo?.currency === imp.bidfloorcur && !isNaN(parseInt(floorInfo.floor))) {
          const mediaTypeFloor = parseFloat(floorInfo.floor);
          if (isMultiFormatRequest && mediaType !== BANNER) {
            logInfo(LOG_WARN_PREFIX, 'floor from floor module returned for mediatype:', mediaType, 'is : ', mediaTypeFloor, 'with currency :', imp.bidfloorcur);
            imp[mediaType]['ext'] = {'bidfloor': mediaTypeFloor, 'bidfloorcur': imp.bidfloorcur};
          }
          logInfo(LOG_WARN_PREFIX, 'floor from floor module:', mediaTypeFloor, 'previous floor value', bidFloor, 'Min:', Math.min(mediaTypeFloor, bidFloor));
          bidFloor = bidFloor === -1 ? mediaTypeFloor : Math.min(mediaTypeFloor, bidFloor);
          logInfo(LOG_WARN_PREFIX, 'new floor value:', bidFloor);
        }
      });
      if (isMultiFormatRequest && mediaType === BANNER) {
        imp[mediaType]['ext'] = {'bidfloor': bidFloor, 'bidfloorcur': imp.bidfloorcur};
      }
    });
  }
  // Determine the highest value between imp.bidfloor and the floor from the floor module.
  // Since we're using Math.max, it's safe if no floor is returned from the floor module, as bidFloor defaults to -1.
  if (imp.bidfloor) {
    logInfo(LOG_WARN_PREFIX, 'Comparing floors:', 'from floor module:', bidFloor, 'impObj.bidfloor:', imp.bidfloor, 'Max:', Math.max(bidFloor, imp.bidfloor));
    bidFloor = Math.max(bidFloor, imp.bidfloor);
  }

  // Set imp.bidfloor only if bidFloor is greater than 0.
  imp.bidfloor = (bidFloor > 0) ? bidFloor : UNDEFINED;
  logInfo(LOG_WARN_PREFIX, 'Updated imp.bidfloor:', imp.bidfloor);
  // remove granular floor if impression level floor is same as granular
  if (isMultiFormatRequest) removeGranularFloor(imp, requestedMediatypes);
}

const updateBannerImp = (bannerObj, adSlot) => {
  const slot = adSlot.split(':');
  let splits = slot[0]?.split('@');
  splits = splits?.length === 2 ? splits[1].split('x') : splits.length === 3 ? splits[2].split('x') : [];
  const primarySize = bannerObj.format[0];
  if (splits.length !== 2 || (parseInt(splits[0]) === 0 && parseInt(splits[1]) === 0)) {
    bannerObj.w = primarySize.w;
    bannerObj.h = primarySize.h;
  } else {
    bannerObj.w = parseInt(splits[0]);
    bannerObj.h = parseInt(splits[1]);
  }

  bannerObj.format = bannerObj.format.filter(
    (item) => !(item.w === bannerObj.w && item.h === bannerObj.h)
  );
  if (!bannerObj.format?.length) delete bannerObj.format;
  bannerObj.pos ??= 0;
}

const setImpTagId = (imp, adSlot, hashedKey) => {
  const splits = adSlot.split(':')[0].split('@');
  imp.tagid = hashedKey || splits[0];
}

const updateNativeImp = (imp, nativeParams) => {
  if (!nativeParams?.ortb) {
    imp.native.request = JSON.stringify(toOrtbNativeRequest(nativeParams));
  }
  if (nativeParams?.ortb) {
    const nativeConfig = JSON.parse(imp.native.request);
    const { assets } = nativeConfig;
    if (!assets?.some(asset => asset.title || asset.img || asset.data || asset.video)) {
      logWarn(`${LOG_WARN_PREFIX}: Native assets object is empty or contains invalid objects`);
      delete imp.native;
    } else {
      imp.native.request = JSON.stringify({ ver: '1.2', ...nativeConfig });
    }
  }
}

const updateVideoImp = (videoParams, adUnitCode, imp) => {
  const videoImp = imp.video;
  if (!deepAccess(videoParams, 'plcmt')) {
    logWarn(MSG_VIDEO_PLCMT_MISSING + ' for ' + adUnitCode);
  };
  if (!videoParams || (!videoImp.w && !videoImp.h)) {
    delete imp.video;
    logWarn(`${LOG_WARN_PREFIX}Error: Missing ${!videoParams ? 'video config params' : 'video size params (playersize or w&h)'} for adunit: ${adUnitCode} with mediaType set as video. Ignoring video impression in the adunit.`);
  }
}

const addJWPlayerSegmentData = (imp, jwplayer) => {
  const jwSegData = jwplayer?.targeting;
  if (!jwSegData || !jwSegData.segments?.length) return;
  const jwMark = 'jw-';
  const contentId = `${jwMark}id=${jwSegData.content.id}`;
  const segmentData = jwSegData.segments.map(segment => `${jwMark}${segment}=1`).join('|');
  const jwPlayerData = `${contentId}|${segmentData}`;
  imp.ext = imp.ext || {};
  imp.ext.key_val = imp.ext.key_val ? `${imp.ext.key_val}|${jwPlayerData}` : jwPlayerData;
};

const updateRequestExt = (req, bidderRequest) => {
  const allBiddersList = ['all'];
  const allowedBiddersList = bidderSettings.get(bidderRequest.bidderCode, 'allowedAlternateBidderCodes');
  const biddersList = isArray(allowedBiddersList)
    ? allowedBiddersList.map(val => val.trim().toLowerCase()).filter(uniques)
    : allBiddersList;
  req.ext.marketplace = {
    allowedbidders: (biddersList.includes('*') || biddersList.includes('all')) ? allBiddersList : [...new Set(['pubmatic', ...biddersList.filter(val => val && val.trim())])]
  }
}

const reqLevelParams = (req) => {
  deepSetValue(req, 'at', AUCTION_TYPE);
  deepSetValue(req, 'cur', [DEFAULT_CURRENCY]);
  req.test = window.location.href.includes('pubmaticTest=true') ? 1 : undefined;
  if (req.source && !Object.keys(req.source).length) delete req.source;
  if (req.app?.publisher) req.app.publisher.id = pubId;
};

const updateUserSiteDevice = (req, bidRequest) => {
  const { gender, yob, pubId, refURL, kadpageurl } = conf;
  const { user } = req;
  if (req.device) {
    Object.assign(req.device, { js: 1, connectiontype: getConnectionType() });
  }
  req.user = {
    ...req.user,
    gender: user?.gender || gender?.trim() || UNDEFINED,
    yob: user?.yob || _parseSlotParam('yob', yob)
  };

  // start - IH eids for Prebid
  const userIdAsEids = deepAccess(bidRequest, '0.userIdAsEids');
  if (bidRequest.length && userIdAsEids?.length && !req.user.ext?.eids) {
    req.user.ext = req.user.ext || {};
    req.user.ext.eids = userIdAsEids;
  } // end - IH eids for Prebid

  if (req.site?.publisher) {
    req.site.ref = req.site.ref || refURL;
    req.site.publisher.id = pubId?.trim();
  }
  // if kadpageurl present then update site.page url with kadpageurl
  if (req.site?.page && kadpageurl) req.site.page = kadpageurl.trim();
  // Check if geo information is present in device or user object
  if (req.device.geo && !req.user.geo) {
    req.user.geo = req.device.geo;
  } else if (req.user.geo && !req.device.geo) {
    req.device.geo = req.user.geo;
  }
}

const updateResponseWithCustomFields = (res, bid, ctx) => {
  const { ortbRequest, seatbid } = ctx;
  res.referrer = ortbRequest.site?.ref || '';
  res.sspID = res.partnerImpId = bid.id || '';
  res.ad = bid.adm;
  res.pm_dspid = bid.ext?.dspid ? bid.ext.dspid : null;
  res.pm_seat = seatbid.seat;
  if (!res.creativeId) res.creativeId = bid.id;
  if (Number(res.ttl) === DEFAULT_TTL) res.ttl = MEDIATYPE_TTL[res.mediaType];
  if (bid.dealid) {
    res.dealChannel = bid.ext?.deal_channel ? dealChannel[bid.ext.deal_channel] || null : 'PMP';
  }
  if (seatbid.ext?.buyid) {
    res.adserverTargeting = { 'hb_buyid_pubmatic': seatbid.ext.buyid }
  }
  if (bid.ext?.marketplace) {
    res.bidderCode = bid.ext.marketplace;
  }

  // add meta fields
  // NOTE: We will not receive below fields from the translator response also not sure on what will be the key names for these in the response,
  // when we needed we can add it back.
  // New fields added, assignee fields name may change
  // if (bid.ext.networkName) res.meta.networkName = bid.ext.networkName;
  // if (bid.ext.advertiserName) res.meta.advertiserName = bid.ext.advertiserName;
  // if (bid.ext.agencyName) res.meta.agencyName = bid.ext.agencyName;
  // if (bid.ext.brandName) res.meta.brandName = bid.ext.brandName;
  if (bid.ext) {
    const { dspid, dchain, dsa, ibv } = bid.ext;
    if (dspid) res.meta.networkId = res.meta.demandSource = dspid;
    if (dchain) res.meta.dchain = dchain;
    if (dsa && Object.keys(dsa).length) res.meta.dsa = dsa;
    if (ibv) {
      res.ext = res.ext || {};
      res.ext['ibv'] = ibv;
      res.meta.mediaType = VIDEO;
    }
  }

  const advid = seatbid.seat || bid.ext?.advid;
  if (advid) res.meta.advertiserId = res.meta.agencyId = res.meta.buyerId = advid;

  if (isNonEmptyArray(bid.adomain)) {
    res.meta.clickUrl = res.meta.brandId = bid.adomain[0];
  }

  if (bid.cat && isNonEmptyArray(bid.cat)) {
    res.meta.secondaryCatIds = bid.cat;
    res.meta.primaryCatId = bid.cat[0];
  }
}

const addExtenstionParams = (req, bidderRequest) => {
  const { profId, verId, wiid } = conf;
  req.ext = {
    epoch: new Date().getTime(), // Sending epoch timestamp in request.ext object
    wrapper: {
      profile: profId ? parseInt(profId) : undefined,
      version: verId ? parseInt(verId) : undefined,
      wiid: wiid,
      wv: '$$REPO_AND_VERSION$$',
      wp: 'pbjs',
      biddercode: bidderRequest?.bidderCode
    },
    cpmAdjustment: cpmAdjustment
  }
}

/**
 * In case of adpod video context, assign prebiddealpriority to the dealtier property of adpod-video bid,
 * so that adpod module can set the hb_pb_cat_dur targetting key.
 * @param {*} bid
 * @param {*} context
 * @param {*} maxduration
 * @returns
 */
const assignDealTier = (bid, context, maxduration) => {
  if (!bid?.ext?.prebiddealpriority || !FEATURES.VIDEO) return;
  if (context !== ADPOD) return;

  const duration = bid?.ext?.video?.duration || maxduration;
  // if (!duration) return;
  bid.video = {
    context: ADPOD,
    durationSeconds: duration,
    dealTier: bid.ext.prebiddealpriority
  };
}

const validateAllowedCategories = (acat) => {
  return [...new Set(
    acat
      .filter(item => {
        if (typeof item === 'string') {
          return true;
        } else {
          logWarn(LOG_WARN_PREFIX + 'acat: Each category should be a string, ignoring category: ' + item);
          return false;
        }
      })
      .map(item => item.trim())
  )];
};

const validateBlockedCategories = (bcats) => {
  bcats = bcats.map(item => typeof item === 'string' ? item.trim() : item);
  const droppedCategories = bcats.filter(item => typeof item !== 'string' || item.length < 3);
  logWarn(LOG_WARN_PREFIX + 'bcat: Each category must be a string with a length greater than 3, ignoring ' + droppedCategories);
  return [...new Set(bcats.filter(item => typeof item === 'string' && item.length >= 3))];
}

/**
 * Optimizes the impressions array by consolidating impressions for the same ad unit and media type
 * @param {Array} imps - Array of impression objects
 * @param {Object} bidderRequest - The bidder request object
 * @returns {Array} - Optimized impressions array
 */
function optimizeImps(imps, bidderRequest) {
  const optimizedImps = {};

  bidderRequest.bids.forEach(bid => {
    const correspondingImp = imps.find(imp => imp.id === bid.bidId);
    if (!correspondingImp) return;
    const uniqueKey = bid.adUnitId;
    if (!optimizedImps[uniqueKey]) {
      optimizedImps[uniqueKey] = deepClone(correspondingImp);
      return;
    }
    const baseImp = optimizedImps[uniqueKey];

    if (isStr(correspondingImp.tagid)) {
      baseImp.tagid = correspondingImp.tagid;
    }

    const copyPropertytoPath = (propPath, propName, toMerge) => {
      if (!correspondingImp[propPath] || !correspondingImp[propPath][propName]) return;
      if (!baseImp[propPath]) baseImp[propPath] = {};
      if (toMerge) {
        if (!baseImp[propPath][propName]) baseImp[propPath][propName] = [];
        baseImp[propPath][propName] = [...baseImp[propPath][propName], ...correspondingImp[propPath][propName]];
      } else {
        baseImp[propPath][propName] = correspondingImp[propPath][propName];
      }
    };
    copyPropertytoPath('ext', 'key_val', false);
    copyPropertytoPath('ext', 'pmZoneId', false);
    copyPropertytoPath('pmp', 'deals', true);
  });
  return Object.values(optimizedImps);
}
// BB stands for Blue BillyWig
const BB_RENDERER = {
  bootstrapPlayer: function(bid) {
    const config = {
      code: bid.adUnitCode,
      vastXml: bid.vastXml || null,
      vastUrl: bid.vastUrl || null,
    };

    if (!config.vastXml && !config.vastUrl) {
      logWarn(`${LOG_WARN_PREFIX}: No vastXml or vastUrl on bid, bailing...`);
      return;
    }

    const rendererId = BB_RENDERER.getRendererId(PUBLICATION, bid.rendererCode);
    const ele = document.getElementById(bid.adUnitCode); // NB convention

    const renderer = window.bluebillywig.renderers.find(r => r._id === rendererId);
    if (renderer) renderer.bootstrap(config, ele);
    else logWarn(`${LOG_WARN_PREFIX}: Couldn't find a renderer with ${rendererId}`);
  },

  newRenderer: function(rendererCode, adUnitCode) {
    const rendererUrl = RENDERER_URL.replace('$RENDERER', rendererCode);
    const renderer = Renderer.install({ url: rendererUrl, loaded: false, adUnitCode });
    try {
      renderer.setRender(BB_RENDERER.outstreamRender);
    } catch (err) {
      logWarn(`${LOG_WARN_PREFIX}: Error tying to setRender on renderer`, err);
    }
    return renderer;
  },

  outstreamRender: function(bid) {
    bid.renderer.push(() => BB_RENDERER.bootstrapPlayer(bid));
  },

  getRendererId: function(pub, renderer) {
    return `${pub}-${renderer}`; // NB convention!
  }
};

function _parseSlotParam(paramName, paramValue) {
  if (!isStr(paramValue)) {
    paramValue && logWarn(LOG_WARN_PREFIX + 'Ignoring param key: ' + paramName + ', expects string-value, found ' + typeof paramValue);
    return UNDEFINED;
  }

  const parsers = {
    pmzoneid: () => paramValue.split(',').slice(0, 50).map(id => id.trim()).join(),
    kadfloor: () => parseFloat(paramValue),
    lat: () => parseFloat(paramValue),
    lon: () => parseFloat(paramValue),
    yob: () => parseInt(paramValue)
  };
  return parsers[paramName]?.() || paramValue;
}

function isNonEmptyArray(test) {
  if (isArray(test) === true) {
    if (test.length > 0) {
      return true;
    }
  }
  return false;
}

const getPublisherId = (bids) =>
  Array.isArray(bids) && bids.length > 0
    ? bids.find(bid => bid.params?.publisherId?.trim())?.params.publisherId || null
    : null;

function getGzipSetting() {
  // Check bidder-specific configuration
  try {
    const gzipSetting = deepAccess(config.getBidderConfig(), 'pubmatic.gzipEnabled');
    if (gzipSetting !== undefined) {
      const gzipValue = String(gzipSetting).toLowerCase().trim();
      if (gzipValue === 'true' || gzipValue === 'false') {
        const parsedValue = gzipValue === 'true';
        logInfo('PubMatic: Using bidder-specific gzipEnabled setting:', parsedValue);
        return parsedValue;
      }
      logWarn('PubMatic: Invalid gzipEnabled value in bidder config:', gzipSetting);
    }
  } catch (e) { logWarn('PubMatic: Error accessing bidder config:', e); }

  logInfo('PubMatic: Using default gzipEnabled setting:', DEFAULT_GZIP_ENABLED);
  return DEFAULT_GZIP_ENABLED;
}

const _handleCustomParams = (params, conf) => {
  Object.keys(CUSTOM_PARAMS).forEach(key => {
    const value = params[key];
    if (value) {
      if (isStr(value)) {
        conf[key] = value;
      } else {
        logWarn(`${LOG_WARN_PREFIX}Ignoring param: ${key} with value: ${CUSTOM_PARAMS[key]}, expects string value, found ${typeof value}`);
      }
    }
  });
  return conf;
};

/**
 * Gets the minimum size from an array of sizes
 * @param {Array} sizes - Array of size objects with w and h properties
 * @returns {Object} The smallest size object
 */
function _getMinSize(sizes) {
  return (!sizes || !sizes.length ? { w: 0, h: 0 } : sizes.reduce((min, size) => size.h * size.w < min.h * min.w ? size : min, sizes[0]));
}

/**
 * Measures viewability for an element and adds it to the imp object at the ext level
 * @param {Object} imp - The impression object
 * @param {string} adUnitCode - The ad unit code for element identification
 * @param {Object} sizes - Sizes object with width and height properties
 */
export const addViewabilityToImp = (imp, adUnitCode, sizes) => {
  let elementSize = { w: 0, h: 0 };

  if (imp.video?.w > 0 && imp.video?.h > 0) {
    elementSize.w = imp.video.w;
    elementSize.h = imp.video.h;
  } else {
    elementSize = _getMinSize(sizes);
  }
  const element = document.getElementById(adUnitCode);
  if (!element) return;

  const viewabilityAmount = isViewabilityMeasurable(element)
    ? getViewability(element, getWindowTop(), elementSize)
    : 'na';

  if (!imp.ext) {
    imp.ext = {};
  }

  // Add viewability data at the imp.ext level
  imp.ext.viewability = {
    amount: isNaN(viewabilityAmount) ? viewabilityAmount : Math.round(viewabilityAmount)
  };
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: 76,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  /**
   * Determines whether or not the given bid request is valid. Valid bid request must have placementId and hbid
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: bid => {
    if (!(bid && bid.params)) return false;
    const { publisherId } = bid.params;
    const mediaTypes = bid.mediaTypes || {};
    const videoMediaTypes = mediaTypes[VIDEO] || {};
    if (!isStr(publisherId)) {
      logWarn(LOG_WARN_PREFIX + 'Error: publisherId is mandatory and cannot be numeric (wrap it in quotes in your config). Call to OpenBid will not be sent for ad unit: ' + JSON.stringify(bid));
      return false;
    }
    if (FEATURES.VIDEO && mediaTypes.hasOwnProperty(VIDEO)) {
      // bid.mediaTypes.video.mimes OR bid.params.video.mimes should be present and must be a non-empty array
      const mediaTypesVideoMimes = deepAccess(bid, 'mediaTypes.video.mimes');
      const paramsVideoMimes = deepAccess(bid, 'params.video.mimes');
      if (!isNonEmptyArray(mediaTypesVideoMimes) && !isNonEmptyArray(paramsVideoMimes)) {
        logWarn(LOG_WARN_PREFIX + 'Error: For video ads, bid.mediaTypes.video.mimes OR bid.params.video.mimes should be present and must be a non-empty array. Call to OpenBid will not be sent for ad unit:' + JSON.stringify(bid));
        return false;
      }
      if (!videoMediaTypes.context) {
        logError(`${LOG_WARN_PREFIX}: No context specified in bid. Rejecting bid: `, bid);
        return false;
      }
      if (videoMediaTypes.context === 'outstream' && !isStr(bid.params.outstreamAU) &&
!bid.renderer && !videoMediaTypes.renderer) {
        if (mediaTypes.hasOwnProperty(BANNER) || mediaTypes.hasOwnProperty(NATIVE)) {
          delete mediaTypes[VIDEO];
          logWarn(`${LOG_WARN_PREFIX}: for "outstream" bids either outstreamAU parameter must be provided or ad unit supplied renderer is required. Rejecting mediatype Video of bid: `, bid);
          return true;
        }
        logError(`${LOG_WARN_PREFIX}: for "outstream" bids either outstreamAU parameter must be provided or ad unit supplied renderer is required. Rejecting bid: `, bid);
        return false;
      }
    }
    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Array} validBidRequests - an array of bids
   * @param {Object} bidderRequest - bidder request object
   * @return {ServerRequest} Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    const { page, ref } = bidderRequest?.refererInfo || {};
    const { publisherId, profId, verId } = bidderRequest?.bids?.[0]?.params || {};
    pubId = publisherId?.trim() || getPublisherId(bidderRequest?.bids)?.trim();
    const wiid = generateUUID();
    let bid;
    blockedIabCategories = [];
    allowedIabCategories = [];
    conf = {
      pageURL: page || window.location.href,
      refURL: ref || window.document.referrer,
      pubId,
      kadpageurl: page || window.location.href,
      profId: profId,
      verId: verId
    }
    validBidRequests.forEach(originalBid => {
      originalBid.params.wiid = originalBid.params.wiid || bidderRequest.auctionId || wiid;
      bid = deepClone(originalBid);
      _handleCustomParams(bid.params, conf);
      const { bcat, acat } = bid.params;
      if (bcat) {
        blockedIabCategories = blockedIabCategories.concat(bcat);
      }
      if (acat) {
        allowedIabCategories = allowedIabCategories.concat(acat);
      }
    })
    const data = converter.toORTB({ validBidRequests, bidderRequest });

    const serverRequest = {
      method: 'POST',
      url: ENDPOINT,
      data: data,
      bidderRequest: bidderRequest,
      options: {
        endpointCompression: getGzipSetting()
      },
    };
    return data?.imp?.length ? serverRequest : null;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} response A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (response, request) => {
    const { bids } = converter.fromORTB({ response: response.body, request: request.data });
    const fledgeAuctionConfigs = deepAccess(response.body, 'ext.fledge_auction_configs');
    if (fledgeAuctionConfigs) {
      return {
        bids,
        paapi: Object.entries(fledgeAuctionConfigs).map(([bidId, cfg]) => ({
          bidId,
          config: { auctionSignals: {}, ...cfg }
        }))
      };
    }
    return bids;
  },

  /**
   * Register User Sync.
   */
  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent, gppConsent) => {
    let syncurl = pubId;

    // Attaching GDPR Consent Params in UserSync url
    if (gdprConsent) {
      syncurl += `&gdpr=${gdprConsent.gdprApplies ? 1 : 0}&gdpr_consent=${encodeURIComponent(gdprConsent.consentString || '')}`;
    }

    // CCPA
    if (uspConsent) {
      syncurl += `&us_privacy=${encodeURIComponent(uspConsent)}`;
    }

    // GPP Consent
    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
      syncurl += `&gpp=${encodeURIComponent(gppConsent.gppString)}&gpp_sid=${encodeURIComponent(gppConsent.applicableSections.join(','))}`;
    }

    // coppa compliance
    if (config.getConfig('coppa') === true) {
      syncurl += '&coppa=1';
    }

    const type = syncOptions.iframeEnabled ? 'iframe' : 'image';
    const url = (type === 'iframe' ? USER_SYNC_URL_IFRAME : USER_SYNC_URL_IMAGE) + syncurl;
    return [{ type, url }];
  },

  onBidWon: (bid) => {
    _calculateBidCpmAdjustment(bid);
  }
};

registerBidder(spec);
