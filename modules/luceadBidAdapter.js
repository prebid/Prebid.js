import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {loadExternalScript} from '../src/adloader.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getUniqueIdentifierStr, logInfo} from '../src/utils.js';
import {fetch} from '../src/ajax.js';

const bidderCode = 'lucead';
let baseUrl = 'https://ayads.io';
let staticUrl = 'https://s.ayads.io';
let companionUrl = 'https://cdn.jsdelivr.net/gh/lucead/prebid-js-external-js-lucead@master/dist/prod.min.js';
let endpointUrl = 'https://prebid.ayads.io/go';
const defaultCurrency = 'EUR';
const defaultTtl = 500;
const isDevEnv = location.hostname.endsWith('.ngrok-free.app');

function isBidRequestValid(bidRequest) {
  return !!bidRequest?.params?.placementId;
}

export function log(msg, obj) {
  logInfo('Lucead - ' + msg, obj);
}

function buildRequests(validBidRequests, bidderRequest) {
  if (isDevEnv) {
    baseUrl = `https://${location.hostname}`;
    staticUrl = baseUrl;
    companionUrl = `${staticUrl}/dist/prebid-companion.js`;
    endpointUrl = `${baseUrl}/go`;
  }

  log('buildRequests', {
    validBidRequests,
    bidderRequest,
  });

  const companionData = {
    base_url: baseUrl,
    static_url: staticUrl,
    endpoint_url: endpointUrl,
    request_id: bidderRequest.bidderRequestId,
    validBidRequests,
    bidderRequest,
    getUniqueIdentifierStr,
    ortbConverter,
  };

  loadExternalScript(companionUrl, bidderCode, () => window.ayads_prebid && window.ayads_prebid(companionData));

  return validBidRequests.map(bidRequest => ({
    method: 'POST',
    url: `${endpointUrl}/prebid/sub`,
    data: JSON.stringify({
      request_id: bidderRequest.bidderRequestId,
      domain: location.hostname,
      bid_id: bidRequest.bidId,
      sizes: bidRequest.sizes,
      media_types: bidRequest.mediaTypes,
      fledge_enabled: bidderRequest.fledgeEnabled,
      enable_contextual: bidRequest?.params?.enableContextual !== false,
      enable_pa: bidRequest?.params?.enablePA !== false,
      params: bidRequest.params,
    }),
    options: {
      contentType: 'text/plain',
      withCredentials: false
    },
  }));
}

function interpretResponse(serverResponse, bidRequest) {
  // @see required fields https://docs.prebid.org/dev-docs/bidder-adaptor.html
  const response = serverResponse.body;
  const bidRequestData = JSON.parse(bidRequest.data);

  const bids = response.enable_contextual !== false ? [{
    requestId: response?.bid_id || '1', // bid request id, the bid id
    cpm: response?.cpm || 0,
    width: (response?.size && response?.size?.width) || 300,
    height: (response?.size && response?.size?.height) || 250,
    currency: response?.currency || defaultCurrency,
    ttl: response?.ttl || defaultTtl,
    creativeId: response?.ad_id || '0',
    netRevenue: response?.netRevenue || true,
    ad: response?.ad || '',
    meta: {
      advertiserDomains: response?.advertiserDomains || [],
    },
  }] : null;

  log('interpretResponse', {serverResponse, bidRequest, bidRequestData, bids});

  if (response.enable_pa === false) { return bids; }

  const fledgeAuctionConfig = {
    seller: baseUrl,
    decisionLogicUrl: `${baseUrl}/js/ssp.js`,
    interestGroupBuyers: [baseUrl],
    perBuyerSignals: {},
    auctionSignals: {
      size: bidRequestData.sizes ? {width: bidRequestData?.sizes[0][0] || 300, height: bidRequestData?.sizes[0][1] || 250} : null,
    },
  };

  const fledgeAuctionConfigs = [{bidId: response.bid_id, config: fledgeAuctionConfig}];

  return {bids, fledgeAuctionConfigs};
}

function report(type = 'impression', data = {}) {
  // noinspection JSCheckFunctionSignatures
  return fetch(`${endpointUrl}/report/${type}`, {
    body: JSON.stringify(data),
    method: 'POST',
    contentType: 'text/plain'
  });
}

function onBidWon(bid) {
  log('Bid won', bid);

  return report(`impression`, {
    bid_id: bid?.bidId,
    ad_id: bid?.creativeId,
    placement_id: bid?.params ? bid?.params[0]?.placementId : 0,
    spent: bid?.cpm,
    currency: bid?.currency,
  });
}

function onTimeout(timeoutData) {
  log('Timeout from adapter', timeoutData);
}

export const spec = {
  code: bidderCode,
  // gvlid: BIDDER_GVLID,
  aliases: [],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onBidWon,
  onTimeout,
};

// noinspection JSCheckFunctionSignatures
registerBidder(spec);
