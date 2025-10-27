'use strict';
import { getDNT } from '../libraries/navigatorData/dnt.js';
import { deepAccess, parseSizesInput, isArray, getWindowTop, deepSetValue, triggerPixel, getWindowSelf, isPlainObject } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import { percentInView } from '../libraries/percentInView/percentInView.js';
import {getMinSize} from '../libraries/sizeUtils/sizeUtils.js';

function MarsmediaAdapter() {
  this.code = 'marsmedia';
  this.aliases = ['mars'];
  this.supportedMediaTypes = [VIDEO, BANNER];

  this.gvlid = 776;
  const SUPPORTED_VIDEO_PROTOCOLS = [2, 3, 5, 6];
  const SUPPORTED_VIDEO_MIMES = ['video/mp4'];
  const SUPPORTED_VIDEO_PLAYBACK_METHODS = [1, 2, 3, 4];
  const SUPPORTED_VIDEO_DELIVERY = [1];
  const SUPPORTED_VIDEO_API = [1, 2, 5];
  const slotsToBids = {};
  const version = '2.5';

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
      // TODO: this should probably use parseUrl
      var el = document.createElement('a');
      el.href = bidderRequest.refererInfo.stack[0];
      isSecure = (el.protocol === 'https:') ? 1 : 0;
    }
    for (var i = 0; i < BRs.length; i++) {
      slotsToBids[BRs[i].adUnitCode] = BRs[i];
      var impObj = {};
      impObj.id = BRs[i].adUnitCode;
      impObj.secure = isSecure;

      if (deepAccess(BRs[i], 'mediaTypes.banner') || deepAccess(BRs[i], 'mediaType') === 'banner') {
        const banner = frameBanner(BRs[i]);
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
      // TODO: is 'ref' the right value here?
      site.ref = ri.ref;

      if (ri.stack.length) {
        site.page = ri.stack[ri.stack.length - 1];

        // clever trick to get the domain
        // TODO: does this logic make sense? why should domain be set to the lowermost frame's?
        // TODO: this should probably use parseUrl
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
    const w = parseInt(dimensionList[0]);
    const h = parseInt(dimensionList[1]);
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
      const minSize = getMinSize(processedSizes);
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
    const bid = {
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
    const schain = BRs[0]?.ortb2?.source?.ext?.schain;
    if (schain) {
      deepSetValue(bid, 'source.ext.schain', schain);
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
    const fallbackZoneId = getFirstParam('zoneId', BRs);
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
    const bids = [];
    let i = 0;

    if (responses.seatbid) {
      const temp = [];
      for (i = 0; i < responses.seatbid.length; i++) {
        for (let j = 0; j < responses.seatbid[i].bid.length; j++) {
          temp.push(responses.seatbid[i].bid[j]);
        }
      }
      responses = temp;
    }

    for (i = 0; i < responses.length; i++) {
      const bid = responses[i];
      const bidRequest = slotsToBids[bid.impid];
      const bidResponse = {
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

      if (isPlainObject(floorInfo) &&
        floorInfo.currency === 'USD' &&
        !isNaN(parseFloat(floorInfo.floor))) {
        floor = floorInfo.floor;
      }
    }

    return floor;
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
      ? percentInView(element, { w, h })
      : 0;
  }
}

export const spec = new MarsmediaAdapter();
registerBidder(spec);
