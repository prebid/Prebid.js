import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

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
        auctionId,
        mediaTypes,
        params,
        sizes
      } = bidRequest;

      const baseEndpoint = 'https://cleanmediaads.com/bidr/';
      const rtbEndpoint = baseEndpoint + '?sid=' + params.supplyPartnerId + '&mt=' + ((mediaTypes && mediaTypes.video) ? 'video' : 'banner') + '&width=' + escape(JSON.stringify(mediaTypes)) + '&height=' + escape(JSON.stringify(sizes)) + '&bidderRequest=' + escape(JSON.stringify(bidderRequest)) + '&SiteURL=' + escape(top.window.location.href);

      let url =
        config.getConfig('pageUrl') || bidderRequest.refererInfo.referer;

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

    let errBcode = '';
    const bids = response.bid;
    let outBids = [];
    if (bids === undefined || bids.length == 0) {
      errBcode = ' ';
    } else {
      bids.forEach(function (bid) {
        let bidResponse = {
          requestId: bid.bidderRequest,
          bidderCode: errBcode,
          cpm: parseFloat(bid.price),
          width: bid.width,
          height: bid.height,
          creativeId: bid.crid || bid.adId,
          currency: 'USD',
          netRevenue: true,
          ttl: 350,
          mediaType: bid.mediaType || 'banner'
        };

        if (bidResponse.mediaType === 'video') {
          bidResponse.vastUrl = bid.vastUrl;
          bidResponse.ttl = 600;
        } else {
          bidResponse.ad = bid.adm;
        }

        outBids.push(bidResponse);
      });
    }

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

registerBidder(spec);
