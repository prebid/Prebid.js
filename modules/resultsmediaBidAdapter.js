'use strict';

import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import { BANNER, VIDEO } from '../src/mediaTypes';

function ResultsmediaAdapter() {
  this.code = 'resultsmedia';
  this.aliases = ['resultsmedia'];
  this.supportedMediaTypes = [VIDEO, BANNER];

  let SUPPORTED_VIDEO_PROTOCOLS = [2, 3, 5, 6];
  let SUPPORTED_VIDEO_MIMES = ['video/mp4'];
  let SUPPORTED_VIDEO_PLAYBACK_METHODS = [1, 2, 3, 4];
  let SUPPORTED_VIDEO_DELIVERY = [1];
  let SUPPORTED_VIDEO_API = [1, 2, 5];
  let slotsToBids = {};
  let that = this;
  let version = '2.1';

  this.isBidRequestValid = function (bid) {
    return !!(bid.params && bid.params.zoneId);
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
      impObj.secure = isSecure;

      if (utils.deepAccess(BRs[i], 'mediaTypes.banner') || utils.deepAccess(BRs[i], 'mediaType') === 'banner') {
        let banner = frameBanner(BRs[i]);
        if (banner) {
          impObj.banner = banner;
        }
      }
      if (utils.deepAccess(BRs[i], 'mediaTypes.video') || utils.deepAccess(BRs[i], 'mediaType') === 'video') {
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
    var site = {
      domain: '',
      page: '',
      ref: ''
    }
    if (bidderRequest && bidderRequest.refererInfo) {
      var ri = bidderRequest.refererInfo;
      site.ref = ri.referer;

      if (ri.stack.length) {
        site.page = ri.stack[ri.stack.length - 1];

        // clever trick to get the domain
        var el = document.createElement('a');
        el.href = ri.stack[0];
        site.domain = el.hostname;
      }
    }
    return site;
  }

  function frameDevice() {
    return {
      ua: navigator.userAgent,
      ip: '', // Empty Ip string is required, server gets the ip from HTTP header
      dnt: utils.getDNT() ? 1 : 0,
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
    var sizeStringList = utils.parseSizesInput(sizeList);
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
    if (utils.deepAccess(bid, 'mediaTypes.video.playerSize')) {
      var dimensionSet = bid.mediaTypes.video.playerSize;
      if (utils.isArray(bid.mediaTypes.video.playerSize[0])) {
        dimensionSet = bid.mediaTypes.video.playerSize[0];
      }
      var validSize = getValidSizeSet(dimensionSet)
      if (validSize) {
        size = validSize;
      }
    }
    return {
      mimes: utils.deepAccess(bid, 'mediaTypes.video.mimes') || SUPPORTED_VIDEO_MIMES,
      protocols: utils.deepAccess(bid, 'mediaTypes.video.protocols') || SUPPORTED_VIDEO_PROTOCOLS,
      w: size[0],
      h: size[1],
      startdelay: utils.deepAccess(bid, 'mediaTypes.video.startdelay') || 0,
      skip: utils.deepAccess(bid, 'mediaTypes.video.skip') || 0,
      playbackmethod: utils.deepAccess(bid, 'mediaTypes.video.playbackmethod') || SUPPORTED_VIDEO_PLAYBACK_METHODS,
      delivery: utils.deepAccess(bid, 'mediaTypes.video.delivery') || SUPPORTED_VIDEO_DELIVERY,
      api: utils.deepAccess(bid, 'mediaTypes.video.api') || SUPPORTED_VIDEO_API,
    }
  }

  function frameExt(bid) {
    return {
      bidder: {
        zoneId: bid.params['zoneId']
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
          consent: utils.deepAccess(bidderRequest, 'gdprConsent.gdprApplies') ? bidderRequest.gdprConsent.consentString : ''
        }
      },
      at: 1,
      tmax: 1000,
      regs: {
        ext: {
          gdpr: utils.deepAccess(bidderRequest, 'gdprConsent.gdprApplies') ? Boolean(bidderRequest.gdprConsent.gdprApplies & 1) : false
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
    let fallbackZoneId = getFirstParam('zoneId', BRs);
    if (fallbackZoneId === undefined || BRs.length < 1) {
      return [];
    }

    var uri = 'https://bid306.rtbsrv.com/bidder/?bid=3mhdom&zoneId=' + fallbackZoneId;

    var fat = /(^v|(\.0)+$)/gi;
    var prebidVersion = '$prebid.version$';
    uri += '&hbv=' + prebidVersion.replace(fat, '') + ',' + version.replace(fat, '');

    var bidRequest = frameBid(BRs, bidderRequest);
    if (!bidRequest.imp.length) {
      return {};
    }

    return {
      method: 'POST',
      url: uri,
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
        requestId: bidRequest.id,
        bidderCode: that.code,
        cpm: parseFloat(bid.price),
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid,
        currency: 'USD',
        netRevenue: true,
        ttl: 350
      };

      if (bidRequest.mediaTypes && bidRequest.mediaTypes.video) {
        bidResponse.vastUrl = bid.adm;
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

export const spec = new ResultsmediaAdapter();
registerBidder(spec);
