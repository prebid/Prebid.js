import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
const BIDDER_CODE = 'oneVideo';
export const spec = {
  code: 'oneVideo',
  ENDPOINT: '//ads.adaptv.advertising.com/rtb/openrtb?ext_id=',
  SYNC_ENDPOINT1: 'https://cm.g.doubleclick.net/pixel?google_nid=adaptv_dbm&google_cm&google_sc',
  SYNC_ENDPOINT2: 'https://pr-bh.ybp.yahoo.com/sync/adaptv_ortb/{combo_uid}',
  SYNC_ENDPOINT3: 'https://sync-tm.everesttech.net/upi/pid/m7y5t93k?redir=https%3A%2F%2Fsync.adap.tv%2Fsync%3Ftype%3Dgif%26key%3Dtubemogul%26uid%3D%24%7BUSER_ID%7D',
  SYNC_ENDPOINT4: 'https://match.adsrvr.org/track/cmf/generic?ttd_pid=adaptv&ttd_tpi=1',
  supportedMediaTypes: ['video'],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    if (bid.bidder !== BIDDER_CODE || typeof bid.params === 'undefined') {
      return false;
    }

    // Video validations
    if (typeof bid.params.video === 'undefined' || typeof bid.params.video.playerWidth === 'undefined' || typeof bid.params.video.playerHeight == 'undefined' || typeof bid.params.video.mimes == 'undefined') {
      return false;
    }

    // Pub Id validation
    if (typeof bid.params.pubId === 'undefined') {
      return false;
    }

    return true;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @param bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bids, bidRequest) {
    let consentData = bidRequest ? bidRequest.gdprConsent : null;

    return bids.map(bid => {
      return {
        method: 'POST',
        url: location.protocol + spec.ENDPOINT + bid.params.pubId,
        data: getRequestData(bid, consentData),
        bidRequest: bid
      }
    })
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(response, { bidRequest }) {
    let bid;
    let size;
    let bidResponse;
    try {
      response = response.body;
      bid = response.seatbid[0].bid[0];
    } catch (e) {
      response = null;
    }
    if (!response || !bid || (!bid.adm && !bid.nurl) || !bid.price) {
      utils.logWarn(`No valid bids from ${spec.code} bidder`);
      return [];
    }
    size = getSize(bidRequest.sizes);
    bidResponse = {
      requestId: bidRequest.bidId,
      bidderCode: spec.code,
      cpm: bid.price,
      adId: bid.adid,
      creativeId: bid.crid,
      width: size.width,
      height: size.height,
      mediaType: 'video',
      currency: response.cur,
      ttl: 100,
      netRevenue: true,
      adUnitCode: bidRequest.adUnitCode
    };
    if (bid.nurl) {
      bidResponse.vastUrl = bid.nurl;
    } else if (bid.adm) {
      bidResponse.vastXml = bid.adm;
    }
    bidResponse.renderer = (bidRequest.mediaTypes.video.context === 'outstream') ? newRenderer(bidRequest, bidResponse) : undefined;
    return bidResponse;
  },
  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function(syncOptions) {
    if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: spec.SYNC_ENDPOINT1
      },
      {
        type: 'image',
        url: spec.SYNC_ENDPOINT2
      },
      {
        type: 'image',
        url: spec.SYNC_ENDPOINT3
      },
      {
        type: 'image',
        url: spec.SYNC_ENDPOINT4
      }];
    }
  }
};

function getSize(sizes) {
  let parsedSizes = utils.parseSizesInput(sizes);
  let [ width, height ] = parsedSizes.length ? parsedSizes[0].split('x') : [];
  return {
    width: parseInt(width, 10) || undefined,
    height: parseInt(height, 10) || undefined
  };
}

function isConsentRequired(consentData) {
  return !!(consentData && consentData.gdprApplies);
}

function getRequestData(bid, consentData) {
  let loc = utils.getTopWindowLocation();
  let page = (bid.params.site && bid.params.site.page) ? (bid.params.site.page) : (loc.href);
  let ref = (bid.params.site && bid.params.site.referrer) ? bid.params.site.referrer : utils.getTopWindowReferrer();
  let bidData = {
    id: utils.generateUUID(),
    at: 2,
    cur: bid.cur || 'USD',
    imp: [{
      id: '1',
      secure: isSecure(),
      bidfloor: bid.params.bidfloor,
      ext: {
        hb: 1,
      }
    }],
    site: {
      page: page,
      ref: ref
    },
    device: {
      ua: navigator.userAgent
    },
    tmax: 200
  };

  if (bid.params.video.display == undefined || bid.params.video.display != 1) {
    bidData.imp[0].video = {
      mimes: bid.params.video.mimes,
      w: bid.params.video.playerWidth,
      h: bid.params.video.playerHeight,
      pos: bid.params.video.position,
    };
    if (bid.params.video.maxbitrate) {
      bidData.imp[0].video.maxbitrate = bid.params.video.maxbitrate
    }
    if (bid.params.video.maxduration) {
      bidData.imp[0].video.maxduration = bid.params.video.maxduration
    }
    if (bid.params.video.minduration) {
      bidData.imp[0].video.minduration = bid.params.video.minduration
    }
    if (bid.params.video.api) {
      bidData.imp[0].video.api = bid.params.video.api
    }
    if (bid.params.video.delivery) {
      bidData.imp[0].video.delivery = bid.params.video.delivery
    }
    if (bid.params.video.position) {
      bidData.imp[0].video.pos = bid.params.video.position
    }
    if (bid.params.video.playbackmethod) {
      bidData.imp[0].video.playbackmethod = bid.params.video.playbackmethod
    }
    if (bid.params.video.placement) {
      bidData.imp[0].ext.placement = bid.params.video.placement
    }
    if (bid.params.video.rewarded) {
      bidData.imp[0].ext.rewarded = bid.params.video.rewarded
    }
    if (bid.params.site && bid.params.site.id) {
      bidData.site.id = bid.params.site.id
    }
    if (bid.params.video.sid) {
      bidData.source = {
        ext: {
          schain: {
            complete: 1,
            nodes: [{
              sid: bid.params.video.sid,
              rid: bidData.id,
            }]
          }
        }
      }
    }
  } else if (bid.params.video.display == 1) {
    bidData.imp[0].banner = {
      mimes: bid.params.video.mimes,
      w: bid.params.video.playerWidth,
      h: bid.params.video.playerHeight,
      pos: bid.params.video.position,
    };
  }
  if (isConsentRequired(consentData)) {
    bidData.regs = {
      ext: {
        gdpr: 1
      }
    };

    if (consentData.consentString) {
      bidData.user = {
        ext: {
          consent: consentData.consentString
        }
      };
    }
  }

  return bidData;
}

function isSecure() {
  return document.location.protocol === 'https:';
}
/**
 * Create oneVideo renderer
 * @returns {*}
 */
function newRenderer(bidRequest, bid) {
  if (!bidRequest.renderer) {
    bidRequest.renderer = {};
    bidRequest.renderer.url = 'https://cdn.vidible.tv/prod/hb-outstream-renderer/renderer.js';
    bidRequest.renderer.render = function(bid) {
      setTimeout(function () {
        o2PlayerRender(bid);
      }, 700)
    };
  }
}

registerBidder(spec);
