'use strict';

import { getDNT } from '../libraries/dnt/index.js';
import { deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { buildImpressionList, interpretCommonResponse } from '../libraries/rhythmoneMarsUtils/index.js';

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
    return buildImpressionList(BRs, bidderRequest, slotsToBids, {
      frameExt,
      getFloor() {
        return 0;
      },
      defaultVideoConfig: {
        SUPPORTED_VIDEO_MIMES,
        SUPPORTED_VIDEO_PROTOCOLS,
        SUPPORTED_VIDEO_PLAYBACK_METHODS,
        SUPPORTED_VIDEO_DELIVERY,
        SUPPORTED_VIDEO_API
      }
    });
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
    return interpretCommonResponse(serverResponse, slotsToBids, {
      baseBidResponse(bid) {
        return {
          meta: {
            advertiserDomains: bid.adomain
          }
        };
      },
      videoBidResponse(bid) {
        return {
          vastUrl: bid.nurl,
          mediaType: 'video',
          ttl: 600
        };
      },
      bannerBidResponse(bid) {
        return {
          ad: bid.adm
        };
      }
    });
  };
}

export const spec = new RhythmOneBidAdapter();
registerBidder(spec);
