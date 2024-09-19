import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { _each, buildUrl, isStr, isEmptyStr, logInfo, logError } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import {
  isBidRequestValid,
  interpretResponse,
  getUserSyncs as getUserSyncsLib,
} from '../libraries/teqblazeUtils/bidderUtils.js';

import {ortbConverter} from '../libraries/ortbConverter/converter.js';

// Constants
const BIDDER_CODE = 'contxtful';
const BIDDER_ENDPOINT = 'prebid.receptivity.io';
const MONITORING_ENDPOINT = 'monitoring.receptivity.io';
const DEFAULT_NET_REVENUE = true;
const DEFAULT_TTL = 300;

// ORTB conversion
const converter = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_TTL
  },
  imp(buildImp, bidRequest, context) {
    let imp = buildImp(bidRequest, context);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const reqData = buildRequest(imps, bidderRequest, context);
    return reqData;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    return bidResponse;
  }
});

// Get Bid Floor
const _getRequestBidFloor = (mediaTypes, paramsBidFloor, bid) => {
  const bidMediaType = Object.keys(mediaTypes)[0] || 'banner';
  const bidFloor = { floor: 0, currency: 'USD' };

  if (typeof bid.getFloor === 'function') {
    const { currency, floor } = bid.getFloor({
      mediaType: bidMediaType,
      size: '*'
    });
    floor && (bidFloor.floor = floor);
    currency && (bidFloor.currency = currency);
  } else if (paramsBidFloor) {
    bidFloor.floor = paramsBidFloor
  }

  return bidFloor;
}

// Get Parameters from the config.
const extractParameters = (config) => {
  const version = config?.contxtful?.version;
  if (!isStr(version) || isEmptyStr(version)) {
    throw Error(`contxfulBidAdapter: contxtful.version should be a non-empty string`);
  }

  const customer = config?.contxtful?.customer;
  if (!isStr(customer) || isEmptyStr(customer)) {
    throw Error(`contxfulBidAdapter: contxtful.customer should be a non-empty string`);
  }

  return { version, customer };
}

// Construct the Payload towards the Bidding endpoint
const buildRequests = (validBidRequests = [], bidderRequest = {}) => {
  const ortb2 = converter.toORTB({bidderRequest: bidderRequest, bidRequests: validBidRequests});

  const bidRequests = [];
  _each(validBidRequests, bidRequest => {
    const {
      mediaTypes = {},
      params = {},
    } = bidRequest;
    bidRequest.bidFloor = _getRequestBidFloor(mediaTypes, params.bidfloor, bidRequest);
    bidRequests.push(bidRequest)
  });
  const pubConfig = config.getConfig();
  const {version, customer} = extractParameters(pubConfig)
  const adapterUrl = buildUrl({
    protocol: 'https',
    host: BIDDER_ENDPOINT,
    pathname: `/${version}/prebid/${customer}/bid`,
  });

  // https://docs.prebid.org/dev-docs/bidder-adaptor.html
  let req = {
    url: adapterUrl,
    method: 'POST',
    data: {
      ortb2,
      bidRequests,
      bidderRequest,
      pubConfig,
    },
  };

  return req;
};

// Prepare a sync object compatible with getUserSyncs.
const buildSyncEntry = (sync, gdprConsent, uspConsent, gppConsent) => {
  const syncDefaults = getUserSyncsLib('')(sync, gdprConsent, uspConsent, gppConsent);
  const syncDefaultEntry = syncDefaults?.find(item => item.url !== undefined);
  if (!syncDefaultEntry) return null;

  const defaultParams = syncDefaultEntry.url.split('?')[1] ?? '';
  const syncUrl = defaultParams ? `${sync.url}?${defaultParams}` : sync.url;
  return {
    ...syncDefaultEntry,
    url: syncUrl,
  };
};

// Returns the list of user synchronization objects.
const getUserSyncs = (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
  const serverSyncsData = serverResponses.flatMap(response => response.body || [])
    .map(data => data.syncs)
    .find(syncs => Array.isArray(syncs) && syncs.length > 0) || [];
  const userSyncs = serverSyncsData
    .map(sync => buildSyncEntry(sync, gdprConsent, uspConsent, gppConsent))
    .filter(Boolean); // Filter out nulls
  return userSyncs;
};

// Retrieve the sampling rate for events
const getSamplingRate = (bidderConfig, eventType) => {
  const entry = Object.entries(bidderConfig?.contxtful?.sampling ?? {}).find(([key, value]) => key.toLowerCase() === eventType.toLowerCase());
  return entry ? entry[1] : 0.001;
};

// Handles the logging of events
const logEvent = (eventType, data, samplingEnabled) => {
  try {
    // Log event
    logInfo(BIDDER_CODE, `[${eventType}] ${JSON.stringify(data)}`);

    // Get Config
    const bidderConfig = config.getConfig();
    const {version, customer} = extractParameters(bidderConfig);

    // Sampled monitoring
    if (samplingEnabled) {
      const shouldSampleDice = Math.random();
      const samplingRate = getSamplingRate(bidderConfig, eventType);
      if (shouldSampleDice >= samplingRate) {
        return; // Don't sample
      }
    }

    const options = {
      method: 'POST',
      contentType: 'application/json',
      withCredentials: true,
    };

    const request = { type: eventType, data };

    const eventUrl = buildUrl({
      protocol: 'https',
      host: MONITORING_ENDPOINT,
      pathname: `/${version}/prebid/${customer}/log/${eventType}`,
    });

    ajax(eventUrl, null, request, options);
  } catch (error) {
    logError(`Failed to log event: ${eventType}`);
  }
};

// Bidder exposed specification
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(['placementId']),
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onBidWon: function(bid) { logEvent('onBidWon', bid, false); },
  onBidBillable: function(bid) { logEvent('onBidBillable', bid, false); },
  onAdRenderSucceeded: function(bid) { logEvent('onAdRenderSucceeded', bid, false); },
  onSetTargeting: function(bid) { },
  onTimeout: function(timeoutData) { logEvent('onTimeout', timeoutData, true); },
  onBidderError: function(args) { logEvent('onBidderError', args, true); },
};

registerBidder(spec);
