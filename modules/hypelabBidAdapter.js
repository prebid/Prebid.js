import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { generateUUID, isFn, isPlainObject, getWinDimensions } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import { getWalletPresence, getWalletProviderFlags } from '../libraries/hypelabUtils/hypelabUtils.js';

export const BIDDER_CODE = 'hypelab';
export const ENDPOINT_URL = 'https://api.hypelab.com';

export const REQUEST_ROUTE = '/v1/prebid_requests';
export const EVENT_ROUTE = '/v1/events';
export const REPORTING_ROUTE = '';

const PREBID_VERSION = '$prebid.version$';
const PROVIDER_NAME = 'prebid';
const PROVIDER_VERSION = '0.0.3';

const url = (route) => ENDPOINT_URL + route;

export function mediaSize(data) {
  if (!data || !data.creative_set) return { width: 0, height: 0 };
  const media = data.creative_set.video || data.creative_set.image || {};
  return { width: media.width, height: media.height };
}

function isBidRequestValid(bidderRequest) {
  return (
    !!bidderRequest.params?.property_slug &&
    !!bidderRequest.params?.placement_slug
  );
}

function buildRequests(validBidRequests, bidderRequest) {
  const result = validBidRequests.map((request) => {
    const uids = (request.userIdAsEids || []).reduce((a, c) => {
      const ids = c.uids.map((uid) => uid.id);
      return [...a, ...ids];
    }, []);

    const uuid = uids[0] ? uids[0] : generateTemporaryUUID();
    const floor = getBidFloor(request, request.sizes || []);
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    const wp = getWalletPresence();
    const wpfs = getWalletProviderFlags();
    const winDimensions = getWinDimensions();
    const vp = [
      Math.max(
        winDimensions?.document.documentElement.clientWidth || 0,
        winDimensions?.innerWidth || 0
      ),
      Math.max(
        winDimensions?.document.documentElement.clientHeight || 0,
        winDimensions?.innerHeight || 0
      ),
    ];
    const pp = getPosition(request.adUnitCode);

    const payload = {
      property_slug: request.params.property_slug,
      placement_slug: request.params.placement_slug,
      provider_version: PROVIDER_VERSION,
      provider_name: PROVIDER_NAME,
      location:
        bidderRequest.refererInfo?.page || typeof window !== 'undefined'
          ? window.location.href
          : '',
      sdk_version: PREBID_VERSION,
      sizes: request.sizes,
      wids: [],
      floor,
      dpr,
      uuid,
      bidRequestsCount: request.bidRequestsCount,
      bidderRequestsCount: request.bidderRequestsCount,
      bidderWinsCount: request.bidderWinsCount,
      wp,
      wpfs,
      vp,
      pp,
    };

    return {
      method: 'POST',
      url: url(REQUEST_ROUTE),
      options: { contentType: 'application/json', withCredentials: true },
      data: payload,
      bidId: request.bidId,
    };
  });

  return result;
}

function generateTemporaryUUID() {
  return 'tmp_' + generateUUID();
}

function getBidFloor(bid, sizes) {
  if (!isFn(bid.getFloor)) {
    return bid.params.bidFloor ? bid.params.bidFloor : null;
  }

  let floor;

  const floorInfo = bid.getFloor({
    currency: 'USD',
    mediaType: 'banner',
    size: sizes.length === 1 ? sizes[0] : '*',
  });

  if (
    isPlainObject(floorInfo) &&
    floorInfo.currency === 'USD' &&
    !isNaN(parseFloat(floorInfo.floor))
  ) {
    floor = parseFloat(floorInfo.floor);
  }

  return floor;
}

function getPosition(id) {
  const element = document.getElementById(id);
  if (!element) return null;
  const rect = getBoundingClientRect(element);
  return [rect.left, rect.top];
}

function interpretResponse(serverResponse, bidRequest) {
  const { data } = serverResponse.body;

  if (!data.cpm || !data.html) return [];

  const size = mediaSize(data);

  const result = {
    requestId: bidRequest.bidId,
    cpm: data.cpm,
    width: size.width,
    height: size.height,
    creativeId: data.creative_set_slug,
    currency: data.currency,
    netRevenue: true,
    referrer: bidRequest.data.location,
    ttl: data.ttl,
    ad: data.html,
    mediaType: serverResponse.body.data.media_type,
    meta: {
      advertiserDomains: data.advertiser_domains || [],
    },
  };

  return [result];
}

export function report(eventType, data, route = REPORTING_ROUTE) {
  if (!route) return;

  const options = {
    method: 'POST',
    contentType: 'application/json',
    withCredentials: true,
  };

  const request = { type: eventType, data };
  ajax(url(route), null, request, options);
}

function onTimeout(timeoutData) {
  this.report('timeout', timeoutData);
}

function onBidWon(bid) {
  this.report('bidWon', bid);
}

function onSetTargeting(bid) {
  this.report('setTargeting', bid);
}

function onBidderError(errorData) {
  this.report('bidderError', errorData);
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  aliases: ['hype'],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onTimeout,
  onBidWon,
  onSetTargeting,
  onBidderError,
  report,
  REPORTING_ROUTE: 'a',
};

registerBidder(spec);
