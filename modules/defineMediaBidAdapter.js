/**
 * Define Media Bid Adapter for Prebid.js
 *
 * This adapter connects publishers to Define Media's programmatic advertising platform
 * via OpenRTB 2.5 protocol. It supports banner ad formats and includes proper
 * supply chain transparency through sellers.json compliance.
 *
 * @module defineMediaBidAdapter
 * @version 1.0.0
 */

import {logInfo, logError, logWarn } from "../src/utils.js";
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'
import { ajax } from '../src/ajax.js';

// Bidder identification and compliance constants
const BIDDER_CODE = 'defineMedia';
const IAB_GVL_ID = 440; // IAB Global Vendor List ID for GDPR compliance
const SUPPORTED_MEDIA_TYPES = [BANNER]; // Currently only banner ads are supported

// Default bid response configuration
const DEFAULT_TTL = 1000; // Default time-to-live for bids in seconds
const DEFAULT_NET_REVENUE = true; // Revenue is reported as net (after platform fees)

// Endpoint URLs for different environments
const ENDPOINT_URL_DEV = 'https://rtb-dev.conative.network/openrtb2/auction'; // Development/testing endpoint
const ENDPOINT_URL_PROD = 'https://rtb.conative.network/openrtb2/auction'; // Production endpoint
const METHOD = 'POST'; // HTTP method for bid requests

/**
 * Default ORTB converter instance with standard configuration
 * This handles the conversion between Prebid.js bid objects and OpenRTB format
 */
