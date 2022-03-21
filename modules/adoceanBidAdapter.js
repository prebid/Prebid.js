import { _each, parseSizesInput, isStr, isArray } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'adocean';

function buildEndpointUrl(emiter, payloadMap) {
  const payload = [];
  _each(payloadMap, function(v, k) {
    payload.push(k + '=' + encodeURIComponent(v));
  });

  const randomizedPart = Math.random().toString().slice(2);
  return 'https://' + emiter + '/_' + randomizedPart + '/ad.json?' + payload.join('&');
}

function buildRequest(masterBidRequests, masterId, gdprConsent) {
  let emiter;
  const payload = {
    id: masterId,
    aosspsizes: []
  };
  if (gdprConsent) {
    payload.gdpr_consent = gdprConsent.consentString || undefined;
    payload.gdpr = gdprConsent.gdprApplies ? 1 : 0;
  }

  const bidIdMap = {};

  _each(masterBidRequests, function(bid, slaveId) {
    if (!emiter) {
      emiter = bid.params.emiter;
    }

    const slaveSizes = parseSizesInput(bid.mediaTypes.banner.sizes).join('_');
    const rawSlaveId = bid.params.slaveId.replace('adocean', '');
    payload.aosspsizes.push(rawSlaveId + '~' + slaveSizes);

    bidIdMap[slaveId] = bid.bidId;
  });

  payload.aosspsizes = payload.aosspsizes.join('-');

  return {
    method: 'GET',
    url: buildEndpointUrl(emiter, payload),
    data: '',
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
      creativeId: placementResponse.crid,
      meta: {
        advertiserDomains: placementResponse.adomain || []
      }
    };

    bids.push(bid);
  }
}

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    const requiredParams = ['slaveId', 'masterId', 'emiter'];
    if (requiredParams.some(name => !isStr(bid.params[name]) || !bid.params[name].length)) {
      return false;
    }

    return !!bid.mediaTypes.banner;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const bidRequestsByMaster = {};
    let requests = [];

    _each(validBidRequests, function(bidRequest) {
      assignToMaster(bidRequest, bidRequestsByMaster);
    });

    _each(bidRequestsByMaster, function(masterRequests, masterId) {
      _each(masterRequests, function(instanceRequests) {
        requests.push(buildRequest(instanceRequests, masterId, bidderRequest.gdprConsent));
      });
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    let bids = [];

    if (isArray(serverResponse.body)) {
      _each(serverResponse.body, function(placementResponse) {
        interpretResponse(placementResponse, bidRequest, bids);
      });
    }

    return bids;
  }
};
registerBidder(spec);
