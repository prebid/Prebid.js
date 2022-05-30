import {deepAccess, getBidIdParameter, isArray, logError} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import {find} from '../src/polyfill.js';

const ENDPOINT = `https://hb.justbidit.xyz:8843/prebid`;
const BIDDER_CODE = 'waardex';

const isBidRequestValid = bid => {
  if (!bid.bidId) {
    logError(BIDDER_CODE + ': bid.bidId should be non-empty');
    return false;
  }

  if (!bid.params) {
    logError(BIDDER_CODE + ': bid.params should be non-empty');
    return false;
  }

  if (!+bid.params.zoneId) {
    logError(BIDDER_CODE + ': bid.params.zoneId should be non-empty Number');
    return false;
  }

  if (bid.mediaTypes && bid.mediaTypes.video) {
    if (!bid.mediaTypes.video.playerSize) {
      logError(BIDDER_CODE + ': bid.mediaTypes.video.playerSize should be non-empty');
      return false;
    }

    if (!isArray(bid.mediaTypes.video.playerSize)) {
      logError(BIDDER_CODE + ': bid.mediaTypes.video.playerSize should be an Array');
      return false;
    }

    if (!bid.mediaTypes.video.playerSize[0]) {
      logError(BIDDER_CODE + ': bid.mediaTypes.video.playerSize should be non-empty');
      return false;
    }

    if (!isArray(bid.mediaTypes.video.playerSize[0])) {
      logError(BIDDER_CODE + ': bid.mediaTypes.video.playerSize should be non-empty Array');
      return false;
    }
  }

  return true;
};

const buildRequests = (validBidRequests, bidderRequest) => {
  const dataToSend = {
    ...getCommonBidsData(bidderRequest),
    bidRequests: getBidRequestsToSend(validBidRequests)
  };

  let zoneId = '';
  if (validBidRequests[0] && validBidRequests[0].params && +validBidRequests[0].params.zoneId) {
    zoneId = +validBidRequests[0].params.zoneId;
  }

  return {method: 'POST', url: `${ENDPOINT}?pubId=${zoneId}`, data: dataToSend};
};

const getCommonBidsData = bidderRequest => {
  const payload = {
    ua: navigator.userAgent || '',
    language: navigator.language && navigator.language.indexOf('-') !== -1 ? navigator.language.split('-')[0] : '',
  };

  if (bidderRequest && bidderRequest.refererInfo) {
    payload.referer = encodeURIComponent(bidderRequest.refererInfo.referer);
  }

  if (bidderRequest && bidderRequest.uspConsent) {
    payload.us_privacy = bidderRequest.uspConsent;
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    payload.gdpr_consent = {
      consent_string: bidderRequest.gdprConsent.consentString,
      consent_required: bidderRequest.gdprConsent.gdprApplies,
    }
  }

  payload.coppa = !!config.getConfig('coppa');

  return payload;
};

const getBidRequestsToSend = validBidRequests => {
  return validBidRequests.map(getBidRequestToSend);
};

const getBidRequestToSend = validBidRequest => {
  const result = {
    bidId: validBidRequest.bidId,
    bidfloor: 0,
    position: parseInt(validBidRequest.params.position) || 1,
    instl: parseInt(validBidRequest.params.instl) || 0,
  };

  if (validBidRequest.mediaTypes[BANNER]) {
    result[BANNER] = createBannerObject(validBidRequest.mediaTypes[BANNER]);
  }

  if (validBidRequest.mediaTypes[VIDEO]) {
    result[VIDEO] = createVideoObject(validBidRequest.mediaTypes[VIDEO], validBidRequest.params);
  }

  return result;
};

const createBannerObject = banner => {
  return {
    sizes: transformSizes(banner.sizes),
  };
};

const transformSizes = requestSizes => {
  let result = [];

  if (Array.isArray(requestSizes) && !Array.isArray(requestSizes[0])) {
    result[0] = {
      width: parseInt(requestSizes[0], 10) || 0,
      height: parseInt(requestSizes[1], 10) || 0,
    };
  } else if (Array.isArray(requestSizes) && Array.isArray(requestSizes[0])) {
    result = requestSizes.map(item => {
      return {
        width: parseInt(item[0], 10) || 0,
        height: parseInt(item[1], 10) || 0,
      }
    });
  }

  return result;
};

