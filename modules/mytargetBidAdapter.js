import * as utils from '../src/utils';
import * as url from '../src/url';
import { config } from '../src/config';
import { registerBidder } from '../src/adapters/bidderFactory';

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
    sitename = url.parse(referrer).hostname;
  }

  return sitename;
}

function getCurrency() {
  let currency = config.getConfig('currency.adServerCurrency');

  return (currency === 'USD') ? currency : DEFAULT_CURRENCY;
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
      places: utils._map(validBidRequests, buildPlacement),
      site: {
        sitename: getSiteName(referrer),
        page: referrer
      },
      settings: {
        currency: getCurrency(),
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
      return utils._map(body.bids, (bid) => {
        let bidResponse = {
          requestId: bid.id,
          cpm: bid.price,
          width: bid.size.width,
          height: bid.size.height,
          ttl: bid.ttl || DEFAULT_TTL,
          currency: bid.currency || DEFAULT_CURRENCY,
          creativeId: bid.creativeId || generateRandomId(),
          netRevenue: true
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
