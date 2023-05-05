import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDADAPTERVERSION = 'TTD-PREBID-2022.06.28';
const BIDDER_CODE = 'ttd';
const BIDDER_CODE_LONG = 'thetradedesk';
const BIDDER_ENDPOINT = 'https://direct.adsrvr.org/bid/bidder/';
const USER_SYNC_ENDPOINT = 'https://match.adsrvr.org';

const MEDIA_TYPE = {
  BANNER: 1,
  VIDEO: 2
};

function getExt(firstPartyData) {
  const ext = {
    ver: BIDADAPTERVERSION,
    pbjs: '$prebid.version$',
    keywords: firstPartyData.site?.keywords ? firstPartyData.site.keywords.split(',').map(k => k.trim()) : []
  }
  return {
    ttdprebid: ext
  };
}

function getRegs(bidderRequest) {
  let regs = {};

  if (bidderRequest.gdprConsent && typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
    utils.deepSetValue(regs, 'ext.gdpr', bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
  }
  if (bidderRequest.uspConsent) {
    utils.deepSetValue(regs, 'ext.us_privacy', bidderRequest.uspConsent);
  }
  if (config.getConfig('coppa') === true) {
    regs.coppa = 1;
  }
  if (bidderRequest.ortb2?.regs) {
    utils.mergeDeep(regs, bidderRequest.ortb2.regs);
  }

  return regs;
}

function getBidFloor(bid) {
  // value from params takes precedance over value set by Floor Module
  if (bid.params.bidfloor) {
    return bid.params.bidfloor;
  }

  if (!utils.isFn(bid.getFloor)) {
    return null;
  }

  let floor = bid.getFloor({
    currency: 'USD',
    mediaType: '*',
    size: '*'
  });
  if (utils.isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

function getSource(validBidRequests) {
  let source = {
    tid: validBidRequests[0].auctionId
  };
  if (validBidRequests[0].schain) {
    utils.deepSetValue(source, 'ext.schain', validBidRequests[0].schain);
  }
  return source;
}

function getDevice() {
  const language = navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage;
  let device = {
    ua: navigator.userAgent,
    dnt: utils.getDNT() ? 1 : 0,
    language: language,
    connectiontype: getConnectionType()
  };

  return device;
};

function getConnectionType() {
  const connection = navigator.connection || navigator.webkitConnection;
  if (!connection) {
    return 0;
  }
  switch (connection.type) {
    case 'ethernet':
      return 1;
    case 'wifi':
      return 2;
    case 'cellular':
      switch (connection.effectiveType) {
        case 'slow-2g':
        case '2g':
          return 4;
        case '3g':
          return 5;
        case '4g':
          return 6;
        default:
          return 3;
      }
    default:
      return 0;
  }
}

function getUser(bidderRequest) {
  let user = {};
  if (bidderRequest.gdprConsent) {
    utils.deepSetValue(user, 'ext.consent', bidderRequest.gdprConsent.consentString);
  }

  if (utils.isStr(utils.deepAccess(bidderRequest, 'bids.0.userId.tdid'))) {
    user.buyeruid = bidderRequest.bids[0].userId.tdid;
  }

  var eids = utils.deepAccess(bidderRequest, 'bids.0.userIdAsEids')
  if (eids && eids.length) {
    utils.deepSetValue(user, 'ext.eids', eids);
  }

  // gather user.data
  const ortb2UserData = utils.deepAccess(bidderRequest, 'ortb2.user.data');
  if (ortb2UserData && ortb2UserData.length) {
    user = utils.mergeDeep(user, {
      data: [...ortb2UserData]
    });
  };
  return user;
}

function getSite(bidderRequest, firstPartyData) {
  var site = utils.mergeDeep({
    page: utils.deepAccess(bidderRequest, 'refererInfo.page'),
    ref: utils.deepAccess(bidderRequest, 'refererInfo.ref'),
    publisher: {
      id: utils.deepAccess(bidderRequest, 'bids.0.params.publisherId'),
    },
  },
  firstPartyData.site
  );

  var publisherDomain = bidderRequest.refererInfo.domain;
  if (publisherDomain) {
    utils.deepSetValue(site, 'publisher.domain', publisherDomain);
  }
  return site;
}

function getImpression(bidRequest) {
  let impression = {
    id: bidRequest.bidId
  };

  const gpid = utils.deepAccess(bidRequest, 'ortb2Imp.ext.gpid');
  const tid = utils.deepAccess(bidRequest, 'ortb2Imp.ext.tid');
  const rwdd = utils.deepAccess(bidRequest, 'ortb2Imp.rwdd');
  if (gpid || tid) {
    impression.ext = {}
    if (gpid) { impression.ext.gpid = gpid }
    if (tid) { impression.ext.tid = tid }
  }
  if (rwdd) {
    impression.rwdd = rwdd;
  }
  const tagid = gpid || bidRequest.params.placementId;
  if (tagid) {
    impression.tagid = tagid;
  }

  const mediaTypesVideo = utils.deepAccess(bidRequest, 'mediaTypes.video');
  const mediaTypesBanner = utils.deepAccess(bidRequest, 'mediaTypes.banner');

  let mediaTypes = {};
  if (mediaTypesBanner) {
    mediaTypes[BANNER] = banner(bidRequest);
  }
  if (FEATURES.VIDEO && mediaTypesVideo) {
    mediaTypes[VIDEO] = video(bidRequest);
  }

  Object.assign(impression, mediaTypes);

  let bidfloor = getBidFloor(bidRequest);
  if (bidfloor) {
    impression.bidfloor = parseFloat(bidfloor);
    impression.bidfloorcur = 'USD';
  }

  return impression;
}

function getSizes(sizes) {
  const sizeStructs = utils.parseSizesInput(sizes)
    .filter(x => x) // sizes that don't conform are returned as null, which we want to ignore
    .map(x => x.split('x'))
    .map(size => {
      return {
        width: parseInt(size[0]),
        height: parseInt(size[1]),
      }
    });

  return sizeStructs;
}

function banner(bid) {
  const sizes = getSizes(bid.mediaTypes.banner.sizes).map(x => {
    return {
      w: x.width,
      h: x.height,
    }
  });
  const pos = parseInt(utils.deepAccess(bid, 'mediaTypes.banner.pos'));
  const expdir = utils.deepAccess(bid, 'params.banner.expdir');
  let optionalParams = {};
  if (pos) {
    optionalParams.pos = pos;
  }
  if (expdir && Array.isArray(expdir)) {
    optionalParams.expdir = expdir;
  }

  const banner = Object.assign(
    {
      w: sizes[0].w,
      h: sizes[0].h,
      format: sizes,
    },
    optionalParams);

  const battr = utils.deepAccess(bid, 'ortb2Imp.battr');
  if (battr) {
    banner.battr = battr;
  }

  return banner;
}

function video(bid) {
  if (FEATURES.VIDEO) {
    let minduration = utils.deepAccess(bid, 'mediaTypes.video.minduration');
    const maxduration = utils.deepAccess(bid, 'mediaTypes.video.maxduration');
    const playerSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
    const api = utils.deepAccess(bid, 'mediaTypes.video.api');
    const mimes = utils.deepAccess(bid, 'mediaTypes.video.mimes');
    const placement = utils.deepAccess(bid, 'mediaTypes.video.placement');
    const plcmt = utils.deepAccess(bid, 'mediaTypes.video.plcmt');
    const protocols = utils.deepAccess(bid, 'mediaTypes.video.protocols');
    const playbackmethod = utils.deepAccess(bid, 'mediaTypes.video.playbackmethod');
    const pos = utils.deepAccess(bid, 'mediaTypes.video.pos');
    const startdelay = utils.deepAccess(bid, 'mediaTypes.video.startdelay');
    const skip = utils.deepAccess(bid, 'mediaTypes.video.skip');
    const skipmin = utils.deepAccess(bid, 'mediaTypes.video.skipmin');
    const skipafter = utils.deepAccess(bid, 'mediaTypes.video.skipafter');
    const minbitrate = utils.deepAccess(bid, 'mediaTypes.video.minbitrate');
    const maxbitrate = utils.deepAccess(bid, 'mediaTypes.video.maxbitrate');

    if (!minduration || !utils.isInteger(minduration)) {
      minduration = 0;
    }
    let video = {
      minduration: minduration,
      maxduration: maxduration,
      api: api,
      mimes: mimes,
      placement: placement,
      protocols: protocols
    };

    if (typeof playerSize !== 'undefined') {
      if (utils.isArray(playerSize[0])) {
        video.w = parseInt(playerSize[0][0]);
        video.h = parseInt(playerSize[0][1]);
      } else if (utils.isNumber(playerSize[0])) {
        video.w = parseInt(playerSize[0]);
        video.h = parseInt(playerSize[1]);
      }
    }

    if (playbackmethod) {
      video.playbackmethod = playbackmethod;
    }
    if (plcmt) {
      video.plcmt = plcmt;
    }
    if (pos) {
      video.pos = pos;
    }
    if (startdelay && utils.isInteger(startdelay)) {
      video.startdelay = startdelay;
    }
    if (skip && (skip === 0 || skip === 1)) {
      video.skip = skip;
    }
    if (skipmin && utils.isInteger(skipmin)) {
      video.skipmin = skipmin;
    }
    if (skipafter && utils.isInteger(skipafter)) {
      video.skipafter = skipafter;
    }
    if (minbitrate && utils.isInteger(minbitrate)) {
      video.minbitrate = minbitrate;
    }
    if (maxbitrate && utils.isInteger(maxbitrate)) {
      video.maxbitrate = maxbitrate;
    }

    const battr = utils.deepAccess(bid, 'ortb2Imp.battr');
    if (battr) {
      video.battr = battr;
    }

    return video;
  }
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: 21,
  aliases: [BIDDER_CODE_LONG],
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    const alphaRegex = /^[\w+]+$/;

    // required parameters
    if (!bid || !bid.params) {
      utils.logWarn(BIDDER_CODE + ': Missing bid parameters');
      return false;
    }
    if (!bid.params.supplySourceId) {
      utils.logWarn(BIDDER_CODE + ': Missing required parameter params.supplySourceId');
      return false;
    }
    if (!alphaRegex.test(bid.params.supplySourceId)) {
      utils.logWarn(BIDDER_CODE + ': supplySourceId must only contain alphabetic characters');
      return false;
    }
    if (!bid.params.publisherId) {
      utils.logWarn(BIDDER_CODE + ': Missing required parameter params.publisherId');
      return false;
    }
    if (bid.params.publisherId.length > 32) {
      utils.logWarn(BIDDER_CODE + ': params.publisherId must be 32 characters or less');
      return false;
    }

    // optional parameters
    if (bid.params.bidfloor && isNaN(parseFloat(bid.params.bidfloor))) {
      return false;
    }

    const gpid = utils.deepAccess(bid, 'ortb2Imp.ext.gpid');
    if (!bid.params.placementId && !gpid) {
      utils.logWarn(BIDDER_CODE + ': one of params.placementId or gpid (via the GPT module https://docs.prebid.org/dev-docs/modules/gpt-pre-auction.html) must be passed');
      return false;
    }

    const mediaTypesBanner = utils.deepAccess(bid, 'mediaTypes.banner');
    const mediaTypesVideo = utils.deepAccess(bid, 'mediaTypes.video');

    if (!mediaTypesBanner && !mediaTypesVideo) {
      utils.logWarn(BIDDER_CODE + ': one of mediaTypes.banner or mediaTypes.video must be passed');
      return false;
    }

    if (FEATURES.VIDEO && mediaTypesVideo) {
      if (!mediaTypesVideo.maxduration || !utils.isInteger(mediaTypesVideo.maxduration)) {
        utils.logWarn(BIDDER_CODE + ': mediaTypes.video.maxduration must be set to the maximum video ad duration in seconds');
        return false;
      }
      if (!mediaTypesVideo.api || mediaTypesVideo.api.length === 0) {
        utils.logWarn(BIDDER_CODE + ': mediaTypes.video.api should be an array of supported api frameworks. See the Open RTB v2.5 spec for valid values');
        return false;
      }
      if (!mediaTypesVideo.mimes || mediaTypesVideo.mimes.length === 0) {
        utils.logWarn(BIDDER_CODE + ': mediaTypes.video.mimes should be an array of supported mime types');
        return false;
      }
      if (!mediaTypesVideo.protocols) {
        utils.logWarn(BIDDER_CODE + ': mediaTypes.video.protocols should be an array of supported protocols. See the Open RTB v2.5 spec for valid values');
        return false;
      }
    }

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} an array of validBidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest} Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const firstPartyData = bidderRequest.ortb2 || {};
    let topLevel = {
      id: bidderRequest.auctionId,
      imp: validBidRequests.map(bidRequest => getImpression(bidRequest)),
      site: getSite(bidderRequest, firstPartyData),
      device: getDevice(),
      user: getUser(bidderRequest),
      at: 1,
      cur: ['USD'],
      regs: getRegs(bidderRequest),
      source: getSource(validBidRequests),
      ext: getExt(firstPartyData)
    }

    if (firstPartyData && firstPartyData.bcat) {
      topLevel.bcat = firstPartyData.bcat;
    }

    if (firstPartyData && firstPartyData.badv) {
      topLevel.badv = firstPartyData.badv;
    }

    let url = BIDDER_ENDPOINT + bidderRequest.bids[0].params.supplySourceId;

    let serverRequest = {
      method: 'POST',
      url: url,
      data: topLevel,
      options: {
        withCredentials: true
      }
    };

    return serverRequest;
  },

  /**
   * Format responses as Prebid bid responses
   *
   * Each bid can have the following elements:
   * - requestId (required)
   * - cpm (required)
   * - width (required)
   * - height (required)
   * - ad (required)
   * - ttl (required)
   * - creativeId (required)
   * - netRevenue (required)
   * - currency (required)
   * - vastUrl
   * - vastImpUrl
   * - vastXml
   * - dealId
   *
   * @param {ttdResponseObj} bidResponse A successful response from ttd.
   * @param {ServerRequest} serverRequest The result of buildRequests() that lead to this response.
   * @return {Bid[]} An array of formatted bids.
  */
  interpretResponse: function (response, serverRequest) {
    let seatBidsInResponse = utils.deepAccess(response, 'body.seatbid');
    const currency = utils.deepAccess(response, 'body.cur');
    if (!seatBidsInResponse || seatBidsInResponse.length === 0) {
      return [];
    }
    let bidResponses = [];
    let requestedImpressions = utils.deepAccess(serverRequest, 'data.imp');

    seatBidsInResponse.forEach(seatBid => {
      seatBid.bid.forEach(bid => {
        let matchingRequestedImpression = requestedImpressions.find(imp => imp.id === bid.impid);

        const cpm = bid.price || 0;
        let bidResponse = {
          requestId: bid.impid,
          cpm: cpm,
          creativeId: bid.crid,
          dealId: bid.dealid || null,
          currency: currency || 'USD',
          netRevenue: true,
          ttl: bid.ttl || 360,
          meta: {},
        };

        if (bid.adomain && bid.adomain.length > 0) {
          bidResponse.meta.advertiserDomains = bid.adomain;
        }

        if (bid.ext.mediatype === MEDIA_TYPE.BANNER) {
          Object.assign(
            bidResponse,
            {
              width: bid.w,
              height: bid.h,
              ad: utils.replaceAuctionPrice(bid.adm, cpm),
              mediaType: BANNER
            }
          );
        } else if (FEATURES.VIDEO && bid.ext.mediatype === MEDIA_TYPE.VIDEO) {
          Object.assign(
            bidResponse,
            {
              width: matchingRequestedImpression.video.w,
              height: matchingRequestedImpression.video.h,
              mediaType: VIDEO
            }
          );
          if (bid.nurl) {
            bidResponse.vastUrl = utils.replaceAuctionPrice(bid.nurl, cpm);
          } else {
            bidResponse.vastXml = utils.replaceAuctionPrice(bid.adm, cpm);
          }
        }

        bidResponses.push(bidResponse);
      });
    });

    return bidResponses;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @param {gdprConsent} gdprConsent GDPR consent object
   * @param {uspConsent} uspConsent USP consent object
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent = {}, uspConsent = '') {
    const syncs = [];

    let gdprParams = `&gdpr=${gdprConsent.gdprApplies ? 1 : 0}&gdpr_consent=${encodeURIComponent(gdprConsent.consentString)}`;

    let url = `${USER_SYNC_ENDPOINT}/track/usersync?us_privacy=${encodeURIComponent(uspConsent)}${gdprParams}`;

    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: url + '&ust=image'
      });
    } else if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: url + '&ust=iframe'
      });
    }
    return syncs;
  },
};

registerBidder(spec)
