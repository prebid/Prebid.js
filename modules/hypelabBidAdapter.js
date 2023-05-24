import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { generateUUID } from '../src/utils.js';
import { ajax } from '../src/ajax.js';

export const BIDDER_CODE = 'hypelab';
export const ENDPOINT_URL = 'https://api.hypelab.com';

export const REQUEST_ROUTE = '/v1/prebid_requests';
export const EVENT_ROUTE = '/v1/events';
export const REPORTING_ROUTE = null;

const DEFAULT_TTL = 360;

const url = (route) => ENDPOINT_URL + route;

function mediaSize(data) {
  if (!data || !data.creative_set) return { width: 0, height: 0 };
  const media = data.creative_set.video || data.creative_set.image || {};
  return { width: media.width, height: media.height };
}

function isBidRequestValid(request) {
  return true;
}

function buildRequests(validBidRequests, bidderRequest) {
  const result = validBidRequests.map((request) => {
    const uids = (request.userIdAsEids || []).reduce((a, c) => {
      const ids = c.uids.map((uid) => uid.id);
      return [...a, ...ids];
    }, []);

    const uuid = uids[0] ? uids[0] : generateTemporaryUUID();

    const payload = {
      property_slug: request.params.property_slug,
      placement_slug: request.params.placement_slug,
      provider_version: request.params.provider_version,
      provider_name: request.params.provider_name,
      referrer: bidderRequest.refererInfo?.ref,
      sdk_version: request.params.sdk_version,
      sizes: request.sizes,
      wids: [],
      url: bidderRequest.refererInfo?.page || window.location.href,
      uuid,
    };

    return {
      method: 'POST',
      url: url(REQUEST_ROUTE),
      options: { contentType: 'application/json', withCredentials: false },
      data: payload,
      bidId: request.bidId,
    };
  });

  return result;
}

function generateTemporaryUUID() {
  return 'tmp_' + generateUUID();
}

function interpretResponse(response, request) {
  const { data } = response.body;
  const { cpm } = data;
  if (!cpm) return [];

  const size = mediaSize(data);

  const result = {
    requestId: request.bidId,
    cpm,
    width: size.width,
    height: size.height,
    creativeId: data.creative_set_slug || '0',
    currency: 'USD',
    netRevenue: true,
    referrer: request.data.referrer,
    ttl: data.ttl || DEFAULT_TTL,
    ad: data.html,
    mediaType: 'banner',
    meta: {
      advertiserDomains: data.advertiserDomains || [],
    },
  };

  return [result];
}

function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  const syncs = [];
  return syncs;
}

function report(eventType, data) {
  if (!REPORTING_ROUTE) return;

  const options = {
    method: 'POST',
    contentType: 'application/json',
    withCredentials: true,
  };

  const request = { type: eventType, data };
  ajax(url(REPORTING_ROUTE), null, request, options);
}

function onTimeout(timeoutData) {
  report('timeout', timeoutData);
}

function onBidWon(bid) {
  report('bidWon', bid);
}

function onSetTargeting(bid) {
  report('setTargeting', bid);
}

function onBidderError(errorData) {
  report('bidderError', errorData);
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  aliases: ['hype'],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onTimeout,
  onBidWon,
  onSetTargeting,
  onBidderError,
};

registerBidder(spec);
