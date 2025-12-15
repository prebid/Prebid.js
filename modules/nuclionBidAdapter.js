import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { Renderer } from '../src/Renderer.js';
import { OUTSTREAM } from '../src/video.js';
import { deepAccess } from '../src/utils.js';

const BIDDER_CODE = 'nuclion';
const DEFAULT_CURRENCY = 'USD';
const CREATIVE_TTL = 300;

// Host mapping for each bidder code / alias
const HOSTS = {
  'nuclion': 'nuclion.io',
  'adryx': 'adryx.io',
  'revantagenuclion': 'revantage.io'
};

function getHost(bidderCode) {
  return HOSTS[bidderCode] || HOSTS[BIDDER_CODE];
}

function getEndpointUrl(bidderCode) {
  return `https://bid.${getHost(bidderCode)}/bid`;
}

function getSyncUrl(bidderCode) {
  return `https://sync.${getHost(bidderCode)}/sync`;
}

function getPlayerUrl(bidderCode) {
  return `https://assets.${getHost(bidderCode)}/player.js`;
}

function getTimeoutUrl(bidderCode) {
  return `https://timeout.${getHost(bidderCode)}/log`;
}

function getErrorUrl(bidderCode) {
  return `https://error.${getHost(bidderCode)}/log`;
}

function sendBeaconSafe(url, data) {
  try {
    const payload = JSON.stringify(data);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, payload);
    } else {
      fetch(url, {
        method: 'POST',
        body: payload,
        mode: 'no-cors',
        keepalive: true
      }).catch(() => {});
    }
  } catch (e) {}
}

// Configure ortbConverter
const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: CREATIVE_TTL
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // Add custom bidder params to imp.ext
    imp.ext = imp.ext || {};
    imp.ext.bidder = {
      placementId: deepAccess(bidRequest, 'params.placementId'),
      feedId: deepAccess(bidRequest, 'params.feedId'),
      publisherId: deepAccess(bidRequest, 'params.publisherId')
    };
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    request.cur = [DEFAULT_CURRENCY];
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    
    // Store burl for win notification
    if (bid.burl) {
      bidResponse.burl = bid.burl;
    }
    
    // Handle outstream renderer
    if (bidResponse.mediaType === VIDEO) {
      const videoContext = deepAccess(context, 'bidRequest.mediaTypes.video.context');
      if (videoContext === OUTSTREAM) {
        bidResponse.renderer = createRenderer({
          slotBidId: bid.impid,
          adUnitCode: context.bidRequest.adUnitCode,
          playerUrl: getPlayerUrl(context.bidderCode || BIDDER_CODE)
        });
      }
    }
    
    return bidResponse;
  }
});

function createRenderer(config) {
  const renderer = Renderer.install({
    id: config.slotBidId,
    url: config.playerUrl,
    config: {},
    adUnitCode: config.adUnitCode,
    loaded: false
  });

  try {
    renderer.setRender((bid) => {
      bid.renderer.push(() => {
        if (window.nuclionPlayer && window.nuclionPlayer.init) {
          window.nuclionPlayer.init({
            width: bid.width,
            height: bid.height,
            vastXml: bid.vastXml,
            vastUrl: bid.vastUrl,
            nodeId: bid.adUnitCode,
            config: bid.renderer.getConfig()
          });
        }
      });
    });
  } catch (e) {}

  return renderer;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['adryx', 'revantagenuclion'],
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function (bid) {
    return !!(bid && bid.params && (bid.params.placementId || bid.params.feedId));
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const bidderCode = validBidRequests[0].bidder;
    const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });

    return {
      method: 'POST',
      url: getEndpointUrl(bidderCode),
      data: data,
      options: {
        contentType: 'application/json',
        withCredentials: false
      },
      bidderCode: bidderCode
    };
  },

  interpretResponse: function (serverResponse, request) {
    if (!serverResponse || !serverResponse.body) {
      return [];
    }

    const response = converter.fromORTB({
      response: serverResponse.body,
      request: request.data
    });

    return response.bids || [];
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];

    if (!syncOptions.pixelEnabled && !syncOptions.iframeEnabled) {
      return syncs;
    }

    let bidderCode = BIDDER_CODE;
    if (serverResponses.length > 0 && serverResponses[0].request?.bidderCode) {
      bidderCode = serverResponses[0].request.bidderCode;
    }

    const params = new URLSearchParams();
    params.append('cb', Date.now());

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        params.append('gdpr', gdprConsent.gdprApplies ? 1 : 0);
      }
      if (gdprConsent.consentString) {
        params.append('gdpr_consent', gdprConsent.consentString);
      }
    }

    if (uspConsent) {
      params.append('us_privacy', uspConsent);
    }

    if (gppConsent) {
      if (gppConsent.gppString) {
        params.append('gpp', gppConsent.gppString);
      }
      if (gppConsent.applicableSections) {
        params.append('gpp_sid', gppConsent.applicableSections.join(','));
      }
    }

    const queryString = params.toString();
    const syncUrl = getSyncUrl(bidderCode);

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `${syncUrl}?${queryString}&type=iframe`
      });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: `${syncUrl}?${queryString}&type=img`
      });
    }

    // Dynamic syncs from server response
    serverResponses.forEach(response => {
      const body = response.body;
      if (body?.userSyncs?.length) {
        body.userSyncs.forEach(sync => {
          if (sync.type === 'iframe' && syncOptions.iframeEnabled) {
            syncs.push({ type: 'iframe', url: sync.url });
          } else if (sync.type === 'image' && syncOptions.pixelEnabled) {
            syncs.push({ type: 'image', url: sync.url });
          }
        });
      }
    });

    return syncs;
  },

  onBidWon: function (bid) {
    if (bid.burl) {
      if (navigator.sendBeacon) {
        const success = navigator.sendBeacon(bid.burl);
        if (!success) {
          fetch(bid.burl, { method: 'GET', mode: 'no-cors', keepalive: true }).catch(() => {});
        }
      } else {
        fetch(bid.burl, { method: 'GET', mode: 'no-cors', keepalive: true }).catch(() => {});
      }
    }
  },

  onTimeout: function (timeoutData) {
    const bidderCode = timeoutData?.[0]?.bidder || BIDDER_CODE;
    sendBeaconSafe(getTimeoutUrl(bidderCode), {
      type: 'timeout',
      ts: Date.now(),
      data: timeoutData
    });
  },

  onBidderError: function (errorData) {
    const bidderCode = errorData?.bidderRequest?.bidderCode || BIDDER_CODE;
    sendBeaconSafe(getErrorUrl(bidderCode), {
      type: 'error',
      ts: Date.now(),
      error: errorData?.error?.message || 'unknown',
      status: errorData?.error?.status,
      bidderCode: bidderCode
    });
  }
};

registerBidder(spec);
