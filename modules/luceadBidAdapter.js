/**
 * @module modules/luceadBidAdapter
 */

import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getUniqueIdentifierStr, deepSetValue, logInfo} from '../src/utils.js';
import {fetch} from '../src/ajax.js';

const gvlid = 1309;
const bidderCode = 'lucead';
const defaultCurrency = 'EUR';
const defaultTtl = 500;
const aliases = ['adliveplus'];
const defaultRegion = 'eu';
const domain = 'lucead.com'
let baseUrl = `https://${domain}`;
let staticUrl = `https://s.${domain}`;
let endpointUrl = baseUrl;

function isDevEnv() {
  return location.hash.includes('prebid-dev');
}

function isBidRequestValid(bidRequest) {
  return !!bidRequest?.params?.placementId;
}

function buildRequests(bidRequests, bidderRequest) {
  const region = bidRequests[0]?.params?.region || defaultRegion;
  endpointUrl = `https://${region}.${domain}`;

  if (isDevEnv()) {
    baseUrl = location.origin;
    staticUrl = baseUrl;
    endpointUrl = `${baseUrl}`;
  }

  logInfo('buildRequests', {
    bidRequests,
    bidderRequest,
  });

  const companionData = {
    base_url: baseUrl,
    static_url: staticUrl,
    endpoint_url: endpointUrl,
    request_id: bidderRequest.bidderRequestId,
    prebid_version: '$prebid.version$',
    bidRequests,
    bidderRequest,
    getUniqueIdentifierStr,
    ortbConverter,
    deepSetValue,
    is_sra: true,
    region,
  };

  window.lucead_prebid_data = companionData;
  const fn = window.lucead_prebid;

  if (fn && typeof fn === 'function') {
    fn(companionData);
  }

  return {
    method: 'POST',
    url: `${endpointUrl}/go/prebid/sra`,
    data: JSON.stringify({
      request_id: bidderRequest.bidderRequestId,
      domain: location.hostname,
      bid_requests: bidRequests.map(bidRequest => {
        return {
          bid_id: bidRequest.bidId,
          sizes: bidRequest.sizes,
          media_types: bidRequest.mediaTypes,
          placement_id: bidRequest.params.placementId,
          schain: bidRequest.schain,
        };
      }),
    }),
    options: {
      contentType: 'text/plain',
      withCredentials: false
    },
  };
}

function interpretResponse(serverResponse, bidRequest) {
  // @see required fields https://docs.prebid.org/dev-docs/bidder-adaptor.html
  const response = serverResponse?.body;
  const bidRequestData = JSON.parse(bidRequest?.data);

  const bids = (response?.bids || []).map(bid => ({
    requestId: bid?.bid_id || '1', // bid request id, the bid id
    cpm: bid?.cpm || 0,
    width: (bid?.size && bid?.size?.width) || 300,
    height: (bid?.size && bid?.size?.height) || 250,
    currency: bid?.currency || defaultCurrency,
    ttl: bid?.ttl || defaultTtl,
    creativeId: bid?.ssp ? `ssp:${bid.ssp}` : `${bid?.ad_id || 0}:${bid?.ig_id || 0}`,
    netRevenue: bid?.net_revenue || true,
    ad: bid?.ad || '',
    meta: {
      advertiserDomains: bid?.advertiser_domains || [],
    },
  }));

  logInfo('interpretResponse', {serverResponse, bidRequest, bidRequestData, bids});

  if (response?.enable_pa === false) { return bids; }

  const fledgeAuctionConfigs = (response.bids || []).map(bid => ({
    bidId: bid?.bid_id,
    config: {
      seller: baseUrl,
      decisionLogicUrl: `${baseUrl}/js/ssp.js`,
      interestGroupBuyers: [baseUrl],
      requestedSize: bid?.size,
      auctionSignals: {
        size: bid?.size,
      },
      perBuyerSignals: {
        [baseUrl]: {
          prebid_paapi: true,
          prebid_bid_id: bid?.bid_id,
          prebid_request_id: bidRequestData.request_id,
          placement_id: bid.placement_id,
          // floor,
          is_sra: true,
          endpoint_url: endpointUrl,
        },
      }
    }
  }));

  return {bids, fledgeAuctionConfigs};
}

function report(type, data) {
  // noinspection JSCheckFunctionSignatures
  return fetch(`${endpointUrl}/go/report/${type}`, {
    body: JSON.stringify({
      ...data,
      domain: location.hostname,
    }),
    method: 'POST',
    contentType: 'text/plain',
  });
}

function onBidWon(bid) {
  logInfo('Bid won', bid);

  let data = {
    bid_id: bid?.bidId,
    placement_id: bid.params ? (bid?.params[0]?.placementId || '0') : '0',
    spent: bid?.cpm,
    currency: bid?.currency,
  };

  if (bid?.creativeId) {
    const parts = bid.creativeId.toString().split(':');

    if (parts[0] === 'ssp') {
      data.ssp = parts[1];
    } else {
      data.ad_id = parts[0]
      data.ig_id = parts[1]
    }
  }

  return report('impression', data);
}

function onTimeout(timeoutData) {
  logInfo('Timeout from adapter', timeoutData);
}

export const spec = {
  code: bidderCode,
  gvlid,
  aliases,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onBidWon,
  onTimeout,
  isDevEnv,
};

// noinspection JSCheckFunctionSignatures
registerBidder(spec);
