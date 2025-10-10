// jshint esversion: 6, es3: false, node: true
'use strict';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import {OUTSTREAM} from '../src/video.js';
import {_map, deepAccess, deepSetValue, logWarn, replaceAuctionPrice, setOnAny, parseGPTSingleSizeArrayToRtbSize, isPlainObject} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';
import {convertOrtbRequestToProprietaryNative} from '../src/native.js';
import {Renderer} from '../src/Renderer.js';

const BIDDER_CODE = 'outbrain';
const GVLID = 164;
const CURRENCY = 'USD';
const NATIVE_PARAMS = {
  title: { id: 0, name: 'title' },
  icon: { id: 2, type: 1, name: 'img' },
  image: { id: 3, type: 3, name: 'img' },
  sponsoredBy: { id: 5, name: 'data', type: 1 },
  body: { id: 4, name: 'data', type: 2 },
  cta: { id: 1, type: 12, name: 'data' }
};
const NATIVE_ASSET_IDS = Object.entries(NATIVE_PARAMS).reduce((acc, [key, value]) => {
  acc[value.id] = key;
  return acc;
}, {});
const OUTSTREAM_RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';
const OB_USER_TOKEN_KEY = 'OB-USER-TOKEN';

export const storage = getStorageManager({bidderCode: BIDDER_CODE});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [ NATIVE, BANNER, VIDEO ],
  isBidRequestValid: (bid) => {
    if (typeof bid.params !== 'object') {
      return false;
    }

    if (typeof deepAccess(bid, 'params.publisher.id') !== 'string') {
      return false;
    }

    if (!!bid.params.tagid && typeof bid.params.tagid !== 'string') {
      return false;
    }

    if (!!bid.params.bcat && (typeof bid.params.bcat !== 'object' || !bid.params.bcat.every(item => typeof item === 'string'))) {
      return false;
    }

    if (!!bid.params.badv && (typeof bid.params.badv !== 'object' || !bid.params.badv.every(item => typeof item === 'string'))) {
      return false;
    }

    return (
      !!config.getConfig('outbrain.bidderUrl') &&
      (!!(bid.nativeParams || bid.sizes) || isValidVideoRequest(bid))
    );
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
    const ortb2 = bidderRequest.ortb2 || {};
    const page = bidderRequest.refererInfo.page;
    const ua = navigator.userAgent;
    const test = setOnAny(validBidRequests, 'params.test');
    const publisher = setOnAny(validBidRequests, 'params.publisher');
    const bcat = ortb2.bcat || setOnAny(validBidRequests, 'params.bcat');
    const badv = ortb2.badv || setOnAny(validBidRequests, 'params.badv');
    const eids = setOnAny(validBidRequests, 'userIdAsEids');
    const wlang = ortb2.wlang;
    const cur = CURRENCY;
    const endpointUrl = config.getConfig('outbrain.bidderUrl');
    const timeout = bidderRequest.timeout;

    const imps = validBidRequests.map((bid, id) => {
      const imp = {
        id: id + 1 + ''
      }

      if (bid.params.tagid) {
        imp.tagid = bid.params.tagid
      }

      if (bid.nativeParams) {
        imp.native = {
          request: JSON.stringify({
            assets: getNativeAssets(bid)
          })
        }
      } else if (isVideoRequest(bid)) {
        imp.video = getVideoAsset(bid);
      } else {
        imp.banner = {
          format: bid.sizes?.map((size) => parseGPTSingleSizeArrayToRtbSize(size))
        }
      }

      if (typeof bid.getFloor === 'function') {
        const floor = _getFloor(bid, bid.nativeParams ? NATIVE : BANNER);
        if (floor) {
          imp.bidfloor = floor;
        }
      }

      return imp;
    });

    const request = {
      id: bidderRequest.bidderRequestId,
      site: { page, publisher },
      device: ortb2?.device || { ua },
      source: { fd: 1 },
      cur: [cur],
      tmax: timeout,
      imp: imps,
      bcat: bcat,
      badv: badv,
      wlang: wlang,
      ext: {
        prebid: {
          channel: {
            name: 'pbjs',
            version: '$prebid.version$'
          }
        }
      }
    };

    if (test) {
      request.is_debug = !!test;
      request.test = 1;
    }

    const obUserToken = storage.getDataFromLocalStorage(OB_USER_TOKEN_KEY)
    if (obUserToken) {
      deepSetValue(request, 'user.ext.obusertoken', obUserToken)
    }

    if (deepAccess(bidderRequest, 'gdprConsent.gdprApplies')) {
      deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString)
      deepSetValue(request, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies & 1)
    }
    if (bidderRequest.uspConsent) {
      deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent)
    }
    if (config.getConfig('coppa') === true) {
      deepSetValue(request, 'regs.coppa', config.getConfig('coppa') & 1)
    }
    if (bidderRequest.gppConsent) {
      deepSetValue(request, 'regs.ext.gpp', bidderRequest.gppConsent.gppString)
      deepSetValue(request, 'regs.ext.gpp_sid', bidderRequest.gppConsent.applicableSections)
    } else if (deepAccess(bidderRequest, 'ortb2.regs.gpp')) {
      deepSetValue(request, 'regs.ext.gpp', bidderRequest.ortb2.regs.gpp)
      deepSetValue(request, 'regs.ext.gpp_sid', bidderRequest.ortb2.regs.gpp_sid)
    }

    if (eids) {
      deepSetValue(request, 'user.ext.eids', eids);
    }

    return {
      method: 'POST',
      url: endpointUrl,
      data: JSON.stringify(request),
      bids: validBidRequests
    };
  },
  interpretResponse: (serverResponse, { bids }) => {
    if (!serverResponse.body) {
      return [];
    }
    const { seatbid, cur } = serverResponse.body;

    const bidResponses = seatbid.map(seat => seat.bid).flat().reduce((result, bid) => {
      result[bid.impid - 1] = bid;
      return result;
    }, []);

    return bids.map((bid, id) => {
      const bidResponse = bidResponses[id];
      if (bidResponse) {
        let type = BANNER;
        if (bid.nativeParams) {
          type = NATIVE;
        } else if (isVideoRequest(bid)) {
          type = VIDEO;
        }
        const bidObject = {
          requestId: bid.bidId,
          cpm: bidResponse.price,
          creativeId: bidResponse.crid,
          ttl: 360,
          netRevenue: true,
          currency: cur,
          mediaType: type,
          nurl: bidResponse.nurl,
        };
        if (type === NATIVE) {
          bidObject.native = parseNative(bidResponse);
        } else if (type === BANNER) {
          bidObject.ad = bidResponse.adm;
          bidObject.width = bidResponse.w;
          bidObject.height = bidResponse.h;
        } else if (type === VIDEO) {
          bidObject.vastXml = bidResponse.adm;
          const videoContext = deepAccess(bid, 'mediaTypes.video.context');
          if (videoContext === OUTSTREAM) {
            bidObject.renderer = createRenderer(bid);
          }
        }
        bidObject.meta = {};
        if (bidResponse.adomain && bidResponse.adomain.length > 0) {
          bidObject.meta.advertiserDomains = bidResponse.adomain;
        }
        return bidObject;
      }
      return null;
    }).filter(Boolean);
  },
  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent, gppConsent) => {
    const syncs = [];
    const syncUrl = config.getConfig('outbrain.usersyncUrl');

    const query = [];
    if (syncOptions.pixelEnabled && syncUrl) {
      if (gdprConsent) {
        query.push('gdpr=' + (gdprConsent.gdprApplies & 1));
        query.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
      }
      if (uspConsent) {
        query.push('us_privacy=' + encodeURIComponent(uspConsent));
      }
      if (gppConsent) {
        query.push('gpp=' + encodeURIComponent(gppConsent.gppString));
        query.push('gpp_sid=' + encodeURIComponent(gppConsent.applicableSections.join(',')));
      }

      syncs.push({
        type: 'image',
        url: syncUrl + (query.length ? '?' + query.join('&') : '')
      });
    }
    return syncs;
  },
  onBidWon: (bid) => {
    // for native requests we put the nurl as an imp tracker, otherwise if the auction takes place on prebid server
    // the server JS adapter puts the nurl in the adm as a tracking pixel and removes the attribute
    if (bid.nurl) {
      ajax(replaceAuctionPrice(bid.nurl, bid.originalCpm))
    }
  }
};

