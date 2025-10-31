import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { isNumber } from '../src/utils.js';
import { getDNT } from '../libraries/dnt/index.js';
import { getConnectionType } from '../libraries/connectionInfo/connectionUtils.js'

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const BIDADAPTERVERSION = 'TTD-PREBID-2025.07.15';
const BIDDER_CODE = 'ttd';
const BIDDER_CODE_LONG = 'thetradedesk';
const BIDDER_ENDPOINT = 'https://direct.adsrvr.org/bid/bidder/';
const BIDDER_ENDPOINT_HTTP2 = 'https://d2.adsrvr.org/bid/bidder/';
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
  const regs = {};

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

  const floor = bid.getFloor({
    currency: 'USD',
    mediaType: '*',
    size: '*'
  });
  if (utils.isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

function getSource(validBidRequests, bidderRequest) {
  const source = {
    tid: bidderRequest?.ortb2?.source?.tid,
  };
  const schain = validBidRequests[0]?.ortb2?.source?.ext?.schain;
  if (schain) {
    utils.deepSetValue(source, 'ext.schain', schain);
  }
  return source;
}

function getDevice(firstPartyData) {
  const language = navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage;
  const device = {
    ua: navigator.userAgent,
    dnt: getDNT() ? 1 : 0,
    language: language,
    connectiontype: getConnectionType()
  };

  utils.mergeDeep(device, firstPartyData.device)

  return device;
};

function getUser(bidderRequest, firstPartyData) {
  const user = {};
  if (bidderRequest.gdprConsent) {
    utils.deepSetValue(user, 'ext.consent', bidderRequest.gdprConsent.consentString);
  }

  var eids = utils.deepAccess(bidderRequest, 'bids.0.userIdAsEids')
  if (eids && eids.length) {
    utils.deepSetValue(user, 'ext.eids', eids);
  }

  utils.mergeDeep(user, firstPartyData.user)

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
  const impression = {
    id: bidRequest.bidId
  };

  const gpid = utils.deepAccess(bidRequest, 'ortb2Imp.ext.gpid');
  const tagid = gpid || bidRequest.params.placementId;
  if (tagid) {
    impression.tagid = tagid;
  }

  const mediaTypesVideo = utils.deepAccess(bidRequest, 'mediaTypes.video');
  const mediaTypesBanner = utils.deepAccess(bidRequest, 'mediaTypes.banner');

  const mediaTypes = {};
  if (mediaTypesBanner) {
    mediaTypes[BANNER] = banner(bidRequest);
  }
  if (FEATURES.VIDEO && mediaTypesVideo) {
    mediaTypes[VIDEO] = video(bidRequest);
  }

  Object.assign(impression, mediaTypes);

  const bidfloor = getBidFloor(bidRequest);
  if (bidfloor) {
    impression.bidfloor = parseFloat(bidfloor);
    impression.bidfloorcur = 'USD';
  }

  const secure = utils.deepAccess(bidRequest, 'ortb2Imp.secure');
  impression.secure = isNumber(secure) ? secure : 1

  const {video: _, ...ortb2ImpWithoutVideo} = bidRequest.ortb2Imp; // if enabled, video is already assigned above
  utils.mergeDeep(impression, ortb2ImpWithoutVideo)

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
  const optionalParams = {};
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

  const battr = utils.deepAccess(bid, 'ortb2Imp.banner.battr');
  if (battr) {
    banner.battr = battr;
  }

  return banner;
}

function video(bid) {
  if (FEATURES.VIDEO) {
    const v = bid?.mediaTypes?.video;
    if (!v) return;

    const {
      minduration = 0,
      maxduration,
      playerSize,
      api,
      mimes,
      placement,
      plcmt,
      protocols,
      playbackmethod,
      pos,
      startdelay,
      skip,
      skipmin,
      skipafter,
      minbitrate,
      maxbitrate
    } = v;

    const video = {
      minduration,
      ...(maxduration !== undefined && { maxduration }),
      ...(api && { api }),
      ...(mimes && { mimes }),
      ...(placement !== undefined && { placement }),
      ...(plcmt !== undefined && { plcmt }),
      ...(protocols && { protocols }),
      ...(playbackmethod !== undefined && { playbackmethod }),
      ...(pos !== undefined && { pos }),
      ...(startdelay !== undefined && { startdelay }),
      ...(skip !== undefined && { skip }),
      ...(skipmin !== undefined && { skipmin }),
      ...(skipafter !== undefined && { skipafter }),
      ...(minbitrate !== undefined && { minbitrate }),
      ...(maxbitrate !== undefined && { maxbitrate })
    };

    if (playerSize) {
      const [w, h] = Array.isArray(playerSize[0]) ? playerSize[0] : playerSize;
      video.w = Number(w);
      video.h = Number(h);
    }

    const battr = bid?.ortb2Imp?.video?.battr;
    if (battr) video.battr = battr;

    return video;
  }
}

function selectEndpoint(params) {
  if (params.customBidderEndpoint) {
    return params.customBidderEndpoint
  }

  if (params.useHttp2) {
    return BIDDER_ENDPOINT_HTTP2;
  }
  return BIDDER_ENDPOINT;
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
    if (bid.params.publisherId.length > 64) {
      utils.logWarn(BIDDER_CODE + ': params.publisherId must be 64 characters or less');
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

    if (bid.params.customBidderEndpoint &&
        (!bid.params.customBidderEndpoint.startsWith('https://') || !bid.params.customBidderEndpoint.endsWith('/bid/bidder/'))) {
      utils.logWarn(BIDDER_CODE + ': if params.customBidderEndpoint is provided, it must start with https:// and end with /bid/bidder/');
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
   * @param {BidRequest[]} validBidRequests - An array of valid bid requests
   * @param {*} bidderRequest - The current bidder request object
   * @returns {ServerRequest} - Info describing the request to the server
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const firstPartyData = bidderRequest.ortb2 || {};
    const firstPartyImpData = bidderRequest.ortb2Imp || {};
    const topLevel = {
      id: bidderRequest.bidderRequestId,
      imp: validBidRequests.map(bidRequest => getImpression(bidRequest)),
      site: getSite(bidderRequest, firstPartyData),
      device: getDevice(firstPartyData),
      user: getUser(bidderRequest, firstPartyData),
      at: 1,
      tmax: Math.max(bidderRequest.timeout || 400, 400),
      cur: ['USD'],
      regs: getRegs(bidderRequest),
      source: getSource(validBidRequests, bidderRequest),
      ext: getExt(firstPartyData)
    }

    if (firstPartyData && firstPartyData.bcat) {
      topLevel.bcat = firstPartyData.bcat;
    }

    if (firstPartyData && firstPartyData.badv) {
      topLevel.badv = firstPartyData.badv;
    }

    if (firstPartyData && firstPartyData.app) {
      topLevel.app = firstPartyData.app;
    }

    if ((firstPartyData && firstPartyData.pmp) || (firstPartyImpData && firstPartyImpData.pmp)) {
      topLevel.imp.forEach(imp => {
        imp.pmp = utils.mergeDeep(
          {},
          imp.pmp || {},
          firstPartyData?.pmp || {},
          firstPartyImpData?.pmp || {}
        );
      });
    }

    const url = selectEndpoint(bidderRequest.bids[0].params) + bidderRequest.bids[0].params.supplySourceId;

    const serverRequest = {
      method: 'POST',
      url: url,
      data: topLevel,
      options: {
        withCredentials: true,
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
   * @param {Object} response A successful response from ttd.
   * @param {ServerRequest} serverRequest The result of buildRequests() that lead to this response.
   * @return {Bid[]} An array of formatted bids.
   */
  interpretResponse: function (response, serverRequest) {
    const seatBidsInResponse = utils.deepAccess(response, 'body.seatbid');
    const currency = utils.deepAccess(response, 'body.cur');
    if (!seatBidsInResponse || seatBidsInResponse.length === 0) {
      return [];
    }
    const bidResponses = [];
    const requestedImpressions = utils.deepAccess(serverRequest, 'data.imp');

    seatBidsInResponse.forEach(seatBid => {
      seatBid.bid.forEach(bid => {
        const matchingRequestedImpression = requestedImpressions.find(imp => imp.id === bid.impid);

        const cpm = bid.price || 0;
        const bidResponse = {
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

    const gdprParams = `&gdpr=${gdprConsent.gdprApplies ? 1 : 0}&gdpr_consent=${encodeURIComponent(gdprConsent.consentString)}`;

    const url = `${USER_SYNC_ENDPOINT}/track/usersync?us_privacy=${encodeURIComponent(uspConsent)}${gdprParams}`;

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
