import {submodule, getHook} from '../src/hook.js';
import adapterManager from '../src/adapterManager.js';
import {logInfo, deepClone, isArray, isStr, isPlainObject, logError} from '../src/utils.js';

// Constants
const MODULE_NAME = 'raveltech';
const RAVEL_ENDPOINT = 'https://pb1.rvlproxy.net/bid/bid';

const getAdapterNameForAlias = (aliasName) => adapterManager.aliasRegistry[aliasName] || aliasName;

const getAnonymizedEids = (eids) => {
  const ZKAD = window.ZKAD || { anonymizeID(v, p) { return undefined; } };
  logInfo('ZKAD.ready=', ZKAD.ready);
  if (!eids) { return eids; }

  eids.forEach(eid => {
    if (!eid || !eid.uids || eid.uids.length === 0) { return eid }
    logInfo('eid.source=', eid.source);
    eid.uids = eid.uids.flatMap(uid => {
      if (!uid || !uid.id) { return []; }
      const id = ZKAD.anonymizeID(uid.id, eid.source);
      if (!id) {
        logError('Error while anonymizing uid :', eid, uid);
        return [];
      }
      logInfo('Anonymized as byte array of length=', id.length);
      return [ {
        ...uid,
        id
      } ];
    })
  })

  return eids;
};

const addRavelDataToRequest = (request, adapterName) => {
  if (isStr(request.data)) {
    try {
      const data = JSON.parse(request.data);
      data.ravel = { pbjsAdapter: adapterName };
      request.data = JSON.stringify(data);
    } catch (_e) {}
  } else if (!request.data) {
    request.data = { ravel: { pbjsAdapter: adapterName } };
  } else if (isPlainObject(request.data)) {
    request.data.ravel = { pbjsAdapter: adapterName };
  }
};

const wrapBuildRequests = (aliasName, preserveOriginalBid, buildRequests) => {
  const adapterName = getAdapterNameForAlias(aliasName)

  return (validBidRequests, ...rest) => {
    if (!window.ZKAD || !window.ZKAD.ready) {
      return buildRequests(validBidRequests, ...rest);
    }
    let requests = preserveOriginalBid ? buildRequests(validBidRequests, ...rest) : [];
    if (!isArray(requests)) {
      requests = [ requests ];
    }

    try {
      const ravelBidRequests = deepClone(validBidRequests);

      // Anonymize eids for ravel proxified requests
      const anonymizedEids = getAnonymizedEids(ravelBidRequests[0]?.userIdAsEids);

      ravelBidRequests.forEach(bidRequest => {
        // Replace original eids with anonymized eids
        bidRequest.userIdAsEids = anonymizedEids;
      });

      let ravelRequests = buildRequests(ravelBidRequests, ...rest);
      if (!isArray(ravelRequests) && ravelRequests) {
        ravelRequests = [ ravelRequests ];
      }
      if (ravelRequests) {
        ravelRequests.forEach(request => {
          // Proxyfy request
          request.url = RAVEL_ENDPOINT;
          request.method = 'POST';
          addRavelDataToRequest(request, adapterName);
        })
      }

      return [ ...requests ?? [], ...ravelRequests ?? [] ];
    } catch (e) {
      logError('Error while generating ravel requests :', e);
      return requests;
    }
  }
};

const getBidderRequestsHook = (config) => {
  const allowedBidders = config.params.bidders || [];
  const preserveOriginalBid = config.params.preserveOriginalBid ?? false;
  const wrappedBidders = [];

  return (next, spec, ...rest) => {
    if (allowedBidders.includes(spec.code) && !wrappedBidders.includes(spec.code)) {
      spec.buildRequests = wrapBuildRequests(spec.code, preserveOriginalBid, spec.buildRequests);

      wrappedBidders.push(spec.code);
    }
    next(spec, ...rest);
  }
};

/**
 * Init
 * @param {Object} config Module configuration
 * @param {boolean} _userConsent
 * @returns true
 */
const init = (config, _userConsent) => {
  const allowedBidders = config.params.bidders || [];
  const preserveOriginalBid = config.params.preserveOriginalBid ?? false;

  getHook('processBidderRequests').before(getBidderRequestsHook(config));
  logInfo(`Raveltech RTD ready - ${preserveOriginalBid ? 'will' : `won't`} duplicate bid requests - Allowed bidders : `, allowedBidders);
  return true;
};

export const raveltechSubmodule = {
  name: MODULE_NAME,
  init
};

// Register raveltechSubmodule as submodule of realTimeData
submodule('realTimeData', raveltechSubmodule);
