import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import {BANNER, VIDEO} from '../src/mediaTypes';
import {Renderer} from '../src/Renderer';

const pixKey = 'utrk';

function startsWith(str, search) {
  return str.substr(0, search.length) === search;
}

function getMediaType(bid) {
  if (bid.ext) {
    if (bid.ext.media_type) {
      return bid.ext.media_type.toLowerCase();
    } else if (bid.ext.vast_url) {
      return VIDEO;
    } else {
      return BANNER;
    }
  }
  return BANNER;
}

export const spec = {
  code: 'yieldnexus',
  aliases: [],
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function (bid) {
    if (!bid.params.spid) {
      return false;
    } else if (typeof bid.params.spid !== 'string') {
      return false;
    }
    return (typeof bid.params.instl === 'undefined' || bid.params.instl === 0 || bid.params.instl === 1) &&
      (typeof bid.params.bidfloor === 'undefined' || typeof bid.params.bidfloor === 'number') &&
      (typeof bid.params['protocols'] === 'undefined' || Array.isArray(bid.params['protocols'])) &&
      (typeof bid.params['adpos'] === 'undefined' || typeof bid.params['adpos'] === 'number');
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      let referrer = '';
      try {
        referrer = window.top.document.referrer;
      } catch (e) {
        try {
          referrer = window.document.referrer;
        } catch (e) {
        }
      }
      const url = utils.getTopWindowUrl();
      const domainStart = url.indexOf('://') + 3;
      const req = {
        id: bidRequest.auctionId,
        site: {
          domain: url.substring(domainStart, url.indexOf('/', domainStart) < 0 ? url.length : url.indexOf('/', domainStart)),
          page: url,
          ref: referrer
        },
        device: {
          ua: navigator.userAgent
        },
        imp: [],
        ext: {}
      };
      if (bidderRequest && bidderRequest.gdprConsent) {
        req.ext.gdpr_consent = {
          consent_string: bidderRequest.gdprConsent.consentString,
          consent_required: bidderRequest.gdprConsent.gdprApplies
        };
      }
      let topFrame;
      try {
        topFrame = window.top === window ? 1 : 0;
      } catch (e) {
        topFrame = 0;
      }
      const imp = {
        id: bidRequest.transactionId,
        instl: bidRequest.params.instl === 1 ? 1 : 0,
        tagid: bidRequest.adUnitCode,
        bidfloor: bidRequest.params.bidfloor || 0,
        bidfloorcur: 'USD',
        secure: startsWith(utils.getTopWindowUrl().toLowerCase(), 'http://') ? 0 : 1
      };

      if (bidRequest.mediaTypes && bidRequest.mediaTypes.video) {
        imp.video = {
          protocols: bidRequest.params.protocols || [1, 2, 3, 4, 5, 6],
          pos: bidRequest.params.pos || 0,
          topframe: topFrame
        };

        let playerSize = bidRequest.mediaTypes.video.playerSize;
        if (playerSize && utils.isArray(playerSize[0])) {
          imp.video.w = playerSize[0][0];
          imp.video.h = playerSize[0][1];
        } else if (playerSize && utils.isNumber(playerSize[0])) {
          imp.video.w = playerSize[0];
          imp.video.h = playerSize[1];
        } else {
          playerSize = utils.isArray(bidRequest.sizes) ? bidRequest.sizes[0] : [300, 250];
          imp.video.w = playerSize[0];
          imp.video.h = playerSize[1];
        }
      }

      if (!bidRequest.mediaTypes || bidRequest.mediaTypes.banner) {
        imp.banner = {
          w: bidRequest.sizes.length ? bidRequest.sizes[0][0] : 300,
          h: bidRequest.sizes.length ? bidRequest.sizes[0][1] : 250,
          pos: bidRequest.params.pos || 0,
          topframe: topFrame
        };
      }

      if (!imp.banner && !imp.video) {
        return;
      }

      req.imp.push(imp);
      return {
        method: 'POST',
        url: `https://ssp.ynxs.io/r/${bidRequest.params.spid}/bidr?bidder=prebid&rformat=open_rtb&reqformat=rtb_json` + (bidRequest.params.query ? '&' + bidRequest.params.query : ''),
        data: req,
        bidRequest
      };
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const outBids = [];
    if (serverResponse && serverResponse.body) {
      const bids = serverResponse.body.seatbid.reduce((acc, seatBid) => acc.concat(seatBid.bid), []);
      bids.forEach(bid => {
        const outBid = {
          requestId: bidRequest.bidRequest.bidId,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          ttl: 15 * 60,
          creativeId: bid.crid,
          netRevenue: true,
          currency: bid.cur || serverResponse.body.cur,
          mediaType: getMediaType(bid)
        };

        if (utils.deepAccess(bidRequest.bidRequest, 'mediaTypes.' + outBid.mediaType)) {
          if (outBid.mediaType === VIDEO) {
            const context = utils.deepAccess(bidRequest.bidRequest, 'mediaTypes.video.context');
            outBids.push(Object.assign({}, outBid, {
              vastUrl: bid.ext.vast_url,
              vastXml: bid.adm,
              renderer: context === 'outstream' ? newRenderer(bidRequest.bidRequest, bid) : undefined
            }));
          } else if (outBid.mediaType === BANNER) {
            outBids.push(Object.assign({}, outBid, {ad: bid.adm}));
          }
        }
      });
    }
    return outBids;
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent) {
    const syncs = [];
    const gdprApplies = gdprConsent && (typeof gdprConsent.gdprApplies === 'boolean') ? gdprConsent.gdprApplies : false;
    const suffix = gdprApplies ? 'gc=' + encodeURIComponent(gdprConsent.consentString) : 'gc=missing';
    serverResponses.forEach(resp => {
      if (resp.body) {
        const bidResponse = resp.body;
        if (bidResponse.ext && Array.isArray(bidResponse.ext[pixKey])) {
          bidResponse.ext[pixKey].forEach(pixel => syncs.push({
            type: pixel.type,
            url: pixel.url + (pixel.url.indexOf('?') > 0 ? '&' + suffix : '?' + suffix)
          }));
        }
        if (Array.isArray(bidResponse.seatbid)) {
          bidResponse.seatbid.forEach(seatBid => {
            if (Array.isArray(seatBid.bid)) {
              seatBid.bid.forEach(bid => {
                if (bid.ext && Array.isArray(bid.ext[pixKey])) {
                  bid.ext[pixKey].forEach(pixel => syncs.push({
                    type: pixel.type,
                    url: pixel.url + (pixel.url.indexOf('?') > 0 ? '&' + suffix : '?' + suffix)
                  }));
                }
              });
            }
          });
        }
      }
    });
    return syncs;
  }
};

function newRenderer(bidRequest, bid, rendererOptions = {}) {
  let rendererUrl = '//s.wlplayer.com/video/latest/renderer.js';
  if (bid.ext && bid.ext.renderer_url) {
    rendererUrl = bid.ext.renderer_url;
  }
  if (bidRequest.params && bidRequest.params.rendererUrl) {
    rendererUrl = bidRequest.params.rendererUrl;
  }
  const renderer = Renderer.install({url: rendererUrl, config: rendererOptions, loaded: false});
  renderer.setRender(renderOutstream);
  return renderer;
}

function renderOutstream(bid) {
  bid.renderer.push(() => {
    window['GambidPlayer'].renderAd({
      id: bid.adUnitCode + '/' + bid.adId,
      debug: window.location.href.indexOf('pbjsDebug') >= 0,
      placement: document.getElementById(bid.adUnitCode),
      width: bid.width,
      height: bid.height,
      events: {
        ALL_ADS_COMPLETED: () => window.setTimeout(() => {
          window['GambidPlayer'].removeAd(bid.adUnitCode + '/' + bid.adId);
        }, 300)
      },
      vastUrl: bid.vastUrl,
      vastXml: bid.vastXml
    });
  });
}

registerBidder(spec);
