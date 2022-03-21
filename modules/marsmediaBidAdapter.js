
'use strict';
import { deepAccess, getDNT, parseSizesInput, isArray, getWindowTop, deepSetValue, triggerPixel, getWindowSelf } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {config} from '../src/config.js';

function MarsmediaAdapter() {
  this.code = 'marsmedia';
  this.aliases = ['mars'];
  this.supportedMediaTypes = [VIDEO, BANNER];

  let SUPPORTED_VIDEO_PROTOCOLS = [2, 3, 5, 6];
  let SUPPORTED_VIDEO_MIMES = ['video/mp4'];
  let SUPPORTED_VIDEO_PLAYBACK_METHODS = [1, 2, 3, 4];
  let SUPPORTED_VIDEO_DELIVERY = [1];
  let SUPPORTED_VIDEO_API = [1, 2, 5];
  let slotsToBids = {};
  let version = '2.5';

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
      impObj.bidfloor = _getFloor(BRs[i]);
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
    if ((bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes)) {
      let bidSizes = (bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes) || bid.sizes;
      bidSizes = ((isArray(bidSizes) && isArray(bidSizes[0])) ? bidSizes : [bidSizes]);
      bidSizes = bidSizes.filter(size => isArray(size));
      const processedSizes = bidSizes.map(size => ({w: parseInt(size[0], 10), h: parseInt(size[1], 10)}));

      const element = document.getElementById(bid.adUnitCode);
      const minSize = _getMinSize(processedSizes);
      const viewabilityAmount = _isViewabilityMeasurable(element)
        ? _getViewability(element, getWindowTop(), minSize)
        : 'na';
      const viewabilityAmountRounded = isNaN(viewabilityAmount) ? viewabilityAmount : Math.round(viewabilityAmount);

      return {
        bidder: {
          zoneId: bid.params['zoneId']
        },
        viewability: viewabilityAmountRounded
      }
    } else {
      return {
        bidder: {
          zoneId: bid.params['zoneId']
        },
        viewability: 'na'
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
      tmax: 650,
      regs: {
        ext: {
          gdpr: deepAccess(bidderRequest, 'gdprConsent.gdprApplies') ? Boolean(bidderRequest.gdprConsent.gdprApplies & 1) : false
        }
      }
    };
    if (BRs[0].schain) {
      deepSetValue(bid, 'source.ext.schain', BRs[0].schain);
    }
    if (bidderRequest.uspConsent) {
      deepSetValue(bid, 'regs.ext.us_privacy', bidderRequest.uspConsent)
    }
    if (config.getConfig('coppa') === true) {
      deepSetValue(bid, 'regs.coppa', config.getConfig('coppa') & 1)
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

    var uri = 'https://hb.go2speed.media/bidder/?bid=3mhdom&zoneId=' + fallbackZoneId;

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

  this.onBidWon = function (bid) {
    if (typeof bid.nurl !== 'undefined') {
      const cpm = bid.pbMg;
      bid.nurl = bid.nurl.replace(
        /\$\{AUCTION_PRICE\}/,
        cpm
      );
      triggerPixel(bid.nurl, null);
    };
    sendbeacon(bid, 17)
  };

  this.onTimeout = function (bid) {
    sendbeacon(bid, 19)
  };

  this.onSetTargeting = function (bid) {
    sendbeacon(bid, 20)
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
        creativeId: bid.crid,
        currency: 'USD',
        netRevenue: true,
        ttl: 350,
        nurl: bid.nurl
      };

      if (bidRequest.mediaTypes && bidRequest.mediaTypes.video) {
        if (bid.adm.charAt(0) === '<') {
          bidResponse.vastXml = bid.adm;
        } else {
          bidResponse.vastUrl = bid.adm;
        }
        bidResponse.mediaType = 'video';
        bidResponse.ttl = 600;
      } else {
        bidResponse.ad = bid.adm;
      }

      bids.push(bidResponse);
    }

    return bids;
  };

  function sendbeacon(bid, type) {
    const bidString = JSON.stringify(bid);
    const encodedBuf = window.btoa(bidString);
    triggerPixel('https://ping-hqx-1.go2speed.media/notification/rtb/beacon/?bt=' + type + '&bid=3mhdom&hb_j=' + encodedBuf, null);
  }

  /**
   * Gets bidfloor
   * @param {Object} bid
   * @returns {Number} floor
   */
  function _getFloor (bid) {
    const curMediaType = bid.mediaTypes.video ? 'video' : 'banner';
    let floor = 0;

    if (typeof bid.getFloor === 'function') {
      const floorInfo = bid.getFloor({
        currency: 'USD',
        mediaType: curMediaType,
        size: '*'
      });

      if (typeof floorInfo === 'object' &&
        floorInfo.currency === 'USD' &&
        !isNaN(parseFloat(floorInfo.floor))) {
        floor = floorInfo.floor;
      }
    }

    return floor;
  }

  function _getMinSize(sizes) {
    return sizes.reduce((min, size) => size.h * size.w < min.h * min.w ? size : min);
  }

  function _isViewabilityMeasurable(element) {
    return !_isIframe() && element !== null;
  }

  function _isIframe() {
    try {
      return getWindowSelf() !== getWindowTop();
    } catch (e) {
      return true;
    }
  }

  function _getViewability(element, topWin, { w, h } = {}) {
    return topWin.document.visibilityState === 'visible'
      ? _getPercentInView(element, topWin, { w, h })
      : 0;
  }

  function _getPercentInView(element, topWin, { w, h } = {}) {
    const elementBoundingBox = _getBoundingBox(element, { w, h });

    const elementInViewBoundingBox = _getIntersectionOfRects([ {
      left: 0,
      top: 0,
      right: topWin.innerWidth,
      bottom: topWin.innerHeight
    }, elementBoundingBox ]);

    let elementInViewArea, elementTotalArea;

    if (elementInViewBoundingBox !== null) {
      // Some or all of the element is in view
      elementInViewArea = elementInViewBoundingBox.width * elementInViewBoundingBox.height;
      elementTotalArea = elementBoundingBox.width * elementBoundingBox.height;

      return ((elementInViewArea / elementTotalArea) * 100);
    }

    return 0;
  }

  function _getBoundingBox(element, { w, h } = {}) {
    let { width, height, left, top, right, bottom } = element.getBoundingClientRect();

    if ((width === 0 || height === 0) && w && h) {
      width = w;
      height = h;
      right = left + w;
      bottom = top + h;
    }

    return { width, height, left, top, right, bottom };
  }

  function _getIntersectionOfRects(rects) {
    const bbox = {
      left: rects[0].left,
      right: rects[0].right,
      top: rects[0].top,
      bottom: rects[0].bottom
    };

    for (let i = 1; i < rects.length; ++i) {
      bbox.left = Math.max(bbox.left, rects[i].left);
      bbox.right = Math.min(bbox.right, rects[i].right);

      if (bbox.left >= bbox.right) {
        return null;
      }

      bbox.top = Math.max(bbox.top, rects[i].top);
      bbox.bottom = Math.min(bbox.bottom, rects[i].bottom);

      if (bbox.top >= bbox.bottom) {
        return null;
      }
    }

    bbox.width = bbox.right - bbox.left;
    bbox.height = bbox.bottom - bbox.top;

    return bbox;
  }
}

export const spec = new MarsmediaAdapter();
registerBidder(spec);
