import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'imonomy';
const ENDPOINT = 'https://b.imonomy.com/openrtb/hb/00000';
const USYNCURL = 'https://b.imonomy.com/UserMatching/b/';

export const spec = {
  code: BIDDER_CODE,

  /**
  * Determines whether or not the given bid request is valid. Valid bid request must have placementId and hbid
  *
  * @param {BidRequest} bid The bid params to validate.
  * @return {boolean} True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: bid => {
    return !!(bid && bid.params && bid.params.placementId && bid.params.hbid);
  },
  /**
  * Make a server request from the list of BidRequests.
  *
  * @param {BidRequest[]} validBidRequests an array of bids
  * @return ServerRequest Info describing the request to the server.
  */
  buildRequests: validBidRequests => {
    const tags = validBidRequests.map(bid => {
      // map each bid id to bid object to retrieve adUnit code in callback
      let tag = {
        uuid: bid.bidId,
        sizes: bid.sizes,
        trid: bid.transactionId,
        hbid: bid.params.hbid,
        placementid: bid.params.placementId
      };

      // add floor price if specified (not mandatory)
      if (bid.params.floorPrice) {
        tag.floorprice = bid.params.floorPrice;
      }

      return tag;
    });

    // Imonomy server config
    const time = new Date().getTime();
    const kbConf = {
      ts_as: time,
      hb_placements: [],
      hb_placement_bidids: {},
      hb_floors: {},
      cb: _generateCb(time),
      tz: new Date().getTimezoneOffset(),
    };

    validBidRequests.forEach(bid => {
      kbConf.hdbdid = kbConf.hdbdid || bid.params.hbid;
      kbConf.encode_bid = kbConf.encode_bid || bid.params.encode_bid;
      kbConf.hb_placement_bidids[bid.params.placementId] = bid.bidId;
      if (bid.params.floorPrice) {
        kbConf.hb_floors[bid.params.placementId] = bid.params.floorPrice;
      }
      kbConf.hb_placements.push(bid.params.placementId);
    });

    let payload = {};
    if (!utils.isEmpty(tags)) {
      payload = { bids: [...tags], kbConf };
    }

    let endpointToUse = ENDPOINT;
    if (kbConf.hdbdid) {
      endpointToUse = endpointToUse.replace('00000', kbConf.hdbdid);
    }

    return {
      method: 'POST',
      url: endpointToUse,
      data: JSON.stringify(payload)
    };
  },
  /**
  * Unpack the response from the server into a list of bids.
  *
  * @param {*} response A successful response from the server.
  * @return {Bid[]} An array of bids which were nested inside the server.
  */
  interpretResponse: (response) => {
    const bidResponses = [];
    if (response && response.body && response.body.bids) {
      response.body.bids.forEach(bid => {
        // The bid ID. Used to tie this bid back to the request.
        if (bid.uuid) {
          bid.requestId = bid.uuid;
        } else {
          utils.logError('No uuid for bid');
        }
        // The creative payload of the returned bid.
        if (bid.creative) {
          bid.ad = bid.creative;
        } else {
          utils.logError('No creative for bid');
        }
        bidResponses.push(bid);
      });
    }
    return bidResponses;
  },
  /**
  * Register User Sync.
  */
  getUserSyncs: syncOptions => {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: USYNCURL
      }];
    }
  }
};

/**
* Generated cache baster value to be sent to bid server
* @param {*} time current time to use for creating cb.
*/
function _generateCb(time) {
  return Math.floor((time % 65536) + (Math.floor(Math.random() * 65536) * 65536));
}

registerBidder(spec);
