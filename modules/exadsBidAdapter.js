import * as utils from '../src/utils.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER = 'exadsadserver';

const PARTNERS = {
  RTB_2_4: 'rtb_2_4'
};

const adPartnerHandlers = {
  [PARTNERS.RTB_2_4]: {
    request: handleReqRTB2Dot4,
    response: handleResRTB2Dot4,
    validation: handleValidRTB2Dot4,
  }
};

function handleReqRTB2Dot4(validBidRequest, endpointUrl, bidderRequest) {
  utils.logInfo(`Calling endpoint for rtb_2_4:`, endpointUrl);
  const gdprConsent = getGdprConsentChoice(bidderRequest);
  const envParams = getEnvParams();

  // Make a dynamic bid request to the ad partner's endpoint
  let bidRequestData = {
    'id': validBidRequest.bidId, // NOT bid.bidderRequestId or bid.auctionId
    'at': 1,
    'imp': [],
    'site': {
      'id': validBidRequest.params.siteId,
      'domain': envParams.domain,
      'cat': validBidRequest.params.catIab,
      'page': envParams.page,
      'keywords': validBidRequest.params.keywords
    },
    'device': {
      'ua': envParams.userAgent,
      'ip': validBidRequest.params.userIp,
      'geo': {
        'country': validBidRequest.params.country
      },
      'language': envParams.lang,
      'os': envParams.osName,
      'js': 0,
      'ext': {
        'accept_language': envParams.language
      }
    },
    'user': {
      'id': validBidRequest.params.userId,
    },
    'ext': {
      'sub': 0,
      'prebid': {
        'channel': {
          'name': 'pbjs',
          'version': '$prebid.version$'
        }
      }
    }
  };

  if (gdprConsent && gdprConsent.gdprApplies) {
    bidRequestData.user['ext'] = {
      consent: gdprConsent.consentString
    }
  }

  // Banner setup
  const bannerMediaType = utils.deepAccess(validBidRequest, 'mediaTypes.banner');
  if (bannerMediaType != null) {
    bidRequestData.imp = bannerMediaType.sizes.map(size => {
      let ext;

      if (validBidRequest.params.image_output || validBidRequest.params.video_output) {
        ext = {
          image_output: validBidRequest.params.image_output ? validBidRequest.params.image_output : undefined,
          video_output: validBidRequest.params.video_output ? validBidRequest.params.video_output : undefined,
        }
      }

      return ({
        'id': validBidRequest.params.impressionId,
        'bidfloor': validBidRequest.params.bidfloor,
        'bidfloorcur': validBidRequest.params.bidfloorcur,
        'banner': {
          'w': size[0],
          'h': size[1],
          'mimes': validBidRequest.params.mimes ? validBidRequest.params.mimes : undefined,
          ext
        },
      });
    });
  }

  const nativeMediaType = utils.deepAccess(validBidRequest, 'mediaTypes.native');

  if (nativeMediaType != null) {
    const nativeVersion = '1.2';

    const native = {
      'native': {
        'ver': nativeVersion,
        'plcmttype': 4,
        'plcmtcnt': validBidRequest.params.native.plcmtcnt
      }
    };

    native.native.assets = bidRequestData.imp = nativeMediaType.ortb.assets.map(asset => {
      const newAsset = asset;
      if (newAsset.img != null) {
        newAsset.img.wmin = newAsset.img.h;
        newAsset.img.hmin = newAsset.img.w;
      }
      return newAsset;
    });

    const imp = [{
      'id': validBidRequest.params.impressionId,
      'bidfloor': validBidRequest.params.bidfloor,
      'bidfloorcur': validBidRequest.params.bidfloorcur,
      'native': {
        'request': JSON.stringify(native),
        'ver': nativeVersion
      },
    }];

    bidRequestData.imp = imp;
  };

  const videoMediaType = utils.deepAccess(validBidRequest, 'mediaTypes.video');

  if (videoMediaType != null) {
    const imp = [{
      'id': validBidRequest.params.impressionId,
      'bidfloor': validBidRequest.params.bidfloor,
      'bidfloorcur': validBidRequest.params.bidfloorcur,
      'video': {
        'mimes': validBidRequest.params.stream.video.mimes,
        'protocols': validBidRequest.params.stream.protocols,
      },
      'ext': validBidRequest.params.stream.ext
    }];

    bidRequestData.imp = imp;
  }

  utils.logInfo('PAYLOAD', bidRequestData, JSON.stringify(bidRequestData));
  utils.logInfo('FINAL URL', endpointUrl);

  return makeBidRequest(endpointUrl, bidRequestData);
};

