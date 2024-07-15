import {getValue, formatQS, logError, deepAccess, isArray, getBidIdParameter} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 */

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
      SPONSORED: 5,
      CTA: 6
    },
    DATA_ASSET_TYPE: {
      SPONSORED: 1,
      DESC: 2,
      CTA_TEXT: 12,
    },
  }
};

let SYNC_URL = '';
const BIDDER_CODE = 'admatic';
const RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

export const spec = {
  code: BIDDER_CODE,
  gvlid: 1281,
  aliases: [
    {code: 'pixad', gvlid: 1281},
    {code: 'monetixads', gvlid: 1281}
  ],
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  /**
   * f
   * @param {object} bid
   * @return {boolean}
   */
  isBidRequestValid: (bid) => {
    let isValid = false;
    if (bid?.params) {
      const isValidNetworkId = _validateId(getValue(bid.params, 'networkId'));
      const isValidHost = _validateString(getValue(bid.params, 'host'));
      isValid = isValidNetworkId && isValidHost;
    }

    if (!isValid) {
      logError(`${bid.bidder} networkId and host parameters are required. Bid aborted.`);
    }
    return isValid;
  },

  /**
   * @param {BidRequest[]} validBidRequests
   * @return {ServerRequest}
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    const tmax = bidderRequest.timeout;
    const bids = validBidRequests.map(buildRequestObject);
    const ortb = bidderRequest.ortb2;
    const networkId = getValue(validBidRequests[0].params, 'networkId');
    const host = getValue(validBidRequests[0].params, 'host');
    const currency = config.getConfig('currency.adServerCurrency') || 'TRY';
    const bidderName = validBidRequests[0].bidder;

    const payload = {
      ortb,
      site: {
        page: bidderRequest.refererInfo.page,
        ref: bidderRequest.refererInfo.page,
        publisher: {
          name: bidderRequest.refererInfo.domain,
          publisherId: networkId
        }
      },
      imp: bids,
      ext: {
        cur: currency,
        bidder: bidderName
      },
      schain: {},
      regs: {
        ext: {
        }
      },
      user: {
        ext: {}
      },
      at: 1,
      tmax: parseInt(tmax)
    };

    if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
      const consentStr = (bidderRequest.gdprConsent.consentString)
        ? bidderRequest.gdprConsent.consentString.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '';
      const gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      payload.regs.ext.gdpr = gdpr;
      payload.regs.ext.consent = consentStr;
    }

    if (bidderRequest && bidderRequest.coppa) {
      payload.regs.ext.coppa = bidderRequest.coppa === true ? 1 : (bidderRequest.coppa === false ? 0 : undefined);
    }

    if (bidderRequest && bidderRequest.ortb2?.regs?.gpp) {
      payload.regs.ext.gpp = bidderRequest.ortb2?.regs?.gpp;
    }

    if (bidderRequest && bidderRequest.ortb2?.regs?.gpp_sid) {
      payload.regs.ext.gpp_sid = bidderRequest.ortb2?.regs?.gpp_sid;
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.regs.ext.uspIab = bidderRequest.uspConsent;
    }

    if (validBidRequests[0].schain) {
      const schain = mapSchain(validBidRequests[0].schain);
      if (schain) {
        payload.schain = schain;
      }
    }

    if (validBidRequests[0].userIdAsEids) {
      const eids = { eids: validBidRequests[0].userIdAsEids };
      payload.user.ext = { ...payload.user.ext, ...eids };
    }

    if (payload) {
      switch (bidderName) {
        case 'monetixads':
          SYNC_URL = 'https://static.cdn.monetixads.com/sync.html';
          break;
        case 'pixad':
          SYNC_URL = 'https://static.cdn.pixad.com.tr/sync.html';
          break;
        default:
          SYNC_URL = 'https://static.cdn.admatic.com.tr/sync.html';
          break;
      }

      return { method: 'POST', url: `https://${host}/pb`, data: payload, options: { contentType: 'application/json' } };
    }
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent, gppConsent) {
    if (!hasSynced && syncOptions.iframeEnabled) {
      // data is only assigned if params are available to pass to syncEndpoint
      let params = {};

      if (gdprConsent) {
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          params['gdpr'] = Number(gdprConsent.gdprApplies);
        }
        if (typeof gdprConsent.consentString === 'string') {
          params['gdpr_consent'] = gdprConsent.consentString;
        }
      }

      if (uspConsent) {
        params['us_privacy'] = encodeURIComponent(uspConsent);
      }

      if (gppConsent?.gppString) {
        params['gpp'] = gppConsent.gppString;
        params['gpp_sid'] = gppConsent.applicableSections?.toString();
      }

      params = Object.keys(params).length ? `?${formatQS(params)}` : '';

      hasSynced = true;
      return {
        type: 'iframe',
        url: SYNC_URL + params
      };
    }
  },

  /**
   * @param {*} response
   * @param {ServerRequest} request
   * @return {Bid[]}
   */
  interpretResponse: (response, request) => {
    const body = response.body;
    const bidResponses = [];

    if (body && body?.data && isArray(body.data)) {
      body.data.forEach(bid => {
        const bidRequest = getAssociatedBidRequest(request.data.imp, bid);
        if (bidRequest) {
          const resbid = {
            requestId: bid.id,
            cpm: bid.price,
            width: bid.width,
            height: bid.height,
            currency: body.cur || 'TRY',
            netRevenue: true,
            creativeId: bid.creative_id,
            meta: {
              model: bid.mime_type,
              advertiserDomains: bid && bid.adomain ? bid.adomain : []
            },
            bidder: bid.bidder,
            mediaType: bid.type,
            ttl: 60
          };

          if (resbid.mediaType === 'video' && isUrl(bid.party_tag)) {
            resbid.vastUrl = bid.party_tag;
          } else if (resbid.mediaType === 'video') {
            resbid.vastXml = bid.party_tag;
          } else if (resbid.mediaType === 'banner') {
            resbid.ad = bid.party_tag;
          } else if (resbid.mediaType === 'native') {
            resbid.native = interpretNativeAd(bid.party_tag)
          };

          const context = deepAccess(bidRequest, 'mediatype.context');
          if (resbid.mediaType === 'video' && context === 'outstream') {
            resbid.renderer = createOutstreamVideoRenderer(bid);
          }

          bidResponses.push(resbid);
        }
      });
    }
    return bidResponses;
  }
};

