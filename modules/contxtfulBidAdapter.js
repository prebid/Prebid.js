import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { _each, buildUrl, isStr, isEmptyStr, logInfo, logError, safeJSONEncode } from '../src/utils.js';
import { sendBeacon, ajax } from '../src/ajax.js';
import { config as pbjsConfig } from '../src/config.js';
import {
  isBidRequestValid,
  interpretResponse,
  getUserSyncs as getUserSyncsLib,
} from '../libraries/teqblazeUtils/bidderUtils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

// Constants
const BIDDER_CODE = 'contxtful';
const BIDDER_ENDPOINT = 'prebid.receptivity.io';
const MONITORING_ENDPOINT = 'monitoring.receptivity.io';
const DEFAULT_NET_REVENUE = true;
const DEFAULT_TTL = 300;
const DEFAULT_SAMPLING_RATE = 1.0;
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
  const ortb2 = converter.toORTB({ bidderRequest: bidderRequest, bidRequests: validBidRequests });

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
  const { version, customer } = extractParameters(config)
  const adapterUrl = buildUrl({
    protocol: 'https',
    host: BIDDER_ENDPOINT,
    pathname: `/${version}/prebid/${customer}/bid`,
  });

  // See https://docs.prebid.org/dev-docs/bidder-adaptor.html
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
  return entry ? entry[1] : DEFAULT_SAMPLING_RATE;
};

const logBidderError = ({ error, bidderRequest }) => {
  if (error) {
    let jsonReason = {
      message: error.reason?.message,
      stack: error.reason?.stack,
    };
    error.reason = jsonReason;
  }
  logEvent('onBidderError', { error, bidderRequest });
};

const safeStringify = (data, keysToExclude = []) => {
  try {
    const seen = new WeakSet();
    return JSON.stringify(data, function (key, value) {
      try {
        if (keysToExclude.includes(key)) {
          return '[Excluded]';
        }
        // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#exceptions
        if (typeof value === "bigint") {
          return value.toString();
        }

        // Handle browser objects
        if (typeof value === "object" && value !== null) {
          // In case we try to stringify some html object, it could throw a SecurityError before detecting the circular reference
          if (value === window ||
              (typeof Window !== 'undefined' && value instanceof Window) ||
              (typeof Document !== 'undefined' && value instanceof Document) ||
              (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) ||
              (typeof Node !== 'undefined' && value instanceof Node)) {
            return '[Browser Object]';
          }

          // Check for circular references
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }

        return value;
      } catch (error) {
        // Handle any property access errors (like cross-origin SecurityError)
        return '[Inaccessible Object]';
      }
    });
  } catch (error) {
    return safeJSONEncode({ traceId: data?.traceId || '[Unknown]', error: error?.toString() });
  }
};

// Handles the logging of events
const logEvent = (eventType, data) => {
  try {
    // Get Config
    const bidderConfig = pbjsConfig.getConfig();
    const { version, customer } = extractParameters(bidderConfig);

    // Construct a fail-safe payload
    const stringifiedPayload = safeStringify(data, ["renderer"]);

    logInfo(BIDDER_CODE, `[${eventType}] ${stringifiedPayload}`);

    // Sampled monitoring
    if (['onBidBillable', 'onAdRenderSucceeded'].includes(eventType)) {
      const randomNumber = Math.random();
      const samplingRate = getSamplingRate(bidderConfig, eventType);
      if (!(randomNumber <= samplingRate)) {
        return; // Don't sample
      }
    } else if (!['onTimeout', 'onBidderError', 'onBidWon'].includes(eventType)) {
      // Unsupported event type.
      return;
    }

    const eventUrl = buildUrl({
      protocol: 'https',
      host: MONITORING_ENDPOINT,
      pathname: `/${version}/prebid/${customer}/log/${eventType}`,
    });

    // Try sending a beacon
    if (sendBeacon(eventUrl, stringifiedPayload)) {
      logInfo(BIDDER_CODE, `[${eventType}] Logging data sent using Beacon and payload: ${stringifiedPayload}`);
    } else {
      // Fallback to using ajax
      ajax(eventUrl, null, stringifiedPayload, {
        method: 'POST',
        contentType: 'application/json',
        withCredentials: true,
      });
      logInfo(BIDDER_CODE, `[${eventType}] Logging data sent using Ajax and payload: ${stringifiedPayload}`);
    }
  } catch (error) {
    logError(BIDDER_CODE, `Failed to log event: ${eventType}. Error: ${error.toString()}.`);
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
  onBidWon: function (bid) { logEvent('onBidWon', bid); },
  onBidBillable: function (bid) { logEvent('onBidBillable', bid); },
  onAdRenderSucceeded: function (bid) { logEvent('onAdRenderSucceeded', bid); },
  onSetTargeting: function (bid) { },
  onTimeout: function (timeoutData) { logEvent('onTimeout', timeoutData); },
  onBidderError: logBidderError,
};

// Export for testing
export { safeStringify };

registerBidder(spec);
