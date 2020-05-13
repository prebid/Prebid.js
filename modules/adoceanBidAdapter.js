import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'adocean';

function buildEndpointUrl(emiter, payload) {
  let payloadString = '';
  utils._each(payload, function(v, k) {
    if (payloadString.length) {
      payloadString += '&';
    }
    payloadString += k + '=' + encodeURIComponent(v);
  });

  const randomizedPart = Math.random().toString().slice(2);
  return 'https://' + emiter + '/_' + randomizedPart + '/ad.json?' + payloadString;
}

function buildRequest(masterBidRequests, masterId, gdprConsent) {
  let emiter;
  const payload = {
    id: masterId,
  };
  if (gdprConsent) {
    payload.gdpr_consent = gdprConsent.consentString || undefined;
    payload.gdpr = gdprConsent.gdprApplies ? 1 : 0;
  }

  const bidIdMap = {};

  utils._each(masterBidRequests, function(bid, slaveId) {
    if (!emiter) {
      emiter = bid.params.emiter;
    }
    bidIdMap[slaveId] = bid.bidId;
  });

  return {
    method: 'GET',
    url: buildEndpointUrl(emiter, payload),
    data: {},
    bidIdMap: bidIdMap
  };
}

function assignToMaster(bidRequest, bidRequestsByMaster) {
  const masterId = bidRequest.params.masterId;
  const slaveId = bidRequest.params.slaveId;
  const masterBidRequests = bidRequestsByMaster[masterId] = bidRequestsByMaster[masterId] || [{}];
  let i = 0;
  while (masterBidRequests[i] && masterBidRequests[i][slaveId]) {
    i++;
  }
  if (!masterBidRequests[i]) {
    masterBidRequests[i] = {};
  }
  masterBidRequests[i][slaveId] = bidRequest;
}

function interpretResponse(placementResponse, bidRequest, bids) {
  const requestId = bidRequest.bidIdMap[placementResponse.id];
  if (!placementResponse.error && requestId) {
    let adCode = '<script type="application/javascript">(function(){var wu="' + (placementResponse.winUrl || '') + '",su="' + (placementResponse.statsUrl || '') + '".replace(/\\[TIMESTAMP\\]/,(new Date()).getTime());';
    adCode += 'if(navigator.sendBeacon){if(wu){navigator.sendBeacon(wu)||((new Image(1,1)).src=wu)};if(su){navigator.sendBeacon(su)||((new Image(1,1)).src=su)}}';
    adCode += 'else{if(wu){(new Image(1,1)).src=wu;}if(su){(new Image(1,1)).src=su;}}';
    adCode += '})();<\/script>';
    adCode += decodeURIComponent(placementResponse.code);

    const bid = {
      ad: adCode,
      cpm: parseFloat(placementResponse.price),
      currency: placementResponse.currency,
      height: parseInt(placementResponse.height, 10),
      requestId: requestId,
      width: parseInt(placementResponse.width, 10),
      netRevenue: false,
      ttl: parseInt(placementResponse.ttl),
      creativeId: placementResponse.crid
    };

    bids.push(bid);
  }
}

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    return !!(bid.params.slaveId && bid.params.masterId && bid.params.emiter);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const bidRequestsByMaster = {};
    let requests = [];

    utils._each(validBidRequests, function(bidRequest) {
      assignToMaster(bidRequest, bidRequestsByMaster);
    });

    utils._each(bidRequestsByMaster, function(masterRequests, masterId) {
      utils._each(masterRequests, function(instanceRequests) {
        requests.push(buildRequest(instanceRequests, masterId, bidderRequest.gdprConsent));
      });
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    let bids = [];

    if (utils.isArray(serverResponse.body)) {
      utils._each(serverResponse.body, function(placementResponse) {
        interpretResponse(placementResponse, bidRequest, bids);
      });
    }

    return bids;
  }
};
registerBidder(spec);
