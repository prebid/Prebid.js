import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'adocean';

function buildEndpointUrl(emiter, payload) {
  let payloadString = '';
  utils._each(payload, function(v, k) {
    if (payloadString.length) {
      payloadString += '&';
    }
    payloadString += k + '=' + encodeURIComponent(v);
  });

  return 'https://' + emiter + '/ad.json?' + payloadString;
}

function buildRequest(masterBidRequests, masterId) {
  const firstBid = masterBidRequests[0];
  const payload = {
    id: masterId,
  };

  const bidIdMap = {};

  utils._each(masterBidRequests, function(v) {
    bidIdMap[v.slaveId] = v.bidId;
  });

  return {
    method: 'GET',
    url: buildEndpointUrl(firstBid.emiter, payload),
    data: {},
    bidIdMap: bidIdMap
  };
}

function assignToMaster(bidRequest, bidRequestsByMaster) {
  const masterId = bidRequest.masterId;
  bidRequestsByMaster[masterId] = bidRequestsByMaster[masterId] || [];
  bidRequestsByMaster[masterId].push(bidRequest);
}

function interpretResponse(placementResponse, bidRequest, bids) {
  if (!placementResponse.error) {
    let adCode = '<script type="application/javascript">(function(){var wu="' + (placementResponse.winUrl || '') + '",su="' + (placementResponse.statsUrl || '') + '".replace(/\\[TIMESTAMP\\]/,(new Date()).getTime());';
    adCode += 'if(navigator.sendBeacon){if(wu){navigator.sendBeacon(wu)||((new Image(1,1)).src=wu)};if(su){navigator.sendBeacon(su)||((new Image(1,1)).src=su)}}';
    adCode += 'else{if(wu){(new Image(1,1)).src=wu;}if(su){(new Image(1,1)).src=su;}}';
    adCode += '})();<\/script>';
    adCode += decodeURIComponent(placementResponse.code);

    const bid = {
      ad: adCode,
      bidderCode: BIDDER_CODE,
      cpm: parseFloat(placementResponse.price),
      currency: placementResponse.currency,
      height: parseInt(placementResponse.height, 10),
      requestId: bidRequest.bidIdMap[placementResponse.id],
      width: parseInt(placementResponse.width, 10),
    };

    bids.push(bid);
  }
}

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    return !!(bid.slaveId && bid.masterId && bid.emiter);
  },

  buildRequests: function(validBidRequests) {
    const bidRequestsByMaster = {};
    let requests = [];

    utils._each(validBidRequests, function(v) {
      assignToMaster(v, bidRequestsByMaster);
    });
    requests = utils._map(bidRequestsByMaster, function(v, k) {
      return buildRequest(v, k);
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    let bids = [];

    if (utils.isArray(serverResponse)) {
      utils._each(serverResponse, function(placementResponse) {
        interpretResponse(placementResponse, bidRequest, bids);
      });
    }

    return bids;
  },

  getUserSyncs: function(syncOptions) {
    // empty
  }
};
registerBidder(spec);
