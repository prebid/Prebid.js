import { registerBidder } from 'src/adapters/bidderFactory';
import { parse } from 'src/url';
import * as utils from 'src/utils';

const BIDDER_CODE = 'criteo';
const CDB_ENDPOINT = '//bidder.criteo.com/cdb';
const PROFILE_ID = 207;
const ADAPTER_VERSION = 2;
const INTEGRATION_MODES = {
  'amp': 1,
};

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,

  /**
   * @param {object} bid
   * @return {boolean}
   */
  isBidRequestValid: bid => (
    !!(bid && bid.params && (bid.params.zoneId || bid.params.networkId))
  ),

  /**
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    let url;
    let data;

    if (typeof Criteo !== 'undefined') {
      const adapter = new Criteo.PubTag.Adapters.Prebid(PROFILE_ID, ADAPTER_VERSION, bidRequests, bidderRequest);
      url = adapter.buildCdbUrl();
      data = adapter.buildCdbRequest();
    } else {
      const context = buildContext(bidRequests);
      url = buildCdbUrl(context);
      data = buildCdbRequest(context, bidRequests);
    }

    return { method: 'POST', url, data };
  },

  /**
   * @param {*} response
   * @param {ServerRequest} request
   * @return {Bid[]}
   */
  interpretResponse: (response, request) => {
    if (typeof Criteo !== 'undefined') {
      const adapter = Criteo.PubTag.Adapters.Prebid.GetAdapter(request.data);
      return adapter.interpretResponse(response.body);
    }

    const bids = [];

    if (response.body.slots && utils.isArray(response.body.slots)) {
      response.body.slots.forEach(slot => {
        const bid = {
          requestId: slot.impid,
          cpm: slot.cpm,
          currency: slot.currency,
          netRevenue: true,
          ad: slot.creative,
          width: slot.width,
          height: slot.height,
        }
        bids.push(bid);
      });
    }

    return bids;
  },
};

/**
 * @param {BidRequest[]} bidRequests
 * @return {CriteoContext}
 */
function buildContext(bidRequests) {
  const url = utils.getTopWindowUrl();
  const queryString = parse(url).search;

  const context = {
    url: url,
    debug: queryString['pbt_debug'] === '1',
    noLog: queryString['pbt_nolog'] === '1',
    integrationMode: undefined,
  };

  bidRequests.forEach(bidRequest => {
    if (bidRequest.params.integrationMode) {
      context.integrationMode = bidRequest.params.integrationMode;
    }
  })

  return context;
}

/**
 * @param {CriteoContext} context
 * @return {string}
 */
function buildCdbUrl(context) {
  let url = CDB_ENDPOINT;
  url += '?profileId=' + PROFILE_ID;
  url += '&av=' + String(ADAPTER_VERSION);
  url += '&cb=' + String(Math.floor(Math.random() * 99999999999));

  if (context.integrationMode in INTEGRATION_MODES) {
    url += '&im=' + INTEGRATION_MODES[context.integrationMode];
  }
  if (context.debug) {
    url += '&debug=1';
  }
  if (context.noLog) {
    url += '&nolog=1';
  }

  return url;
}

/**
 * @param {CriteoContext} context
 * @param {BidRequest[]} bidRequests
 * @return {*}
 */
function buildCdbRequest(context, bidRequests) {
  let networkId;
  const request = {
    publisher: {
      url: context.url,
    },
    slots: bidRequests.map(bidRequest => {
      networkId = bidRequest.params.networkId || networkId;
      const slot = {
        impid: bidRequest.bidId,
        transactionid: bidRequest.transactionId,
        auctionId: bidRequest.auctionId,
        sizes: bidRequest.sizes.map(size => size[0] + 'x' + size[1]),
      };
      if (bidRequest.params.zoneId) {
        slot.zoneid = bidRequest.params.zoneId;
      }
      if (bidRequest.params.publisherSubId) {
        slot.publishersubid = bidRequest.params.publisherSubId;
      }
      return slot;
    }),
  };
  if (networkId) {
    request.publisher.networkid = networkId;
  }
  return request;
}

registerBidder(spec);
