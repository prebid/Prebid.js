import { _each, parseSizesInput, isStr, isArray } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'adocean';

function buildEndpointUrl(emiter, payloadMap) {
  const payload = [];
  _each(payloadMap, function(v, k) {
    payload.push(k + '=' + (k === 'schain' ? v : encodeURIComponent(v)));
  });

  const randomizedPart = Math.random().toString().slice(2);
  return 'https://' + emiter + '/_' + randomizedPart + '/ad.json?' + payload.join('&');
}

function buildRequest(masterBidRequests, masterId, bidderRequest) {
  let emiter;
  const payload = {
    id: masterId,
    aosspsizes: []
  };
  if (bidderRequest.gdprConsent) {
    payload.gdpr_consent = bidderRequest.gdprConsent.consentString || undefined;
    payload.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
  }
  if (bidderRequest.schain) {
    payload.schain = serializeSupplyChain(bidderRequest.schain);
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

const SCHAIN_FIELDS = ['asi', 'sid', 'hp', 'rid', 'name', 'domain', 'ext'];
function serializeSupplyChain(schain) {
  const header = `${schain.ver},${schain.complete}!`;

  const serializedEntries = [];
  _each(schain.nodes, function(node) {
    serializedEntries.push(SCHAIN_FIELDS
      .map(fieldName => {
        if (fieldName === 'ext') {
          // do not serialize ext data, just mark if it was available
          return ('ext' in schain.nodes ? '1' : '0');
        }
        if (node[fieldName]) {
          return encodeURIComponent(node[fieldName]).replace(/!/g, '%21');
        }
        return '';
      })
      .join(','));
  });

  return header + serializedEntries.join('!');
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
        requests.push(buildRequest(instanceRequests, masterId, bidderRequest));
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
