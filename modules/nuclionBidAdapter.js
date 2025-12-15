import { deepAccess, deepClone } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { INSTREAM, OUTSTREAM } from '../src/video.js';
import { Renderer } from '../src/Renderer.js';

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

export const spec = {
  code: BIDDER_CODE,
  aliases: ['adryx', 'revantagenuclion'], // TODO: Get GVL IDs for these
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function (bid) {
    return !!(bid && bid.params && (bid.params.placementId || bid.params.feedId));
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    try {
      const bidderCode = validBidRequests[0].bidder;
      const requestPayload = buildRequestPayload(validBidRequests, bidderRequest);

      return {
        method: 'POST',
        url: getEndpointUrl(bidderCode),
        data: JSON.stringify(requestPayload),
        options: {
          contentType: 'text/plain',
          withCredentials: false
        },
        bidderCode: bidderCode,
        bidRequests: validBidRequests
      };
    } catch (error) {
      return [];
    }
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];

    try {
      if (!serverResponse || !serverResponse.body) {
        return bidResponses;
      }

      const responseBody = serverResponse.body;
      const bidRequests = bidRequest.bidRequests || [];
      const bidderCode = bidRequest.bidderCode || BIDDER_CODE;

      const bidRequestsMap = {};
      bidRequests.forEach(request => {
        bidRequestsMap[request.bidId] = request;
      });

      if (!responseBody.seatbid || !Array.isArray(responseBody.seatbid)) {
        return bidResponses;
      }

      responseBody.seatbid.forEach(seatbid => {
        if (!seatbid.bid || !Array.isArray(seatbid.bid)) {
          return;
        }

        seatbid.bid.forEach(bid => {
          const originalBidRequest = bidRequestsMap[bid.impid];

          if (!originalBidRequest || !bid.price || bid.price <= 0) {
            return;
          }

          const hasAdMarkup = !!(bid.adm || bid.vastXml || bid.vastUrl);
          if (!hasAdMarkup) {
            return;
          }

          const bidResponse = {
            requestId: bid.impid,
            cpm: parseFloat(bid.price) || 0,
            width: parseInt(bid.w, 10) || 300,
            height: parseInt(bid.h, 10) || 250,
            creativeId: bid.crid || bid.id || ('nuclion_' + Date.now()),
            dealId: bid.dealid || undefined,
            currency: responseBody.cur || DEFAULT_CURRENCY,
            netRevenue: true,
            ttl: CREATIVE_TTL,
            meta: {
              advertiserDomains: bid.adomain || [],
              dsp: seatbid.seat || 'unknown',
              networkName: 'Nuclion'
            }
          };

          if (bid.burl) {
            bidResponse.burl = bid.burl;
          }

          const isVideo = (bid.ext && bid.ext.mediaType === 'video') ||
                         bid.vastXml || bid.vastUrl ||
                         (originalBidRequest.mediaTypes && originalBidRequest.mediaTypes.video &&
                          !originalBidRequest.mediaTypes.banner);

          if (isVideo) {
            bidResponse.mediaType = VIDEO;
            bidResponse.vastXml = bid.vastXml || bid.adm;
            bidResponse.vastUrl = bid.vastUrl;

            if (!bidResponse.vastUrl && !bidResponse.vastXml) {
              return;
            }

            const videoContext = deepAccess(originalBidRequest, 'mediaTypes.video.context');

            if (videoContext === OUTSTREAM) {
              bidResponse.renderer = createRenderer({
                slotBidId: bid.impid,
                adUnitCode: originalBidRequest.adUnitCode,
                playerUrl: getPlayerUrl(bidderCode)
              });
            }
          } else {
            bidResponse.mediaType = BANNER;
            bidResponse.ad = bid.adm;

            if (!bidResponse.ad) {
              return;
            }
          }

          if (bid.ext && bid.ext.dspPrice) {
            bidResponse.meta.dspPrice = bid.ext.dspPrice;
          }

          bidResponses.push(bidResponse);
        });
      });

    } catch (error) {}

    return bidResponses;
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

    serverResponses.forEach(response => {
      const body = response.body;
      if (body && body.userSyncs && Array.isArray(body.userSyncs)) {
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
          fetch(bid.burl, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-cache',
            keepalive: true
          }).catch(() => {});
        }
      } else {
        fetch(bid.burl, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-cache',
          keepalive: true
        }).catch(() => {});
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

// ============================================================================
// Helper Functions
// ============================================================================

function buildRequestPayload(bidRequests, bidderRequest) {
  const impressions = bidRequests.map(bidRequest => {
    const sizes = getBidSizes(bidRequest);
    const floor = getBidFloor(bidRequest);

    const impression = {
      id: bidRequest.bidId,
      tagid: bidRequest.adUnitCode,
      bidfloor: floor,
      ext: {
        feedId: deepAccess(bidRequest, 'params.feedId'),
        bidder: {
          placementId: deepAccess(bidRequest, 'params.placementId'),
          publisherId: deepAccess(bidRequest, 'params.publisherId')
        }
      }
    };

    if (bidRequest.mediaTypes && bidRequest.mediaTypes.banner) {
      impression.banner = {
        w: sizes[0][0],
        h: sizes[0][1],
        format: sizes.map(size => ({
          w: size[0],
          h: size[1]
        }))
      };
    }

    if (bidRequest.mediaTypes && bidRequest.mediaTypes.video) {
      const video = bidRequest.mediaTypes.video;
      impression.video = {
        mimes: video.mimes || ['video/mp4', 'video/webm'],
        minduration: video.minduration || 0,
        maxduration: video.maxduration || 60,
        protocols: video.protocols || [2, 3, 5, 6],
        placement: video.placement || 1,
        plcmt: video.plcmt || video.placement || 1,
        playbackmethod: video.playbackmethod || [1, 2],
        api: video.api || [1, 2],
        skip: video.skip || 0,
        skipmin: video.skipmin || 0,
        skipafter: video.skipafter || 0,
        pos: video.pos || 0,
        startdelay: video.startdelay || 0,
        linearity: video.linearity || 1
      };

      if (video.playerSize && video.playerSize[0]) {
        impression.video.w = video.playerSize[0][0];
        impression.video.h = video.playerSize[0][1];
      }
    }

    return impression;
  });

  const user = {};

  if (bidRequests[0] && bidRequests[0].userIdAsEids) {
    user.eids = deepClone(bidRequests[0].userIdAsEids);
  }

  const ortb2 = bidderRequest.ortb2 || {};
  const site = {
    domain: typeof window !== 'undefined' ? window.location.hostname : '',
    page: typeof window !== 'undefined' ? window.location.href : '',
    ref: typeof document !== 'undefined' ? document.referrer : ''
  };

  if (ortb2.site) {
    Object.assign(site, deepClone(ortb2.site));
  }

  const device = deepClone(ortb2.device) || {};
  device.ua = device.ua || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  device.language = device.language || (typeof navigator !== 'undefined' ? navigator.language : '');
  device.w = device.w || (typeof screen !== 'undefined' ? screen.width : 0);
  device.h = device.h || (typeof screen !== 'undefined' ? screen.height : 0);
  device.devicetype = device.devicetype || getDeviceType();

  const regs = { ext: {} };

  if (bidderRequest.gdprConsent) {
    regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    user.ext = user.ext || {};
    user.ext.consent = bidderRequest.gdprConsent.consentString;
  }

  if (bidderRequest.uspConsent) {
    regs.ext.us_privacy = bidderRequest.uspConsent;
  }

  if (bidderRequest.gppConsent) {
    if (bidderRequest.gppConsent.gppString) {
      regs.ext.gpp = bidderRequest.gppConsent.gppString;
    }
    if (bidderRequest.gppConsent.applicableSections) {
      regs.ext.gpp_sid = bidderRequest.gppConsent.applicableSections;
    }
  }

  const schain = bidderRequest.schain || (bidRequests[0] && bidRequests[0].schain);

  return {
    id: bidderRequest.auctionId,
    imp: impressions,
    site: site,
    device: device,
    user: user,
    regs: regs,
    source: schain ? { schain: schain } : undefined,
    tmax: bidderRequest.timeout || 1000,
    cur: [DEFAULT_CURRENCY]
  };
}

function getBidSizes(bidRequest) {
  if (bidRequest.mediaTypes && bidRequest.mediaTypes.banner &&
      Array.isArray(bidRequest.mediaTypes.banner.sizes)) {
    return bidRequest.mediaTypes.banner.sizes;
  }
  if (bidRequest.mediaTypes && bidRequest.mediaTypes.video &&
      bidRequest.mediaTypes.video.playerSize) {
    return bidRequest.mediaTypes.video.playerSize;
  }
  return bidRequest.sizes || [[300, 250]];
}

function getBidFloor(bidRequest) {
  let floor = 0;

  if (typeof bidRequest.getFloor === 'function') {
    const mediaType = (bidRequest.mediaTypes && bidRequest.mediaTypes.video) ? 'video' : 'banner';
    const sizes = getBidSizes(bidRequest);

    for (let i = 0; i < sizes.length; i++) {
      try {
        const floorInfo = bidRequest.getFloor({
          currency: DEFAULT_CURRENCY,
          mediaType: mediaType,
          size: sizes[i]
        });

        if (floorInfo && floorInfo.floor > floor &&
            floorInfo.currency === DEFAULT_CURRENCY && !isNaN(floorInfo.floor)) {
          floor = floorInfo.floor;
        }
      } catch (e) {}
    }

    if (floor === 0) {
      try {
        const wildcardFloor = bidRequest.getFloor({
          currency: DEFAULT_CURRENCY,
          mediaType: mediaType,
          size: '*'
        });

        if (typeof wildcardFloor === 'object' &&
            wildcardFloor.currency === DEFAULT_CURRENCY &&
            !isNaN(wildcardFloor.floor)) {
          floor = wildcardFloor.floor;
        }
      } catch (e) {}
    }
  }

  return floor;
}

function getDeviceType() {
  if (typeof screen === 'undefined') {
    return 1;
  }

  const screenWidth = screen.width;
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  if (/iPhone|iPod/i.test(userAgent) || (screenWidth < 768 && /Mobile/i.test(userAgent))) {
    return 2;
  }
  if (/iPad/i.test(userAgent) || (screenWidth >= 768 && screenWidth < 1024)) {
    return 5;
  }
  return 1;
}

function createRenderer(config) {
  const renderer = Renderer.install({
    id: config.slotBidId,
    url: config.playerUrl,
    config: {},
    adUnitCode: config.adUnitCode,
    loaded: false
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (e) {}

  return renderer;
}

function outstreamRender(bid) {
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
}

registerBidder(spec);
