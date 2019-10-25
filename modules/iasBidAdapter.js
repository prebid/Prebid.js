import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'ias';

const otherBidIds = [];

function isBidRequestValid(bid) {
  const { pubId, adUnitPath } = bid.params;
  return !!(pubId && adUnitPath);
}

/**
 * Converts GPT-style size array into a string
 * @param  {Array} sizes:  list of GPT-style sizes, e.g. [[300, 250], [300, 300]]
 * @return {String} a string containing sizes, e.g. '[300.250,300.300]'
 */
function stringifySlotSizes(sizes) {
  let result = '';
  if (utils.isArray(sizes)) {
    result = sizes.reduce((acc, size) => {
      acc.push(size.join('.'));
      return acc;
    }, []);
    result = '[' + result.join(',') + ']';
  }
  return result;
}

function stringifySlot(bidRequest) {
  const id = bidRequest.adUnitCode;
  const ss = stringifySlotSizes(bidRequest.sizes);
  const p = bidRequest.params.adUnitPath;
  const slot = { id, ss, p };
  const keyValues = utils.getKeys(slot).map(function(key) {
    return [key, slot[key]].join(':');
  });
  return '{' + keyValues.join(',') + '}';
}

function stringifyWindowSize() {
  return [ window.innerWidth || -1, window.innerHeight || -1 ].join('.');
}

function stringifyScreenSize() {
  return [ (window.screen && window.screen.width) || -1, (window.screen && window.screen.height) || -1 ].join('.');
}

function buildRequests(bidRequests) {
  const IAS_HOST = '//pixel.adsafeprotected.com/services/pub';
  const anId = bidRequests[0].params.pubId;

  let queries = [];
  queries.push(['anId', anId]);
  queries = queries.concat(bidRequests.reduce(function(acc, request) {
    acc.push(['slot', stringifySlot(request)]);
    return acc;
  }, []));

  queries.push(['wr', stringifyWindowSize()]);
  queries.push(['sr', stringifyScreenSize()]);
  queries.push(['url', encodeURIComponent(window.location.href)]);

  const queryString = encodeURI(queries.map(qs => qs.join('=')).join('&'));

  bidRequests.forEach(function (request) {
    if (bidRequests[0].bidId != request.bidId) {
      otherBidIds.push(request.bidId);
    }
  });

  return {
    method: 'GET',
    url: IAS_HOST,
    data: queryString,
    bidRequest: bidRequests[0]
  };
}

function getPageLevelKeywords(response) {
  let result = {};
  shallowMerge(result, response.brandSafety);
  result.fr = response.fr;
  result.custom = response.custom;
  return result;
}

function shallowMerge(dest, src) {
  utils.getKeys(src).reduce((dest, srcKey) => {
    dest[srcKey] = src[srcKey];
    return dest;
  }, dest);
}

function interpretResponse(serverResponse, request) {
  const iasResponse = serverResponse.body;
  const bidResponses = [];

  // Keys in common bid response are not used;
  // Necessary to get around with prebid's common bid response check
  const commonBidResponse = {
    requestId: request.bidRequest.bidId,
    cpm: 0.01,
    width: 100,
    height: 200,
    creativeId: 434,
    dealId: 42,
    currency: 'USD',
    netRevenue: true,
    ttl: 360
  };

  shallowMerge(commonBidResponse, getPageLevelKeywords(iasResponse));
  commonBidResponse.slots = iasResponse.slots;
  bidResponses.push(commonBidResponse);

  otherBidIds.forEach(function (bidId) {
    var otherResponse = Object.assign({}, commonBidResponse);
    otherResponse.requestId = bidId;
    bidResponses.push(otherResponse);
  });

  return bidResponses;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: [],
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse
};

registerBidder(spec);
