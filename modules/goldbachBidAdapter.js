import { ajax } from '../src/ajax.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';

/* General config */
const IS_LOCAL_MODE = false;
const BIDDER_CODE = 'goldbach';
const GVLID = 580;
const URL = 'https://goldlayer-api.prod.gbads.net/bid/pbjs';
const URL_LOCAL = 'http://localhost:3000/bid/pbjs';
const LOGGING_PERCENTAGE_REGULAR = 0.0001;
const LOGGING_PERCENTAGE_ERROR = 0.001;
const LOGGING_URL = 'https://l.da-services.ch/pb';

/* Renderer settings */
const RENDERER_OPTIONS = {
  OUTSTREAM_GP: {
    MIN_HEIGHT: 300,
    MIN_WIDTH: 300,
    URL: 'https://goldplayer.prod.gbads.net/scripts/goldplayer.js'
  }
};

/* Event types */
const EVENTS = {
  BID_WON: 'bid_won',
  TARGETING: 'targeting_set',
  RENDER: 'creative_render',
  TIMEOUT: 'timeout',
  ERROR: 'error'
};

/* Targeting mapping */
const TARGETING_KEYS = {
  // request level
  GEO_LAT: 'lat',
  GEO_LON: 'long',
  GEO_ZIP: 'zip',
  CONNECTION_TYPE: 'connection',
  // slot level
  VIDEO_DURATION: 'duration',
};

/* Native mapping */
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
      CTA: 5,
      SPONSORED: 6,
    }
  }
};

/* Mapping */
const convertToCustomTargeting = (bidderRequest) => {
  const customTargeting = {};

  // geo - lat/long
  if (bidderRequest?.ortb2?.device?.geo) {
    if (bidderRequest?.ortb2?.device?.geo?.lon) {
      customTargeting[TARGETING_KEYS.GEO_LON] = bidderRequest.ortb2.device.geo.lon;
    }
    if (bidderRequest?.ortb2?.device?.geo?.lat) {
      customTargeting[TARGETING_KEYS.GEO_LAT] = bidderRequest.ortb2.device.geo.lat;
    }
  }

  // connection
  if (bidderRequest?.ortb2?.device?.connectiontype) {
    switch (bidderRequest.ortb2.device.connectiontype) {
      case 1:
        customTargeting[TARGETING_KEYS.CONNECTION_TYPE] = 'ethernet';
        break;
      case 2:
        customTargeting[TARGETING_KEYS.CONNECTION_TYPE] = 'wifi';
        break;
      case 4:
        customTargeting[TARGETING_KEYS.CONNECTION_TYPE] = '2G';
        break;
      case 5:
        customTargeting[TARGETING_KEYS.CONNECTION_TYPE] = '3G';
        break;
      case 6:
        customTargeting[TARGETING_KEYS.CONNECTION_TYPE] = '4G';
        break;
      case 0:
      case 3:
      default:
        break;
    }
  }

  // zip
  if (bidderRequest?.ortb2?.device?.geo?.zip) {
    customTargeting[TARGETING_KEYS.GEO_ZIP] = bidderRequest.ortb2.device.geo.zip;
  }

  return customTargeting;
}

const convertToCustomSlotTargeting = (validBidRequest) => {
  const customTargeting = {};

  // Video duration
  if (validBidRequest.mediaTypes?.[VIDEO]) {
    if (validBidRequest.params?.video?.maxduration) {
      const duration = validBidRequest.params?.video?.maxduration;
      if (duration <= 15) customTargeting[TARGETING_KEYS.VIDEO_DURATION] = 'M';
      if (duration > 15 && duration <= 30) customTargeting[TARGETING_KEYS.VIDEO_DURATION] = 'XL';
      if (duration > 30) customTargeting[TARGETING_KEYS.VIDEO_DURATION] = 'XXL';
    }
  }

  return customTargeting
}

