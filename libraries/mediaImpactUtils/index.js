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
