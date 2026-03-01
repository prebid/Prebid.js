import {registerBidder} from '../src/adapters/bidderFactory.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {BANNER} from '../src/mediaTypes.js';
import {deepSetValue} from '../src/utils.js';

const BIDDER_CODE = 'proxistore';
const PROXISTORE_VENDOR_ID = 418;
const COOKIE_BASE_URL = 'https://abs.proxistore.com/v3/rtb/openrtb';
const COOKIE_LESS_URL = 'https://abs.cookieless-proxistore.com/v3/rtb/openrtb';
const SYNC_BASE_URL = 'https://abs.proxistore.com/v3/rtb/sync';

const converter = ortbConverter({
  context: {
    mediaType: BANNER,
    netRevenue: true,
    ttl: 30,
    currency: 'EUR',
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const bidRequests = context.bidRequests;
    if (bidRequests && bidRequests.length > 0) {
      const params = bidRequests[0].params;
      if (params.website) {
        deepSetValue(request, 'ext.proxistore.website', params.website);
      }
      if (params.language) {
        deepSetValue(request, 'ext.proxistore.language', params.language);
      }
    }
    return request;
  }
});

/**
 * Determines whether or not the given bid request is valid.
 *
 * @param bid  The bid params to validate.
 * @return boolean True if this is a valid bid, and false otherwise.
 */
function isBidRequestValid(bid) {
  return !!(bid.params.website && bid.params.language);
}

/**
 * Make a server request from the list of BidRequests.
 *
 * @param bidRequests - an array of bids
 * @param bidderRequest
 * @return ServerRequest Info describing the request to the server.
 */
function buildRequests(bidRequests, bidderRequest) {
  let gdprApplies = false;
  let consentGiven = false;

  if (bidderRequest && bidderRequest.gdprConsent) {
    const gdprConsent = bidderRequest.gdprConsent;

    if (typeof gdprConsent.gdprApplies === 'boolean' && gdprConsent.gdprApplies) {
      gdprApplies = true;
    }

    if (gdprConsent.vendorData) {
      const vendorData = gdprConsent.vendorData;
      if (
        vendorData.vendor &&
        vendorData.vendor.consents &&
        vendorData.vendor.consents[PROXISTORE_VENDOR_ID.toString(10)] !== 'undefined'
      ) {
        consentGiven = !!vendorData.vendor.consents[PROXISTORE_VENDOR_ID.toString(10)];
      }
    }
  }

  const options = {
    contentType: 'application/json',
    withCredentials: consentGiven,
    customHeaders: {
      version: '2.0.0',
    },
  };

  const endPointUri = consentGiven || !gdprApplies ? COOKIE_BASE_URL : COOKIE_LESS_URL;

  return {
    method: 'POST',
    url: endPointUri,
    data: converter.toORTB({ bidRequests, bidderRequest }),
    options: options,
  };
}

/**
 * Unpack the response from the server into a list of bids.
 *
 * @param response
 * @param request
 * @return  An array of bids which were nested inside the server.
 */
function interpretResponse(response, request) {
  if (response.body) {
    return converter.fromORTB({response: response.body, request: request.data}).bids;
  }
  return [];
}

/**
 * Register user sync pixels and iframes.
 *
 * @param syncOptions - which sync types are enabled
 * @param responses - server responses
 * @param gdprConsent - GDPR consent data
 * @return Array of sync objects
 */
function getUserSyncs(syncOptions, responses, gdprConsent) {
  const syncs = [];

  // Only sync if consent given or GDPR doesn't apply
  const consentGiven = gdprConsent?.vendorData?.vendor?.consents?.[PROXISTORE_VENDOR_ID];
  if (gdprConsent?.gdprApplies && !consentGiven) {
    return syncs;
  }

  const params = new URLSearchParams();
  if (gdprConsent) {
    params.set('gdpr', gdprConsent.gdprApplies ? '1' : '0');
    if (gdprConsent.consentString) {
      params.set('gdpr_consent', gdprConsent.consentString);
    }
  }

  if (syncOptions.pixelEnabled) {
    syncs.push({
      type: 'image',
      url: `${SYNC_BASE_URL}/image?${params}`
    });
  }

  if (syncOptions.iframeEnabled) {
    syncs.push({
      type: 'iframe',
      url: `${SYNC_BASE_URL}/iframe?${params}`
    });
  }

  return syncs;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: PROXISTORE_VENDOR_ID,
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse,
  getUserSyncs: getUserSyncs,
  supportedMediaTypes: [BANNER],
  browsingTopics: true,
};

registerBidder(spec);
