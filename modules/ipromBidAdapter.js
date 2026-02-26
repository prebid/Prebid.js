import { deepClone, logError, logWarn } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'iprom';
const ENDPOINT_URL = 'https://core.iprom.net/programmatic';
const VERSION = 'v1.1.0';
const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_NETREVENUE = true;
const DEFAULT_TTL = 360;
const IAB_GVL_ID = 811;
const converter = ortbConverter({
  context: {
    netRevenue: DEFAULT_NETREVENUE,
    ttl: DEFAULT_TTL
  }
});

function logMissingFields(scope, missingFields) {
  if (missingFields.length) {
    logWarn(`${BIDDER_CODE}: Missing ${scope} fields: ${missingFields.join(', ')}`);
  }
}

function isValidEndpointUrl(endpoint) {
  try {
    const parsedEndpoint = new URL(endpoint);
    return parsedEndpoint.protocol === 'http:' || parsedEndpoint.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function getCustomEndpoint() {
  const configuredEndpoint = config.getConfig(`${BIDDER_CODE}.endpoint`);

  if (typeof configuredEndpoint === 'string' && isValidEndpointUrl(configuredEndpoint)) {
    return configuredEndpoint;
  }

  return null;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: IAB_GVL_ID,
  isBidRequestValid: function ({ bidder, params = {} } = {}) {
    // id parameter checks
    if (!params.id) {
      logError(`${bidder}: Parameter 'id' missing`);
      return false;
    } else if (typeof params.id !== 'string') {
      logError(`${bidder}: Parameter 'id' needs to be a string`);
      return false;
    }
    // dimension parameter checks
    if (params.dimension && typeof params.dimension !== 'string') {
      logError(`${bidder}: Parameter 'dimension' needs to be a string`);
      return false;
    }

    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const customEndpoint = getCustomEndpoint();

    if (customEndpoint) {
      const ortbRequest = converter.toORTB({
        bidderRequest,
        bidRequests: validBidRequests,
      });

      return {
        method: 'POST',
        url: customEndpoint,
        data: ortbRequest,
        ortb: true
      };
    }

    const payload = {
      bids: validBidRequests,
      version: VERSION
    };

    if (bidderRequest?.refererInfo) {
      const refererInfo = bidderRequest.refererInfo;
      const refererUrl = refererInfo.topmostLocation ?? refererInfo.ref;
      const missingRefererFields = [];

      if (refererInfo.reachedTop == null) missingRefererFields.push('reachedTop');
      if (refererUrl == null) missingRefererFields.push('referer');
      if (refererInfo.numIframes == null) missingRefererFields.push('numIframes');
      if (refererInfo.stack == null) missingRefererFields.push('stack');

      logMissingFields('referer', missingRefererFields);

      const referer = {
        reachedTop: refererInfo.reachedTop,
        referer: refererUrl,
        numIframes: refererInfo.numIframes,
        stack: refererInfo.stack
      };

      if (Object.values(referer).some(value => value != null)) {
        payload.referer = referer;
      }
    }

    if (bidderRequest?.gdprConsent) {
      const tcf = {
        consentString: bidderRequest.gdprConsent.consentString,
        gdprApplies: bidderRequest.gdprConsent.gdprApplies,
        addtlConsent: bidderRequest.gdprConsent.addtlConsent
      };
      const missingTcfFields = [];

      if (tcf.consentString == null) missingTcfFields.push('consentString');
      if (tcf.gdprApplies == null) missingTcfFields.push('gdprApplies');
      if (tcf.addtlConsent == null) missingTcfFields.push('addtlConsent');

      logMissingFields('tcf', missingTcfFields);

      payload.tcf = tcf;
    }

    const schain = bidderRequest?.ortb2?.source?.ext?.schain;
    if (schain) {
      payload.schain = schain;
    }

    if (bidderRequest?.ortb2) {
      const firstPartyData = deepClone(bidderRequest.ortb2);

      if (firstPartyData?.source?.ext?.schain) {
        delete firstPartyData.source.ext.schain;

        if (!Object.keys(firstPartyData.source.ext).length) {
          delete firstPartyData.source.ext;
        }

        if (!Object.keys(firstPartyData.source).length) {
          delete firstPartyData.source;
        }
      }

      if (firstPartyData.site) {
        delete firstPartyData.site;
      }

      if (Object.keys(firstPartyData).length) {
        payload.firstPartyData = firstPartyData;
      }
    }

    const payloadString = JSON.stringify(payload);

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString
    };
  },

  interpretResponse: function (serverResponse, request) {
    if (request?.ortb) {
      return converter.fromORTB({response: serverResponse.body, request: request.data}).bids;
    }

    const bids = serverResponse.body;

    const bidResponses = [];

    bids.forEach(bid => {
      const b = {
        ad: bid.ad,
        requestId: bid.requestId,
        cpm: bid.cpm,
        width: bid.width,
        height: bid.height,
        creativeId: bid.creativeId,
        currency: bid.currency || DEFAULT_CURRENCY,
        netRevenue: bid.netRevenue || DEFAULT_NETREVENUE,
        ttl: bid.ttl || DEFAULT_TTL,
        meta: {},
      };

      if (bid.aDomains && bid.aDomains.length) {
        b.meta.advertiserDomains = bid.aDomains;
      }

      bidResponses.push(b);
    });

    return bidResponses;
  },
}

registerBidder(spec);
