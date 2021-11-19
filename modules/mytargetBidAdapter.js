import { _map } from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'mytarget';
const BIDDER_URL = '//ad.mail.ru/hbid_prebid/';
const DEFAULT_CURRENCY = 'RUB';
const DEFAULT_TTL = 180;

function buildPlacement(bidRequest) {
  let { bidId, params } = bidRequest;
  let { placementId, position, response, bidfloor } = params;
  let placement = {
    placementId,
    id: bidId,
    position: position || 0,
    response: response || 0
  };

  if (typeof bidfloor !== 'undefined') {
    placement.bidfloor = bidfloor;
  }

  return placement;
}

function getSiteName(referrer) {
  let sitename = config.getConfig('mytarget.sitename');

  if (!sitename) {
    const parsed = document.createElement('a');
    parsed.href = decodeURIComponent(referrer);
    sitename = parsed.hostname;
  }

  return sitename;
}

function generateRandomId() {
  return Math.random().toString(16).substring(2);
}

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    return !!bid.params.placementId;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    let referrer = '';

    if (bidderRequest && bidderRequest.refererInfo) {
      referrer = bidderRequest.refererInfo.referer;
    }

    const payload = {
      places: _map(validBidRequests, buildPlacement),
      site: {
        sitename: getSiteName(referrer),
        page: referrer
      },
      settings: {
        currency: DEFAULT_CURRENCY,
        windowSize: {
          width: window.screen.width,
          height: window.screen.height
        }
      }
    };

    return {
      method: 'POST',
      url: BIDDER_URL,
      data: payload,
    };
  },

  interpretResponse: function(serverResponse, bidRequest) {
    let { body } = serverResponse;

    if (body.bids) {
      return _map(body.bids, (bid) => {
        let bidResponse = {
          requestId: bid.id,
          cpm: bid.price,
          width: bid.size.width,
          height: bid.size.height,
          ttl: bid.ttl || DEFAULT_TTL,
          currency: bid.currency || DEFAULT_CURRENCY,
          creativeId: bid.creativeId || generateRandomId(),
          netRevenue: true,
          meta: {
            advertiserDomains: bid.adomain && bid.adomain.length > 0 ? bid.adomain : [],
          }
        }

        if (bid.adm) {
          bidResponse.ad = bid.adm;
        } else {
          bidResponse.adUrl = bid.displayUrl;
        }

        return bidResponse;
      });
    }

    return [];
  }
}

registerBidder(spec);
