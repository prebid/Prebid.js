'use strict';

import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import { BANNER, VIDEO } from '../src/mediaTypes';

function RhythmOneBidAdapter() {
  this.code = 'rhythmone';
  this.supportedMediaTypes = [VIDEO, BANNER];

  let SUPPORTED_VIDEO_PROTOCOLS = [2, 3, 5, 6];
  let SUPPORTED_VIDEO_MIMES = ['video/mp4'];
  let SUPPORTED_VIDEO_PLAYBACK_METHODS = [1, 2, 3, 4];
  let SUPPORTED_VIDEO_DELIVERY = [1];
  let SUPPORTED_VIDEO_API = [1, 2, 5];
  let slotsToBids = {};
  let that = this;
  let version = '2.0.0.0';
  let loadStart = Date.now();
  var win = typeof window !== 'undefined' ? window : {};

  this.isBidRequestValid = function (bid) {
    return !!(bid.params && bid.params.placementId);
  };

  this.getUserSyncs = function (syncOptions, responses, gdprConsent) {
    let slots = [];
    let placementIds = [];

    for (let k in slotsToBids) {
      slots.push(k);
      placementIds.push(getFirstParam('placementId', [slotsToBids[k]]));
    }

    let data = {
      doc_version: 1,
      doc_type: 'Prebid Audit',
      placement_id: placementIds.join(',').replace(/[,]+/g, ',').replace(/^,|,$/g, '')
    };
    let w = typeof (window) !== 'undefined' ? window : {document: {location: {href: ''}}};
    let ao = w.document.location.ancestorOrigins;
    let q = [];
    let u = '//hbevents.1rx.io/audit?';

    if (ao && ao.length > 0) {
      data.ancestor_origins = ao[ao.length - 1];
    }

    data.popped = w.opener !== null ? 1 : 0;
    data.framed = w.top === w ? 0 : 1;

    try {
      data.url = w.top.document.location.href.toString();
    } catch (ex) {
      data.url = w.document.location.href.toString();
    }

    try {
      data.prebid_version = '$prebid.version$';
      data.prebid_timeout = config.getConfig('bidderTimeout');
    } catch (ex) { }

    data.response_ms = Date.now() - loadStart;
    data.placement_codes = slots.join(',');
    data.bidder_version = version;
    if (gdprConsent) {
      data.gdpr_consent = gdprConsent.consentString;
      data.gdpr = (typeof gdprConsent.gdprApplies === 'boolean') ? gdprConsent.gdprApplies : false;
    }

    for (let k in data) {
      q.push(encodeURIComponent(k) + '=' + encodeURIComponent((typeof data[k] === 'object' ? JSON.stringify(data[k]) : data[k])));
    }

    q.sort();

    if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: u + q.join('&')
      }];
    }
  };

  function frameImp(BRs) {
    var imp = [];
    for (var i = 0; i < BRs.length; i++) {
      slotsToBids[BRs[i].adUnitCode || BRs[i].placementCode] = BRs[i];
      var impObj = {};
      impObj.id = BRs[i].adUnitCode;
      impObj.bidfloor = parseFloat(utils.deepAccess(BRs[i], 'params.floor')) || 0;
      impObj.secure = win.location.protocol === 'https:' ? 1 : 0;

      if (utils.deepAccess(BRs[i], 'mediaTypes.banner') || utils.deepAccess(BRs[i], 'mediaType') === 'banner') {
        impObj.banner = frameBanner(BRs[i]);
      }
      if (utils.deepAccess(BRs[i], 'mediaTypes.video') || utils.deepAccess(BRs[i], 'mediaType') === 'video') {
        impObj.video = frameVideo(BRs[i]);
      }
      impObj.ext = frameExt(BRs[i]);
      imp.push(impObj);
    }
    return imp;
  }

  function frameSite(bidderRequest) {
    return {
      domain: attempt(function() {
        var d = win.document.location.ancestorOrigins;
        if (d && d.length > 0) {
          return d[d.length - 1];
        }
        return win.top.document.location.hostname; // try/catch is in the attempt function
      }, ''),
      page: attempt(function() {
        var l;
        // try/catch is in the attempt function
        try {
          l = win.top.document.location.href.toString();
        } catch (ex) {
          l = win.document.location.href.toString();
        }
        return l;
      }, ''),
      ref: attempt(function() {
        if (bidderRequest && bidderRequest.refererInfo) {
          return bidderRequest.refererInfo.referer;
        }
        return '';
      }, '')
    }
  }

  function frameDevice() {
    return {
      ua: navigator.userAgent,
      devicetype: /(ios|ipod|ipad|iphone|android)/i.test(win.navigator.userAgent) ? 1 : /(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i.test(win.navigator.userAgent) ? 3 : 2,
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
    if (!Array.isArray(sizeStringList)) {
      return {};
    }

    var format = [];
    sizeStringList.forEach(function(size) {
      if (!size) {
        return;
      }
      var dimensionList = getValidSizeSet(size.split('x'));
      if (dimensionList) {
        format.push({
          'w': dimensionList[0],
          'h': dimensionList[1],
        });
      }
    });
    if (format.length) {
      return {
        'format': format
      };
    }
    return {};
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
        placementId: bid.params['placementId'],
        zone: (bid.params && bid.params['zone']) ? bid.params['zone'] : '1r',
        path: (bid.params && bid.params['path']) ? bid.params['path'] : 'mvo'
      }
    }
  }

  function frameBid(BRs, bidderRequest) {
    return {
      id: BRs[0].bidderRequestId,
      imp: frameImp(BRs),
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
  }

  function getFirstParam(key, validBidRequests) {
    for (let i = 0; i < validBidRequests.length; i++) {
      if (validBidRequests[i].params && validBidRequests[i].params[key]) {
        return validBidRequests[i].params[key];
      }
    }
  }

  function attempt(valueFunction, defaultValue) {
    try {
      return valueFunction();
    } catch (ex) { }
    return defaultValue;
  }

  this.buildRequests = function (BRs, bidderRequest) {
    let fallbackPlacementId = getFirstParam('placementId', BRs);
    if (fallbackPlacementId === undefined || BRs.length < 1) {
      return [];
    }

    var rmpUrl = getFirstParam('endpoint', BRs) || '//tag.1rx.io/rmp/{placementId}/0/{path}?z={zone}';
    var defaultZone = getFirstParam('zone', BRs) || '1r';
    var defaultPath = getFirstParam('path', BRs) || 'mvo';

    rmpUrl = rmpUrl.replace(/\{placementId\}/i, fallbackPlacementId);
    rmpUrl = rmpUrl.replace(/\{zone\}/i, defaultZone);
    rmpUrl = rmpUrl.replace(/\{path\}/i, defaultPath);

    var fat = /(^v|(\.0)+$)/gi;
    var prebidVersion = '$prebid.version$';
    rmpUrl += '&hbv=' + prebidVersion.replace(fat, '') + ',' + version.replace(fat, '');

    var bidRequest = frameBid(BRs, bidderRequest);
    loadStart = Date.now();

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
