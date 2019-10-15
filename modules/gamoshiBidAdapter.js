import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import {config} from '../src/config';
import {Renderer} from '../src/Renderer';
import {BANNER, VIDEO} from '../src/mediaTypes';

const ENDPOINTS = {
  'gamoshi': 'https://rtb.gamoshi.io'
};

const DEFAULT_TTL = 360;

export const helper = {
  getTopFrame: function () {
    try {
      return window.top === window ? 1 : 0;
    } catch (e) {
    }
    return 0;
  },
  startsWith: function (str, search) {
    return str.substr(0, search.length) === search;
  },
  getTopWindowDomain: function (url) {
    const domainStart = url.indexOf('://') + '://'.length;
    return url.substring(domainStart, url.indexOf('/', domainStart) < 0 ? url.length : url.indexOf('/', domainStart));
  },

  getMediaType: function (bid) {
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
};

export const spec = {
  code: 'gamoshi',
  aliases: ['gambid', 'cleanmedia', 'viewdeos', '9MediaOnline'],
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    return !!bid.params.supplyPartnerId &&
      typeof bid.params.supplyPartnerId === 'string' &&
      (typeof bid.params['rtbEndpoint'] === 'undefined' || typeof bid.params['rtbEndpoint'] === 'string') &&
      (typeof bid.params.bidfloor === 'undefined' || typeof bid.params.bidfloor === 'number') &&
      (typeof bid.params['adpos'] === 'undefined' || typeof bid.params['adpos'] === 'number') &&
      (typeof bid.params['protocols'] === 'undefined' || Array.isArray(bid.params['protocols'])) &&
      (typeof bid.params.instl === 'undefined' || bid.params.instl === 0 || bid.params.instl === 1);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const {adUnitCode, auctionId, mediaTypes, params, sizes, transactionId} = bidRequest;
      const baseEndpoint = params['rtbEndpoint'] || ENDPOINTS['gamoshi'];
      const rtbEndpoint = `${baseEndpoint}/r/${params.supplyPartnerId}/bidr?rformat=open_rtb&reqformat=rtb_json&bidder=prebid` + (params.query ? '&' + params.query : '');
      let url = config.getConfig('pageUrl') || bidderRequest.refererInfo.referer;

      const rtbBidRequest = {
        'id': auctionId,
        'site': {
          'domain': helper.getTopWindowDomain(url),
          'page': url,
          'ref': bidderRequest.refererInfo.referer
        },
        'device': {
          'ua': navigator.userAgent
        },
        'imp': [],
        'ext': {}
      };

      if (bidderRequest.gdprConsent &&
        bidderRequest.gdprConsent.consentString &&
        bidderRequest.gdprConsent.gdprApplies) {
        rtbBidRequest.ext.gdpr_consent = {
          consent_string: bidderRequest.gdprConsent.consentString,
          consent_required: bidderRequest.gdprConsent.gdprApplies
        };
      }

      const imp = {
        'id': transactionId,
        'instl': params.instl === 1 ? 1 : 0,
        'tagid': adUnitCode,
        'bidfloor': params.bidfloor || 0,
        'bidfloorcur': 'USD',
        'secure': helper.startsWith(utils.getTopWindowUrl().toLowerCase(), 'http://') ? 0 : 1
      };

      const hasFavoredMediaType =
        params.favoredMediaType && this.supportedMediaTypes.includes(params.favoredMediaType);

      if ((!mediaTypes || mediaTypes.banner)) {
        if (!hasFavoredMediaType || params.favoredMediaType === BANNER) {
          const bannerImp = Object.assign({}, imp, {
            banner: {
              w: sizes.length ? sizes[0][0] : 300,
              h: sizes.length ? sizes[0][1] : 250,
              pos: params.pos || 0,
              topframe: helper.getTopFrame()
            }
          });
          rtbBidRequest.imp.push(bannerImp);
        }
      }

      if (mediaTypes && mediaTypes.video) {
        if (!hasFavoredMediaType || params.favoredMediaType === VIDEO) {
          const playerSize = mediaTypes.video.playerSize || sizes;
          const videoImp = Object.assign({}, imp, {
            video: {
              w: playerSize ? playerSize[0][0] : 300,
              h: playerSize ? playerSize[0][1] : 250,
              protocols: params.protocols || [1, 2, 3, 4, 5, 6],
              pos: params.pos || 0,
              ext: {
                context: mediaTypes.video.context
              }
            }
          });
          rtbBidRequest.imp.push(videoImp);
        }
      }

      if (rtbBidRequest.imp.length === 0) {
        return;
      }

      return {method: 'POST', url: rtbEndpoint, data: rtbBidRequest, bidRequest};
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const response = serverResponse && serverResponse.body;
    if (!response) {
      utils.logError('empty response');
      return [];
    }

    const bids = response.seatbid.reduce((acc, seatBid) => acc.concat(seatBid.bid), []);
    let outBids = [];

    bids.forEach(bid => {
      const outBid = {
        requestId: bidRequest.bidRequest.bidId,
        cpm: bid.price,
        width: bid.w,
        height: bid.h,
        ttl: DEFAULT_TTL,
        creativeId: bid.crid || bid.adid,
        netRevenue: true,
        currency: bid.cur || response.cur,
        mediaType: helper.getMediaType(bid)
      };

      if (utils.deepAccess(bidRequest.bidRequest, 'mediaTypes.' + outBid.mediaType)) {
        if (outBid.mediaType === BANNER) {
          outBids.push(Object.assign({}, outBid, {ad: bid.adm}));
        } else if (outBid.mediaType === VIDEO) {
          const context = utils.deepAccess(bidRequest.bidRequest, 'mediaTypes.video.context');
          outBids.push(Object.assign({}, outBid, {
            vastUrl: bid.ext.vast_url,
            vastXml: bid.adm,
            renderer: context === 'outstream' ? newRenderer(bidRequest.bidRequest, bid) : undefined
          }));
        }
      }
    });
    return outBids;
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent) {
    const syncs = [];
    const gdprApplies = gdprConsent && (typeof gdprConsent.gdprApplies === 'boolean') ? gdprConsent.gdprApplies : false;
    const suffix = gdprApplies ? 'gc=' + encodeURIComponent(gdprConsent.consentString) : 'gc=missing';
    serverResponses.forEach(resp => {
      if (resp.body) {
        const bidResponse = resp.body;
        if (bidResponse.ext && Array.isArray(bidResponse.ext['utrk'])) {
          bidResponse.ext['utrk'].forEach(pixel => {
            const url = pixel.url + (pixel.url.indexOf('?') > 0 ? '&' + suffix : '?' + suffix);
            return syncs.push({type: pixel.type, url});
          });
        }
        if (Array.isArray(bidResponse.seatbid)) {
          bidResponse.seatbid.forEach(seatBid => {
            if (Array.isArray(seatBid.bid)) {
              seatBid.bid.forEach(bid => {
                if (bid.ext && Array.isArray(bid.ext['utrk'])) {
                  bid.ext['utrk'].forEach(pixel => {
                    const url = pixel.url + (pixel.url.indexOf('?') > 0 ? '&' + suffix : '?' + suffix);
                    return syncs.push({type: pixel.type, url});
                  });
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
  const renderer = Renderer.install({
    url: (bidRequest.params && bidRequest.params.rendererUrl) || (bid.ext && bid.ext.renderer_url) || '//s.wlplayer.com/video/latest/renderer.js',
    config: rendererOptions,
    loaded: false,
  });
  try {
    renderer.setRender(renderOutstream);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

function renderOutstream(bid) {
  bid.renderer.push(() => {
    const unitId = bid.adUnitCode + '/' + bid.adId;
    window['GamoshiPlayer'].renderAd({
      id: unitId,
      debug: window.location.href.indexOf('pbjsDebug') >= 0,
      placement: document.getElementById(bid.adUnitCode),
      width: bid.width,
      height: bid.height,
      events: {
        ALL_ADS_COMPLETED: () => window.setTimeout(() => {
          window['GamoshiPlayer'].removeAd(unitId);
        }, 300)
      },
      vastUrl: bid.vastUrl,
      vastXml: bid.vastXml
    });
  });
}

registerBidder(spec);