const createVideoObject = (videoMediaTypes, videoParams) => {
  return {
    w: deepAccess(videoMediaTypes, 'playerSize')[0][0],
    h: deepAccess(videoMediaTypes, 'playerSize')[0][1],
    mimes: getBidIdParameter('mimes', videoParams) || ['application/javascript', 'video/mp4', 'video/webm'],
    minduration: getBidIdParameter('minduration', videoParams) || 0,
    maxduration: getBidIdParameter('maxduration', videoParams) || 500,
    protocols: getBidIdParameter('protocols', videoParams) || [2, 3, 5, 6],
    startdelay: getBidIdParameter('startdelay', videoParams) || 0,
    placement: getBidIdParameter('placement', videoParams) || videoMediaTypes.context === 'outstream' ? 3 : 1,
    skip: getBidIdParameter('skip', videoParams) || 1,
    skipafter: getBidIdParameter('skipafter', videoParams) || 0,
    minbitrate: getBidIdParameter('minbitrate', videoParams) || 0,
    maxbitrate: getBidIdParameter('maxbitrate', videoParams) || 3500,
    delivery: getBidIdParameter('delivery', videoParams) || [2],
    playbackmethod: getBidIdParameter('playbackmethod', videoParams) || [1, 2, 3, 4],
    api: getBidIdParameter('api', videoParams) || [2],
    linearity: getBidIdParameter('linearity', videoParams) || 1
  };
};

const interpretResponse = (serverResponse, bidRequest) => {
  try {
    const responseBody = serverResponse.body;

    if (!responseBody.seatbid || !responseBody.seatbid[0]) {
      return [];
    }

    return responseBody.seatbid[0].bid
      .map(openRtbBid => {
        const hbRequestBid = getHbRequestBid(openRtbBid, bidRequest.data);
        if (!hbRequestBid) return;

        const hbRequestMediaType = getHbRequestMediaType(hbRequestBid);
        if (!hbRequestMediaType) return;

        return mapOpenRtbToHbBid(openRtbBid, hbRequestMediaType, hbRequestBid);
      })
      .filter(x => x);
  } catch (e) {
    return [];
  }
};

const getHbRequestBid = (openRtbBid, bidRequest) => {
  return find(bidRequest.bidRequests, x => x.bidId === openRtbBid.impid);
};

const getHbRequestMediaType = hbRequestBid => {
  if (hbRequestBid.banner) return BANNER;
  if (hbRequestBid.video) return VIDEO;
  return null;
};

const mapOpenRtbToHbBid = (openRtbBid, mediaType, hbRequestBid) => {
  let bid = null;

  if (mediaType === BANNER) {
    bid = mapOpenRtbBannerToHbBid(openRtbBid, hbRequestBid);
  }

  if (mediaType === VIDEO) {
    bid = mapOpenRtbVideoToHbBid(openRtbBid, hbRequestBid);
  }

  return isBidValid(bid) ? bid : null;
};

const mapOpenRtbBannerToHbBid = (openRtbBid, hbRequestBid) => {
  return {
    mediaType: BANNER,
    requestId: hbRequestBid.bidId,
    cpm: openRtbBid.price,
    currency: 'USD',
    width: openRtbBid.w,
    height: openRtbBid.h,
    creativeId: openRtbBid.crid,
    netRevenue: true,
    ttl: 3000,
    ad: openRtbBid.adm,
    dealId: openRtbBid.dealid,
    meta: {
      cid: openRtbBid.cid,
      adomain: openRtbBid.adomain,
      mediaType: openRtbBid.ext && openRtbBid.ext.mediaType
    },
  };
};

const mapOpenRtbVideoToHbBid = (openRtbBid, hbRequestBid) => {
  return {
    mediaType: VIDEO,
    requestId: hbRequestBid.bidId,
    cpm: openRtbBid.price,
    currency: 'USD',
    width: hbRequestBid.video.w,
    height: hbRequestBid.video.h,
    ad: openRtbBid.adm,
    ttl: 3000,
    creativeId: openRtbBid.crid,
    netRevenue: true,
    vastUrl: getVastUrl(openRtbBid),
    // An impression tracking URL to serve with video Ad
    // Optional; only usable with vastUrl and requires prebid cache to be enabled
    // Example: "https://vid.exmpale.com/imp/134"
    // For now we don't need this field
    // vastImpUrl: null,
    vastXml: openRtbBid.adm,
    dealId: openRtbBid.dealid,
    meta: {
      cid: openRtbBid.cid,
      adomain: openRtbBid.adomain,
      networkId: null,
      networkName: null,
      agencyId: null,
      agencyName: null,
      advertiserId: null,
      advertiserName: null,
      advertiserDomains: null,
      brandId: null,
      brandName: null,
      primaryCatId: null,
      secondaryCatIds: null,
      mediaType: 'video',
    },
  }
};

const getVastUrl = openRtbBid => {
  const adm = (openRtbBid.adm || '').trim();

  if (adm.startsWith('http')) {
    return adm;
  } else {
    return null
  }
};

const isBidValid = bid => {
  if (!bid.requestId || !bid.cpm || !bid.creativeId || !bid.ttl || !bid.currency) {
    return false;
  }

  return Boolean(bid.width && bid.height && bid.ad);
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
};

registerBidder(spec);
