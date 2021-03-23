import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'oneVideo';
export const spec = {
  code: 'oneVideo',
  VERSION: '3.0.6',
  ENDPOINT: 'https://ads.adaptv.advertising.com/rtb/openrtb?ext_id=',
  E2ETESTENDPOINT: 'https://ads-wc.v.ssp.yahoo.com/rtb/openrtb?ext_id=',
  SYNC_ENDPOINT1: 'https://pixel.advertising.com/ups/57304/sync?gdpr=&gdpr_consent=&_origin=0&redir=true',
  SYNC_ENDPOINT2: 'https://match.adsrvr.org/track/cmf/generic?ttd_pid=adaptv&ttd_tpi=1',
  supportedMediaTypes: ['video', 'banner'],
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

    // Prevend DAP Outstream validation, Banner DAP validation & Multi-Format adUnit support
    if (bid.mediaTypes.video) {
      if (bid.mediaTypes.video.context === 'outstream' && bid.params.video.display === 1) {
        return false;
      }
    } else if (bid.mediaTypes.banner && !bid.params.video.display) {
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
      let url = spec.ENDPOINT
      let pubId = bid.params.pubId;
      if (bid.params.video.e2etest) {
        url = spec.E2ETESTENDPOINT;
        pubId = 'HBExchange';
      }
      return {
        method: 'POST',
        /** removing adding local protocal since we
         * can get cookie data only if we call with https. */
        url: url + pubId,
        data: getRequestData(bid, consentData, bidRequest),
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
  interpretResponse: function(response, {bidRequest}) {
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
      creativeId: bid.crid,
      width: size.width,
      height: size.height,
      currency: response.cur,
      ttl: (bidRequest.params.video.ttl > 0 && bidRequest.params.video.ttl <= 3600) ? bidRequest.params.video.ttl : 300,
      netRevenue: true,
      adUnitCode: bidRequest.adUnitCode
    };

    bidResponse.mediaType = (bidRequest.mediaTypes.banner) ? 'banner' : 'video'

    if (bid.nurl) {
      bidResponse.vastUrl = bid.nurl;
    } else if (bid.adm && bidRequest.params.video.display === 1) {
      bidResponse.ad = bid.adm
    } else if (bid.adm) {
      bidResponse.vastXml = bid.adm;
    }
    if (bidRequest.mediaTypes.video) {
      bidResponse.renderer = (bidRequest.mediaTypes.video.context === 'outstream') ? newRenderer(bidRequest, bidResponse) : undefined;
    }

    return bidResponse;
  },
  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function(syncOptions, responses, consentData = {}) {
    let {
      gdprApplies,
      consentString = ''
    } = consentData;

    if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: spec.SYNC_ENDPOINT1
      },
      {
        type: 'image',
        url: `https://sync-tm.everesttech.net/upi/pid/m7y5t93k?gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}&redir=https%3A%2F%2Fpixel.advertising.com%2Fups%2F55986%2Fsync%3Fuid%3D%24%7BUSER_ID%7D%26_origin%3D0` + encodeURI(`&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}`)
      },
      {
        type: 'image',
        url: spec.SYNC_ENDPOINT2
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

function getRequestData(bid, consentData, bidRequest) {
  let loc = bidRequest.refererInfo.referer;
  let page = (bid.params.site && bid.params.site.page) ? (bid.params.site.page) : (loc.href);
  let ref = (bid.params.site && bid.params.site.referrer) ? bid.params.site.referrer : bidRequest.refererInfo.referer;
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
        prebidver: '$prebid.version$',
        adapterver: spec.VERSION,
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
      bidData.imp[0].video.placement = bid.params.video.placement
    }
    if (bid.params.video.rewarded) {
      bidData.imp[0].ext.rewarded = bid.params.video.rewarded
    }
    bidData.imp[0].video.linearity = 1;
    bidData.imp[0].video.protocols = bid.params.video.protocols || [2, 5];
  } else if (bid.params.video.display == 1) {
    bidData.imp[0].banner = {
      mimes: bid.params.video.mimes,
      w: bid.params.video.playerWidth,
      h: bid.params.video.playerHeight,
      pos: bid.params.video.position,
    };
    if (bid.params.video.placement) {
      bidData.imp[0].banner.placement = bid.params.video.placement
    }
    if (bid.params.video.maxduration) {
      bidData.imp[0].banner.ext = bidData.imp[0].banner.ext || {}
      bidData.imp[0].banner.ext.maxduration = bid.params.video.maxduration
    }
    if (bid.params.video.minduration) {
      bidData.imp[0].banner.ext = bidData.imp[0].banner.ext || {}
      bidData.imp[0].banner.ext.minduration = bid.params.video.minduration
    }
  }
  if (bid.params.video.inventoryid) {
    bidData.imp[0].ext.inventoryid = bid.params.video.inventoryid
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
    if (bid.params.video.hp == 1) {
      bidData.source.ext.schain.nodes[0].hp = bid.params.video.hp;
    }
  } else if (bid.schain) {
    bidData.source = {
      ext: {
        schain: bid.schain
      }
    }
    bidData.source.ext.schain.nodes[0].rid = bidData.id;
  }
  if (bid.params.site && bid.params.site.id) {
    bidData.site.id = bid.params.site.id
  }
  if (isConsentRequired(consentData) || (bidRequest && bidRequest.uspConsent)) {
    bidData.regs = {
      ext: {}
    };
    if (isConsentRequired(consentData)) {
      bidData.regs.ext.gdpr = 1
    }

    if (consentData && consentData.consentString) {
      bidData.user = {
        ext: {
          consent: consentData.consentString
        }
      };
    }
    // ccpa support
    if (bidRequest && bidRequest.uspConsent) {
      bidData.regs.ext.us_privacy = bidRequest.uspConsent
    }
  }
  if (bid.params.video.e2etest) {
    bidData.imp[0].bidfloor = null;
    bidData.imp[0].video.w = 300;
    bidData.imp[0].video.h = 250;
    bidData.imp[0].video.mimes = ['video/mp4', 'application/javascript'];
    bidData.imp[0].video.api = [2];
    bidData.site.page = 'https://verizonmedia.com';
    bidData.site.ref = 'https://verizonmedia.com';
    bidData.tmax = 1000;
  }
  if (bid.params.video.custom && utils.isPlainObject(bid.params.video.custom)) {
    bidData.imp[0].ext.custom = {};
    for (const key in bid.params.video.custom) {
      if (utils.isStr(bid.params.video.custom[key]) || utils.isNumber(bid.params.video.custom[key])) {
        bidData.imp[0].ext.custom[key] = bid.params.video.custom[key];
      }
    }
  }
  if (bid.params.video.content && utils.isPlainObject(bid.params.video.content)) {
    bidData.imp[0].content = {};
    const contentStringKeys = ['id', 'title', 'series', 'season', 'genre', 'contentrating', 'language'];
    const contentNumberkeys = ['episode', 'prodq', 'context', 'livestream', 'len'];
    const contentArrayKeys = ['cat'];
    const contentObjectKeys = ['ext'];
    for (const contentKey in bid.params.video.content) {
      if (
        (contentStringKeys.indexOf(contentKey) > -1 && utils.isStr(bid.params.video.content[contentKey])) ||
        (contentNumberkeys.indexOf(contentKey) > -1 && utils.isNumber(bid.params.video.content[contentKey])) ||
        (contentObjectKeys.indexOf(contentKey) > -1 && utils.isPlainObject(bid.params.video.content[contentKey])) ||
        (contentArrayKeys.indexOf(contentKey) > -1 && utils.isArray(bid.params.video.content[contentKey]) &&
        bid.params.video.content[contentKey].every(catStr => utils.isStr(catStr)))) {
        bidData.imp[0].content[contentKey] = bid.params.video.content[contentKey];
      } else {
        utils.logMessage('oneVideo bid adapter validation error: ', contentKey, ' is either not supported is OpenRTB V2.5 or value is undefined');
      }
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
      setTimeout(function() {
        // eslint-disable-next-line no-undef
        o2PlayerRender(bid);
      }, 700)
    };
  }
}

registerBidder(spec);
