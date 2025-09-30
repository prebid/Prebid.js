import { _each, isStr, isArray } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

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

function buildRequest(bid, gdprConsent) {
  const emiter = bid.params.emiter;
  const masterId = bid.params.masterId;
  const slaveId = bid.params.slaveId;
  const payload = {
    id: masterId,
    slaves: ""
  };
  if (gdprConsent) {
    payload.gdpr_consent = gdprConsent.consentString || undefined;
    payload.gdpr = gdprConsent.gdprApplies ? 1 : 0;
  }
  if (bid.schain) {
    payload.schain = serializeSupplyChain(bid.schain);
  }

  if (bid.userId && bid.userId.gemiusId) {
    payload.aouserid = bid.userId.gemiusId;
  }

  const bidIdMap = {};
  const uniquePartLength = 10;

  const rawSlaveId = bid.params.slaveId.replace('adocean', '');
  payload.slaves = rawSlaveId.slice(-uniquePartLength);

  bidIdMap[slaveId] = bid.bidId;

  if (bid.mediaTypes.video) {
    if (bid.mediaTypes.video.context === 'instream') {
      if (bid.mediaTypes.video.maxduration) {
        payload.dur = bid.mediaTypes.video.maxduration;
        payload.maxdur = bid.mediaTypes.video.maxduration;
      }
      if (bid.mediaTypes.video.minduration) {
        payload.mindur = bid.mediaTypes.video.minduration;
      }
      payload.spots = 1;
    }
    if (bid.mediaTypes.video.context === 'adpod') {
      const durationRangeSec = bid.mediaTypes.video.durationRangeSec;
      if (!bid.mediaTypes.video.adPodDurationSec || !isArray(durationRangeSec) || durationRangeSec.length === 0) {
        return;
      }
      const spots = getAdPodSpots(bid.mediaTypes.video.adPodDurationSec, bid.mediaTypes.video.durationRangeSec);
      const maxDuration = Math.max(...durationRangeSec);
      payload.dur = bid.mediaTypes.video.adPodDurationSec;
      payload.maxdur = maxDuration;
      payload.spots = spots;
    }
  }

  return {
    method: 'GET',
    url: buildEndpointUrl(emiter, payload),
    data: '',
    bidIdMap: bidIdMap
  };
}

function getAdPodSpots(adPodDurationSec, durationRangeSec) {
  const minAllowedDuration = Math.min(...durationRangeSec);
  const numberOfSpots = Math.floor(adPodDurationSec / minAllowedDuration);
  return numberOfSpots;
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

function interpretResponse(placementResponse, bidRequest, bids) {
  const requestId = bidRequest.bidIdMap[placementResponse.id];
  if (!placementResponse.error && requestId) {
    if (!placementResponse.code || !placementResponse.height || !placementResponse.width || !placementResponse.price) {
      return;
    }
    let adCode = decodeURIComponent(placementResponse.code);

    const bid = {
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
    if (placementResponse.isVideo) {
      bid.meta.mediaType = VIDEO;
      bid.vastXml = adCode;
    } else {
      bid.meta.mediaType = BANNER;
      bid.ad = adCode;
    }

    bids.push(bid);
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function(bid) {
    const requiredParams = ['slaveId', 'masterId', 'emiter'];
    if (requiredParams.some(name => !isStr(bid.params[name]) || !bid.params[name].length)) {
      return false;
    }

    if (bid.mediaTypes.banner) {
      return true;
    }
    if (bid.mediaTypes.video) {
      if (bid.mediaTypes.video.context === 'instream') {
        return true;
      }
      if (bid.mediaTypes.video.context === 'adpod') {
        return !bid.mediaTypes.video.requireExactDuration;
      }
    }
    return false;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    let requests = [];

    _each(validBidRequests, function(bidRequest) {
      requests.push(buildRequest(bidRequest, bidderRequest.gdprConsent));
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
