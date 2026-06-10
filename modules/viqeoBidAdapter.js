import { registerBidder } from '../src/adapters/bidderFactory.js';
import {
  logError,
  logInfo,
  _each,
  mergeDeep,
  isFn,
  isNumber,
  isPlainObject,
} from '../src/utils.js';
import { VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 */

const BIDDER_CODE = 'viqeo';
const DEFAULT_MIMES = [
  'video/3gpp',
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'application/javascript',
];
const VIQEO_ENDPOINT = 'https://ad.vqserve.com/ads/prebid';
const RENDERER_URL = 'https://cdn.viqeo.tv/js/vq_starter.js';
const DEFAULT_CURRENCY = 'USD';

function getBidFloor(bid) {
  const { floor, currency } = bid.params;
  const curr = currency || DEFAULT_CURRENCY;
  if (!isFn(bid.getFloor)) {
    return { floor: isNumber(floor) ? floor : 0, currency: curr };
  }
  const floorInfo = bid.getFloor({
    currency: curr,
    mediaType: VIDEO,
    size: '*',
  });
  if (
    isPlainObject(floorInfo) &&
    isNumber(floorInfo.floor) &&
    floorInfo.currency === curr
  ) {
    return floorInfo;
  }
  return { floor: floor || 0, currency: currency || DEFAULT_CURRENCY };
}

function getVideoTargetingParams({ mediaTypes: { video } }) {
  const result = {};
  Object.keys(Object(video)).forEach((key) => {
    if (key === 'playerSize') {
      result.w = video.playerSize[0][0];
      result.h = video.playerSize[0][1];
    } else if (key !== 'context') {
      result[key] = video[key];
    }
  });
  return result;
}

/**
 * @type {BidderSpec}
 */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO],
  /**
   * @param {BidRequest} bidRequest The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: ({ params }) => {
    if (!params) {
      logError('failed validation: params not declared');
      return false;
    }
    if (!params.tagId) {
      logError('failed validation: tagId not declared');
      return false;
    }
    if (!params.playerOptions) {
      logError('failed validation: playerOptions not declared');
      return false;
    }
    const { profileId, videoId, playerId } = params.playerOptions;
    if (!profileId) {
      logError('failed validation: profileId not declared');
      return false;
    }
    if (!videoId && !playerId) {
      logError('failed validation: videoId or playerId not declared');
      return false;
    }
    return true;
  },
  /**
   * @param validBidRequests {BidRequest[]}
   * @returns {ServerRequest[]}
   */
  buildRequests: (validBidRequests) => {
    logInfo('validBidRequests', validBidRequests);
    const bidRequests = [];
    _each(validBidRequests, (bid, i) => {
      const {
        params: { test, tagId, endpointUrl, bcat, badv },
        mediaTypes: { video },
      } = bid;
      const ortb2 = bid.ortb2 || {};
      const user = bid.params.user || {};
      const device = bid.params.device || {};
      const site = bid.params.site || {};
      const floorInfo = getBidFloor(bid);

      const data = {
        id: bid.bidId,
        test,
        imp: [
          {
            id: `${i}`,
            video: {
              ...getVideoTargetingParams(bid),
              mimes: video.mimes || DEFAULT_MIMES,
            },
            tagid: `${tagId}`,
            bidfloor: floorInfo.floor,
            bidfloorcur: floorInfo.currency,
            secure: 1,
          },
        ],
        site: mergeDeep(
          site,
          ortb2.site
        ),
        device: mergeDeep(device, ortb2.device),
        user: mergeDeep(user, ortb2.user),
        bcat: ortb2.bcat || bcat,
        badv: ortb2.badv || badv
      };
      bidRequests.push({
        url: endpointUrl || `${VIQEO_ENDPOINT}`,
        method: 'POST',
        data,
        bids: validBidRequests,
      });
    });
    return bidRequests;
  },
  /**
   * @param {ServerResponse} serverResponse
   * @param {BidRequest} bidRequests
   * @return {Bid[]}
   */
  interpretResponse: (serverResponse, bidRequests) => {
    logInfo('serverResponse', serverResponse);
    const bidResponses = [];
    if (!serverResponse || !serverResponse.body) {
      logError('empty response');
      return [];
    }
    try {
      const { id, seatbid, cur } = serverResponse.body;
      _each(seatbid, (sb) => {
        const { bid } = sb;
        _each(bid, (b) => {
          const bidRequest = bidRequests.bids.find(({ bidId }) => bidId === id);
          const renderer = Renderer.install({
            url: bidRequest?.params?.renderUrl || RENDERER_URL,
          });
          renderer.setRender((bid, doc) => {
            if (window.VIQEO) {
              window.VIQEO.renderPrebid(bid, doc);
            } else {
              logError('failed get window.VIQEO');
            }
          });
          bidResponses.push({
            requestId: id,
            currency: cur || DEFAULT_CURRENCY,
            cpm: b.price,
            ttl: b.exp,
            netRevenue: true,
            creativeId: b.cid,
            width: b.w || bidRequest?.mediaTypes[VIDEO].playerSize[0][0],
            height: b.h || bidRequest?.mediaTypes[VIDEO].playerSize[0][1],
            vastXml: b.adm,
            vastUrl: b.nurl,
            mediaType: VIDEO,
            renderer,
            meta: {
              secondaryCatIds: b.cat,
              attr: b.attr,
              advertiserDomains: b.adomain,
            },
          });
        });
      });
    } catch (error) {
      logError(error);
    }
    return bidResponses;
  },
};
registerBidder(spec);
