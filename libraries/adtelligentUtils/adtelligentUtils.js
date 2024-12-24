import {deepAccess, isArray} from '../../src/utils.js';
import { config } from '../../src/config.js';
import {BANNER, VIDEO} from '../../src/mediaTypes.js';

export const supportedMediaTypes = [VIDEO, BANNER]

export function isBidRequestValid (bid) {
  return !!deepAccess(bid, 'params.aid');
}

export function getUserSyncsFn (syncOptions, serverResponses, syncsCache = {}) {
  const syncs = [];
  function addSyncs(bid) {
    const uris = bid.cookieURLs;
    const types = bid.cookieURLSTypes || [];

    if (Array.isArray(uris)) {
      uris.forEach((uri, i) => {
        const type = types[i] || 'image';

        if ((!syncOptions.pixelEnabled && type === 'image') ||
            (!syncOptions.iframeEnabled && type === 'iframe') ||
            syncsCache[uri]) {
          return;
        }

        syncsCache[uri] = true;
        syncs.push({
          type: type,
          url: uri
        })
      })
    }
  }

  if (syncOptions.pixelEnabled || syncOptions.iframeEnabled) {
    isArray(serverResponses) && serverResponses.forEach((response) => {
      if (response.body) {
        if (isArray(response.body)) {
          response.body.forEach(b => {
            addSyncs(b);
          })
        } else {
          addSyncs(response.body)
        }
      }
    })
  }
  return syncs;
}

export function createTag(bidRequests, adapterRequest) {
  const tag = {
    // TODO: is 'page' the right value here?
    Domain: deepAccess(adapterRequest, 'refererInfo.page'),
  };

  if (config.getConfig('coppa') === true) {
    tag.Coppa = 1;
  }
  if (deepAccess(adapterRequest, 'gdprConsent.gdprApplies')) {
    tag.GDPR = 1;
    tag.GDPRConsent = deepAccess(adapterRequest, 'gdprConsent.consentString');
  }
  if (deepAccess(adapterRequest, 'uspConsent')) {
    tag.USP = deepAccess(adapterRequest, 'uspConsent');
  }
  if (deepAccess(bidRequests[0], 'schain')) {
    tag.Schain = deepAccess(bidRequests[0], 'schain');
  }
  if (deepAccess(bidRequests[0], 'userId')) {
    tag.UserIds = deepAccess(bidRequests[0], 'userId');
  }
  if (deepAccess(bidRequests[0], 'userIdAsEids')) {
    tag.UserEids = deepAccess(bidRequests[0], 'userIdAsEids');
  }

  return tag;
}
