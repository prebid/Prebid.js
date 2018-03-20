import { registerBidder } from 'src/adapters/bidderFactory';
import { getTopWindowLocation, parseSizesInput } from 'src/utils';
import * as utils from '../src/utils';
import { BANNER, VIDEO } from '../src/mediaTypes';

const BIDDER_CODE = 'sonobi';
const STR_ENDPOINT = 'https://apex.go.sonobi.com/trinity.json';
const PAGEVIEW_ID = utils.generateUUID();

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
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
      let slotIdentifier = _validateSlot(bid);
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

    let data = {}
    bids.forEach((bid) => { Object.assign(data, bid); });

    const payload = {
      'key_maker': JSON.stringify(data),
      'ref': getTopWindowLocation().host,
      's': utils.generateUUID(),
      'pv': PAGEVIEW_ID,
    };

    if (validBidRequests[0].params.hfa) {
      payload.hfa = validBidRequests[0].params.hfa;
    }

    return {
      method: 'GET',
      url: STR_ENDPOINT,
      withCredentials: true,
      data: payload,
      bidderRequests: validBidRequests
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {*} bidderRequests - Info describing the request to the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse, { bidderRequests }) => {
    const bidResponse = serverResponse.body;
    const bidsReturned = [];

    if (Object.keys(bidResponse.slots).length === 0) {
      return bidsReturned;
    }

    Object.keys(bidResponse.slots).forEach(slot => {
      const bidId = _getBidIdFromTrinityKey(slot);
      const bidRequest = bidderRequests.find(bidReqest => bidReqest.bidId === bidId);
      const videoMediaType = utils.deepAccess(bidRequest, 'mediaTypes.video');
      const mediaType = bidRequest.mediaType || (videoMediaType ? 'video' : null);
      const createCreative = _creative(mediaType);
      const bid = bidResponse.slots[slot];
      if (bid.sbi_aid && bid.sbi_mouse && bid.sbi_size) {
        const [
          width = 1,
          height = 1
        ] = bid.sbi_size.split('x');
        const bids = {
          requestId: bidId,
          cpm: Number(bid.sbi_mouse),
          width: Number(width),
          height: Number(height),
          ad: createCreative(bidResponse.sbi_dc, bid.sbi_aid),
          ttl: 500,
          creativeId: bid.sbi_aid,
          netRevenue: true,
          currency: 'USD'
        };

        if (bid.sbi_dozer) {
          bids.dealId = bid.sbi_dozer;
        }

        const creativeType = bid.sbi_ct;
        if (creativeType && (creativeType === 'video' || creativeType === 'outstream')) {
          bids.mediaType = 'video';
          bids.vastUrl = createCreative(bidResponse.sbi_dc, bid.sbi_aid);
          delete bids.ad;
          delete bids.width;
          delete bids.height;
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

const _creative = (mediaType) => (sbi_dc, sbi_aid) => {
  if (mediaType === 'video') {
    return _videoCreative(sbi_dc, sbi_aid)
  }
  const src = 'https://' + sbi_dc + 'apex.go.sonobi.com/sbi.js?aid=' + sbi_aid + '&as=null' + '&ref=' + getTopWindowLocation().host;
  return '<script type="text/javascript" src="' + src + '"></script>';
}

function _videoCreative(sbi_dc, sbi_aid) {
  return `https://${sbi_dc}apex.go.sonobi.com/vast.xml?vid=${sbi_aid}&ref=${getTopWindowLocation().host}`
}

function _getBidIdFromTrinityKey (key) {
  return key.split('|').slice(-1)[0]
}

registerBidder(spec);
