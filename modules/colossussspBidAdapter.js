import { deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ajax } from '../src/ajax.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import {
  buildPlacementProcessingFunction,
  buildRequestsBase,
  interpretResponse,
  getUserSyncs
} from '../libraries/teqblazeUtils/bidderUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'colossusssp';
const G_URL = 'https://colossusssp.com/?c=o&m=multi';
const G_URL_SYNC = 'https://sync.colossusssp.com';

function getUserId(eids, id, source, uidExt) {
  if (id) {
    var uid = { id };
    if (uidExt) {
      uid.ext = uidExt;
    }
    eids.push({
      source,
      uids: [ uid ]
    });
  }
}

const addPlacementType = (bid, bidderRequest, placement) => {
  placement.placementId = bid.params.placement_id;
  placement.groupId = bid.params.group_id;
};

const addCustomFieldsToPlacement = (bid, bidderRequest, placement) => {
  placement.traffic = placement.adFormat;
  delete placement.adFormat;

  if (placement.traffic === VIDEO) {
    placement.sizes = placement.playerSize;
  }

  placement.tid = bid.ortb2Imp?.ext?.tid;

  const gpid = deepAccess(bid, 'ortb2Imp.ext.gpid') || deepAccess(bid, 'ortb2Imp.ext.data.pbadslot');
  if (gpid) {
    placement.gpid = gpid;
  }

  placement.eids = placement.eids || [];
  if (bid.userId) {
    getUserId(placement.eids, bid.userId.idl_env, 'identityLink');
    getUserId(placement.eids, bid.userId.id5id, 'id5-sync.com');
    getUserId(placement.eids, bid.userId.uid2 && bid.userId.uid2.id, 'uidapi.com');
    getUserId(placement.eids, bid.userId.tdid, 'adserver.org', { rtiPartner: 'TDID' });
  }

  placement.floor = {};
  if (typeof bid.getFloor === 'function' && placement.sizes) {
    for (let size of placement.sizes) {
      const tmpFloor = bid.getFloor({ currency: 'USD', mediaType: placement.traffic, size });
      if (tmpFloor) {
        placement.floor[`${size[0]}x${size[1]}`] = tmpFloor.floor;
      }
    }
  }

  delete placement.bidfloor;
  delete placement.plcmt;
  delete placement.ext;
};

const placementProcessingFunction = buildPlacementProcessingFunction({
  addPlacementType,
  addCustomFieldsToPlacement
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    const validPlacamentId = bid.params && !isNaN(bid.params.placement_id);
    const validGroupId = bid.params && !isNaN(bid.params.group_id);

    return Boolean(bid.bidId && (validPlacamentId || validGroupId));
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests = [], bidderRequest = {}) => {
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const request = buildRequestsBase({
      adUrl: G_URL,
      validBidRequests,
      bidderRequest,
      placementProcessingFunction
    });

    const base = request.data;
    const firstPartyData = bidderRequest.ortb2 || {};

    request.data = {
      deviceWidth: base.deviceWidth,
      deviceHeight: base.deviceHeight,
      language: base.language,
      secure: base.secure,
      host: base.host,
      page: base.page,
      placements: base.placements,
      ccpa: base.ccpa,
      userObj: firstPartyData.user,
      siteObj: firstPartyData.site,
      appObj: firstPartyData.app
    };

    if (bidderRequest.gdprConsent) {
      request.data.gdpr_consent = bidderRequest.gdprConsent.consentString || 'ALL';
      request.data.gdpr_require = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }

    if (base.gpp) {
      request.data.gpp = base.gpp;
      request.data.gpp_sid = base.gpp_sid;
    }

    return request;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse,
  getUserSyncs: getUserSyncs(G_URL_SYNC),

  onBidWon: (bid) => {
    if (bid.nurl) {
      ajax(bid.nurl, null);
    }
  }
};

registerBidder(spec);
