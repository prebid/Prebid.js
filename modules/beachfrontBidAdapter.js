import {
  deepAccess,
  deepClone,
  deepSetValue,
  getUniqueIdentifierStr,
  isArray,
  isFn,
  logWarn,
  parseSizesInput,
  parseUrl,
  formatQS
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { find, includes } from '../src/polyfill.js';
import { createRequestData, getBannerBidFloor, getBannerBidParam, getBannerSizes, getTopWindowLocation, getVideoBidFloor, getVideoBidParam, getVideoSizes, isBannerBid, isBannerBidValid, isVideoBid, isVideoBidValid, isConnectedTV, isMobile, getDoNotTrack, findAndFillParam, getOsVersion, getFirstSize, getVideoTargetingParams, VIDEO_TARGETING, DEFAULT_MIMES } from './bidAdapterUtils.js';

const ADAPTER_VERSION = '1.21';
const ADAPTER_NAME = 'BFIO_PREBID';
const OUTSTREAM = 'outstream';
const CURRENCY = 'USD';

export const VIDEO_ENDPOINT = 'https://reachms.bfmio.com/bid.json?exchange_id=';
export const BANNER_ENDPOINT = 'https://display.bfmio.com/prebid_display';
export const OUTSTREAM_SRC = 'https://player-cdn.beachfrontmedia.com/playerapi/loader/outstream.js';
export const SYNC_IFRAME_ENDPOINT = 'https://sync.bfmio.com/sync_iframe';
export const SYNC_IMAGE_ENDPOINT = 'https://sync.bfmio.com/syncb';

export const SUPPORTED_USER_IDS = [
  { key: 'tdid', source: 'adserver.org', rtiPartner: 'TDID', queryParam: 'tdid' },
  { key: 'idl_env', source: 'liveramp.com', rtiPartner: 'idl', queryParam: 'idl' },
  { key: 'uid2.id', source: 'uidapi.com', rtiPartner: 'UID2', queryParam: 'uid2' },
  { key: 'hadronId', source: 'audigent.com', atype: 1, queryParam: 'hadronid' }
];

let appId = '';

export const spec = {
  code: 'beachfront',
  supportedMediaTypes: [ VIDEO, BANNER ],

  isBidRequestValid(bid) {
    if (isVideoBid(bid)) {
      if (!getVideoBidParam(bid, 'appId')) {
        logWarn('Beachfront: appId param is required for video bids.');
        return false;
      }
      if (!getVideoBidParam(bid, 'bidfloor')) {
        logWarn('Beachfront: bidfloor param is required for video bids.');
        return false;
      }
    }
    if (isBannerBid(bid)) {
      if (!getBannerBidParam(bid, 'appId')) {
        logWarn('Beachfront: appId param is required for banner bids.');
        return false;
      }
      if (!getBannerBidParam(bid, 'bidfloor')) {
        logWarn('Beachfront: bidfloor param is required for banner bids.');
        return false;
      }
    }
    return true;
  },

  buildRequests(bids, bidderRequest) {
    let requests = [];
    let videoBids = bids.filter(bid => isVideoBidValid(bid));
    let bannerBids = bids.filter(bid => isBannerBidValid(bid));
    videoBids.forEach(bid => {
      appId = getVideoBidParam(bid, 'appId');
      requests.push({
        method: 'POST',
        url: VIDEO_ENDPOINT + appId,
        data: createRequestData(bid, bidderRequest, true, getVideoBidParam, getVideoSizes, getVideoBidFloor, 'beachfront', ADAPTER_VERSION),
        bidRequest: bid
      });
    });
    if (bannerBids.length) {
      appId = getBannerBidParam(bannerBids[0], 'appId');
      requests.push({
        method: 'POST',
        url: BANNER_ENDPOINT,
        data: createRequestData(bannerBids, bidderRequest, false, getBannerBidParam, getBannerSizes, getBannerBidFloor, 'beachfront', ADAPTER_VERSION),
        bidRequest: bannerBids
      });
    }
    return requests;
  },

  interpretResponse(response, { bidRequest }) {
    response = response.body;

    if (isVideoBid(bidRequest)) {
      if (!response || !response.bidPrice) {
        logWarn(`No valid video bids from ${spec.code} bidder`);
        return [];
      }
      let sizes = getVideoSizes(bidRequest);
      let firstSize = getFirstSize(sizes);
      let context = deepAccess(bidRequest, 'mediaTypes.video.context');
      let responseType = getVideoBidParam(bidRequest, 'responseType') || 'both';
      let responseMeta = Object.assign({ mediaType: VIDEO, advertiserDomains: [] }, response.meta);
      let bidResponse = {
        requestId: bidRequest.bidId,
        cpm: response.bidPrice,
        width: firstSize.w,
        height: firstSize.h,
        creativeId: response.crid || response.cmpId,
        meta: responseMeta,
        renderer: context === OUTSTREAM ? createRenderer(bidRequest) : null,
        mediaType: VIDEO,
        currency: CURRENCY,
        netRevenue: true,
        ttl: 300
      };

      if (responseType === 'nurl' || responseType === 'both') {
        bidResponse.vastUrl = response.url;
      }

      if (responseType === 'adm' || responseType === 'both') {
        bidResponse.vastXml = response.vast;
      }

      return bidResponse;
    } else {
      if (!response || !response.length) {
        logWarn(`No valid banner bids from ${spec.code} bidder`);
        return [];
      }
      return response
        .filter(bid => bid.adm)
        .map((bid) => {
          let request = find(bidRequest, req => req.adUnitCode === bid.slot);
          let responseMeta = Object.assign({ mediaType: BANNER, advertiserDomains: [] }, bid.meta);
          return {
            requestId: request.bidId,
            bidderCode: spec.code,
            ad: bid.adm,
            creativeId: bid.crid,
            cpm: bid.price,
            width: bid.w,
            height: bid.h,
            meta: responseMeta,
            mediaType: BANNER,
            currency: CURRENCY,
            netRevenue: true,
            ttl: 300
          };
        });
    }
  },

  getUserSyncs(syncOptions, serverResponses = [], gdprConsent = {}, uspConsent = '', gppConsent = {}) {
    let { gdprApplies, consentString = '' } = gdprConsent;
    let { gppString = '', applicableSections = [] } = gppConsent;
    let bannerResponse = find(serverResponses, (res) => isArray(res.body));

    let syncs = [];
    let params = {
      id: appId,
      gdpr: gdprApplies ? 1 : 0,
      gc: consentString,
      gce: 1,
      us_privacy: uspConsent,
      gpp: gppString,
      gpp_sid: Array.isArray(applicableSections) ? applicableSections.join(',') : ''
    };

    if (bannerResponse) {
      if (syncOptions.iframeEnabled) {
        bannerResponse.body
          .filter(bid => bid.sync)
          .forEach(bid => {
            syncs.push({
              type: 'iframe',
              url: bid.sync
            });
          });
      }
    } else if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `${SYNC_IFRAME_ENDPOINT}?ifg=1&${formatQS(params)}`
      });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: `${SYNC_IMAGE_ENDPOINT}?pid=144&${formatQS(params)}`
      });
    }

    return syncs;
  }
};

function createRenderer(bidRequest) {
  const renderer = Renderer.install({
    id: bidRequest.bidId,
    url: OUTSTREAM_SRC,
    loaded: false
  });

  renderer.setRender(bid => {
    bid.renderer.push(() => {
      window.Beachfront.Player(bid.adUnitCode, {
        adTagUrl: bid.vastUrl,
        width: bid.width,
        height: bid.height,
        expandInView: getPlayerBidParam(bidRequest, 'expandInView', false),
        collapseOnComplete: getPlayerBidParam(bidRequest, 'collapseOnComplete', true),
        progressColor: getPlayerBidParam(bidRequest, 'progressColor'),
        adPosterColor: getPlayerBidParam(bidRequest, 'adPosterColor')
      });
    });
  });

  return renderer;
}

function getPlayerBidParam(bid, key, defaultValue) {
  let param = deepAccess(bid, 'params.player.' + key);
  return param === undefined ? defaultValue : param;
}

registerBidder(spec);
