import { _each, isEmpty, deepAccess } from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER = Object.freeze({
  CODE: 'adgrid',
  HOST: 'https://api-prebid.adgrid.io',
  REQUEST_METHOD: 'POST',
  REQUEST_ENDPOINT: '/api/v1/auction',
  SUPPORTED_MEDIA_TYPES: [BANNER, VIDEO],
});

const CURRENCY = Object.freeze({
  KEY: 'currency',
  US_DOLLAR: 'USD',
});

function isBidRequestValid(bid) {
  if (!bid || !bid.params) {
    return false;
  }

  return !!bid.params.domainId;
}

/**
 * Return some extra params
 */
function getAudience(validBidRequests, bidderRequest) {
  const params = {
    domain: deepAccess(bidderRequest, 'refererInfo.page')
  };

  if (deepAccess(bidderRequest, 'gdprConsent.gdprApplies')) {
    params.gdpr = 1;
    params.gdprConsent = deepAccess(bidderRequest, 'gdprConsent.consentString');
  }

  if (deepAccess(bidderRequest, 'uspConsent')) {
    params.usp = deepAccess(bidderRequest, 'uspConsent');
  }

  if (deepAccess(validBidRequests[0], 'schain')) {
    params.schain = deepAccess(validBidRequests[0], 'schain');
  }

  if (deepAccess(validBidRequests[0], 'userId')) {
    params.userIds = deepAccess(validBidRequests[0], 'userId');
  }

  if (deepAccess(validBidRequests[0], 'userIdAsEids')) {
    params.userEids = deepAccess(validBidRequests[0], 'userIdAsEids');
  }

  if (bidderRequest.gppConsent) {
    params.gpp = bidderRequest.gppConsent.gppString;
    params.gppSid = bidderRequest.gppConsent.applicableSections?.toString();
  } else if (bidderRequest.ortb2?.regs?.gpp) {
    params.gpp = bidderRequest.ortb2.regs.gpp;
    params.gppSid = bidderRequest.ortb2.regs.gpp_sid;
  }

  return params;
}

function buildRequests(validBidRequests, bidderRequest) {
  const currencyObj = config.getConfig(CURRENCY.KEY);
  const currency = (currencyObj && currencyObj.adServerCurrency) ? currencyObj.adServerCurrency : 'USD';
  const bids = [];

  _each(validBidRequests, bid => {
    bids.push(getBidData(bid))
  });

  const bidsParams = Object.assign({}, {
    url: window.location.href,
    timeout: bidderRequest.timeout,
    ts: new Date().getTime(),
    device: {
      size: [
        window.screen.width,
        window.screen.height
      ]
    },
    bids
  });

  // Add currency if not USD
  if (currency != null && currency != CURRENCY.US_DOLLAR) {
    bidsParams.cur = currency;
  }

  bidsParams.audience = getAudience(validBidRequests, bidderRequest);

  // Passing geo location data if found in prebid config
  bidsParams.geodata = config.getConfig('adgGeodata') || {};

  return Object.assign({}, bidderRequest, {
    method: BIDDER.REQUEST_METHOD,
    url: `${BIDDER.HOST}${BIDDER.REQUEST_ENDPOINT}`,
    data: bidsParams,
    currency: currency,
    options: {
      withCredentials: false,
      contentType: 'application/json'
    }
  });
}

function interpretResponse(response, bidRequest) {
  let bids = response.body;
  const bidResponses = [];

  if (isEmpty(bids)) {
    return bidResponses;
  }

  if (typeof bids !== 'object') {
    return bidResponses;
  }

  bids = bids.bids;

  bids.forEach((adUnit) => {
    const bidResponse = {
      requestId: adUnit.bidId,
      cpm: Number(adUnit.cpm),
      width: adUnit.width,
      height: adUnit.height,
      ttl: 300,
      creativeId: adUnit.creativeId,
      netRevenue: true,
      currency: adUnit.currency || bidRequest.currency,
      mediaType: adUnit.mediaType
    };

    if (adUnit.mediaType == 'video') {
      if (adUnit.admUrl) {
        bidResponse.vastUrl = adUnit.admUrl;
      } else {
        bidResponse.vastXml = adUnit.adm;
      }
    } else {
      bidResponse.ad = adUnit.ad;
    }

    bidResponses.push(bidResponse);
  });

  return bidResponses;
}

function getBidData(bid) {
  const bidData = {
    requestId: bid.bidId,
    tid: bid.ortb2Imp?.ext?.tid,
    deviceW: bid.ortb2?.device?.w,
    deviceH: bid.ortb2?.device?.h,
    deviceUa: bid.ortb2?.device?.ua,
    domain: bid.ortb2?.site?.publisher?.domain,
    domainId: bid.params.domainId,
    code: bid.adUnitCode
  };

  if (bid.mediaTypes != null) {
    if (bid.mediaTypes.banner != null) {
      bidData.mediaType = 'banner';
      bidData.sizes = bid.mediaTypes.banner.sizes;
    } else if (bid.mediaTypes.video != null) {
      bidData.mediaType = 'video';
      bidData.sizes = bid.mediaTypes.video.playerSize;
      bidData.videoData = bid.mediaTypes.video;
      bidData.videoParams = bid.params.video;
    }
  }

  return bidData;
}

export const spec = {
  code: BIDDER.CODE,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  supportedMediaTypes: BIDDER.SUPPORTED_MEDIA_TYPES
};

registerBidder(spec);
