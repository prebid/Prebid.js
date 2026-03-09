'use strict';

import { getDNT } from '../libraries/dnt/index.js';
import { deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { frameBanner, frameVideo, getIsSecureBidRequest } from '../libraries/rhythmoneMarsUtils/index.js';

function RhythmOneBidAdapter() {
  this.code = 'rhythmone';
  this.supportedMediaTypes = [VIDEO, BANNER];
  this.gvlid = 36;

  const SUPPORTED_VIDEO_PROTOCOLS = [2, 3, 5, 6];
  const SUPPORTED_VIDEO_MIMES = ['video/mp4'];
  const SUPPORTED_VIDEO_PLAYBACK_METHODS = [1, 2, 3, 4];
  const SUPPORTED_VIDEO_DELIVERY = [1];
  const SUPPORTED_VIDEO_API = [1, 2, 5];
  const slotsToBids = {};
  const version = '2.1';

  this.isBidRequestValid = function (bid) {
    return !!(bid.params && bid.params.placementId);
  };

  this.getUserSyncs = function (syncOptions, responses, gdprConsent) {
    return [];
  };

  function frameImp(BRs, bidderRequest) {
    var impList = [];
    var isSecure = getIsSecureBidRequest(bidderRequest);
    for (var i = 0; i < BRs.length; i++) {
      slotsToBids[BRs[i].adUnitCode] = BRs[i];
      var impObj = {};
      impObj.id = BRs[i].adUnitCode;
      impObj.bidfloor = 0;
      impObj.secure = isSecure;

      if (deepAccess(BRs[i], 'mediaTypes.banner') || deepAccess(BRs[i], 'mediaType') === 'banner') {
        const banner = frameBanner(BRs[i]);
        if (banner) {
          impObj.banner = banner;
        }
      }
      if (deepAccess(BRs[i], 'mediaTypes.video') || deepAccess(BRs[i], 'mediaType') === 'video') {
        impObj.video = frameVideo(BRs[i], {
          SUPPORTED_VIDEO_MIMES,
          SUPPORTED_VIDEO_PROTOCOLS,
          SUPPORTED_VIDEO_PLAYBACK_METHODS,
          SUPPORTED_VIDEO_DELIVERY,
          SUPPORTED_VIDEO_API
        });
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
      tmax: Math.min(1000, bidderRequest.timeout),
      regs: {
        ext: {
          gdpr: deepAccess(bidderRequest, 'gdprConsent.gdprApplies') ? Boolean(bidderRequest.gdprConsent.gdprApplies & 1) : false
        }
      }
    };
    const schain = BRs[0]?.ortb2?.source?.ext?.schain;
    if (schain) {
      bid.source = {
        'ext': {
          'schain': schain
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
    const fallbackPlacementId = getFirstParam('placementId', BRs);
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