const converter = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_TTL
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: IAB_GVL_ID,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  /**
   * Determines if a bid request is valid for this adapter
   *
   * Required parameters:
   * - supplierDomainName: Domain name for supply chain transparency
   * - mediaTypes.banner: Must include banner media type configuration
   *
   * Optional parameters:
   * - devMode: Boolean flag to use development endpoint
   * - ttl: Custom time-to-live for the bid response (only honored when devMode is true)
   *
   * @param {Object} bid - The bid request object from Prebid.js
   * @returns {boolean} True if the bid request is valid
   */
  isBidRequestValid: (bid) => {
    // Ensure we have a valid bid object
    if (!bid || typeof bid !== 'object') {
      logInfo(`[${BIDDER_CODE}] isBidRequestValid: Invalid bid object`);
      return false;
    }

    // Validate required parameters
    const hasSupplierDomainName = Boolean(bid?.params?.supplierDomainName);
    const hasValidMediaType = Boolean(bid?.mediaTypes && bid.mediaTypes.banner);
    const isDevMode = Boolean(bid?.params?.devMode);

    logInfo(`[${BIDDER_CODE}] isBidRequestValid called with:`, {
      bidId: bid.bidId,
      hasSupplierDomainName,
      hasValidMediaType,
      isDevMode
    });

    const isValid = hasSupplierDomainName && hasValidMediaType;
    logInfo(`[${BIDDER_CODE}] isBidRequestValid returned:`, isValid);
    return isValid;
  },

  /**
   * Builds OpenRTB bid requests from validated Prebid.js bid requests
   *
   * This method:
   * 1. Creates individual OpenRTB requests for each valid bid
   * 2. Sets up dynamic TTL based on bid parameters (only in devMode)
   * 3. Configures supply chain transparency (schain)
   * 4. Selects appropriate endpoint based on devMode flag
   *
   * @param {Array} validBidRequests - Array of valid bid request objects
   * @param {Object} bidderRequest - Bidder-level request data from Prebid.js
   * @returns {Array} Array of bid request objects to send to the server
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    return validBidRequests?.map(function(req) {
      // DeepCopy the request to avoid modifying the original object
      const oneBidRequest = [JSON.parse(JSON.stringify(req))];

      // Get parameters and check devMode first
      const params = oneBidRequest[0].params;
      const isDevMode = Boolean(params?.devMode);

      // Custom TTL is only allowed in development mode for security and consistency
      const ttl = isDevMode && params?.ttl ? params.ttl : DEFAULT_TTL;

      // Create converter with TTL (custom only in devMode, otherwise default)
      const dynamicConverter = ortbConverter({
        context: {
          netRevenue: DEFAULT_NET_REVENUE,
          ttl: ttl
        }
      });

      // Convert Prebid.js request to OpenRTB format
      const ortbRequest = dynamicConverter.toORTB({
        bidderRequest: bidderRequest,
        bidRequests: oneBidRequest
      });

      // Select endpoint based on development mode flag
      const endpointUrl = isDevMode ? ENDPOINT_URL_DEV : ENDPOINT_URL_PROD;

      // Configure supply chain transparency (sellers.json compliance)
      // Preserve existing schain if present, otherwise create minimal schain
      if (bidderRequest?.source?.schain) {
        // Preserve existing schain structure from bidderRequest
        ortbRequest.source = bidderRequest.source;
      } else {
        // Create minimal schain only if none exists
        if (!ortbRequest.source) {
          ortbRequest.source = {};
        }
        if (!ortbRequest.source.schain) {
          ortbRequest.source.schain = {
            complete: 1, // Indicates this is a complete supply chain
            nodes: [{
              asi: params.supplierDomainName // Advertising system identifier
            }]
          };
        }
      }

      logInfo(`[${BIDDER_CODE}] Mapped ORTB Request from`, oneBidRequest, ' to ', ortbRequest, ' with bidderRequest ', bidderRequest);

      return {
        method: METHOD,
        url: endpointUrl,
        data: ortbRequest,
        converter: dynamicConverter // Attach converter for response processing
      }
    });
  },

  /**
   * Processes bid responses from the Define Media server
   *
   * This method:
   * 1. Validates the server response structure
   * 2. Uses the appropriate ORTB converter (request-specific or default)
   * 3. Converts OpenRTB response back to Prebid.js bid format
   * 4. Handles errors gracefully and returns empty array on failure
   *
   * @param {Object} serverResponse - Response from the bid server
   * @param {Object} request - Original request object containing converter
   * @returns {Array} Array of bid objects for Prebid.js
   */
  interpretResponse: (serverResponse, request) => {
    logInfo(`[${BIDDER_CODE}] interpretResponse called with:`, { serverResponse, request });

    // Validate server response structure
    if (!serverResponse?.body) {
      logWarn(`[${BIDDER_CODE}] No response body received`);
      return [];
    }

    try {
      // Use the converter from the request if available (with custom TTL), otherwise use default
      const responseConverter = request.converter || converter;
      const bids = responseConverter.fromORTB({response: serverResponse.body, request: request.data}).bids;
      logInfo(`[${BIDDER_CODE}] Successfully parsed ${bids.length} bids`);
      return bids;
    } catch (error) {
      logError(`[${BIDDER_CODE}] Error parsing response:`, error);
      return [];
    }
  },

  /**
   * Handles bid request timeouts
   * Currently logs timeout events for monitoring and debugging
   *
   * @param {Array|Object} timeoutData - Timeout data from Prebid.js
   */
  onTimeout: (timeoutData) => {
    logInfo(`[${BIDDER_CODE}] onTimeout called with:`, timeoutData);
  },

  /**
   * Handles successful bid wins
   *
   * This method:
   * 1. Fires win notification URL (burl) if present in bid
   * 2. Logs win event for analytics and debugging
   *
   * @param {Object} bid - The winning bid object
   */
  onBidWon: (bid) => {
    // Fire win notification URL for server-side tracking
    if (bid?.burl) {
      ajax(bid.burl, null, null);
    }
    logInfo(`[${BIDDER_CODE}] onBidWon called with bid:`, bid);
  },

  /**
   * Handles bidder errors with comprehensive error categorization
   *
   * This method:
   * 1. Categorizes errors by type (timeout, network, client/server errors)
   * 2. Collects relevant context for debugging
   * 3. Logs structured error information for monitoring
   *
   * Error categories:
   * - timeout: Request exceeded time limit
   * - network: Network connectivity issues
   * - client_error: 4xx HTTP status codes
   * - server_error: 5xx HTTP status codes
   * - unknown: Uncategorized errors
   *
   * @param {Object} params - Error parameters
   * @param {Object} params.error - Error object
   * @param {Object} params.bidderRequest - Original bidder request
   */
  onBidderError: ({ error, bidderRequest }) => {
    // Collect comprehensive error information for debugging
    const errorInfo = {
      message: error?.message || 'Unknown error',
      type: error?.type || 'general',
      code: error?.code || null,
      bidderCode: BIDDER_CODE,
      auctionId: bidderRequest?.auctionId || 'unknown',
      bidderRequestId: bidderRequest?.bidderRequestId || 'unknown',
      timeout: bidderRequest?.timeout || null,
      bids: bidderRequest?.bids?.length || 0
    };

    // Categorize error types for better debugging and monitoring
    if (error?.message?.includes('timeout')) {
      errorInfo.category = 'timeout';
    } else if (error?.message?.includes('network')) {
      errorInfo.category = 'network';
    } else if (error?.code >= 400 && error?.code < 500) {
      errorInfo.category = 'client_error';
    } else if (error?.code >= 500) {
      errorInfo.category = 'server_error';
    } else {
      errorInfo.category = 'unknown';
    }

    logError(`[${BIDDER_CODE}] Bidder error occurred:`, errorInfo);
  },

  /**
   * Handles successful ad rendering events
   * Currently logs render success for analytics and debugging
   *
   * @param {Object} bid - The successfully rendered bid object
   */
  onAdRenderSucceeded: (bid) => {
    logInfo(`[${BIDDER_CODE}] onAdRenderSucceeded called with bid:`, bid);
  }
};

// Register the bidder with Prebid.js
registerBidder(spec);
