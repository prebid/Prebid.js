
'use strict';

import { deepAccess, getDNT, parseSizesInput, isArray } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

function RhythmOneBidAdapter() {
  this.code = 'rhythmone';
  this.supportedMediaTypes = [VIDEO, BANNER];
  this.gvlid = 36;

  let SUPPORTED_VIDEO_PROTOCOLS = [2, 3, 5, 6];
  let SUPPORTED_VIDEO_MIMES = ['video/mp4'];
  let SUPPORTED_VIDEO_PLAYBACK_METHODS = [1, 2, 3, 4];
  let SUPPORTED_VIDEO_DELIVERY = [1];
  let SUPPORTED_VIDEO_API = [1, 2, 5];
  let slotsToBids = {};
  let version = '2.1';

  this.isBidRequestValid = function (bid) {
    return !!(bid.params && bid.params.placementId);
  };

  this.getUserSyncs = function (syncOptions, responses, gdprConsent) {
    return [];
  };

  function frameImp(BRs, bidderRequest) {
    var impList = [];
    var isSecure = 0;
    if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.stack.length) {
      // clever trick to get the protocol
      var el = document.createElement('a');
      el.href = bidderRequest.refererInfo.stack[0];
      isSecure = (el.protocol == 'https:') ? 1 : 0;
    }
    for (var i = 0; i < BRs.length; i++) {
      slotsToBids[BRs[i].adUnitCode] = BRs[i];
      var impObj = {};
      impObj.id = BRs[i].adUnitCode;
      impObj.bidfloor = 0;
      impObj.secure = isSecure;

      if (deepAccess(BRs[i], 'mediaTypes.banner') || deepAccess(BRs[i], 'mediaType') === 'banner') {
        let banner = frameBanner(BRs[i]);
        if (banner) {
          impObj.banner = banner;
        }
      }
      if (deepAccess(BRs[i], 'mediaTypes.video') || deepAccess(BRs[i], 'mediaType') === 'video') {
        impObj.video = frameVideo(BRs[i]);
      }
      if (!(impObj.banner || impObj.video)) {
        continue;
      }
      impObj.ext = frameExt(BRs[i]);
      impList.push(impObj);
    }
    return impList;
  }

  function frameSite(bidderRequest) {
    return {
      domain: bidderRequest?.refererInfo?.domain || '',
      page: bidderRequest?.refererInfo?.page || '',
      ref: bidderRequest?.refererInfo?.ref || ''
    }
  }

  function frameDevice() {
    return {
      ua: navigator.userAgent,
      ip: '', // Empty Ip string is required, server gets the ip from HTTP header
      dnt: getDNT() ? 1 : 0,
    }
  }

  function getValidSizeSet(dimensionList) {
    let w = parseInt(dimensionList[0]);
    let h = parseInt(dimensionList[1]);
    // clever check for NaN
    if (! (w !== w || h !== h)) {  // eslint-disable-line
      return [w, h];
    }
    return false;
  }

  function frameBanner(adUnit) {
    // adUnit.sizes is scheduled to be deprecated, continue its support but prefer adUnit.mediaTypes.banner
    var sizeList = adUnit.sizes;
    if (adUnit.mediaTypes && adUnit.mediaTypes.banner) {
      sizeList = adUnit.mediaTypes.banner.sizes;
    }
    var sizeStringList = parseSizesInput(sizeList);
    var format = [];
    sizeStringList.forEach(function(size) {
      if (size) {
        var dimensionList = getValidSizeSet(size.split('x'));
        if (dimensionList) {
          format.push({
            'w': dimensionList[0],
            'h': dimensionList[1],
          });
        }
      }
    });
    if (format.length) {
      return {
        'format': format
      };
    }

    return false;
  }

  function frameVideo(bid) {
    var size = [];
    if (deepAccess(bid, 'mediaTypes.video.playerSize')) {
      var dimensionSet = bid.mediaTypes.video.playerSize;
      if (isArray(bid.mediaTypes.video.playerSize[0])) {
        dimensionSet = bid.mediaTypes.video.playerSize[0];
      }
      var validSize = getValidSizeSet(dimensionSet)
      if (validSize) {
        size = validSize;
      }
    }
    return {
      mimes: deepAccess(bid, 'mediaTypes.video.mimes') || SUPPORTED_VIDEO_MIMES,
      protocols: deepAccess(bid, 'mediaTypes.video.protocols') || SUPPORTED_VIDEO_PROTOCOLS,
      w: size[0],
      h: size[1],
      startdelay: deepAccess(bid, 'mediaTypes.video.startdelay') || 0,
      skip: deepAccess(bid, 'mediaTypes.video.skip') || 0,
      playbackmethod: deepAccess(bid, 'mediaTypes.video.playbackmethod') || SUPPORTED_VIDEO_PLAYBACK_METHODS,
      delivery: deepAccess(bid, 'mediaTypes.video.delivery') || SUPPORTED_VIDEO_DELIVERY,
      api: deepAccess(bid, 'mediaTypes.video.api') || SUPPORTED_VIDEO_API,
    }
  }

  function frameExt(bid) {
    return {
      bidder: {
        placementId: bid.params['placementId'],
        zone: (bid.params && bid.params['zone']) ? bid.params['zone'] : '1r',
        path: (bid.params && bid.params['path']) ? bid.params['path'] : 'mvo'
      }
    }
  }

  function frameBid(BRs, bidderRequest) {
    let bid = {
      id: BRs[0].bidderRequestId,
      imp: frameImp(BRs, bidderRequest),
      site: frameSite(bidderRequest),
      device: frameDevice(),
      user: {
        ext: {
          consent: deepAccess(bidderRequest, 'gdprConsent.gdprApplies') ? bidderRequest.gdprConsent.consentString : ''
        }
      },
      at: 1,
      tmax: Math.min(1000, bidderRequest.timeout),
      regs: {
        ext: {
          gdpr: deepAccess(bidderRequest, 'gdprConsent.gdprApplies') ? Boolean(bidderRequest.gdprConsent.gdprApplies & 1) : false
        }
      }
    };
    if (BRs[0].schain) {
      bid.source = {
        'ext': {
          'schain': BRs[0].schain
        }
      }
    }
    return bid;
  }

  function getFirstParam(key, validBidRequests) {
    for (let i = 0; i < validBidRequests.length; i++) {
      if (validBidRequests[i].params && validBidRequests[i].params[key]) {
        return validBidRequests[i].params[key];
      }
    }
  }

  this.buildRequests = function (BRs, bidderRequest) {
    let fallbackPlacementId = getFirstParam('placementId', BRs);
    if (fallbackPlacementId === undefined || BRs.length < 1) {
      return [];
    }

    var rmpUrl = getFirstParam('endpoint', BRs) || 'https://tag.1rx.io/rmp/{placementId}/0/{path}?z={zone}';
    var defaultZone = getFirstParam('zone', BRs) || '1r';
    var defaultPath = getFirstParam('path', BRs) || 'mvo';

    rmpUrl = rmpUrl.replace(/\{placementId\}/i, fallbackPlacementId);
    rmpUrl = rmpUrl.replace(/\{zone\}/i, defaultZone);
    rmpUrl = rmpUrl.replace(/\{path\}/i, defaultPath);

    var fat = /(^v|(\.0)+$)/gi;
    var prebidVersion = '$prebid.version$';
    rmpUrl += '&hbv=' + prebidVersion.replace(fat, '') + ',' + version.replace(fat, '');

    var bidRequest = frameBid(BRs, bidderRequest);
    if (!bidRequest.imp.length) {
      return {};
    }

    return {
      method: 'POST',
      url: rmpUrl,
      data: JSON.stringify(bidRequest)
    };
  };

  this.interpretResponse = function (serverResponse) {
    let responses = serverResponse.body || [];
    let bids = [];
    let i = 0;

    if (responses.seatbid) {
      let temp = [];
      for (i = 0; i < responses.seatbid.length; i++) {
        for (let j = 0; j < responses.seatbid[i].bid.length; j++) {
          temp.push(responses.seatbid[i].bid[j]);
        }
      }
      responses = temp;
    }

    for (i = 0; i < responses.length; i++) {
      let bid = responses[i];
      let bidRequest = slotsToBids[bid.impid];
      let bidResponse = {
        requestId: bidRequest.bidId,
        cpm: parseFloat(bid.price),
        width: bid.w,
        height: bid.h,
        meta: {
          advertiserDomains: bid.adomain
        },
        creativeId: bid.crid,
        currency: 'USD',
        netRevenue: true,
        ttl: 350
      };

      if (bidRequest.mediaTypes && bidRequest.mediaTypes.video) {
        bidResponse.vastUrl = bid.nurl;
        bidResponse.mediaType = 'video';
        bidResponse.ttl = 600;
      } else {
        bidResponse.ad = bid.adm;
      }
      bids.push(bidResponse);
    }

    return bids;
  };
}

export const spec = new RhythmOneBidAdapter();
registerBidder(spec);