registerBidder(spec);

function parseNative(bid) {
  const { assets, link, privacy, eventtrackers } = JSON.parse(bid.adm);
  const result = {
    clickUrl: link.url,
    clickTrackers: link.clicktrackers || undefined
  };
  assets.forEach(asset => {
    const kind = NATIVE_ASSET_IDS[asset.id];
    const content = kind && asset[NATIVE_PARAMS[kind].name];
    if (content) {
      result[kind] = content.text || content.value || { url: content.url, width: content.w, height: content.h };
    }
  });
  if (privacy) {
    result.privacyLink = privacy;
  }
  if (eventtrackers) {
    result.impressionTrackers = [];
    eventtrackers.forEach(tracker => {
      if (tracker.event !== 1) return;
      switch (tracker.method) {
        case 1: // img
          result.impressionTrackers.push(tracker.url);
          break;
        case 2: // js
          result.javascriptTrackers = `<script src="${tracker.url}"></script>`;
          break;
      }
    });
  }
  return result;
}

function getNativeAssets(bid) {
  return _map(bid.nativeParams, (bidParams, key) => {
    const props = NATIVE_PARAMS[key];
    const asset = {
      required: bidParams.required & 1,
    };
    if (props) {
      asset.id = props.id;
      let wmin, hmin, w, h;
      let aRatios = bidParams.aspect_ratios;

      if (aRatios && aRatios[0]) {
        aRatios = aRatios[0];
        wmin = aRatios.min_width || 0;
        hmin = aRatios.ratio_height * wmin / aRatios.ratio_width | 0;
      }

      if (bidParams.sizes) {
        const sizes = bidParams.sizes.flat();
        w = parseInt(sizes[0], 10);
        h = parseInt(sizes[1], 10);
      }

      asset[props.name] = {
        len: bidParams.len,
        type: props.type,
        wmin,
        hmin,
        w,
        h
      };

      return asset;
    }
  }).filter(Boolean);
}

