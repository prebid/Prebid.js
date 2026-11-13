import { deepClone, deepSetValue, logError, logWarn } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
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
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const { id, dimension } = bidRequest.params || {};

    deepSetValue(imp, 'ext.bidder.id', id);
    if (dimension != null) {
      deepSetValue(imp, 'ext.bidder.dimension', dimension);
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const refererInfo = bidderRequest?.refererInfo;

    if (refererInfo) {
      const ext = {};
      if (refererInfo.reachedTop != null) ext.reachedTop = refererInfo.reachedTop;
      if (refererInfo.numIframes != null) ext.numIframes = refererInfo.numIframes;
      if (refererInfo.stack != null) ext.stack = refererInfo.stack;

      if (Object.keys(ext).length) {
        if (!request.site) request.site = {};
        request.site.ext = Object.assign({}, request.site.ext, ext);
      }
    }

    if (!request.ext) request.ext = {};
    request.ext.adapterVersion = VERSION;

    return request;
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
    return parsedEndpoint.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function resolveEndpoint(endpoint) {
  if (typeof endpoint === 'string') {
    if (isValidEndpointUrl(endpoint)) {
      return endpoint;
    } else {
      logWarn(`${BIDDER_CODE}: Endpoint ${endpoint} is not a valid HTTPS URL, using default endpoint`);
    }
  }

  return ENDPOINT_URL;
}

function extractReferer(refererInfo) {
  if (!refererInfo) {
    return null;
  }

  const refererUrl = refererInfo.topmostLocation ?? refererInfo.ref;
  const missingRefererFields = [];

  if (refererInfo.reachedTop == null) missingRefererFields.push('reachedTop');
  if (refererUrl == null) missingRefererFields.push('referer');
  if (refererInfo.numIframes == null) missingRefererFields.push('numIframes');
  if (refererInfo.stack == null) missingRefererFields.push('stack');

  logMissingFields('referer', missingRefererFields);

  const referer = {
    reachedTop: refererInfo.reachedTop ?? null,
    referer: refererUrl ?? null,
    numIframes: refererInfo.numIframes ?? null,
    stack: refererInfo.stack ?? null
  };

  return Object.values(referer).some(value => value != null) ? referer : null;
}

function extractTcf(gdprConsent) {
  if (!gdprConsent) {
    return null;
  }

  const tcf = {
    consentString: gdprConsent.consentString ?? null,
    gdprApplies: gdprConsent.gdprApplies ?? null,
    addtlConsent: gdprConsent.addtlConsent ?? null
  };
  const missingTcfFields = [];

  if (tcf.consentString == null) missingTcfFields.push('consentString');
  if (tcf.gdprApplies == null) missingTcfFields.push('gdprApplies');
  if (tcf.addtlConsent == null) missingTcfFields.push('addtlConsent');

  logMissingFields('tcf', missingTcfFields);

  return tcf;
}

function removeSchainFromFirstPartyData(firstPartyData) {
  if (!firstPartyData?.source?.ext?.schain) {
    return;
  }

  delete firstPartyData.source.ext.schain;

  if (!Object.keys(firstPartyData.source.ext).length) {
    delete firstPartyData.source.ext;
  }

  if (!Object.keys(firstPartyData.source).length) {
    delete firstPartyData.source;
  }
}

function extractFirstPartyData(ortb2) {
  if (!ortb2) {
    return null;
  }

  const firstPartyData = deepClone(ortb2);

  removeSchainFromFirstPartyData(firstPartyData);

  if (firstPartyData.site) {
    delete firstPartyData.site;
  }

  return Object.keys(firstPartyData).length ? firstPartyData : null;
}

function buildLegacyPayload(validBidRequests, bidderRequest) {
  const payload = {
    bids: validBidRequests,
    version: VERSION
  };

  const referer = extractReferer(bidderRequest?.refererInfo);
  if (referer) {
    payload.referer = referer;
  }

  const tcf = extractTcf(bidderRequest?.gdprConsent);
  if (tcf) {
    payload.tcf = tcf;
  }

  const schain = bidderRequest?.ortb2?.source?.ext?.schain;
  if (schain) {
    payload.schain = schain;
  }

  const firstPartyData = extractFirstPartyData(bidderRequest?.ortb2);
  if (firstPartyData) {
    payload.firstPartyData = firstPartyData;
  }

  return payload;
}

function buildOrtbRequest(validBidRequests, bidderRequest, endpoint) {
  const ortbRequest = converter.toORTB({
    bidderRequest,
    bidRequests: validBidRequests,
  });

  return {
    method: 'POST',
    url: endpoint,
    data: ortbRequest,
    ortb: true
  };
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: IAB_GVL_ID,
  isBidRequestValid: function ({ bidder, params = {} } = {}) {
    const bidderName = bidder || BIDDER_CODE;

    if (!params.id) {
      logError(`${bidderName}: Parameter 'id' missing`);
      return false;
    }

    if (typeof params.id !== 'string') {
      logError(`${bidderName}: Parameter 'id' needs to be a string`);
      return false;
    }

    if (params.dimension && typeof params.dimension !== 'string') {
      logError(`${bidderName}: Parameter 'dimension' needs to be a string`);
      return false;
    }

    if (params.endpoint !== undefined && !isValidEndpointUrl(params.endpoint)) {
      logError(`${bidderName}: Parameter 'endpoint' needs to be a valid HTTPS URL`);
      return false;
    }

    if (params.ortb !== undefined && typeof params.ortb !== 'boolean') {
      logError(`${bidderName}: Parameter 'ortb' needs to be a boolean`);
      return false;
    }

    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const groups = {};

    for (const bid of validBidRequests) {
      const endpoint = resolveEndpoint(bid.params.endpoint);
      const ortb = bid.params.ortb === true;
      const key = `${endpoint}::${ortb}`;

      if (!groups[key]) {
        groups[key] = { endpoint, ortb, bids: [] };
      }

      groups[key].bids.push(bid);
    }

    return Object.values(groups).map(({ endpoint, ortb, bids }) => {
      if (ortb) {
        // ORTB mode uses an object payload and is interpreted via converter.fromORTB.
        return buildOrtbRequest(bids, bidderRequest, endpoint);
      }

      // Legacy mode uses a stringified JSON payload.
      const payload = buildLegacyPayload(bids, bidderRequest);

      return {
        method: 'POST',
        url: endpoint,
        data: JSON.stringify(payload)
      };
    });
  },

  interpretResponse: function (serverResponse, request) {
    if (request?.ortb) {
      return converter.fromORTB({ response: serverResponse?.body, request: request.data }).bids ?? [];
    }

    const bids = Array.isArray(serverResponse?.body) ? serverResponse.body : [];

    return bids.map((bid) => {
      const responseBid = {
        ad: bid.ad,
        requestId: bid.requestId,
        cpm: bid.cpm,
        width: bid.width,
        height: bid.height,
        creativeId: bid.creativeId,
        currency: bid.currency ?? DEFAULT_CURRENCY,
        netRevenue: bid.netRevenue ?? DEFAULT_NETREVENUE,
        ttl: bid.ttl ?? DEFAULT_TTL,
        meta: {},
      };

      if (bid.aDomains && bid.aDomains.length) {
        responseBid.meta.advertiserDomains = bid.aDomains;
      }

      return responseBid;
    });
  },
};

registerBidder(spec);
