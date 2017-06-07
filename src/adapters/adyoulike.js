import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { format } from 'src/url';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';

var AdyoulikeAdapter = function AdyoulikeAdapter() {
  const _VERSION = '0.1';

  const baseAdapter = Adapter.createNew('adyoulike');

  baseAdapter.callBids = function (bidRequest) {
    const bidRequests = {};
    const bids = bidRequest.bids || [];

    const validBids = bids.filter(valid);
    validBids.forEach(bid => { bidRequests[bid.params.placement] = bid; });

    const placements = validBids.map(bid => bid.params.placement);
    if (!utils.isEmpty(placements)) {
      const body = createBody(placements);
      const endpoint = createEndpoint();
      ajax(endpoint,
        (response) => {
          handleResponse(bidRequests, response);
        }, body, {
          contentType: 'text/json',
          withCredentials: true
        });
    }
  };

  /* Create endpoint url */
  function createEndpoint() {
    return format({
      protocol: (document.location.protocol === 'https:') ? 'https' : 'http',
      host: 'hb-api.omnitagjs.com',
      pathname: '/hb-api/prebid',
      search: createEndpointQS()
    });
  }

  /* Create endpoint query string */
  function createEndpointQS() {
    const qs = {};

    const ref = getReferrerUrl();
    if (ref) {
      qs.RefererUrl = encodeURIComponent(ref);
    }

    const can = getCanonicalUrl();
    if (can) {
      qs.CanonicalUrl = encodeURIComponent(can);
    }

    return qs;
  }

  /* Create request body */
  function createBody(placements) {
    const body = {
      Version: _VERSION,
      Placements: placements,
    };

    if (performance && performance.navigation) {
      body.PageRefreshed = performance.navigation.type === performance.navigation.TYPE_RELOAD;
    }

    return JSON.stringify(body);
  }

  /* Response handler */
  function handleResponse(bidRequests, response) {
    let responses = [];
    try {
      responses = JSON.parse(response);
    } catch (error) { utils.logError(error); }

    const bidResponses = {};
    responses.forEach(response => {
      bidResponses[response.Placement] = response;
    });

    Object.keys(bidRequests).forEach(placement => {
      addResponse(placement, bidRequests[placement], bidResponses[placement]);
    });
  }

  /* Check that a bid has required parameters */
  function valid(bid) {
    const sizes = getSize(bid.sizes);
    if (!bid.params.placement || !sizes.width || !sizes.height) {
      return false;
    }
    return true;
  }

  /* Get current page referrer url */
  function getReferrerUrl() {
    let referer = '';
    if (window.self !== window.top) {
      try {
        referer = window.top.document.referrer;
      } catch (e) { }
    } else {
      referer = document.referrer;
    }
    return referer;
  }

  /* Get current page canonical url */
  function getCanonicalUrl() {
    let link;
    if (window.self !== window.top) {
      try {
        link = window.top.document.head.querySelector('link[rel="canonical"][href]');
      } catch (e) { }
    } else {
      link = document.head.querySelector('link[rel="canonical"][href]');
    }

    if (link) {
      return link.href;
    }
    return '';
  }

  /* Get parsed size from request size */
  function getSize(requestSizes) {
    const parsed = {},
      size = utils.parseSizesInput(requestSizes)[0];

    if (typeof size !== 'string') {
      return parsed;
    }

    const parsedSize = size.toUpperCase().split('X');
    const width = parseInt(parsedSize[0], 10);
    if (width) {
      parsed.width = width;
    }

    const height = parseInt(parsedSize[1], 10);
    if (height) {
      parsed.height = height;
    }

    return parsed;
  }

  /* Create bid from response */
  function createBid(placementId, bidRequest, response) {
    let bid;
    if (!response || !response.Banner) {
      bid = bidfactory.createBid(STATUS.NO_BID, bidRequest);
    } else {
      bid = bidfactory.createBid(STATUS.GOOD, bidRequest);
      const size = getSize(bidRequest.sizes);
      bid.width = size.width;
      bid.height = size.height;
      bid.cpm = response.Price;
      bid.ad = response.Banner;
    }

    bid.bidderCode = baseAdapter.getBidderCode();

    return bid;
  }

  /* Add response to bidmanager */
  function addResponse(placementId, bidRequest, response) {
    const bid = createBid(placementId, bidRequest, response);
    const placement = bidRequest.placementCode;
    bidmanager.addBidResponse(placement, bid);
  }

  return {
    createNew: AdyoulikeAdapter.createNew,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
  };
};

AdyoulikeAdapter.createNew = function () {
  return new AdyoulikeAdapter();
};

module.exports = AdyoulikeAdapter;
