import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO, NATIVE} from '../src/mediaTypes.js';

const VER = 'ADGENT_PREBID-2018011501';
const BIDDER_CODE = 'ucfunnel';

const VIDEO_CONTEXT = {
  INSTREAM: 0,
  OUSTREAM: 2
}

export const spec = {
  code: BIDDER_CODE,
  ENDPOINT: 'https://hb.aralego.com/header',
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  /**
   * Check if the bid is a valid zone ID in either number or string form
   * @param {object} bid the ucfunnel bid to validate
   * @return boolean for whether or not a bid is valid
   */
  isBidRequestValid: function(bid) {
    const isVideoMediaType = (bid.mediaTypes && bid.mediaTypes.video != null);
    const videoContext = (bid.mediaTypes && bid.mediaTypes.video != null) ? bid.mediaTypes.video.videoContext : '';

    if (typeof bid.params !== 'object' || typeof bid.params.adid != 'string') {
      return false;
    }

    if (isVideoMediaType && videoContext === 'outstream') {
      return false;
    }

    return true;
  },

  /**
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: function(bids, bidderRequest) {
    return bids.map(bid => {
      return {
        method: 'GET',
        url: spec.ENDPOINT,
        data: getRequestData(bid, bidderRequest),
        bidRequest: bid
      }
    });
  },

  /**
   * Format ucfunnel responses as Prebid bid responses
   * @param {ucfunnelResponseObj} ucfunnelResponse A successful response from ucfunnel.
   * @return {Bid[]} An array of formatted bids.
  */
  interpretResponse: function (ucfunnelResponseObj, request) {
    const bidRequest = request.bidRequest;
    const ad = ucfunnelResponseObj ? ucfunnelResponseObj.body : {};
    const videoPlayerSize = parseSizes(bidRequest);

    let bid = {
      requestId: bidRequest.bidId,
      cpm: ad.cpm || 0,
      creativeId: ad.ad_id || bidRequest.params.adid,
      dealId: ad.deal || null,
      currency: 'USD',
      netRevenue: true,
      ttl: 1800
    };

    if (bidRequest.params && bidRequest.params.bidfloor && ad.cpm && ad.cpm < bidRequest.params.bidfloor) {
      bid.cpm = 0;
    }
    if (ad.creative_type) {
      bid.mediaType = ad.creative_type;
    }

    switch (ad.creative_type) {
      case NATIVE:
        let nativeAd = ad.native;
        Object.assign(bid, {
          width: 1,
          height: 1,
          native: {
            title: nativeAd.title,
            body: nativeAd.desc,
            cta: nativeAd.ctatext,
            sponsoredBy: nativeAd.sponsored,
            image: nativeAd.image || nativeAd.image.url,
            icon: nativeAd.icon || nativeAd.icon.url,
            clickUrl: nativeAd.clickUrl,
            clickTrackers: (nativeAd.clicktrackers) ? nativeAd.clicktrackers : [],
            impressionTrackers: nativeAd.impressionTrackers,
          }
        });
        break;
      case VIDEO:
        Object.assign(bid, {
          vastUrl: ad.vastUrl,
          vastXml: ad.vastXml
        });

        if (videoPlayerSize && videoPlayerSize.length === 2) {
          Object.assign(bid, {
            width: videoPlayerSize[0],
            height: videoPlayerSize[1]
          });
        }
        break;
      case BANNER:
      default:
        var size = parseSizes(bidRequest);
        Object.assign(bid, {
          width: ad.width || size[0],
          height: ad.height || size[1],
          ad: ad.adm || ''
        });
    }

    return [bid];
  },

  getUserSyncs: function(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://cdn.aralego.net/ucfad/cookie/sync.html'
      }];
    } else if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: 'https://sync.aralego.com/idSync'
      }];
    }
  }
};
registerBidder(spec);

function transformSizes(requestSizes) {
  if (typeof requestSizes === 'object' && requestSizes.length) {
    return requestSizes[0];
  }
}

function parseSizes(bid) {
  let params = bid.params;
  if (bid.mediaType === VIDEO) {
    let size = [];
    if (params.video && params.video.playerWidth && params.video.playerHeight) {
      size = [
        params.video.playerWidth,
        params.video.playerHeight
      ];
      return size;
    }
  }

  return transformSizes(bid.sizes);
}

function getSupplyChain(schain) {
  var supplyChain = '';
  if (schain != null && schain.nodes) {
    supplyChain = schain.ver + ',' + schain.complete;
    for (let i = 0; i < schain.nodes.length; i++) {
      supplyChain += '!';
      supplyChain += (schain.nodes[i].asi) ? encodeURIComponent(schain.nodes[i].asi) : '';
      supplyChain += ',';
      supplyChain += (schain.nodes[i].sid) ? encodeURIComponent(schain.nodes[i].sid) : '';
      supplyChain += ',';
      supplyChain += (schain.nodes[i].hp) ? encodeURIComponent(schain.nodes[i].hp) : '';
      supplyChain += ',';
      supplyChain += (schain.nodes[i].rid) ? encodeURIComponent(schain.nodes[i].rid) : '';
      supplyChain += ',';
      supplyChain += (schain.nodes[i].name) ? encodeURIComponent(schain.nodes[i].name) : '';
      supplyChain += ',';
      supplyChain += (schain.nodes[i].domain) ? encodeURIComponent(schain.nodes[i].domain) : '';
    }
  }
  return supplyChain;
}

function getRequestData(bid, bidderRequest) {
  const size = parseSizes(bid);
  const loc = window.location;
  const host = loc.host;
  const page = loc.href;
  const language = navigator.language;
  const dnt = (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0;
  const userIdTdid = (bid.userId && bid.userId.tdid) ? bid.userId.tdid : '';
  const supplyChain = getSupplyChain(bid.schain);
  // general bid data
  let bidData = {
    ver: VER,
    ifr: 0,
    bl: language,
    je: 1,
    dnt: dnt,
    host: host,
    u: page,
    adid: bid.params.adid,
    tdid: userIdTdid,
    schain: supplyChain,
    fp: bid.params.bidfloor
  };

  if (size != undefined && size.length == 2) {
    bidData.w = size[0];
    bidData.h = size[1];
  }

  if (bidderRequest && bidderRequest.uspConsent) {
    Object.assign(bidData, {
      usprivacy: bidderRequest.uspConsent
    });
  }
  if (bid.mediaTypes && bid.mediaTypes.video != null) {
    const videoContext = bid.mediaTypes.video.context;
    switch (videoContext) {
      case 'outstream':
        bidData.atype = VIDEO_CONTEXT.OUSTREAM;
        break;
      case 'instream':
      default:
        bidData.atype = VIDEO_CONTEXT.INSTREAM;
        break;
    }
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    Object.assign(bidData, {
      gdpr: bidderRequest.gdprConsent.gdprApplies ? 1 : 0,
      euconsent: bidderRequest.gdprConsent.consentString
    });
  }

  return bidData;
}
