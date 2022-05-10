import {
  isStr,
  deepAccess,
  isArray,
  isNumber,
  logError,
  logWarn,
  parseGPTSingleSizeArrayToRtbSize,
  mergeDeep
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'gridNM';
const ENDPOINT_URL = 'https://grid.bidswitch.net/hbjson';
const SYNC_URL = 'https://x.bidswitch.net/sync?ssp=themediagrid';
const TIME_TO_LIVE = 360;
const RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

let hasSynced = false;

const LOG_ERROR_MESS = {
  noAdm: 'Bid from response has no adm parameter - ',
  noPrice: 'Bid from response has no price parameter - ',
  wrongContentType: 'Bid from response has wrong content_type parameter - ',
  noBid: 'Array of bid objects is empty',
  noPlacementCode: 'Can\'t find in requested bids the bid with auid - ',
  emptyUids: 'Uids should be not empty',
  emptySeatbid: 'Seatbid array from response has empty item',
  emptyResponse: 'Response is empty',
  hasEmptySeatbidArray: 'Response has empty seatbid array',
  hasNoArrayOfBids: 'Seatbid from response has no array of bid objects - '
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [ VIDEO ],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    let invalid =
      !bid.params.source || !isStr(bid.params.source) ||
      !bid.params.secid || !isStr(bid.params.secid) ||
      !bid.params.pubid || !isStr(bid.params.pubid);

    const video = deepAccess(bid, 'mediaTypes.video') || {};
    const { protocols = video.protocols, mimes = video.mimes } = deepAccess(bid, 'params.video') || {};
    if (!invalid) {
      invalid = !protocols || !mimes;
    }
    if (!invalid) {
      invalid = !isArray(mimes) || !mimes.length || mimes.filter((it) => !(it && isStr(it))).length;
      if (!invalid) {
        invalid = !isArray(protocols) || !protocols.length || protocols.filter((it) => !(isNumber(it) && it > 0 && !(it % 1))).length;
      }
    }
    return !invalid;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @param {bidderRequest} bidderRequest bidder request object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const bids = validBidRequests || [];
    const requests = [];
    let { bidderRequestId, auctionId, gdprConsent, uspConsent, timeout, refererInfo } = bidderRequest || {};

    const referer = refererInfo ? encodeURIComponent(refererInfo.page) : '';

    bids.forEach(bid => {
      let user;
      let userExt;

      const schain = bid.schain;
      const userIdAsEids = bid.userIdAsEids;

      if (!bidderRequestId) {
        bidderRequestId = bid.bidderRequestId;
      }
      if (!auctionId) {
        auctionId = bid.auctionId;
      }
      const {
        params: { floorcpm, pubdata, source, secid, pubid, content, video },
        mediaTypes, bidId, adUnitCode, rtd, ortb2Imp, sizes
      } = bid;

      const bidFloor = _getFloor(mediaTypes || {}, bid, isNumber(floorcpm) && floorcpm);
      const jwTargeting = rtd && rtd.jwplayer && rtd.jwplayer.targeting;
      const jwpseg = (pubdata && pubdata.jwpseg) || (jwTargeting && jwTargeting.segments);

      const siteContent = content || (jwTargeting && jwTargeting.content);

      const impObj = {
        id: bidId.toString(),
        tagid: secid.toString(),
        video: createVideoForImp(mergeDeep({}, video, mediaTypes && mediaTypes.video), sizes),
        ext: {
          divid: adUnitCode.toString()
        }
      };

      if (ortb2Imp && ortb2Imp.ext && ortb2Imp.ext.data) {
        impObj.ext.data = ortb2Imp.ext.data;
        if (impObj.ext.data.adserver && impObj.ext.data.adserver.adslot) {
          impObj.ext.gpid = impObj.ext.data.adserver.adslot.toString();
        } else {
          impObj.ext.gpid = ortb2Imp.ext.data.pbadslot && ortb2Imp.ext.data.pbadslot.toString();
        }
      }

      if (bidFloor) {
        impObj.bidfloor = bidFloor;
      }

      const imp = [impObj];

      const reqSource = {
        tid: auctionId && auctionId.toString(),
        ext: {
          wrapper: 'Prebid_js',
          wrapper_version: '$prebid.version$'
        }
      };

      if (schain) {
        reqSource.ext.schain = schain;
      }

      const bidderTimeout = config.getConfig('bidderTimeout') || timeout;
      const tmax = timeout ? Math.min(bidderTimeout, timeout) : bidderTimeout;

      const request = {
        id: bidderRequestId && bidderRequestId.toString(),
        site: {
          page: referer,
          publisher: {
            id: pubid,
          },
        },
        source: reqSource,
        tmax,
        imp,
      };

      if (siteContent) {
        request.site.content = siteContent;
      }

      if (jwpseg && jwpseg.length) {
        user = {
          data: [{
            name: 'iow_labs_pub_data',
            segment: segmentProcessing(jwpseg, 'jwpseg'),
          }]
        };
      }

      if (gdprConsent && gdprConsent.consentString) {
        userExt = { consent: gdprConsent.consentString };
      }

      if (userIdAsEids && userIdAsEids.length) {
        userExt = userExt || {};
        userExt.eids = [...userIdAsEids];
      }

      if (userExt && Object.keys(userExt).length) {
        user = user || {};
        user.ext = userExt;
      }

      const ortb2UserData = deepAccess(bidderRequest, 'ortb2.user.data');
      if (ortb2UserData && ortb2UserData.length) {
        if (!user) {
          user = { data: [] };
        }
        user = mergeDeep(user, {
          data: [...ortb2UserData]
        });
      }

      if (user) {
        request.user = user;
      }
      const site = deepAccess(bidderRequest, 'ortb2.site');
      if (site) {
        const data = deepAccess(site, 'content.data');
        if (data && data.length) {
          const siteContent = request.site.content || {};
          request.site.content = mergeDeep(siteContent, { data });
        }
      }

      if (gdprConsent && gdprConsent.gdprApplies) {
        request.regs = {
          ext: {
            gdpr: gdprConsent.gdprApplies ? 1 : 0
          }
        };
      }

      if (uspConsent) {
        if (!request.regs) {
          request.regs = { ext: {} };
        }
        request.regs.ext.us_privacy = uspConsent;
      }

      if (config.getConfig('coppa') === true) {
        if (!request.regs) {
          request.regs = {};
        }
        request.regs.coppa = 1;
      }

      requests.push({
        method: 'POST',
        url: ENDPOINT_URL + '?no_mapping=1&sp=' + source,
        bid: bid,
        data: request
      });
    });

    return requests;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {*} bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    serverResponse = serverResponse && serverResponse.body;
    const bidResponses = [];

    let errorMessage;

    if (!serverResponse) errorMessage = LOG_ERROR_MESS.emptyResponse;
    else if (serverResponse.seatbid && !serverResponse.seatbid.length) {
      errorMessage = LOG_ERROR_MESS.hasEmptySeatbidArray;
    }

    if (!errorMessage && serverResponse.seatbid) {
      const serverBid = _getBidFromResponse(serverResponse.seatbid[0]);
      if (serverBid) {
        if (!serverBid.adm && !serverBid.nurl) errorMessage = LOG_ERROR_MESS.noAdm + JSON.stringify(serverBid);
        else if (!serverBid.price) errorMessage = LOG_ERROR_MESS.noPrice + JSON.stringify(serverBid);
        else if (serverBid.content_type !== 'video') errorMessage = LOG_ERROR_MESS.wrongContentType + serverBid.content_type;
        if (!errorMessage) {
          const bid = bidRequest.bid;
          const bidResponse = {
            requestId: bid.bidId,
            cpm: serverBid.price,
            width: serverBid.w,
            height: serverBid.h,
            creativeId: serverBid.auid || bid.bidderRequestId,
            currency: 'USD',
            netRevenue: true,
            ttl: TIME_TO_LIVE,
            dealId: serverBid.dealid,
            mediaType: VIDEO,
            meta: {
              advertiserDomains: serverBid.adomain ? serverBid.adomain : []
            }
          };

          if (serverBid.adm) {
            bidResponse.vastXml = serverBid.adm;
            bidResponse.adResponse = {
              content: bidResponse.vastXml
            };
          } else if (serverBid.nurl) {
            bidResponse.vastUrl = serverBid.nurl;
          }

          if (!bid.renderer && (!bid.mediaTypes || !bid.mediaTypes.video || bid.mediaTypes.video.context === 'outstream')) {
            bidResponse.renderer = createRenderer(bidResponse, {
              id: bid.bidId,
              url: RENDERER_URL
            });
          }
          bidResponses.push(bidResponse);
        }
      }
    }
    if (errorMessage) logError(errorMessage);
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    if (!hasSynced && syncOptions.pixelEnabled) {
      let params = '';

      if (gdprConsent && typeof gdprConsent.consentString === 'string') {
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          params += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
        } else {
          params += `&gdpr_consent=${gdprConsent.consentString}`;
        }
      }
      if (uspConsent) {
        params += `&us_privacy=${uspConsent}`;
      }

      hasSynced = true;
      return {
        type: 'image',
        url: SYNC_URL + params
      };
    }
  }
};

