import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {Renderer} from '../src/Renderer.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

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
  aliases: ['gambid', 'cleanmedia', '9MediaOnline'],
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    return !!bid.params.supplyPartnerId && utils.isStr(bid.params.supplyPartnerId) &&
      (!bid.params['rtbEndpoint'] || utils.isStr(bid.params['rtbEndpoint'])) &&
      (!bid.params.bidfloor || utils.isNumber(bid.params.bidfloor)) &&
      (!bid.params['adpos'] || utils.isNumber(bid.params['adpos'])) &&
      (!bid.params['protocols'] || Array.isArray(bid.params['protocols'])) &&
      (!bid.params.instl || bid.params.instl === 0 || bid.params.instl === 1);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const {adUnitCode, auctionId, mediaTypes, params, sizes, transactionId} = bidRequest;
      const baseEndpoint = params['rtbEndpoint'] || ENDPOINTS['gamoshi'];
      const rtbEndpoint = `${baseEndpoint}/r/${params.supplyPartnerId}/bidr?rformat=open_rtb&reqformat=rtb_json&bidder=prebid` + (params.query ? '&' + params.query : '');
      let url = config.getConfig('pageUrl') || bidderRequest.refererInfo.referer;

      const rtbBidRequest = {
        id: auctionId,
        site: {
          domain: helper.getTopWindowDomain(url),
          page: url,
          ref: bidderRequest.refererInfo.referer
        },
        device: {
          ua: navigator.userAgent,
          dnt: utils.getDNT() ? 1 : 0,
          h: screen.height,
          w: screen.width,
          language: navigator.language
        },
        imp: [],
        ext: {},
        user: {ext: {}},
        source: {ext: {}},
        regs: {ext: {}}
      };
      const gdprConsent = bidderRequest.gdprConsent;

      if (gdprConsent && gdprConsent.consentString && gdprConsent.gdprApplies) {
        rtbBidRequest.ext.gdpr_consent = {
          consent_string: gdprConsent.consentString,
          consent_required: gdprConsent.gdprApplies
        };

        utils.deepSetValue(rtbBidRequest, 'regs.ext.gdpr', gdprConsent.gdprApplies === true ? 1 : 0);
        utils.deepSetValue(rtbBidRequest, 'user.ext.consent', gdprConsent.consentString);
      }

      if (validBidRequests[0].schain) {
        utils.deepSetValue(rtbBidRequest, 'source.ext.schain', validBidRequests[0].schain);
      }

      if (bidderRequest && bidderRequest.uspConsent) {
        utils.deepSetValue(rtbBidRequest, 'regs.ext.us_privacy', bidderRequest.uspConsent);
      }

      const imp = {
        id: transactionId,
        instl: params.instl === 1 ? 1 : 0,
        tagid: adUnitCode,
        bidfloor: params.bidfloor || 0,
        bidfloorcur: 'USD',
        secure: 1
      };

      const hasFavoredMediaType =
        params.favoredMediaType && this.supportedMediaTypes.includes(params.favoredMediaType);

      if (!mediaTypes || mediaTypes.banner) {
        if (!hasFavoredMediaType || params.favoredMediaType === BANNER) {
          const bannerImp = Object.assign({}, imp, {
            banner: {
              w: sizes.length ? sizes[0][0] : 300,
              h: sizes.length ? sizes[0][1] : 250,
              pos: params.pos || 0,
              topframe: utils.inIframe() ? 0 : 1
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
              protocols: params.protocols || [1, 2, 3, 4, 5, 6],
              pos: params.pos || 0,
              ext: {
                context: mediaTypes.video.context
              }
            }
          });

          if (utils.isArray(playerSize[0])) {
            videoImp.video.w = playerSize[0][0];
            videoImp.video.h = playerSize[0][1];
          } else if (utils.isNumber(playerSize[0])) {
            videoImp.video.w = playerSize[0];
            videoImp.video.h = playerSize[1];
          } else {
            videoImp.video.w = 300;
            videoImp.video.h = 250;
          }

          rtbBidRequest.imp.push(videoImp);
        }
      }

      let eids = [];
      if (bidRequest && bidRequest.userId) {
        addExternalUserId(eids, utils.deepAccess(bidRequest, `userId.id5id`), 'id5-sync.com', 'ID5ID');
        addExternalUserId(eids, utils.deepAccess(bidRequest, `userId.tdid`), 'adserver.org', 'TDID');
      }
      if (eids.length > 0) {
        rtbBidRequest.user.ext.eids = eids;
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

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];
    let gdprApplies = false;
    let consentString = '';
    let uspConsentString = '';

    if (gdprConsent && (typeof gdprConsent.gdprApplies === 'boolean')) {
      gdprApplies = gdprConsent.gdprApplies;
    }
    let gdpr = gdprApplies ? 1 : 0;

    if (gdprApplies && gdprConsent.consentString) {
      consentString = encodeURIComponent(gdprConsent.consentString)
    }

    if (uspConsent) {
      uspConsentString = encodeURIComponent(uspConsent);
    }

    const macroValues = {
      gdpr: gdpr,
      consent: consentString,
      uspConsent: uspConsentString
    };

    serverResponses.forEach(resp => {
      if (resp.body) {
        const bidResponse = resp.body;
        if (bidResponse.ext && Array.isArray(bidResponse.ext['utrk'])) {
          bidResponse.ext['utrk']
            .forEach(pixel => {
              const url = replaceMacros(pixel.url, macroValues);
              syncs.push({type: pixel.type, url});
            });
        }

        if (Array.isArray(bidResponse.seatbid)) {
          bidResponse.seatbid.forEach(seatBid => {
            if (Array.isArray(seatBid.bid)) {
              seatBid.bid.forEach(bid => {
                if (bid.ext && Array.isArray(bid.ext['utrk'])) {
                  bid.ext['utrk']
                    .forEach(pixel => {
                      const url = replaceMacros(pixel.url, macroValues);
                      syncs.push({type: pixel.type, url});
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
    url: (bidRequest.params && bidRequest.params.rendererUrl) || (bid.ext && bid.ext.renderer_url) || 'https://s.gamoshi.io/video/latest/renderer.js',
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

function addExternalUserId(eids, value, source, rtiPartner) {
  if (utils.isStr(value)) {
    eids.push({
      source,
      uids: [{
        id: value,
        ext: {
          rtiPartner
        }
      }]
    });
  }
}

function replaceMacros(url, macros) {
  return url
    .replace('[GDPR]', macros.gdpr)
    .replace('[CONSENT]', macros.consent)
    .replace('[US_PRIVACY]', macros.uspConsent);
}

registerBidder(spec);
