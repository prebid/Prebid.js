import { registerBidder } from 'src/adapters/bidderFactory';
import { getTopWindowLocation, parseSizesInput } from 'src/utils';
import * as utils from '../src/utils';

const BIDDER_CODE = 'sonobi';
const STR_ENDPOINT = 'https://apex.go.sonobi.com/trinity.json';

export const spec = {
  code: BIDDER_CODE,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid - The bid params to validate.
   * @return {boolean} True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: bid => !!(bid.params && (bid.params.ad_unit || bid.params.placement_id) && (bid.params.sizes || bid.sizes)),

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @return {object} ServerRequest - Info describing the request to the server.
   */
  buildRequests: (validBidRequests) => {
    const bids = validBidRequests.map(bid => {
      let slotIdentifier = _validateSlot(bid)
      if (/^[\/]?[\d]+[[\/].+[\/]?]?$/.test(slotIdentifier)) {
        slotIdentifier = slotIdentifier.charAt(0) === '/' ? slotIdentifier : '/' + slotIdentifier
        return {
          [`${slotIdentifier}|${bid.bidId}`]: `${_validateSize(bid)}${_validateFloor(bid)}`
        }
      } else if (/^[0-9a-fA-F]{20}$/.test(slotIdentifier) && slotIdentifier.length === 20) {
        return {
          [bid.bidId]: `${slotIdentifier}|${_validateSize(bid)}${_validateFloor(bid)}`
        }
      } else {
        utils.logError(`The ad unit code or Sonobi Placement id for slot ${bid.bidId} is invalid`);
      }
    });

    const payload = {
      'key_maker': JSON.stringify(Object.assign({}, ...bids)),
      'ref': getTopWindowLocation().host,
      's': utils.generateUUID(),
    };

    return {
      method: 'GET',
      url: STR_ENDPOINT,
      withCredentials: true,
      data: payload
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse) => {
    const bidResponse = serverResponse.body;
    const bidsReturned = [];

    if (Object.keys(bidResponse.slots).length === 0) {
      return bidsReturned;
    }

    Object.keys(bidResponse.slots).forEach(slot => {
      const bid = bidResponse.slots[slot];

      if (bid.sbi_aid && bid.sbi_mouse && bid.sbi_size) {
        const bids = {
          requestId: slot.split('|').slice(-1)[0],
          cpm: Number(bid.sbi_mouse),
          width: Number(bid.sbi_size.split('x')[0]) || 1,
          height: Number(bid.sbi_size.split('x')[1]) || 1,
          ad: _creative(bidResponse.sbi_dc, bid.sbi_aid),
          ttl: 500,
          creativeId: bid.sbi_aid,
          netRevenue: true,
          currency: 'USD',
        };

        if (bid.sbi_dozer) {
          bids.dealId = bid.sbi_dozer;
        }

        bidsReturned.push(bids);
      }
    });
    return bidsReturned;
  },
  /**
   * Register User Sync.
   */
  getUserSyncs: (syncOptions, serverResponses) => {
    const syncs = [];
    if (syncOptions.pixelEnabled && serverResponses[0].body.sbi_px) {
      serverResponses[0].body.sbi_px.forEach(pixel => {
        syncs.push({
          type: pixel.type,
          url: pixel.url
        });
      });
    }
    return syncs;
  }
}

function _validateSize (bid) {
  if (bid.params.sizes) {
    return parseSizesInput(bid.params.sizes).join(',');
  }
  return parseSizesInput(bid.sizes).join(',');
}

function _validateSlot (bid) {
  if (bid.params.ad_unit) {
    return bid.params.ad_unit;
  }
  return bid.params.placement_id;
}

function _validateFloor (bid) {
  if (bid.params.floor) {
    return `|f=${bid.params.floor}`;
  }
  return '';
}

function _creative (sbi_dc, sbi_aid) {
  const src = 'https://' + sbi_dc + 'apex.go.sonobi.com/sbi.js?aid=' + sbi_aid + '&as=null';
  return '<script type="text/javascript" src="' + src + '"></script>';
}

registerBidder(spec);