function getVideoAsset(bid) {
  const sizes = bid.mediaTypes.video.playerSize.flat();
  return {
    w: parseInt(sizes[0], 10),
    h: parseInt(sizes[1], 10),
    protocols: bid.mediaTypes.video.protocols,
    playbackmethod: bid.mediaTypes.video.playbackmethod,
    mimes: bid.mediaTypes.video.mimes,
    skip: bid.mediaTypes.video.skip,
    delivery: bid.mediaTypes.video.delivery,
    api: bid.mediaTypes.video.api,
    minbitrate: bid.mediaTypes.video.minbitrate,
    maxbitrate: bid.mediaTypes.video.maxbitrate,
    minduration: bid.mediaTypes.video.minduration,
    maxduration: bid.mediaTypes.video.maxduration,
    startdelay: bid.mediaTypes.video.startdelay,
    placement: bid.mediaTypes.video.placement,
    plcmt: bid.mediaTypes.video.plcmt,
    linearity: bid.mediaTypes.video.linearity
  };
}

function _getFloor(bid, type) {
  const floorInfo = bid.getFloor({
    currency: CURRENCY,
    mediaType: type,
    size: '*'
  });
  if (isPlainObject(floorInfo) && floorInfo.currency === CURRENCY && !isNaN(parseFloat(floorInfo.floor))) {
    return parseFloat(floorInfo.floor);
  }
  return null;
}

function isVideoRequest(bid) {
  return bid.mediaType === 'video' || !!deepAccess(bid, 'mediaTypes.video');
}

function createRenderer(bid) {
  let config = {};
  let playerUrl = OUTSTREAM_RENDERER_URL;
  let render = function (bid) {
    bid.renderer.push(() => {
      window.ANOutstreamVideo.renderAd({
        sizes: bid.sizes,
        targetId: bid.adUnitCode,
        adResponse: { content: bid.vastXml }
      });
    });
  };

  let externalRenderer = deepAccess(bid, 'mediaTypes.video.renderer');
  if (!externalRenderer) {
    externalRenderer = deepAccess(bid, 'renderer');
  }

  if (externalRenderer) {
    config = externalRenderer.options;
    playerUrl = externalRenderer.url;
    render = externalRenderer.render;
  }

  const renderer = Renderer.install({
    id: bid.adUnitCode,
    url: playerUrl,
    config: config,
    adUnitCode: bid.adUnitCode,
    loaded: false
  });
  try {
    renderer.setRender(render);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

function isValidVideoRequest(bid) {
  const videoAdUnit = deepAccess(bid, 'mediaTypes.video')
  if (!videoAdUnit) {
    return false;
  }

  if (!Array.isArray(videoAdUnit.playerSize)) {
    return false;
  }

  if (videoAdUnit.context === '') {
    return false;
  }

  return true;
}
