/*
* Tremor Video bid Adapter for prebid.js
* */

import Adapter from 'src/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import {ajax} from 'src/ajax';
import {STATUS} from 'src/constants';
import adaptermanager from 'src/adaptermanager';

const ENDPOINT = '.ads.tremorhub.com/ad/tag';

const OPTIONAL_PARAMS = [
  'mediaId', 'mediaUrl', 'mediaTitle', 'contentLength', 'floor',
  'efloor', 'custom', 'categories', 'keywords', 'blockDomains',
  'c2', 'c3', 'c4', 'skip', 'skipmin', 'skipafter', 'delivery',
  'placement', 'videoMinBitrate', 'videoMaxBitrate'
];

/**
 * Bidder adapter Tremor Video. Given the list of all ad unit tag IDs,
 * sends out a bid request. When a bid response is back, registers the bid
 * to Prebid.js.
 * Steps:
 * - Format and send the bid request
 * - Evaluate and handle the response
 * - Store potential VAST markup
 * - Send request to ad server
 * - intercept ad server response
 * - Check if the vast wrapper URL is http://cdn.tremorhub.com/static/dummy.xml
 * - If yes: then render the locally stored VAST markup by directly passing it to your player
 * - Else: give the player the VAST wrapper from your ad server
 */
function TremorAdapter() {
  let baseAdapter = new Adapter('tremor');

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function (bidRequest) {
    const bids = bidRequest.bids || [];
    bids.filter(bid => valid(bid))
      .map(bid => {
        let url = generateUrl(bid);
        if (url) {
          ajax(url, response => {
            handleResponse(bid, response);
          }, null, {method: 'GET', withCredentials: true});
        }
      });
  };

  /**
   * Generates the url based on the parameters given. Sizes are required.
   * The format is: [L,W] or [[L1,W1],...]
   * @param bid
   * @returns {string}
   */
  function generateUrl(bid) {
    // get the sizes
    let width, height;
    if (utils.isArray(bid.sizes) && bid.sizes.length === 2 && (!isNaN(bid.sizes[0]) && !isNaN(bid.sizes[1]))) {
      width = bid.sizes[0];
      height = bid.sizes[1];
    } else if (typeof bid.sizes === 'object') {
      // take the primary (first) size from the array
      width = bid.sizes[0][0];
      height = bid.sizes[0][1];
    }
    if (width && height) {
      let scheme = ((document.location.protocol === 'https:') ? 'https' : 'http') + '://';
      let url = scheme + bid.params.supplyCode + ENDPOINT + '?adCode=' + bid.params.adCode;

      url += ('&playerWidth=' + width);
      url += ('&playerHeight=' + height);
      url += ('&srcPageUrl=' + encodeURIComponent(document.location.href));

      OPTIONAL_PARAMS.forEach(param => {
        if (bid.params[param]) {
          url += ('&' + param + '=' + bid.params[param]);
        }
      });

      url = (url + '&fmt=json');

      return url;
    }
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(bidReq, response) {
    let bidResult;

    try {
      bidResult = JSON.parse(response);
    } catch (error) {
      utils.logError(error);
    }

    if (!bidResult || bidResult.error) {
      let errorMessage = `in response for ${baseAdapter.getBidderCode()} adapter`;
      if (bidResult && bidResult.error) {
        errorMessage += `: ${bidResult.error}`;
      }
      utils.logError(errorMessage);

      // signal this response is complete
      bidmanager.addBidResponse(bidReq.placementCode, createBid(STATUS.NO_BID));
    }

    if (bidResult.seatbid && bidResult.seatbid.length > 0) {
      bidResult.seatbid[0].bid.forEach(tag => {
        let status = STATUS.GOOD;
        const bid = createBid(status, bidReq, tag);
        bidmanager.addBidResponse(bidReq.placementCode, bid);
      });
    } else {
      // signal this response is complete with no bid
      bidmanager.addBidResponse(bidReq.placementCode, createBid(STATUS.NO_BID));
    }
  }

  /**
   * We require the ad code and the supply code to generate a tag url
   * @param bid
   * @returns {*}
   */
  function valid(bid) {
    if (bid.params.adCode && bid.params.supplyCode) {
      return bid;
    } else {
      utils.logError('missing bid params');
    }
  }

  /**
   * Create and return a bid object based on status and tag
   * @param status
   * @param reqBid
   * @param response
   */
  function createBid(status, reqBid, response) {
    let bid = bidfactory.createBid(status, reqBid);
    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = baseAdapter.getBidderCode();

    if (response) {
      bid.cpm = response.price;
      bid.crid = response.crid;
      bid.vastXml = response.adm;
      bid.mediaType = 'video';
    }

    return bid;
  }

  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
  });
}

adaptermanager.registerBidAdapter(new TremorAdapter(), 'tremor', {
  supportedMediaTypes: ['video']
});

module.exports = TremorAdapter;
