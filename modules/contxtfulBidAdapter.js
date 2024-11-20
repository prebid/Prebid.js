import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { _each, buildUrl, isStr, isEmptyStr, logInfo, logError } from '../src/utils.js';
import { sendBeacon, ajax } from '../src/ajax.js';
import { config as pbjsConfig } from '../src/config.js';
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
const PREBID_VERSION = '$prebid.version$';

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
  const config = pbjsConfig.getConfig();
  config.pbjsVersion = PREBID_VERSION;
  const {version, customer} = extractParameters(config)
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
      config,
    },
  };

  return req;
};

// Prepare a sync object compatible with getUserSyncs.
const constructUrl = (userSyncsDefault, userSyncServer) => {
  const urlSyncServer = (userSyncServer?.url ?? '').split('?');
  const userSyncUrl = userSyncsDefault?.url || '';
  const baseSyncUrl = urlSyncServer[0] || '';

  let url = `${baseSyncUrl}${userSyncUrl}`;

  if (urlSyncServer.length > 1) {
    const urlParams = urlSyncServer[1];
    url += url.includes('?') ? `&${urlParams}` : `?${urlParams}`;
  }

  return {
    ...userSyncsDefault,
    url,
  };
};

// Returns the list of user synchronization objects.
const getUserSyncs = (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
  // Get User Sync Defaults from pbjs lib
  const userSyncsDefaultLib = getUserSyncsLib('')(syncOptions, null, gdprConsent, uspConsent, gppConsent);
  const userSyncsDefault = userSyncsDefaultLib?.find(item => item.url !== undefined);

  // Map Server Responses to User Syncs list
  const serverSyncsData = serverResponses?.flatMap(response => response.body || [])
    .map(data => data.syncs)
    .find(syncs => Array.isArray(syncs) && syncs.length > 0) || [];
  const userSyncs = serverSyncsData
    .map(sync => constructUrl(userSyncsDefault, sync))
    .filter(Boolean); // Filter out nulls
  return userSyncs;
};

// Retrieve the sampling rate for events
const getSamplingRate = (bidderConfig, eventType) => {
  const entry = Object.entries(bidderConfig?.contxtful?.sampling ?? {}).find(([key, value]) => key.toLowerCase() === eventType.toLowerCase());
  return entry ? entry[1] : 0.001;
};

// Handles the logging of events
const logEvent = (eventType, data) => {
  try {
    // Log event
    logInfo(BIDDER_CODE, `[${eventType}] ${JSON.stringify(data)}`);

    // Get Config
    const bidderConfig = pbjsConfig.getConfig();
    const {version, customer} = extractParameters(bidderConfig);

    // Sampled monitoring
    if (['onBidBillable', 'onAdRenderSucceeded'].includes(eventType)) {
      const randomNumber = Math.random();
      const samplingRate = getSamplingRate(bidderConfig, eventType);
      if (randomNumber >= samplingRate) {
        return; // Don't sample
      }
    } else if (!['onTimeout', 'onBidderError', 'onBidWon'].includes(eventType)) {
      // Unsupported event type.
      return;
    }

    const payload = { type: eventType, data };
    const eventUrl = buildUrl({
      protocol: 'https',
      host: MONITORING_ENDPOINT,
      pathname: `/${version}/prebid/${customer}/log/${eventType}`,
    });

    // Try sending a beacon
    if (sendBeacon(eventUrl, JSON.stringify(payload))) {
      logInfo(BIDDER_CODE, `[${eventType}] Logging data sent using Beacon and payload: ${JSON.stringify(data)}`);
    } else {
      // Fallback to using ajax
      ajax(eventUrl, null, JSON.stringify(payload), {
        method: 'POST',
        contentType: 'application/json',
        withCredentials: true,
      });
      logInfo(BIDDER_CODE, `[${eventType}] Logging data sent using Ajax and payload: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    logError(BIDDER_CODE, `Failed to log event: ${eventType}`);
  }
};

// Bidder public specification
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onBidWon: function(bid) { logEvent('onBidWon', bid); },
  onBidBillable: function(bid) { logEvent('onBidBillable', bid); },
  onAdRenderSucceeded: function(bid) { logEvent('onAdRenderSucceeded', bid); },
  onSetTargeting: function(bid) { },
  onTimeout: function(timeoutData) { logEvent('onTimeout', timeoutData); },
  onBidderError: function({ error, bidderRequest }) { logEvent('onBidderError', { error, bidderRequest }); },
};

registerBidder(spec);