const convertToProprietaryData = (validBidRequests, bidderRequest) => {
  const requestData = {
    mock: false,
    debug: false,
    timestampStart: undefined,
    timestampEnd: undefined,
    config: {
      publisher: {
        id: undefined,
      }
    },
    gdpr: {
      consent: undefined,
      consentString: undefined,
    },
    contextInfo: {
      contentUrl: undefined,
      bidderResources: undefined,
    },
    appInfo: {
      id: undefined,
    },
    userInfo: {
      ip: undefined,
      ua: undefined,
      ifa: undefined,
      ppid: [],
    },
    slots: [],
    targetings: {},
  };

  // Set timestamps
  requestData.timestampStart = Date.now();
  requestData.timestampEnd = Date.now() + (!isNaN(bidderRequest.timeout) ? Number(bidderRequest.timeout) : 0);

  // Set config
  if (validBidRequests[0]?.params?.publisherId) {
    requestData.config.publisher.id = validBidRequests[0].params.publisherId;
  }

  // Set GDPR
  if (bidderRequest?.gdprConsent) {
    requestData.gdpr.consent = bidderRequest.gdprConsent.gdprApplies;
    requestData.gdpr.consentString = bidderRequest.gdprConsent.consentString;
  }

  // Set contextInfo
  requestData.contextInfo.contentUrl = bidderRequest.refererInfo?.canonicalUrl || bidderRequest.refererInfo?.topmostLocation || bidderRequest?.ortb2?.site?.page;

  // Set appInfo
  requestData.appInfo.id = bidderRequest?.ortb2?.site?.domain || bidderRequest.refererInfo?.page;

  // Set userInfo
  requestData.userInfo.ip = bidderRequest?.ortb2?.device?.ip || navigator.ip;
  requestData.userInfo.ua = bidderRequest?.ortb2?.device?.ua || navigator.userAgent;

  // Set userInfo.ppid
  requestData.userInfo.ppid = (validBidRequests || []).reduce((ppids, validBidRequest) => {
    const extractedPpids = [];
    (validBidRequest.userIdAsEids || []).forEach((eid) => {
      (eid?.uids || []).forEach(uid => {
        if (uid?.ext?.stype === 'ppuid') {
          const isExistingInExtracted = !!extractedPpids.find(id => id.source === eid.source);
          const isExistingInPpids = !!ppids.find(id => id.source === eid.source);
          if (!isExistingInExtracted && !isExistingInPpids) extractedPpids.push({source: eid.source, id: uid.id});
        }
      });
    })
    return [...ppids, ...extractedPpids];
  }, []);

  // Set userInfo.ifa
  if (bidderRequest.ortb2?.device?.ifa) {
    requestData.userInfo.ifa = bidderRequest.ortb2.device.ifa;
  } else {
    requestData.userInfo.ifa = validBidRequests.find(validBidRequest => {
      return !!validBidRequest.ortb2?.device?.ifa;
    });
  }

  // Set slots
  requestData.slots = validBidRequests.map((validBidRequest) => {
    const slot = {
      id: validBidRequest.params?.slotId,
      sizes: [
        ...(validBidRequest.sizes || []),
        ...(validBidRequest.mediaTypes?.[VIDEO]?.sizes ? validBidRequest.mediaTypes[VIDEO].sizes : [])
      ],
      targetings: {
        ...validBidRequest?.params?.customTargeting,
        ...convertToCustomSlotTargeting(validBidRequest)
      }
    };
    return slot;
  });

  // Set targetings
  requestData.targetings = convertToCustomTargeting(bidderRequest);

  return requestData;
}

const getRendererForBid = (bidRequest, creative) => {
  if (!bidRequest.renderer && creative.contextType === 'video_outstream') {
    if (!creative.vastUrl && !creative.vastXml) return undefined;

    const config = { documentResolver: (_, sourceDocument, renderDocument) => renderDocument ?? sourceDocument };
    const renderer = Renderer.install({id: bidRequest.bidId, url: RENDERER_OPTIONS.OUTSTREAM_GP.URL, adUnitCode: bidRequest.adUnitCode, config});

    renderer.setRender((bid, doc) => {
      bid.renderer.push(() => {
        if (doc.defaultView?.GoldPlayer) {
          const options = {
            vastUrl: creative.vastUrl,
            vastXML: creative.vastXml,
            autoplay: false,
            muted: false,
            controls: true,
            styling: { progressbarColor: '#000' },
            videoHeight: Math.min(doc.defaultView?.innerWidth / 16 * 9, RENDERER_OPTIONS.OUTSTREAM_GP.MIN_HEIGHT),
            videoVerticalHeight: Math.min(doc.defaultView?.innerWidth / 9 * 16, RENDERER_OPTIONS.OUTSTREAM_GP.MIN_WIDTH),
          };
          const GP = doc.defaultView.GoldPlayer;
          const player = new GP(options);
          player.play();
        }
      });
    });

    return renderer;
  }
  return undefined;
}

