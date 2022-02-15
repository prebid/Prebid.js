import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { createEidsArray } from './userId/eids.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDADAPTERVERSION = 'TTD-PREBID-2022.02.15';
const BIDDER_CODE = 'ttd';
const BIDDER_CODE_LONG = 'thetradedesk';
const BIDDER_ENDPOINT = 'https://direct.adsrvr.org/bid/bidder/';
const USER_SYNC_ENDPOINT = 'https://match.adsrvr.org';

function getExt(bidderRequest) {
  const ext = {
    ver: BIDADAPTERVERSION,
    pbjs: '$prebid.version$',
    keywords: utils.deepAccess(bidderRequest, 'bids.0.params.keywords')
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
  return regs;
}

function getBidFloor(bid) {
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
  let source = {};
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

  var eids = createEidsArray(utils.deepAccess(bidderRequest, 'bids.0.userId'))
  if (eids.length) {
    utils.deepSetValue(user, 'ext.eids', eids);
  }

  return user;
}

function getSite(bidderRequest) {
  var site = {
    id: utils.deepAccess(bidderRequest, 'bids.0.params.siteId'),
    page: utils.deepAccess(bidderRequest, 'refererInfo.referer'),
    publisher: {
      id: utils.deepAccess(bidderRequest, 'bids.0.params.publisherId'),
    },
    pagecat: utils.deepAccess(bidderRequest, 'bids.0.params.categories')
  };

  var publisherDomain = config.getConfig('publisherDomain');
  if (publisherDomain) {
    utils.deepSetValue(site, 'publisher.domain', publisherDomain);
  }
  return site;
}

function getImpression(bid) {
  let impression = {
    id: bid.bidId,
    tagid: bid.params.placementId
  };

  if (bid.params.secure) {
    impression.secure = bid.params.secure;
  }

  let gpid = utils.deepAccess(bid, 'ortb2Imp.ext.data.pbadslot');
  if (gpid) {
    impression.ext = {
      gpid: gpid
    }
  }

  const mediaTypesVideo = utils.deepAccess(bid, 'mediaTypes.video');
  const bannerParams = utils.deepAccess(bid, 'mediaTypes.banner');

  let mediaTypes = {};
  // default to banner if mediaTypes isn't defined
  if (bannerParams || !(mediaTypesVideo || bannerParams)) {
    mediaTypes[BANNER] = banner(bid);
  } else if (mediaTypesVideo) {
    mediaTypes[VIDEO] = video(bid);
  }

  Object.assign(impression, mediaTypes);

  let bidfloor = getBidFloor(bid);
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
  if (!(bid.mediaType === BANNER || utils.deepAccess(bid, 'mediaTypes.banner'))) {
    return null;
  }
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
  if (expdir) {
    optionalParams.expdir = expdir;
  }

  const banner = Object.assign(
    {
      w: sizes[0].w,
      h: sizes[0].h,
      format: sizes,
    },
    optionalParams);
  return banner;
}

function video(bid) {
  const minduration = utils.deepAccess(bid, 'mediaTypes.video.minduration');
  const maxduration = utils.deepAccess(bid, 'mediaTypes.video.maxduration');
  const playerSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
  const api = utils.deepAccess(bid, 'mediaTypes.video.api');
  const mimes = utils.deepAccess(bid, 'mediaTypes.video.mimes');
  const placement = utils.deepAccess(bid, 'mediaTypes.video.placement');
  const protocols = utils.deepAccess(bid, 'mediaTypes.video.protocols');
  const playbackmethod = utils.deepAccess(bid, 'mediaTypes.video.playbackmethod');
  const pos = utils.deepAccess(bid, 'mediaTypes.video.pos');
  const startdelay = utils.deepAccess(bid, 'mediaTypes.video.startdelay');
  const skip = utils.deepAccess(bid, 'mediaTypes.video.skip');
  const skipmin = utils.deepAccess(bid, 'mediaTypes.video.skipmin');
  const skipafter = utils.deepAccess(bid, 'mediaTypes.video.skipafter');
  const minbitrate = utils.deepAccess(bid, 'mediaTypes.video.minbitrate');
  const maxbitrate = utils.deepAccess(bid, 'mediaTypes.video.maxbitrate');

  let video = {
    minduration: minduration,
    maxduration: maxduration,
    api: api,
    mimes: mimes,
    placement: placement
  };

  if (utils.isArray(playerSize[0])) {
    video.w = parseInt(playerSize[0][0]);
    video.h = parseInt(playerSize[0][1]);
  } else if (utils.isNumber(playerSize[0])) {
    video.w = parseInt(playerSize[0]);
    video.h = parseInt(playerSize[1]);
  }

  if (protocols) {
    video.protocols = protocols;
  }
  if (playbackmethod) {
    video.playbackmethod = playbackmethod;
  }
  if (pos) {
    video.pos = pos;
  }
  if (startdelay) {
    video.startdelay = startdelay;
  }
  if (skip) {
    video.skip = skip;
  }
  if (skipmin) {
    video.skipmin = skipmin;
  }
  if (skipafter) {
    video.skipafter = skipafter;
  }
  if (minbitrate) {
    video.minbitrate = minbitrate;
  }
  if (maxbitrate) {
    video.maxbitrate = maxbitrate;
  }

  return video;
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
      utils.logError(BIDDER_CODE + ': supplySourceId must only contain alphabetic characters');
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
    if (!bid.params.siteId) {
      utils.logWarn(BIDDER_CODE + ': Missing required parameter params.siteId');
      return false;
    }
    if (bid.params.siteId.length > 50) {
      utils.logWarn(BIDDER_CODE + ': params.siteId must be 50 characters or less');
      return false;
    }
    if (!bid.params.placementId) {
      utils.logWarn(BIDDER_CODE + ': Missing required parameter params.placementId');
      return false;
    }
    if (bid.params.placementId.length > 128) {
      utils.logWarn(BIDDER_CODE + ': params.placementId must be 128 characters or less');
      return false;
    }
    if (bid.params.secure && !(bid.params.secure === 0 || bid.params.secure === 1)) {
      utils.logWarn(BIDDER_CODE + ': params.secure should be either 0 or 1');
      return false;
    }
    const mediaTypesVideo = utils.deepAccess(bid, 'mediaTypes.video');
    const mediaTypesBanner = utils.deepAccess(bid, 'mediaTypes.banner');

    if (mediaTypesBanner || !(mediaTypesVideo || mediaTypesBanner)) {
      const bannerExpDir = utils.deepAccess(bid, 'params.banner.expdir');
      if (bannerExpDir) {
        if (!Array.isArray(bannerExpDir)) {
          utils.logWarn(BIDDER_CODE + ': params.banner.expdir should be an array');
          return false;
        }
      }
    } else {
      if (!mediaTypesVideo.minduration || !utils.isInteger(mediaTypesVideo.minduration)) {
        utils.logWarn(BIDDER_CODE + ': mediaTypes.video.minduration must be set to the minimum video ad duration in seconds');
        return false;
      }
      if (!mediaTypesVideo.maxduration || !utils.isInteger(mediaTypesVideo.maxduration)) {
        utils.logWarn(BIDDER_CODE + ': mediaTypes.video.maxduration must be set to the maximum video ad duration in seconds');
        return false;
      }
      if (!mediaTypesVideo.playerSize) {
        utils.logWarn(BIDDER_CODE + ': mediaTypes.video.playerSize should be an array of width, height values')
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
        utils.logWarn(BIDDER_CODE + ': mediaTypes.video.protocols should be an array of supported protocols. See the Open RTB v2.5 spec for valid values')
        return false;
      }
      if (mediaTypesVideo.startdelay && !utils.isInteger(mediaTypesVideo.startdelay)) {
        utils.logWarn(BIDDER_CODE + ': mediaTypes.video.startdelay should be an integer');
        return false;
      }
      if (mediaTypesVideo.skip && !(mediaTypesVideo.skip === 0 || mediaTypesVideo.skip === 1)) {
        utils.logWarn(BIDDER_CODE + ': mediaTypes.video.skip should be either 0 or 1');
        return false;
      }
      if (mediaTypesVideo.skipmin && !utils.isInteger(mediaTypesVideo.skipmin)) {
        utils.logWarn(BIDDER_CODE + ': mediaTypes.video.skipmin should be an integer');
        return false;
      }
      if (mediaTypesVideo.skipafter && !utils.isInteger(mediaTypesVideo.skipafter)) {
        utils.logWarn(BIDDER_CODE + ': mediaTypes.video.skipafter should be an integer');
        return false;
      }
      if (mediaTypesVideo.minbitrate && !utils.isInteger(mediaTypesVideo.minbitrate)) {
        utils.logWarn(BIDDER_CODE + ': mediaTypes.video.minbitrate should be an integer');
        return false;
      }
      if (mediaTypesVideo.maxbitrate && !utils.isInteger(mediaTypesVideo.maxbitrate)) {
        utils.logWarn(BIDDER_CODE + ': mediaTypes.video.maxbitrate should be an integer');
        return false;
      }
    }

    const pageCategories = utils.deepAccess(bid, 'params.categories');
    if (pageCategories) {
      if (!Array.isArray(pageCategories)) {
        utils.logWarn(BIDDER_CODE + ': params.categories should be an array of string values');
        return false;
      }
      for (let i = 0; i < pageCategories.length; i++) {
        if (typeof pageCategories[i] !== 'string') {
          utils.logWarn(BIDDER_CODE + ': params.categories should be an array of string values');
          return false;
        }
      }
    }

    const keywords = utils.deepAccess(bid, 'params.keywords');
    if (keywords) {
      if (!Array.isArray(keywords)) {
        utils.logWarn(BIDDER_CODE + ': params.keywords should be an array of string values');
        return false;
      }
      for (let i = 0; i < keywords.length; i++) {
        if (typeof keywords[i] !== 'string') {
          utils.logWarn(BIDDER_CODE + ': params.keywords should be an array of string values');
          return false;
        }
        if (keywords[i].length > 128) {
          utils.logWarn(BIDDER_CODE + ': params.keywords must only contain strings that are 128 characters or less');
          return false;
        }
      }
      if (keywords.length > 10) {
        utils.logWarn(BIDDER_CODE + ': params.keywords must can only contain a max of 10 keywords');
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
    utils.logInfo('validBidRequests:', JSON.stringify(validBidRequests))
    utils.logInfo('bidderRequest:', JSON.stringify(bidderRequest))

    let topLevel = {
      id: bidderRequest.auctionId,
      imp: validBidRequests.map(bid => getImpression(bid)),
      site: getSite(bidderRequest),
      device: getDevice(),
      user: getUser(bidderRequest),
      at: 1,
      cur: ['USD'],
      regs: getRegs(bidderRequest),
      source: getSource(validBidRequests),
      ext: getExt(bidderRequest)
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
    utils.logInfo('buildRequests serverRequest:', JSON.stringify(serverRequest))
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
    utils.logInfo('interpretResponse-bidResponse:', JSON.stringify(response))
    utils.logInfo('interpretResponse-serverRequest:', JSON.stringify(serverRequest))

    let seatBidsInResponse = utils.deepAccess(response, 'body.seatbid');
    const currency = utils.deepAccess(response, 'body.cur');
    if (!seatBidsInResponse || seatBidsInResponse.length === 0) {
      return [];
    }
    let bidResponses = [];
    let requestedImpressions = utils.deepAccess(serverRequest, 'data.imp');
    utils.logInfo('interpretResponse-matchingServerRequest:', JSON.stringify(requestedImpressions))

    seatBidsInResponse.forEach(seatBid => {
      seatBid.bid.forEach(bid => {
        let matchingRequestedImpression = requestedImpressions.find(imp => imp.id === bid.impid);
        utils.logInfo('interpretResponse-matchingRequestedImpression:', JSON.stringify(matchingRequestedImpression))

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

        if (matchingRequestedImpression.video) {
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
        } else {
          Object.assign(
            bidResponse,
            {
              width: bid.w,
              height: bid.h,
              ad: utils.replaceAuctionPrice(bid.adm, cpm),
              mediaType: BANNER
            }
          );
        }

        bidResponses.push(bidResponse);
      });
    });

    utils.logInfo('output:', JSON.stringify(bidResponses));
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
    utils.logInfo('getUserSyncs - syncOptions: {', JSON.stringify(syncOptions), '}, gdprConsent: {', JSON.stringify(gdprConsent), '}, uspConsent: "', uspConsent + '"');

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
