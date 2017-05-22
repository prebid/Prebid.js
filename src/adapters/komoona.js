import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';

const ENDPOINT = '//bidder.komoona.com/v1/GetSBids';

function KomoonaAdapter() {
  let baseAdapter = Adapter.createNew('komoona');
  let bidRequests = {};

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function(bidRequest) {
    const bids = bidRequest.bids || [];
    const tags = bids
      .filter(bid => valid(bid))
      .map(bid => {
        // map request id to bid object to retrieve adUnit code in callback
        bidRequests[bid.bidId] = bid;

        let tag = {};
        tag.sizes = bid.sizes;
        tag.uuid = bid.bidId;
        tag.placementid = bid.params.placementId;
        tag.hbid = bid.params.hbid;

        return tag;
      });

    if (!utils.isEmpty(tags)) {
      const payload = JSON.stringify({bids: [...tags]});

      ajax(ENDPOINT, handleResponse, payload, {
        contentType: 'text/plain',
        withCredentials: true
      });
    }
  };

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    let parsed;

    try {
      parsed = JSON.parse(response);
    } catch (error) {
      utils.logError(error);
    }

    if (!parsed || parsed.error) {
      let errorMessage = `in response for ${baseAdapter.getBidderCode()} adapter`;
      if (parsed && parsed.error) { errorMessage += `: ${parsed.error}`; }
      utils.logError(errorMessage);

      // signal this response is complete
      Object.keys(bidRequests)
        .map(bidId => bidRequests[bidId].placementCode)
        .forEach(placementCode => {
          bidmanager.addBidResponse(placementCode, createBid(STATUS.NO_BID));
        });

      return;
    }

    parsed.bids.forEach(tag => {
      let status;
      if (tag.cpm > 0 && tag.creative) {
        status = STATUS.GOOD;
      } else {
        status = STATUS.NO_BID;
      }

      tag.bidId = tag.uuid;  // bidfactory looks for bidId on requested bid
      const bid = createBid(status, tag);
      const placement = bidRequests[bid.adId].placementCode;

      bidmanager.addBidResponse(placement, bid);
    });
  }

  /* Check that a bid has required paramters */
  function valid(bid) {
    if (bid.params.placementId && bid.params.hbid) {
      return bid;
    } else {
      utils.logError('bid requires placementId and hbid params');
    }
  }

  /* Create and return a bid object based on status and tag */
  function createBid(status, tag) {
    let bid = bidfactory.createBid(status, tag);
    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = baseAdapter.getBidderCode();

    if (status === STATUS.GOOD) {
      bid.cpm = tag.cpm;
      bid.width = tag.width;
      bid.height = tag.height;
      bid.ad = tag.creative;
    }

    return bid;
  }

  return {
    createNew: KomoonaAdapter.createNew,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
  };
}

KomoonaAdapter.createNew = function() {
  return new KomoonaAdapter();
};

module.exports = KomoonaAdapter;
