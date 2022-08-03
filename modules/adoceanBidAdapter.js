import { _each, parseSizesInput, isStr, isArray } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'adocean';
const URL_SAFE_FIELDS = {
  schain: true,
  slaves: true
};

function buildEndpointUrl(emiter, payloadMap) {
  const payload = [];
  _each(payloadMap, function(v, k) {
    payload.push(k + '=' + (URL_SAFE_FIELDS[k] ? v : encodeURIComponent(v)));
  });

  const randomizedPart = Math.random().toString().slice(2);
  return 'https://' + emiter + '/_' + randomizedPart + '/ad.json?' + payload.join('&');
}

function buildRequest(masterBidRequests, masterId, gdprConsent) {
  let emiter;
  const payload = {
    id: masterId,
    aosspsizes: [],
    slaves: []
  };
  if (gdprConsent) {
    payload.gdpr_consent = gdprConsent.consentString || undefined;
    payload.gdpr = gdprConsent.gdprApplies ? 1 : 0;
  }
  const anyKey = Object.keys(masterBidRequests)[0];
  if (masterBidRequests[anyKey].schain) {
    payload.schain = serializeSupplyChain(masterBidRequests[anyKey].schain);
  }

  const bidIdMap = {};
  const uniquePartLength = 10;
  _each(masterBidRequests, function(bid, slaveId) {
    if (!emiter) {
      emiter = bid.params.emiter;
    }

    const slaveSizes = parseSizesInput(bid.mediaTypes.banner.sizes).join('_');
    const rawSlaveId = bid.params.slaveId.replace('adocean', '');
    payload.aosspsizes.push(rawSlaveId + '~' + slaveSizes);
    payload.slaves.push(rawSlaveId.slice(-uniquePartLength));

    bidIdMap[slaveId] = bid.bidId;
  });

  payload.aosspsizes = payload.aosspsizes.join('-');
  payload.slaves = payload.slaves.join(',');

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

  const serializedNodes = [];
  _each(schain.nodes, function(node) {
    const serializedNode = SCHAIN_FIELDS
      .map(fieldName => {
        if (fieldName === 'ext') {
          // do not serialize ext data, just mark if it was available
          return ('ext' in node ? '1' : '0');
        }
        if (fieldName in node) {
          return encodeURIComponent(node[fieldName]).replace(/!/g, '%21');
        }
        return '';
      })
      .join(',');
    serializedNodes.push(serializedNode);
  });

  return header + serializedNodes.join('!');
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
