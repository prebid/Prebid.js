import { buildUrl } from '../../src/utils.js';
import { ajax } from '../../src/ajax.js';

/**
 * Builds the bid requests and beacon parameters.
 * @param {Array} validBidRequests - The array of valid bid requests.
 * @param {string} referer - The referer URL.
 * @returns {Object} - An object containing bidRequests and beaconParams.
 */
export function buildBidRequestsAndParams(validBidRequests, referer) {
  const bidRequests = [];
  const beaconParams = { tag: [], partner: [], sizes: [], referer: encodeURIComponent(referer) };

  validBidRequests.forEach(function (validBidRequest) {
    const sizes = validBidRequest.params.sizes || validBidRequest.sizes;

    const bidRequestObject = {
      adUnitCode: validBidRequest.adUnitCode,
      sizes: sizes,
      bidId: validBidRequest.bidId,
      referer: referer,
    };

    if (parseInt(validBidRequest.params.unitId)) {
      bidRequestObject.unitId = parseInt(validBidRequest.params.unitId);
      beaconParams.tag.push(validBidRequest.params.unitId);
    }

    if (parseInt(validBidRequest.params.partnerId)) {
      bidRequestObject.unitId = 0;
      bidRequestObject.partnerId = parseInt(validBidRequest.params.partnerId);
      beaconParams.partner.push(validBidRequest.params.partnerId);
    }

    bidRequests.push(bidRequestObject);
    beaconParams.sizes.push(joinSizesToString(sizes));
  });

  // Finalize beaconParams
  if (beaconParams.partner.length > 0) {
    beaconParams.partner = beaconParams.partner.join(',');
  } else {
    delete beaconParams.partner;
  }
  beaconParams.tag = beaconParams.tag.join(',');
  beaconParams.sizes = beaconParams.sizes.join(',');

  return { bidRequests, beaconParams };
}

export function joinSizesToString(sizes) {
  return sizes.map(size => size.join('x')).join('|');
}

export function postRequest(endpoint, data) {
  ajax(endpoint, null, data, { method: 'POST' });
}

export function buildEndpointUrl(protocol, hostname, pathname, searchParams) {
  return buildUrl({ protocol, hostname, pathname, search: searchParams });
}

export function createBuildRequests(protocol, domain, path) {
  return function(validBidRequests, bidderRequest) {
    const referer = bidderRequest?.refererInfo?.page || window.location.href;
    const { bidRequests, beaconParams } = buildBidRequestsAndParams(validBidRequests, referer);
    const url = buildEndpointUrl(protocol, domain, path, beaconParams);
    return {
      method: 'POST',
      url,
      data: JSON.stringify(bidRequests)
    };
  };
}

export function interpretMIResponse(serverResponse, bidRequest, spec) {
  const validBids = JSON.parse(bidRequest.data);
  if (typeof serverResponse.body === 'undefined') {
    return [];
  }

  return validBids
    .map(bid => ({ bid, ad: serverResponse.body[bid.adUnitCode] }))
    .filter(item => item.ad)
    .map(item => spec.adResponse(item.bid, item.ad));
}

export function createOnBidWon(protocol, domain, postFn = postRequest) {
  return function(data) {
    data.winNotification.forEach(function(unitWon) {
      const bidWonUrl = buildEndpointUrl(protocol, domain, unitWon.path);
      if (unitWon.method === 'POST') {
        postFn(bidWonUrl, JSON.stringify(unitWon.data));
      }
    });
    return true;
  };
}

export function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  const syncs = [];

  if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
    return syncs;
  }

  const appendGdprParams = function(url, gdprParams) {
    if (gdprParams === null) {
      return url;
    }

    return url + (url.indexOf('?') >= 0 ? '&' : '?') + gdprParams;
  };

  let gdprParams = null;
  if (gdprConsent) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      gdprParams = `gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
    } else {
      gdprParams = `gdpr_consent=${gdprConsent.consentString}`;
    }
  }

  serverResponses.forEach(resp => {
    if (resp.body) {
      Object.keys(resp.body).forEach(key => {
        const respObject = resp.body[key];
        if (
          respObject['syncs'] !== undefined &&
          Array.isArray(respObject.syncs) &&
          respObject.syncs.length > 0
        ) {
          if (syncOptions.iframeEnabled) {
            respObject.syncs
              .filter(function(syncIframeObject) {
                if (
                  syncIframeObject['type'] !== undefined &&
                  syncIframeObject['link'] !== undefined &&
                  syncIframeObject.type === 'iframe'
                ) {
                  return true;
                }
                return false;
              })
              .forEach(function(syncIframeObject) {
                syncs.push({
                  type: 'iframe',
                  url: appendGdprParams(syncIframeObject.link, gdprParams)
                });
              });
          }
          if (syncOptions.pixelEnabled) {
            respObject.syncs
              .filter(function(syncImageObject) {
                if (
                  syncImageObject['type'] !== undefined &&
                  syncImageObject['link'] !== undefined &&
                  syncImageObject.type === 'image'
                ) {
                  return true;
                }
                return false;
              })
              .forEach(function(syncImageObject) {
                syncs.push({
                  type: 'image',
                  url: appendGdprParams(syncImageObject.link, gdprParams)
                });
              });
          }
        }
      });
    }
  });

  return syncs;
}
