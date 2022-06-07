import {deepAccess, getDNT, inIframe, isArray, isNumber, logError, logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {Renderer} from '../src/Renderer.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {includes} from '../src/polyfill.js';

export const helper = {
  getTopWindowDomain: function (url) {
    const domainStart = url.indexOf('://') + '://'.length;
    return url.substring(domainStart, url.indexOf('/', domainStart) < 0 ? url.length : url.indexOf('/', domainStart));
  },
  startsWith: function (str, search) {
    return str.substr(0, search.length) === search;
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
  code: 'cleanmedianet',
  aliases: [],
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function (bid) {
    return (
      !!bid.params.supplyPartnerId &&
      typeof bid.params.supplyPartnerId === 'string' &&
      (typeof bid.params.bidfloor === 'undefined' ||
        typeof bid.params.bidfloor === 'number') &&
      (typeof bid.params['adpos'] === 'undefined' ||
        typeof bid.params['adpos'] === 'number') &&
      (typeof bid.params['protocols'] === 'undefined' ||
        Array.isArray(bid.params['protocols'])) &&
      (typeof bid.params.instl === 'undefined' ||
        bid.params.instl === 0 ||
        bid.params.instl === 1)
    );
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const {
        adUnitCode,
        auctionId,
        mediaTypes,
        params,
        sizes,
        transactionId
      } = bidRequest;
      const baseEndpoint = 'https://bidder.cleanmediaads.com';
      const rtbEndpoint =
        `${baseEndpoint}/r/${
          params.supplyPartnerId
        }/bidr?rformat=open_rtb&reqformat=rtb_json&bidder=prebid` +
        (params.query ? '&' + params.query : '');
      let url = bidderRequest.refererInfo.page;

      const rtbBidRequest = {
        id: auctionId,
        site: {
          domain: bidderRequest.refererInfo.domain,
          page: url,
          ref: bidderRequest.refererInfo.ref
        },
        device: {
          ua: navigator.userAgent,
          dnt: getDNT() ? 1 : 0,
          h: screen.height,
          w: screen.width,
          language: navigator.language
        },
        imp: [],
        ext: {},
        user: {
          ext: {}
        }
      };

      if (
        bidderRequest.gdprConsent &&
        bidderRequest.gdprConsent.consentString &&
        bidderRequest.gdprConsent.gdprApplies
      ) {
        rtbBidRequest.ext.gdpr_consent = {
          consent_string: bidderRequest.gdprConsent.consentString,
          consent_required: bidderRequest.gdprConsent.gdprApplies
        };
        rtbBidRequest.regs = {
          ext: {
            gdpr: bidderRequest.gdprConsent.gdprApplies === true ? 1 : 0
          }
        };
        rtbBidRequest.user = {
          ext: {
            consent: bidderRequest.gdprConsent.consentString
          }
        }
      }

      const imp = {
        id: transactionId,
        instl: deepAccess(bidRequest.ortb2Imp, 'instl') === 1 || params.instl === 1 ? 1 : 0,
        tagid: adUnitCode,
        bidfloor: 0,
        bidfloorcur: 'USD',
        secure: 1
      };

      const hasFavoredMediaType =
        params.favoredMediaType &&
        includes(this.supportedMediaTypes, params.favoredMediaType);

      if (!mediaTypes || mediaTypes.banner) {
        if (!hasFavoredMediaType || params.favoredMediaType === BANNER) {
          const bannerImp = Object.assign({}, imp, {
            banner: {
              w: sizes.length ? sizes[0][0] : 300,
              h: sizes.length ? sizes[0][1] : 250,
              pos: params.pos || 0,
              topframe: inIframe() ? 0 : 1
            }
          });
          rtbBidRequest.imp.push(bannerImp);
        }
      }

      if (mediaTypes && mediaTypes.video) {
        if (!hasFavoredMediaType || params.favoredMediaType === VIDEO) {
          let videoImp = {
            video: {
              protocols: params.protocols || [1, 2, 3, 4, 5, 6],
              pos: params.pos || 0,
              ext: {context: mediaTypes.video.context}
            }
          };

          let playerSize = mediaTypes.video.playerSize || sizes;
          if (isArray(playerSize[0])) {
            videoImp.video.w = playerSize[0][0];
            videoImp.video.h = playerSize[0][1];
          } else if (isNumber(playerSize[0])) {
            videoImp.video.w = playerSize[0];
            videoImp.video.h = playerSize[1];
          } else {
            videoImp.video.w = 300;
            videoImp.video.h = 250;
          }

          videoImp = Object.assign({}, imp, videoImp);
          rtbBidRequest.imp.push(videoImp);
        }
      }

      if (rtbBidRequest.imp.length === 0) {
        return;
      }

      return {
        method: 'POST',
        url: rtbEndpoint,
        data: rtbBidRequest,
        bidRequest
      };
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const response = serverResponse && serverResponse.body;
    if (!response) {
      logError('empty response');
      return [];
    }

    const bids = response.seatbid.reduce(
      (acc, seatBid) => acc.concat(seatBid.bid),
      []
    );
    let outBids = [];

    bids.forEach(bid => {
      const outBid = {
        requestId: bidRequest.bidRequest.bidId,
        cpm: bid.price,
        width: bid.w,
        height: bid.h,
        ttl: 360,
        creativeId: bid.crid || bid.adid,
        netRevenue: true,
        currency: bid.cur || response.cur,
        mediaType: helper.getMediaType(bid)
      };

      if (
        deepAccess(
          bidRequest.bidRequest,
          'mediaTypes.' + outBid.mediaType
        )
      ) {
        if (outBid.mediaType === BANNER) {
          outBids.push(Object.assign({}, outBid, {ad: bid.adm}));
        } else if (outBid.mediaType === VIDEO) {
          const context = deepAccess(
            bidRequest.bidRequest,
            'mediaTypes.video.context'
          );
          outBids.push(
            Object.assign({}, outBid, {
              vastUrl: bid.ext.vast_url,
              vastXml: bid.adm,
              renderer:
                context === 'outstream'
                  ? newRenderer(bidRequest.bidRequest, bid)
                  : undefined
            })
          );
        }
      }
    });
    return outBids;
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent) {
    const syncs = [];
    const gdprApplies =
      gdprConsent && typeof gdprConsent.gdprApplies === 'boolean'
        ? gdprConsent.gdprApplies
        : false;
    const suffix = gdprApplies
      ? 'gc=' + encodeURIComponent(gdprConsent.consentString)
      : 'gc=missing';
    serverResponses.forEach(resp => {
      if (resp.body) {
        const bidResponse = resp.body;
        if (bidResponse.ext && Array.isArray(bidResponse.ext['utrk'])) {
          bidResponse.ext['utrk'].forEach(pixel => {
            const url =
              pixel.url +
              (pixel.url.indexOf('?') > 0 ? '&' + suffix : '?' + suffix);
            return syncs.push({type: pixel.type, url});
          });
        }
        if (Array.isArray(bidResponse.seatbid)) {
          bidResponse.seatbid.forEach(seatBid => {
            if (Array.isArray(seatBid.bid)) {
              seatBid.bid.forEach(bid => {
                if (bid.ext && Array.isArray(bid.ext['utrk'])) {
                  bid.ext['utrk'].forEach(pixel => {
                    const url =
                      pixel.url +
                      (pixel.url.indexOf('?') > 0
                        ? '&' + suffix
                        : '?' + suffix);
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
    url:
      (bidRequest.params && bidRequest.params.rendererUrl) ||
      (bid.ext && bid.ext.renderer_url) ||
      'https://s.wlplayer.com/video/latest/renderer.js',
    config: rendererOptions,
    loaded: false
  });
  try {
    renderer.setRender(renderOutstream);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
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
        ALL_ADS_COMPLETED: () =>
          window.setTimeout(() => {
            window['GamoshiPlayer'].removeAd(unitId);
          }, 300)
      },
      vastUrl: bid.vastUrl,
      vastXml: bid.vastXml
    });
  });
}

registerBidder(spec);