var hasSynced = false;

export function resetUserSync() {
  hasSynced = false;
}

/**
 * @param {object} schain object set by Publisher
 * @returns {object} OpenRTB SupplyChain object
 */
function mapSchain(schain) {
  if (!schain) {
    return null;
  }
  if (!validateSchain(schain)) {
    logError('AdMatic: required schain params missing');
    return null;
  }
  return schain;
}

/**
 * @param {object} schain object set by Publisher
 * @returns {object} bool
 */
function validateSchain(schain) {
  if (!schain.nodes) {
    return false;
  }
  const requiredFields = ['asi', 'sid', 'hp'];
  return schain.nodes.every(node => {
    return requiredFields.every(field => node[field]);
  });
}

function isUrl(str) {
  try {
    URL(str);
    return true;
  } catch (error) {
    return false;
  }
};

function outstreamRender (bid) {
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      targetId: bid.adUnitCode,
      adResponse: bid.adResponse
    });
  });
}

function createOutstreamVideoRenderer(bid) {
  const renderer = Renderer.install({
    id: bid.bidId,
    url: RENDERER_URL,
    loaded: false
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logError('Prebid Error calling setRender on renderer' + err);
  }

  return renderer;
}

function getAssociatedBidRequest(bidRequests, bid) {
  for (const request of bidRequests) {
    if (request.id === bid.id) {
      return request;
    }
  }
  return undefined;
}

function enrichSlotWithFloors(slot, bidRequest) {
  try {
    const slotFloors = {};

    if (bidRequest.getFloor) {
      if (bidRequest.mediaTypes?.banner) {
        slotFloors.banner = {};
        const bannerSizes = parseSizes(deepAccess(bidRequest, 'mediaTypes.banner.sizes'))
        bannerSizes.forEach(bannerSize => slotFloors.banner[parseSize(bannerSize).toString()] = bidRequest.getFloor({ size: bannerSize, mediaType: BANNER }));
      }

      if (bidRequest.mediaTypes?.video) {
        slotFloors.video = {};
        const videoSizes = parseSizes(deepAccess(bidRequest, 'mediaTypes.video.playerSize'))
        videoSizes.forEach(videoSize => slotFloors.video[parseSize(videoSize).toString()] = bidRequest.getFloor({ size: videoSize, mediaType: VIDEO }));
      }

      if (bidRequest.mediaTypes?.native) {
        slotFloors.native = {};
        slotFloors.native['*'] = bidRequest.getFloor({ size: '*', mediaType: NATIVE });
      }

      if (Object.keys(slotFloors).length > 0) {
        if (!slot) {
          slot = {}
        }
        Object.assign(slot, {
          floors: slotFloors
        });
      }
    }
  } catch (e) {
    logError('Could not parse floors from Prebid: ' + e);
  }
}

function parseSizes(sizes, parser = s => s) {
  if (sizes == undefined) {
    return [];
  }
  if (Array.isArray(sizes[0])) { // is there several sizes ? (ie. [[728,90],[200,300]])
    return sizes.map(size => parser(size));
  }
  return [parser(sizes)]; // or a single one ? (ie. [728,90])
}

function parseSize(size) {
  return size[0] + 'x' + size[1];
}

function buildRequestObject(bid) {
  const reqObj = {};
  reqObj.size = getSizes(bid);
  if (bid.mediaTypes?.banner) {
    reqObj.type = 'banner';
    reqObj.mediatype = {};
  }
  if (bid.mediaTypes?.video) {
    reqObj.type = 'video';
    reqObj.mediatype = bid.mediaTypes.video;
  }
  if (bid.mediaTypes?.native) {
    reqObj.type = 'native';
    reqObj.size = [{w: 1, h: 1}];
    reqObj.mediatype = bid.mediaTypes.native;
  }

  if (deepAccess(bid, 'ortb2Imp.ext')) {
    reqObj.ext = bid.ortb2Imp.ext;
  }

  reqObj.id = getBidIdParameter('bidId', bid);

  enrichSlotWithFloors(reqObj, bid);

  return reqObj;
}

function getSizes(bid) {
  return concatSizes(bid);
}

function concatSizes(bid) {
  let playerSize = deepAccess(bid, 'mediaTypes.video.playerSize');
  let videoSizes = deepAccess(bid, 'mediaTypes.video.sizes');
  let nativeSizes = deepAccess(bid, 'mediaTypes.native.sizes');
  let bannerSizes = deepAccess(bid, 'mediaTypes.banner.sizes');

  if (isArray(bannerSizes) || isArray(playerSize) || isArray(videoSizes)) {
    let mediaTypesSizes = [bannerSizes, videoSizes, nativeSizes, playerSize];
    return mediaTypesSizes
      .reduce(function(acc, currSize) {
        if (isArray(currSize)) {
          if (isArray(currSize[0])) {
            currSize.forEach(function (childSize) {
              acc.push({ w: childSize[0], h: childSize[1] });
            })
          }
        }
        return acc;
      }, []);
  }
}

function interpretNativeAd(adm) {
  const native = JSON.parse(adm).native;
  const result = {
    clickUrl: encodeURI(native.link.url),
    impressionTrackers: native.imptrackers
  };
  native.assets.forEach(asset => {
    switch (asset.id) {
      case OPENRTB.NATIVE.ASSET_ID.TITLE:
        result.title = asset.title.text;
        break;
      case OPENRTB.NATIVE.ASSET_ID.IMAGE:
        result.image = {
          url: encodeURI(asset.img.url),
          width: asset.img.w,
          height: asset.img.h
        };
        break;
      case OPENRTB.NATIVE.ASSET_ID.ICON:
        result.icon = {
          url: encodeURI(asset.img.url),
          width: asset.img.w,
          height: asset.img.h
        };
        break;
      case OPENRTB.NATIVE.ASSET_ID.BODY:
        result.body = asset.data.value;
        break;
      case OPENRTB.NATIVE.ASSET_ID.SPONSORED:
        result.sponsoredBy = asset.data.value;
        break;
      case OPENRTB.NATIVE.ASSET_ID.CTA:
        result.cta = asset.data.value;
        break;
    }
  });
  return result;
}

function _validateId(id) {
  return (parseInt(id) > 0);
}

function _validateString(str) {
  return (typeof str == 'string');
}

registerBidder(spec);