const getNativeAssetsForBid = (bidRequest, creative) => {
  if (creative.contextType === 'native' && creative.ad) {
    const nativeAssets = JSON.parse(creative.ad);
    const result = {
      clickUrl: encodeURI(nativeAssets?.link?.url),
      impressionTrackers: nativeAssets?.imptrackers,
      clickTrackers: nativeAssets?.clicktrackers,
      javascriptTrackers: nativeAssets?.jstracker && [nativeAssets.jstracker],
    };
    (nativeAssets?.assets || []).forEach(asset => {
      switch (asset.id) {
        case OPENRTB.NATIVE.ASSET_ID.TITLE:
          result.title = asset.title?.text;
          break;
        case OPENRTB.NATIVE.ASSET_ID.IMAGE:
          result.image = {
            url: encodeURI(asset.img?.url),
            width: asset.img?.w,
            height: asset.img?.h
          };
          break;
        case OPENRTB.NATIVE.ASSET_ID.ICON:
          result.icon = {
            url: encodeURI(asset.img.url),
            width: asset.img?.w,
            height: asset.img?.h
          };
          break;
        case OPENRTB.NATIVE.ASSET_ID.BODY:
          result.body = asset.data?.value;
          break;
        case OPENRTB.NATIVE.ASSET_ID.SPONSORED:
          result.sponsoredBy = asset.data?.value;
          break;
        case OPENRTB.NATIVE.ASSET_ID.CTA:
          result.cta = asset.data?.value;
          break;
      }
    });
    return result;
  }
  return undefined;
}

const convertProprietaryResponseToBidResponses = (serverResponse, bidRequest) => {
  const bidRequests = bidRequest?.bidderRequest?.bids || [];
  const creativeGroups = serverResponse?.body?.creatives || {};

  return bidRequests.reduce((bidResponses, bidRequest) => {
    const matchingCreativeGroup = (creativeGroups[bidRequest.params?.slotId] || []).filter((creative) => {
      if (bidRequest.mediaTypes?.[BANNER] && creative.mediaType === BANNER) return true;
      if (bidRequest.mediaTypes?.[VIDEO] && creative.mediaType === VIDEO) return true;
      if (bidRequest.mediaTypes?.[NATIVE] && creative.mediaType === NATIVE) return true;
      return false;
    });
    const matchingBidResponses = matchingCreativeGroup.map((creative) => {
      return {
        requestId: bidRequest.bidId,
        cpm: creative.cpm,
        currency: creative.currency,
        width: creative.width,
        height: creative.height,
        creativeId: creative.creativeId,
        dealId: creative.dealId,
        netRevenue: creative.netRevenue,
        ttl: creative.ttl,
        ad: creative.ad,
        vastUrl: creative.vastUrl,
        vastXml: creative.vastXml,
        mediaType: creative.mediaType,
        meta: creative.meta,
        native: getNativeAssetsForBid(bidRequest, creative),
        renderer: getRendererForBid(bidRequest, creative),
      };
    });
    return [...bidResponses, ...matchingBidResponses];
  }, []);
}

/* Logging */
const sendLog = (data, percentage = 0.0001) => {
  if (Math.random() > percentage) return;
  const encodedData = `data=${window.btoa(JSON.stringify({...data, source: 'goldbach_pbjs', projectedAmount: (1 / percentage)}))}`;
  ajax(LOGGING_URL, null, encodedData, {
    withCredentials: false,
    method: 'POST',
    crossOrigin: true,
    contentType: 'application/x-www-form-urlencoded',
  });
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: function (bid) {
    return typeof bid.params.publisherId === 'string' && Array.isArray(bid.sizes);
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const url = IS_LOCAL_MODE ? URL_LOCAL : URL;
    const data = convertToProprietaryData(validBidRequests, bidderRequest);
    return [{
      method: 'POST',
      url: url,
      data: data,
      bidderRequest: bidderRequest,
      options: {
        withCredentials: false,
        contentType: 'application/json',
      }
    }];
  },
  interpretResponse: function (serverResponse, request) {
    return convertProprietaryResponseToBidResponses(serverResponse, request);
  },
  onTimeout: function(timeoutData) {
    const payload = {
      event: EVENTS.TIMEOUT,
      error: timeoutData,
    };
    sendLog(payload, LOGGING_PERCENTAGE_ERROR);
  },
  onBidWon: function(bid) {
    const payload = {
      event: EVENTS.BID_WON,
      adUnitCode: bid.adUnitCode,
      adId: bid.adId,
      mediaType: bid.mediaType,
      size: bid.size,
    };
    sendLog(payload, LOGGING_PERCENTAGE_REGULAR);
  },
  onSetTargeting: function(bid) {
    const payload = {
      event: EVENTS.TARGETING,
      adUnitCode: bid.adUnitCode,
      adId: bid.adId,
      mediaType: bid.mediaType,
      size: bid.size,
    };
    sendLog(payload, LOGGING_PERCENTAGE_REGULAR);
  },
  onBidderError: function({ error }) {
    const payload = {
      event: EVENTS.ERROR,
      error: error,
    };
    sendLog(payload, LOGGING_PERCENTAGE_ERROR);
  },
  onAdRenderSucceeded: function(bid) {
    const payload = {
      event: EVENTS.RENDER,
      adUnitCode: bid.adUnitCode,
      adId: bid.adId,
      mediaType: bid.mediaType,
      size: bid.size,
    };
    sendLog(payload, LOGGING_PERCENTAGE_REGULAR);
  },
}

registerBidder(spec);
