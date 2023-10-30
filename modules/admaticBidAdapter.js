import {getValue, logError, isEmpty, deepAccess, isArray, getBidIdParameter} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
let SYNC_URL = '';
const BIDDER_CODE = 'admatic';
export const spec = {
  code: BIDDER_CODE,
  aliases: [
    {code: 'pixad'}
  ],
  supportedMediaTypes: [BANNER, VIDEO],
  /** f
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
    const bids = validBidRequests.map(buildRequestObject);
    const blacklist = bidderRequest.ortb2;
    const networkId = getValue(validBidRequests[0].params, 'networkId');
    const host = getValue(validBidRequests[0].params, 'host');
    const currency = config.getConfig('currency.adServerCurrency') || 'TRY';
    const bidderName = validBidRequests[0].bidder;

    const payload = {
      user: {
        ua: navigator.userAgent
      },
      blacklist: [],
      site: {
        page: location.href,
        ref: location.origin,
        publisher: {
          name: location.hostname,
          publisherId: networkId
        }
      },
      imp: bids,
      ext: {
        cur: currency,
        bidder: bidderName
      }
    };

    if (!isEmpty(blacklist.badv)) {
      payload.blacklist = blacklist.badv;
    };

    if (payload) {
      switch (bidderName) {
        case 'pixad':
          SYNC_URL = 'https://static.pixad.com.tr/sync.html';
          break;
        default:
          SYNC_URL = 'https://cdn.serve.admatic.com.tr/showad/sync.html';
          break;
      }

      return { method: 'POST', url: `https://${host}/pb`, data: payload, options: { contentType: 'application/json' } };
    }
  },

  getUserSyncs: function (syncOptions, responses) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: SYNC_URL
      }];
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
          resbid.vastImpUrl = bid.iurl;
        } else if (resbid.mediaType === 'video') {
          resbid.vastXml = bid.party_tag;
          resbid.vastImpUrl = bid.iurl;
        } else if (resbid.mediaType === 'banner') {
          resbid.ad = bid.party_tag;
        };

        bidResponses.push(resbid);
      });
    }
    return bidResponses;
  }
};

function isUrl(str) {
  try {
    URL(str);
    return true;
  } catch (error) {
    return false;
  }
};

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
  let bannerSizes = deepAccess(bid, 'mediaTypes.banner.sizes');

  if (isArray(bannerSizes) || isArray(playerSize) || isArray(videoSizes)) {
    let mediaTypesSizes = [bannerSizes, videoSizes, playerSize];
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

function _validateId(id) {
  return (parseInt(id) > 0);
}

function _validateString(str) {
  return (typeof str == 'string');
}

registerBidder(spec);
