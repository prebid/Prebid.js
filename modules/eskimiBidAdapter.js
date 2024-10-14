import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';
import {getBidIdParameter, logInfo, mergeDeep} from '../src/utils.js';
import {hasPurpose1Consent} from '../src/utils/gdpr.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'eskimi';
const DEFAULT_BID_TTL = 30;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
const GVLID = 814;

const VIDEO_ORTB_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'plcmt',
  'protocols',
  'startdelay',
  'skip',
  'skipafter',
  'minbitrate',
  'maxbitrate',
  'delivery',
  'playbackmethod',
  'api',
  'linearity',
  'battr'
];

const BANNER_ORTB_PARAMS = [
  'battr'
];

const REGION_SUBDOMAIN_SUFFIX = {
  EU: '',
  US: '-us-e',
  APAC: '-asia'
};

export const spec = {
  code: BIDDER_CODE,
  aliases: ['eskimi'],
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} bid The bid that won the auction
   */
  onBidWon: function (bid) {
    logInfo('Bid won: ', bid);
    if (bid.burl) {
      utils.triggerPixel(bid.burl);
    }
  },
  onTimeout: function (timeoutData) {
    logInfo('Timeout: ', timeoutData);
  },
  onBidderError: function ({error, bidderRequest}) {
    logInfo('Error: ', error, bidderRequest);
  },
}

registerBidder(spec);

const CONVERTER = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL,
    currency: DEFAULT_CURRENCY
  },
  imp(buildImp, bidRequest, context) {
    let imp = buildImp(bidRequest, context);
    imp.secure = Number(window.location.protocol === 'https:');
    if (!imp.bidfloor && bidRequest.params.bidFloor) {
      imp.bidfloor = bidRequest.params.bidFloor;
      imp.bidfloorcur = getBidIdParameter('bidFloorCur', bidRequest.params).toUpperCase() || 'USD'
    }

    if (bidRequest.mediaTypes[VIDEO]) {
      imp = buildVideoImp(bidRequest, imp);
    } else if (bidRequest.mediaTypes[BANNER]) {
      imp = buildBannerImp(bidRequest, imp);
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    mergeDeep(req, {
      at: 1,
      ext: {
        pv: '$prebid.version$'
      }
    })
    const bid = context.bidRequests[0];
    if (bid.params.coppa) {
      utils.deepSetValue(req, 'regs.coppa', 1);
    }
    if (bid.params.test) {
      req.test = 1
    }
    return req;
  },
});

function isBidRequestValid(bidRequest) {
  return (isPlacementIdValid(bidRequest) && (isValidBannerRequest(bidRequest) || isValidVideoRequest(bidRequest)));
}

function isPlacementIdValid(bidRequest) {
  return utils.isNumber(bidRequest.params.placementId);
}

function isValidBannerRequest(bidRequest) {
  const bannerSizes = utils.deepAccess(bidRequest, `mediaTypes.${BANNER}.sizes`);
  return utils.isArray(bannerSizes) && bannerSizes.length > 0 && bannerSizes.every(size => utils.isNumber(size[0]) && utils.isNumber(size[1]));
}

function isValidVideoRequest(bidRequest) {
  const videoSizes = utils.deepAccess(bidRequest, `mediaTypes.${VIDEO}.playerSize`);

  return utils.isArray(videoSizes) && videoSizes.length > 0 && videoSizes.every(size => utils.isNumber(size[0]) && utils.isNumber(size[1]));
}

/**
 * Takes an array of valid bid requests, all of which are guaranteed to have passed the isBidRequestValid() test.
 * Make a server request from the list of BidRequests.
 *
 * @param {*} validBidRequests
 * @param {*} bidderRequest
 * @return ServerRequest Info describing the request to the server.
 */
function buildRequests(validBidRequests, bidderRequest) {
  let videoBids = validBidRequests.filter(bid => isVideoBid(bid));
  let bannerBids = validBidRequests.filter(bid => isBannerBid(bid));
  let requests = [];

  bannerBids.forEach(bid => {
    requests.push(createRequest([bid], bidderRequest, BANNER));
  });

  videoBids.forEach(bid => {
    requests.push(createRequest([bid], bidderRequest, VIDEO));
  });

  return requests;
}

function interpretResponse(response, request) {
  return CONVERTER.fromORTB({request: request.data, response: response.body}).bids;
}

function buildVideoImp(bidRequest, imp) {
  const videoAdUnitParams = utils.deepAccess(bidRequest, `mediaTypes.${VIDEO}`, {});
  const videoBidderParams = utils.deepAccess(bidRequest, `params.${VIDEO}`, {});

  const videoParams = {...videoAdUnitParams, ...videoBidderParams};

  const videoSizes = (videoAdUnitParams && videoAdUnitParams.playerSize) || [];

  if (videoSizes && videoSizes.length > 0) {
    utils.deepSetValue(imp, 'video.w', videoSizes[0][0]);
    utils.deepSetValue(imp, 'video.h', videoSizes[0][1]);
  }

  VIDEO_ORTB_PARAMS.forEach((param) => {
    if (videoParams.hasOwnProperty(param)) {
      utils.deepSetValue(imp, `video.${param}`, videoParams[param]);
    }
  });

  if (imp.video && videoParams?.context === 'outstream') {
    imp.video.plcmt = imp.video.plcmt || 4;
  }

  return {...imp};
}

