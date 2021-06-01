import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();

export const BIDDER_CODE = 'nanointeractive';
export const END_POINT_URL = 'https://ad.audiencemanager.de';

export const SSP_PLACEMENT_ID = 'pid';
export const NQ = 'nq';
export const NQ_NAME = 'name';
export const CATEGORY = 'category';
export const CATEGORY_NAME = 'categoryName';
export const SUB_ID = 'subId';
export const REF = 'ref';
export const LOCATION = 'loc';

var nanoPid = '5a1ec660eb0a191dfa591172';

export const spec = {

  code: BIDDER_CODE,
  aliases: ['ni'],

  isBidRequestValid(bid) {
    const pid = bid.params[SSP_PLACEMENT_ID];
    return !!(pid);
  },

  buildRequests(validBidRequests, bidderRequest) {
    let payload = [];
    validBidRequests.forEach(
      bid => payload.push(createSingleBidRequest(bid, bidderRequest))
    );
    const url = getEndpointUrl() + '/hb';

    return {
      method: 'POST',
      url: url,
      data: JSON.stringify(payload)
    };
  },
  interpretResponse(serverResponse) {
    const bids = [];
    serverResponse.body.forEach(serverBid => {
      if (isEngineResponseValid(serverBid)) {
        bids.push(createSingleBidResponse(serverBid));
      }
    });
    return bids;
  },
  getUserSyncs: function(syncOptions) {
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: getEndpointUrl() + '/hb/cookieSync/' + nanoPid
      });
    }

    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: getEndpointUrl() + '/hb/cookieSync/' + nanoPid
      });
    }
    return syncs;
  }

};

function createSingleBidRequest(bid, bidderRequest) {
  const location = utils.deepAccess(bidderRequest, 'refererInfo.referer');
  const origin = utils.getOrigin();

  nanoPid = bid.params[SSP_PLACEMENT_ID] || nanoPid;

  const data = {
    [SSP_PLACEMENT_ID]: bid.params[SSP_PLACEMENT_ID],
    [NQ]: [createNqParam(bid)],
    [CATEGORY]: [createCategoryParam(bid)],
    [SUB_ID]: createSubIdParam(bid),
    [REF]: createRefParam(),
    sizes: bid.sizes.map(value => value[0] + 'x' + value[1]),
    bidId: bid.bidId,
    cors: origin,
    [LOCATION]: location,
    lsUserId: getLsUserId()
  };

  if (bidderRequest && bidderRequest.gdprConsent) {
    data['gdprConsent'] = bidderRequest.gdprConsent.consentString;
    data['gdprApplies'] = (bidderRequest.gdprConsent.gdprApplies) ? '1' : '0';
  }

  return data;
}

function createSingleBidResponse(serverBid) {
  if (serverBid.userId) {
    storage.setDataInLocalStorage('lsUserId', serverBid.userId);
  }
  return {
    requestId: serverBid.id,
    cpm: serverBid.cpm,
    width: serverBid.width,
    height: serverBid.height,
    ad: serverBid.ad,
    ttl: serverBid.ttl,
    creativeId: serverBid.creativeId,
    netRevenue: serverBid.netRevenue || true,
    currency: serverBid.currency
  };
}

function createNqParam(bid) {
  return bid.params[NQ_NAME] ? utils.getParameterByName(bid.params[NQ_NAME]) : bid.params[NQ] || null;
}

function createCategoryParam(bid) {
  return bid.params[CATEGORY_NAME] ? utils.getParameterByName(bid.params[CATEGORY_NAME]) : bid.params[CATEGORY] || null;
}

function createSubIdParam(bid) {
  return bid.params[SUB_ID] || null;
}

function createRefParam() {
  try {
    return window.top.document.referrer;
  } catch (ex) {
    return document.referrer;
  }
}

function isEngineResponseValid(response) {
  return !!response.cpm && !!response.ad;
}

/**
 * Used mainly for debugging
 *
 * @returns string
 */
function getEndpointUrl() {
  const nanoConfig = config.getConfig('nano');
  return (nanoConfig && nanoConfig['endpointUrl']) || END_POINT_URL;
}

function getLsUserId() {
  if (storage.getDataFromLocalStorage('lsUserId') != null) {
    return storage.getDataFromLocalStorage('lsUserId');
  }
  return null;
}

registerBidder(spec);
