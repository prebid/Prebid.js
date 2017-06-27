import {createBid} from 'src/bidfactory';
import {addBidResponse} from 'src/bidmanager';
import {logError, getTopWindowLocation} from 'src/utils';
import {ajax} from 'src/ajax';
import {STATUS} from 'src/constants';
import adaptermanager from 'src/adaptermanager';

function PulsePointLiteAdapter() {
  const bidUrl = window.location.protocol + '//bid.contextweb.com/header/ortb';
  const ajaxOptions = {
    method: 'POST',
    withCredentials: true,
    contentType: 'text/plain'
  };

  function _callBids(bidRequest) {
    // construct the openrtb bid request from slots
    const request = {
      imp: bidRequest.bids.map(slot => impression(slot)),
      site: site(bidRequest),
      device: device(),
    };
    ajax(bidUrl, (rawResponse) => {
      bidResponseAvailable(bidRequest, rawResponse);
    }, JSON.stringify(request), ajaxOptions);
  }

  function bidResponseAvailable(bidRequest, rawResponse) {
    const idToSlotMap = {};
    const idToBidMap = {};
    // extract the request bids and the response bids, keyed by impr-id
    bidRequest.bids.forEach((slot) => {
      idToSlotMap[slot.bidId] = slot;
    });
    const bidResponse = parse(rawResponse);
    if (bidResponse) {
      bidResponse.seatbid.forEach(seatBid => seatBid.bid.forEach((bid) => {
        idToBidMap[bid.impid] = bid;
      }));
    }
    // register the responses
    Object.keys(idToSlotMap).forEach((id) => {
      if (idToBidMap[id]) {
        const size = adSize(idToSlotMap[id]);
        const bid = createBid(STATUS.GOOD, bidRequest);
        bid.bidderCode = bidRequest.bidderCode;
        bid.cpm = idToBidMap[id].price;
        bid.ad = idToBidMap[id].adm;
        bid.width = size[0];
        bid.height = size[1];
        addBidResponse(idToSlotMap[id].placementCode, bid);
      } else {
        const passback = createBid(STATUS.NO_BID, bidRequest);
        passback.bidderCode = idToSlotMap[id].bidderCode;
        addBidResponse(idToSlotMap[id].placementCode, passback);
      }
    });
  }

  function impression(slot) {
    const size = adSize(slot);
    return {
      id: slot.bidId,
      banner: {
        w: size[0],
        h: size[1],
        id: slot.params.ct.toString(),
      },
    };
  }

  function site(bidderRequest) {
    const pubId = bidderRequest.bids.length > 0 ? bidderRequest.bids[0].params.cp : '0';
    return {
      publisher: {
        id: pubId.toString(),
      },
      ref: referrer(),
      page: getTopWindowLocation().href,
    };
  }

  function referrer() {
    try {
      return window.top.document.referrer;
    } catch (e) {
      return document.referrer;
    }
  }

  function device() {
    return {
      ua: navigator.userAgent,
      language: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage),
    };
  }

  function parse(rawResponse) {
    try {
      return JSON.parse(rawResponse);
    } catch (ex) {
      logError('pulsepointLite.safeParse', 'ERROR', ex);
      return null;
    }
  }

  function adSize(slot) {
    const size = slot.params.cf.toUpperCase().split('X');
    const width = parseInt(slot.params.cw || size[0], 10);
    const height = parseInt(slot.params.ch || size[1], 10);
    return [width, height];
  }

  return {
    callBids: _callBids
  };
}

// registering an alias for backwards compatibility.
adaptermanager.registerBidAdapter(new PulsePointLiteAdapter, 'ppLite');

module.exports = PulsePointLiteAdapter;