function buildBannerImp(bidRequest, imp) {
  const bannerAdUnitParams = utils.deepAccess(bidRequest, `mediaTypes.${BANNER}`, {});
  const bannerBidderParams = utils.deepAccess(bidRequest, `params.${BANNER}`, {});

  const bannerParams = {...bannerAdUnitParams, ...bannerBidderParams};

  let sizes = bidRequest.mediaTypes.banner.sizes;

  if (sizes) {
    utils.deepSetValue(imp, 'banner.w', sizes[0][0]);
    utils.deepSetValue(imp, 'banner.h', sizes[0][1]);
  }

  BANNER_ORTB_PARAMS.forEach((param) => {
    if (bannerParams.hasOwnProperty(param)) {
      utils.deepSetValue(imp, `banner.${param}`, bannerParams[param]);
    }
  });

  return {...imp};
}

function createRequest(bidRequests, bidderRequest, mediaType) {
  const data = CONVERTER.toORTB({bidRequests, bidderRequest, context: {mediaType}})

  const bid = bidRequests.find((b) => b.params.placementId)
  if (!data.site) data.site = {}
  data.site.ext = {placementId: bid.params.placementId}

  if (bidderRequest.gdprConsent) {
    if (!data.user) data.user = {};
    if (!data.user.ext) data.user.ext = {};
    if (!data.regs) data.regs = {};
    if (!data.regs.ext) data.regs.ext = {};
    data.user.ext.consent = bidderRequest.gdprConsent.consentString;
    data.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
  }

  if (bid.params.bcat) data.bcat = bid.params.bcat;
  if (bid.params.badv) data.badv = bid.params.badv;
  if (bid.params.bapp) data.bapp = bid.params.bapp;

  return {
    method: 'POST',
    url: getBidRequestUrlByRegion(),
    data: data,
    options: {contentType: 'application/json;charset=UTF-8', withCredentials: false}
  }
}

function isVideoBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.video');
}

function isBannerBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.banner') || !isVideoBid(bid);
}

/**
 * @param syncOptions
 * @param responses
 * @param gdprConsent
 * @param uspConsent
 * @param gppConsent
 * @return {{type: (string), url: (*|string)}[]}
 */
function getUserSyncs(syncOptions, responses, gdprConsent, uspConsent, gppConsent) {
  if ((syncOptions.iframeEnabled || syncOptions.pixelEnabled) && hasSyncConsent(gdprConsent, uspConsent, gppConsent)) {
    let pixelType = syncOptions.iframeEnabled ? 'iframe' : 'image';
    let query = [];
    let syncUrl = getUserSyncUrlByRegion();
    // Attaching GDPR Consent Params in UserSync url
    if (gdprConsent) {
      query.push('gdpr=' + (gdprConsent.gdprApplies & 1));
      query.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
    }
    // CCPA
    if (uspConsent) {
      query.push('us_privacy=' + encodeURIComponent(uspConsent));
    }
    // GPP Consent
    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
      query.push('gpp=' + encodeURIComponent(gppConsent.gppString));
      query.push('gpp_sid=' + encodeURIComponent(gppConsent.applicableSections.join(',')));
    }
    return [{
      type: pixelType,
      url: `${syncUrl}${query.length > 0 ? '?' + query.join('&') : ''}`
    }];
  }
}

function hasSyncConsent(gdprConsent, uspConsent, gppConsent) {
  return hasPurpose1Consent(gdprConsent) && hasUspConsent(uspConsent) && hasGppConsent(gppConsent);
}

function hasUspConsent(uspConsent) {
  return typeof uspConsent !== 'string' || !(uspConsent[0] === '1' && uspConsent[2] === 'Y');
}

function hasGppConsent(gppConsent) {
  return (
    !(gppConsent && Array.isArray(gppConsent.applicableSections)) ||
    gppConsent.applicableSections.every((section) => typeof section === 'number' && section <= 5)
  );
}

/**
 * Get Bid Request endpoint url by region
 * @return {string}
 */
function getBidRequestUrlByRegion() {
  return `https://ittr${getRegionSubdomainSuffix()}.eskimi.com/prebidjs`;
}

/**
 * Get User Sync endpoint url by region
 * @return {string}
 */
function getUserSyncUrlByRegion() {
  return `https://ittpx${getRegionSubdomainSuffix()}.eskimi.com/sync?sp_id=137`;
}

/**
 * Get subdomain URL suffix by region
 * @return {string}
 */
function getRegionSubdomainSuffix() {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const region = timezone.split('/')[0];

    switch (region) {
      case 'Europe':
      case 'Africa':
      case 'Atlantic':
      case 'Arctic':
        return REGION_SUBDOMAIN_SUFFIX['EU'];
      case 'Asia':
      case 'Australia':
      case 'Antarctica':
      case 'Pacific':
      case 'Indian':
        return REGION_SUBDOMAIN_SUFFIX['APAC'];
      case 'America':
        return REGION_SUBDOMAIN_SUFFIX['US'];
      default:
        return REGION_SUBDOMAIN_SUFFIX['EU'];
    }
  } catch (err) {
    return REGION_SUBDOMAIN_SUFFIX['EU'];
  }
}
