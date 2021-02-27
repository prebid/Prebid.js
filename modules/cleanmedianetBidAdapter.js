import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {Renderer} from '../src/Renderer.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import includes from 'core-js-pure/features/array/includes.js';

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
      const baseEndpoint = 'https://cleanmediaads.com/bidr/';
      const rtbEndpoint = baseEndpoint + 'p.ashx?sid=' + params.supplyPartnerId;
      let url =
        config.getConfig('pageUrl') || bidderRequest.refererInfo.referer;

      const rtbBidRequest = {
        id: auctionId,
        imp: [],
        ext: {},
        user: {
          ext: {}
        },
		bidderRequest
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

      return {
        method: 'POST',
        url: rtbEndpoint,
        data: rtbBidRequest,
        bidRequest,
        options: {
          withCredentials: false,
          crossOrigin: true
        }
      };
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const response = serverResponse && serverResponse.body;
    if (!response) {
      utils.logError('empty response');
      return [];
    }

    const bids = response.bid;
    let outBids = [];

    bids.forEach(bid => {
      const outBid = {
        requestId: bid.bidderRequest,
        bidderCode: 'cleanmedianet',
        bidder: 'cleanmedianet',
        cpm: parseFloat(bid.price),
        width: bid.width,
        height: bid.height,
        creativeId: bid.crid || bid.adId,
        currency: 'USD',
        netRevenue: true,
        ttl: 350,
        mediaType: bid.mediaType || 'banner',
        vastXml: bid.vastXml,
        ad: bid.adm,
        CMAdUnitLookupID: bid.CMAdUnitLookupID,
        CMAdLookupID: bid.CMAdLookupID
      };

      if (
        utils.deepAccess(
          bidRequest.bidRequest,
          'mediaTypes.' + outBid.mediaType
        )
      ) {
        if (outBid.mediaType === BANNER) {
          outBids.push(Object.assign({}, outBid, {ad: bid.adm}));
        } else if (outBid.mediaType === VIDEO) {
          const context = utils.deepAccess(
            bidRequest.bidRequest,
            'mediaTypes.video.context'
          );
          outBids.push(
            Object.assign({}, outBid, {
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
      'https://dtyry4ejybx0.cloudfront.net/js/vid/renderer.js',
    config: rendererOptions,
    loaded: false
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
    window['CMPlayer'].renderAd({
      id: unitId,
      debug: window.location.href.indexOf('pbjsDebug') >= 0,
      placement: document.getElementById(bid.adUnitCode),
      width: bid.width,
      height: bid.height,
      events: {
        ALL_ADS_COMPLETED: () =>
          window.setTimeout(() => {
            window['CMPlayer'].removeAd(unitId);
          }, 300)
      },
      vastUrl: bid.vastUrl,
      vastXml: bid.vastXml
    });
  });
}

registerBidder(spec);
