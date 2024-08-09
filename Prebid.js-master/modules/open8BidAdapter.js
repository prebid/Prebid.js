import { Renderer } from '../src/Renderer.js';
import {ajax} from '../src/ajax.js';
import { createTrackPixelHtml, getBidIdParameter, logError, logWarn, tryAppendQueryString } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'open8';
const URL = 'https://as.vt.open8.com/v1/control/prebid';
const AD_TYPE = {
  VIDEO: 1,
  BANNER: 2
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],

  isBidRequestValid: function(bid) {
    return !!(bid.params.slotKey);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    var requests = [];
    for (var i = 0; i < validBidRequests.length; i++) {
      var bid = validBidRequests[i];
      var queryString = '';
      var slotKey = getBidIdParameter('slotKey', bid.params);
      queryString = tryAppendQueryString(queryString, 'slot_key', slotKey);
      queryString = tryAppendQueryString(queryString, 'imp_id', generateImpId());
      queryString += ('bid_id=' + bid.bidId);

      requests.push({
        method: 'GET',
        url: URL,
        data: queryString
      });
    }
    return requests;
  },

  interpretResponse: function(serverResponse, request) {
    var bidderResponse = serverResponse.body;

    if (!bidderResponse.isAdReturn) {
      return [];
    }

    var ad = bidderResponse.ad;

    const bid = {
      slotKey: bidderResponse.slotKey,
      userId: bidderResponse.userId,
      impId: bidderResponse.impId,
      media: bidderResponse.media,
      ds: ad.ds,
      spd: ad.spd,
      fa: ad.fa,
      pr: ad.pr,
      mr: ad.mr,
      nurl: ad.nurl,
      requestId: ad.bidId,
      cpm: ad.price,
      creativeId: ad.creativeId,
      dealId: ad.dealId,
      currency: ad.currency || 'JPY',
      netRevenue: true,
      ttl: 360, // 6 minutes
      meta: {
        advertiserDomains: ad.adomain || []
      }
    }

    if (ad.adType === AD_TYPE.VIDEO) {
      const videoAd = bidderResponse.ad.video;
      Object.assign(bid, {
        vastXml: videoAd.vastXml,
        width: videoAd.w,
        height: videoAd.h,
        renderer: newRenderer(bidderResponse),
        adResponse: bidderResponse,
        mediaType: VIDEO
      });
    } else if (ad.adType === AD_TYPE.BANNER) {
      const bannerAd = bidderResponse.ad.banner;
      Object.assign(bid, {
        width: bannerAd.w,
        height: bannerAd.h,
        ad: bannerAd.adm,
        mediaType: BANNER
      });
      if (bannerAd.imps) {
        try {
          bannerAd.imps.forEach(impTrackUrl => {
            const tracker = createTrackPixelHtml(impTrackUrl);
            bid.ad += tracker;
          });
        } catch (error) {
          logError('Error appending imp tracking pixel', error);
        }
      }
    }
    return [bid];
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];
    if (syncOptions.iframeEnabled && serverResponses.length) {
      const syncIFs = serverResponses[0].body.syncIFs;
      if (syncIFs) {
        syncIFs.forEach(sync => {
          syncs.push({
            type: 'iframe',
            url: sync
          });
        });
      }
    }
    if (syncOptions.pixelEnabled && serverResponses.length) {
      const syncPixs = serverResponses[0].body.syncPixels;
      if (syncPixs) {
        syncPixs.forEach(sync => {
          syncs.push({
            type: 'image',
            url: sync
          });
        });
      }
    }
    return syncs;
  },
  onBidWon: function(bid) {
    if (!bid.nurl) { return; }
    const winUrl = bid.nurl.replace(
      /\$\{AUCTION_PRICE\}/,
      bid.cpm
    );
    ajax(winUrl, null);
  }
}

function generateImpId() {
  var l = 16;
  var c = 'abcdefghijklmnopqrstuvwsyz0123456789';
  var cl = c.length;
  var r = '';
  for (var i = 0; i < l; i++) {
    r += c[Math.floor(Math.random() * cl)];
  }
  return r;
}

function newRenderer(bidderResponse) {
  const renderer = Renderer.install({
    id: bidderResponse.ad.bidId,
    url: bidderResponse.ad.video.purl,
    loaded: false,
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logWarn('Prebid Error calling setRender on newRenderer', err);
  }

  return renderer;
}

function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.op8.renderPrebid({
      vastXml: bid.vastXml,
      adUnitCode: bid.adUnitCode,
      slotKey: bid.slotKey,
      impId: bid.impId,
      userId: bid.userId,
      media: bid.media,
      ds: bid.ds,
      spd: bid.spd,
      fa: bid.fa,
      pr: bid.pr,
      mr: bid.mr,
      adResponse: bid.adResponse,
      mediaType: bid.mediaType
    });
  });
}

registerBidder(spec);