function handleResRTB2Dot4(serverResponse, request) {
  utils.logInfo('on handleResRTB_2_4 -> request:', request);
  utils.logInfo('on handleResRTB_2_4 -> request json data:', JSON.parse(request.data));
  utils.logInfo('on handleResRTB_2_4 -> serverResponse:', serverResponse);

  let bidResponses = [];

  if (serverResponse.hasOwnProperty('body') && serverResponse.body.hasOwnProperty('id')) {
    utils.logInfo('Ad server response', serverResponse.body.id);
    utils.logInfo('serverResponse.body.seatbid[0].bid[0]', serverResponse.body.seatbid[0].bid[0]);

    const bidRq = JSON.parse(request.data);
    const requestId = serverResponse.body.id;
    const bidData = serverResponse.body.seatbid[0].bid[0];
    const currency = serverResponse.body.cur;
    const bidResponseAd = bidData.adm;
    const pixelUrl = bidData.nurl.replace(/^http:\/\//i, 'https://');

    const bannerInfo = utils.deepAccess(bidRq.imp[0], 'banner');
    const nativeInfo = utils.deepAccess(bidRq.imp[0], 'native');
    const videoInfo = utils.deepAccess(bidRq.imp[0], 'video');

    let w; let h = 0;
    let mediaType = '';
    const native = {};

    if (bannerInfo != null) {
      w = bidRq.imp[0].banner.w;
      h = bidRq.imp[0].banner.h;
      mediaType = BANNER;
    } else if (nativeInfo != null) {
      const reqNative = JSON.parse(bidResponseAd);
      reqNative.native.assets.forEach(asset => {
        if (asset.img != null) {
          const imgAsset = JSON.parse(bidRq.imp[0].native.request)
            .native.assets.filter(asset => asset.img != null).map(asset => asset.img);
          w = imgAsset[0].w;
          h = imgAsset[0].h;
          native.image = {
            url: asset.img.url,
            height: h,
            width: w
          }
        } else if (asset.title != null) {
          native.title = asset.title.text;
        } else if (asset.data != null) {
          native.body = asset.data.value;
        } else {
          utils.logWarn('bidResponse->', 'wrong asset type or null');
        }
      });
      mediaType = NATIVE;
    } else if (videoInfo != null) {
      mediaType = VIDEO;
    }

    const bidResponse = {
      requestId: requestId,
      currency: currency,
      ad: bidData.adm,
      cpm: bidData.price,
      creativeId: bidData.crid,
      cid: bidData.cid,
      width: w,
      ttl: 360,
      height: h,
      netRevenue: true,
      mediaType: mediaType,
      nurl: pixelUrl
    };

    if (mediaType == 'native') {
      native.clickUrl = bidData.adomain[0];
      bidResponse.native = native;
    }

    if (mediaType == 'video') {
      bidResponse.vastXml = bidData.adm;
      bidResponse.width = bidData.w;
      bidResponse.height = bidData.h;
    }

    utils.logInfo('bidResponse->', bidResponse);

    bidResponses.push(bidResponse);
  } else {
    utils.logInfo('NO Ad server response ->', serverResponse.body.id);
  }

  utils.logInfo('interpretResponse -> bidResponses:', bidResponses);

  return bidResponses;
}

function makeBidRequest(url, data) {
  const payloadString = JSON.stringify(data);

  return {
    method: 'POST',
    url: url,
    data: payloadString,
  }
}

function getUrl(adPartner, bid) {
  let endpointUrlMapping = {
    [PARTNERS.RTB_2_4]: bid.params.endpoint + '?idzone=' + bid.params.zoneId + '&fid=' + bid.params.fid
  };

  return endpointUrlMapping[adPartner] ? endpointUrlMapping[adPartner] : 'defaultEndpoint';
}

function getEnvParams() {
  const envParams = {
    lang: '',
    userAgent: '',
    osName: '',
    page: '',
    domain: '',
    language: ''
  };

  envParams.domain = window.location.hostname;
  envParams.page = window.location.protocol + '//' + window.location.host + window.location.pathname;
  envParams.lang = navigator.language.indexOf('-') > -1
    ? navigator.language.split('-')[0]
    : navigator.language;
  envParams.userAgent = navigator.userAgent;

  if (envParams.userAgent.match(/Windows/i)) {
    envParams.osName = 'Windows';
  } else if (envParams.userAgent.match(/Mac OS|Macintosh/i)) {
    envParams.osName = 'MacOS';
  } else if (envParams.userAgent.match(/Unix/i)) {
    envParams.osName = 'Unix';
  } else if (envParams.userAgent.userAgent.match(/Android/i)) {
    envParams.osName = 'Android';
  } else if (envParams.userAgent.userAgent.match(/iPhone|iPad|iPod/i)) {
    envParams.osName = 'iOS';
  } else if (envParams.userAgent.userAgent.match(/Linux/i)) {
    envParams.osName = 'Linux';
  } else {
    envParams.osName = 'Unknown';
  }

  let browserLanguage = navigator.language || navigator.userLanguage;
  let acceptLanguage = browserLanguage.replace('_', '-');

  envParams.language = acceptLanguage;

  utils.logInfo('Domain -> ', envParams.domain);
  utils.logInfo('Page -> ', envParams.page);
  utils.logInfo('Lang -> ', envParams.lang);
  utils.logInfo('OS -> ', envParams.osName);
  utils.logInfo('User Agent -> ', envParams.userAgent);
  utils.logInfo('Primary Language -> ', envParams.language);

  return envParams;
}

export const imps = new Map();

/*
  Common mandatory parameters:
  - endpoint
  - userIp
  - userIp - the minimum constraint is having the propery, empty or not
  - zoneId
  - partner
  - fid
  - siteId
  - impressionId
  - country
  - bidfloor
  - bidfloorcur
  - mediaTypes?.banner or mediaTypes?.native or mediaTypes?.video

  for native parameters
  - assets - it should contain the img property

  for video parameters
  - mimes - it has to contain one mime type at least
  - procols - it should contain one protocol at least

*/
function handleValidRTB2Dot4(bid) {
  const bannerInfo = bid.mediaTypes?.banner;
  const nativeInfo = bid.mediaTypes?.native;
  const videoInfo = bid.mediaTypes?.video;
  const isValid = (
    hasValue(bid.params.endpoint) &&
    hasValue(bid.params.userIp) &&
    bid.params.hasOwnProperty('userIp') &&
    hasValue(bid.params.zoneId) &&
    hasValue(bid.params.partner) &&
    hasValue(bid.params.fid) &&
    hasValue(bid.params.siteId) &&
    hasValue(bid.params.impressionId) &&
    hasValue(bid.params.country) &&
    hasValue(bid.params.country.length > 0) &&
    (bannerInfo || nativeInfo || videoInfo) &&
    (hasValue(bid.params.bidfloor) && hasValue(bid.params.bidfloorcur)) &&
    (nativeInfo ? bid.params.native &&
      nativeInfo.ortb.assets &&
      nativeInfo.ortb.assets.some(asset => !!asset.img) : true) &&
    (videoInfo ? (bid.params.stream &&
      hasValue(bid.params.stream.video) &&
      bid.params.stream.video.mimes &&
      bid.params.stream.video.mimes.length > 0 &&
      bid.params.stream.protocols &&
      bid.params.stream.protocols.length > 0) : true));

  if (!isValid) {
    utils.logError('Validation Error');
  }

  return isValid;
}

function hasValue(value) {
  return (
    value !== undefined &&
    value !== null
  );
}

function getGdprConsentChoice(bidderRequest) {
  const hasGdprConsent =
    hasValue(bidderRequest) &&
    hasValue(bidderRequest.gdprConsent);

  if (hasGdprConsent) {
    return bidderRequest.gdprConsent;
  }

  return null;
}

export const spec = {
  aliases: ['exads'], // short code
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],
  isBidRequestValid: function (bid) {
    utils.logInfo('on isBidRequestValid -> bid:', bid);

    if (!bid.params.partner) {
      utils.logError('Validation Error', 'bid.params.partner missed');
      return false;
    } else if (!Object.values(PARTNERS).includes(bid.params.partner)) {
      utils.logError('Validation Error', 'bid.params.partner is not valid');
      return false;
    }

    let adPartner = bid.params.partner;

    if (adPartnerHandlers[adPartner] && adPartnerHandlers[adPartner]['validation']) {
      return adPartnerHandlers[adPartner]['validation'](bid);
    } else {
      // Handle unknown or unsupported ad partners
      return false;
    }
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    utils.logInfo('on buildRequests -> validBidRequests:', validBidRequests);
    utils.logInfo('on buildRequests -> bidderRequest:', bidderRequest);

    return validBidRequests.map(bid => {
      let adPartner = bid.params.partner;

      imps.set(bid.params.impressionId, adPartner);

      let endpointUrl = getUrl(adPartner, bid);

      // Call the handler for the ad partner, passing relevant parameters
      if (adPartnerHandlers[adPartner]['request']) {
        return adPartnerHandlers[adPartner]['request'](bid, endpointUrl, bidderRequest);
      } else {
        // Handle unknown or unsupported ad partners
        return null;
      }
    });
  },
  interpretResponse: function (serverResponse, request) {
    const bid = JSON.parse(request.data);
    let adPartner = imps.get(bid.imp[0].id);
    imps.delete(bid.imp[0].id);

    // Call the handler for the ad partner, passing relevant parameters
    if (adPartnerHandlers[adPartner]['response']) {
      return adPartnerHandlers[adPartner]['response'](serverResponse, request);
    } else {
      // Handle unknown or unsupported ad partners
      return null;
    }
  },
  onTimeout: function (timeoutData) {
    utils.logWarn(`onTimeout -> timeoutData:`, timeoutData);
  },
  onBidWon: function (bid) {
    utils.logInfo(`onBidWon -> bid:`, bid);
    if (bid['nurl']) {
      utils.triggerPixel(bid['nurl']);
    }
  },
  onSetTargeting: function (bid) {
    utils.logInfo(`onSetTargeting -> bid:`, bid);
  }
};

registerBidder({
  code: BIDDER,
  ...spec
});