/**
 * Gets bidfloor
 * @param {Object} mediaTypes
 * @param {Object} bid
 * @param {Number} floor
 * @returns {Number} floor
 */
function _getFloor (mediaTypes, bid, floor) {
  const curMediaType = mediaTypes.video ? 'video' : 'banner';

  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({
      currency: 'USD',
      mediaType: curMediaType,
      size: bid.sizes.map(([w, h]) => ({w, h}))
    });

    if (typeof floorInfo === 'object' &&
      floorInfo.currency === 'USD' &&
      !isNaN(parseFloat(floorInfo.floor))) {
      floor = Math.max(floor, parseFloat(floorInfo.floor));
    }
  }

  return floor;
}

function _getBidFromResponse(respItem) {
  if (!respItem) {
    logError(LOG_ERROR_MESS.emptySeatbid);
  } else if (!respItem.bid) {
    logError(LOG_ERROR_MESS.hasNoArrayOfBids + JSON.stringify(respItem));
  } else if (!respItem.bid[0]) {
    logError(LOG_ERROR_MESS.noBid);
  }
  return respItem && respItem.bid && respItem.bid[0];
}

function outstreamRender (bid) {
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      targetId: bid.adUnitCode,
      adResponse: bid.adResponse
    });
  });
}

function createRenderer (bid, rendererParams) {
  const renderer = Renderer.install({
    id: rendererParams.id,
    url: rendererParams.url,
    loaded: false
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }

  return renderer;
}

function createVideoForImp({ mind, maxd, size, ...paramsVideo }, bidSizes) {
  if (size && isStr(size)) {
    const sizeArray = size.split('x');
    if (sizeArray.length === 2 && parseInt(sizeArray[0]) && parseInt(sizeArray[1])) {
      paramsVideo.w = parseInt(sizeArray[0]);
      paramsVideo.h = parseInt(sizeArray[1]);
    }
  }

  if (!paramsVideo.w || !paramsVideo.h) {
    const playerSizes = paramsVideo.playerSize && paramsVideo.playerSize.length === 2 ? paramsVideo.playerSize : bidSizes;
    if (playerSizes) {
      const playerSize = playerSizes[0];
      if (playerSize) {
        Object.assign(paramsVideo, parseGPTSingleSizeArrayToRtbSize(playerSize));
      }
    }
  }

  if (paramsVideo.playerSize) {
    delete paramsVideo.playerSize;
  }

  const durationRangeSec = paramsVideo.durationRangeSec || [];
  const minDur = mind || durationRangeSec[0] || paramsVideo.minduration;
  const maxDur = maxd || durationRangeSec[1] || paramsVideo.maxduration;

  if (minDur) {
    paramsVideo.minduration = minDur;
  }
  if (maxDur) {
    paramsVideo.maxduration = maxDur;
  }

  return paramsVideo;
}

export function resetUserSync() {
  hasSynced = false;
}

export function getSyncUrl() {
  return SYNC_URL;
}

function segmentProcessing(segment, forceSegName) {
  return segment
    .map((seg) => {
      const value = seg && (seg.value || seg.id || seg);
      if (typeof value === 'string' || typeof value === 'number') {
        return {
          value: value.toString(),
          ...(forceSegName && { name: forceSegName }),
          ...(seg.name && { name: seg.name }),
        };
      }
      return null;
    })
    .filter((seg) => !!seg);
}

registerBidder(spec);
