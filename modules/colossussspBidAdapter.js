import { getWindowTop, deepAccess, logMessage } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ajax } from '../src/ajax.js';

const BIDDER_CODE = 'colossusssp';
const G_URL = 'https://colossusssp.com/?c=o&m=multi';
const G_URL_SYNC = 'https://colossusssp.com/?c=o&m=cookie';

function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId || !bid.ttl || !bid.currency) {
    return false;
  }

  switch (bid.mediaType) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.vastUrl);
    case NATIVE:
      return Boolean(bid.native);
    default:
      return false;
  }
}

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
  buildRequests: (validBidRequests, bidderRequest) => {
    const winTop = getWindowTop();
    const location = winTop.location;
    let placements = [];
    let request = {
      deviceWidth: winTop.screen.width,
      deviceHeight: winTop.screen.height,
      language: (navigator && navigator.language) ? navigator.language : '',
      secure: location.protocol === 'https:' ? 1 : 0,
      host: location.host,
      page: location.pathname,
      placements: placements,
    };

    if (bidderRequest) {
      if (bidderRequest.uspConsent) {
        request.ccpa = bidderRequest.uspConsent;
      }
      if (bidderRequest.gdprConsent) {
        request.gdpr_consent = bidderRequest.gdprConsent.consentString || 'ALL'
        request.gdpr_require = bidderRequest.gdprConsent.gdprApplies ? 1 : 0
      }
    }

    for (let i = 0; i < validBidRequests.length; i++) {
      let bid = validBidRequests[i];
      let traff = bid.params.traffic || BANNER
      let placement = {
        placementId: bid.params.placement_id,
        groupId: bid.params.group_id,
        bidId: bid.bidId,
        sizes: bid.mediaTypes[traff].sizes,
        traffic: traff,
        eids: [],
        floor: {}
      };
      if (typeof bid.getFloor === 'function') {
        let tmpFloor = {};
        for (let size of placement.sizes) {
          tmpFloor = bid.getFloor({
            currency: 'USD',
            mediaType: traff,
            size: size
          });
          if (tmpFloor) {
            placement.floor[`${size[0]}x${size[1]}`] = tmpFloor.floor;
          }
        }
      }
      if (bid.schain) {
        placement.schain = bid.schain;
      }
      let gpid = deepAccess(bid, 'ortb2Imp.ext.data.pbadslot');
      if (gpid) {
        placement.gpid = gpid;
      }
      if (bid.userId) {
        getUserId(placement.eids, bid.userId.britepoolid, 'britepool.com');
        getUserId(placement.eids, bid.userId.idl_env, 'identityLink');
        getUserId(placement.eids, bid.userId.id5id, 'id5-sync.com');
        getUserId(placement.eids, bid.userId.uid2 && bid.userId.uid2.id, 'uidapi.com');
        getUserId(placement.eids, bid.userId.tdid, 'adserver.org', {
          rtiPartner: 'TDID'
        });
      }
      if (traff === VIDEO) {
        placement.playerSize = bid.mediaTypes[VIDEO].playerSize;
        placement.minduration = bid.mediaTypes[VIDEO].minduration;
        placement.maxduration = bid.mediaTypes[VIDEO].maxduration;
        placement.mimes = bid.mediaTypes[VIDEO].mimes;
        placement.protocols = bid.mediaTypes[VIDEO].protocols;
        placement.startdelay = bid.mediaTypes[VIDEO].startdelay;
        placement.placement = bid.mediaTypes[VIDEO].placement;
        placement.skip = bid.mediaTypes[VIDEO].skip;
        placement.skipafter = bid.mediaTypes[VIDEO].skipafter;
        placement.minbitrate = bid.mediaTypes[VIDEO].minbitrate;
        placement.maxbitrate = bid.mediaTypes[VIDEO].maxbitrate;
        placement.delivery = bid.mediaTypes[VIDEO].delivery;
        placement.playbackmethod = bid.mediaTypes[VIDEO].playbackmethod;
        placement.api = bid.mediaTypes[VIDEO].api;
        placement.linearity = bid.mediaTypes[VIDEO].linearity;
      }
      placements.push(placement);
    }
    return {
      method: 'POST',
      url: G_URL,
      data: request
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse) => {
    let response = [];
    try {
      serverResponse = serverResponse.body;
      for (let i = 0; i < serverResponse.length; i++) {
        let resItem = serverResponse[i];
        if (isBidResponseValid(resItem)) {
          const advertiserDomains = resItem.adomain && resItem.adomain.length ? resItem.adomain : [];
          resItem.meta = { ...resItem.meta, advertiserDomains };

          response.push(resItem);
        }
      }
    } catch (e) {
      logMessage(e);
    };
    return response;
  },

  getUserSyncs: () => {
    return [{
      type: 'image',
      url: G_URL_SYNC
    }];
  },

  onBidWon: (bid) => {
    if (bid.nurl) {
      ajax(bid.nurl, null);
    }
  }
};

registerBidder(spec);
