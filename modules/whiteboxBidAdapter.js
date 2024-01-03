import {logInfo} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';

const BIDDER_CODE = 'whitebox';
const IS_DEV_ENV = true;
const ENABLE_SRA = false;
const BASE_URL = IS_DEV_ENV ? `https://${location.hostname}` : 'https://ayads.io';
const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_TTL = 300;

export const state = {
  timeout: config.getConfig('bidderTimeout'),
};

function isBidRequestValid() {
  return true
}

export function log(msg, obj) {
  logInfo('WB - ' + msg, obj);
}

function buildRequests(validBidRequests, bidderRequest) {
  log('buildRequests', {
    validBidRequests,
    bidderRequest,
  });

  top.dispatchEvent(new CustomEvent('whitebox:bid', { detail: {
    base_url: BASE_URL,
    sra: ENABLE_SRA,
    validBidRequests,
    bidderRequest,
    request_id: bidderRequest.bidderRequestId,
  }}));

  if (ENABLE_SRA) {
    const payload = {
      request_id: bidderRequest.bidderRequestId,
      domain: location.hostname,
      bids: validBidRequests.map(bidRequest => {
        return {
          bid_id: bidRequest.bidId,
          auction_id: bidRequest.auctionId,
          sizes: bidRequest.sizes,
          media_types: bidRequest.mediaTypes,
        };
      })
    };

    return {
      method: 'POST',
      url: BASE_URL + '/prebid/sub',
      data: JSON.stringify(payload),
      options: {
        contentType: 'text/plain',
        withCredentials: false
      },
    };
  } else {
    return validBidRequests.map(bidRequest => ({
      method: 'POST',
      url: BASE_URL + '/prebid/sub',
      data: JSON.stringify({
        request_id: bidderRequest.bidderRequestId,
        domain: location.hostname,
        bid_id: bidRequest.bidId,
        auction_id: bidRequest.auctionId,
        sizes: bidRequest.sizes,
        media_types: bidRequest.mediaTypes,
      }),
      options: {
        contentType: 'text/plain',
        withCredentials: false
      },
    }));
  }
}

function interpretResponse(serverResponse, bidRequest) {
  log('interpretResponse', {serverResponse, bidRequest});
  // @see required fields https://docs.prebid.org/dev-docs/bidder-adaptor.html
  if (ENABLE_SRA) {
    return serverResponse.body.map(response => {
      return {
        requestId: response.bid_id || '1',
        cpm: response.cpm || 0,
        width: response.width || 300,
        height: response.height || 250,
        currency: response.currency || DEFAULT_CURRENCY,
        ttl: response.ttl || DEFAULT_TTL,
        creativeId: response.creativeId || '1',
        netRevenue: response.netRevenue || true,
        ad: response.ad || '',
        meta: {
          advertiserDomains: response.advertiserDomains || [],
        }
      };
    });
  } else {
    const response = serverResponse.body;

    return {
      requestId: response.bid_id || '1',
      cpm: response.cpm || 0,
      width: (response.size && response?.size?.width) || 300,
      height: (response.size && response?.size?.height) || 250,
      currency: response.currency || DEFAULT_CURRENCY,
      ttl: response.ttl || DEFAULT_TTL,
      creativeId: response.creativeId || '1',
      netRevenue: response.netRevenue || true,
      ad: response.ad || '',
      meta: {
        advertiserDomains: response.advertiserDomains || [],
      }
    };
  }
}

function onBidWon(bid) {
  log('Bid won', bid);
}

function onTimeout(timeoutData) {
  log('Timeout from adapter', timeoutData);
}

export const spec = {
  code: BIDDER_CODE,
  // gvlid: BIDDER_GVLID,
  aliases: [],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onBidWon,
  onTimeout,
};

registerBidder(spec);
