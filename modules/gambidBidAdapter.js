import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';

function getTopFrame() {
  try {
    return window.top === window ? 1 : 0;
  } catch (e) {
    return 0;
  }
}

function startsWith(str, search) {
  return str.substr(0, search.length) === search;
}

function getTopWindowDomain() {
  const url = utils.getTopWindowUrl();
  const domainStart = url.indexOf('://') + '://'.length;
  return url.substring(domainStart, url.indexOf('/', domainStart) < 0 ? url.length : url.indexOf('/', domainStart));
}

function getTopWindowReferer() {
  try {
    return window.top.document.referrer;
  } catch (e) {
    utils.logMessage('Failed obtaining top window\'s referrer: ', e);
    try {
      return window.document.referrer;
    } catch (e) {
      utils.logMessage('Failed obtaining current window\'s referrer: ', e);
      return '';
    }
  }
}

export const spec = {
  code: 'gambid',
  aliases: [],
  supportedMediaTypes: [ 'banner', 'video' ],

  isBidRequestValid: function(bid) {
    return !!bid.params.supplyPartnerId && typeof bid.params.supplyPartnerId === 'string' &&
           (typeof bid.params[ 'rtbEndpoint' ] === 'undefined' || typeof bid.params[ 'rtbEndpoint' ] === 'string') &&
           (typeof bid.params.bidfloor === 'undefined' || typeof bid.params.bidfloor === 'number') &&
           (typeof bid.params[ 'adpos' ] === 'undefined' || typeof bid.params[ 'adpos' ] === 'number') &&
           (typeof bid.params[ 'protocols' ] === 'undefined' || Array.isArray(bid.params[ 'protocols' ])) &&
           (typeof bid.params.instl === 'undefined' || bid.params.instl === 0 || bid.params.instl === 1);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const { adUnitCode, auctionId, mediaTypes, params, sizes, transactionId } = bidRequest;
      const baseEndpoint = params[ 'rtbEndpoint' ] || 'https://rtb.gambid.io';
      const rtbEndpoint = `${baseEndpoint}/r/${params.supplyPartnerId}/bidr?rformat=open_rtb&bidder=prebid` + (params.query ? '&' + params.query : '');
      const rtbBidRequest = {
        'id': auctionId,
        'site': {
          'domain': getTopWindowDomain(),
          'page': config.getConfig('pageUrl') || utils.getTopWindowUrl(),
          'ref': getTopWindowReferer()
        },
        'device': {
          'ua': navigator.userAgent
        },
        'imp': [],
        'ext': {}
      };
      if (bidderRequest && bidderRequest.gdprConsent) {
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
        'secure': startsWith(utils.getTopWindowUrl().toLowerCase(), 'http://') ? 0 : 1
      };

      if (!mediaTypes || mediaTypes.banner) {
        imp.banner = {
          w: sizes.length ? sizes[ 0 ][ 0 ] : 300,
          h: sizes.length ? sizes[ 0 ][ 1 ] : 250,
          pos: params.pos || 0,
          topframe: getTopFrame()
        };
      } else if (mediaTypes.video) {
        imp.video = {
          w: sizes.length ? sizes[ 0 ][ 0 ] : 300,
          h: sizes.length ? sizes[ 0 ][ 1 ] : 250,
          protocols: params.protocols || [1, 2, 3, 4, 5, 6],
          pos: params.pos || 0,
          topframe: getTopFrame()
        };
      } else {
        return;
      }
      rtbBidRequest.imp.push(imp);
      return { method: 'POST', url: rtbEndpoint, data: rtbBidRequest, bidRequest };
    });
  },

  interpretResponse: function(serverResponse, bidRequest) {
    const response = serverResponse && serverResponse.body;
    if (!response) {
      utils.logError('empty response');
      return [];
    }

    const bids = response.seatbid.reduce((acc, seatBid) => acc.concat(seatBid.bid), []);
    const outBids = [];
    bids.forEach(bid => {
      const outBid = {
        requestId: bidRequest.bidRequest.bidId,
        cpm: bid.price,
        width: bid.w,
        height: bid.h,
        ttl: 60 * 10,
        creativeId: bid.crid,
        netRevenue: true,
        currency: bid.cur || response.cur
      };
      if (!bidRequest.bidRequest.mediaTypes || bidRequest.bidRequest.mediaTypes.banner) {
        outBids.push(Object.assign({}, outBid, { ad: bid.adm }));
      } else if (bidRequest.bidRequest.mediaTypes && bidRequest.bidRequest.mediaTypes.video) {
        outBids.push(Object.assign({}, outBid, { vastXml: bid.adm }));
      }
    });
    return outBids;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    const syncs = [];
    const gdprApplies = gdprConsent && (typeof gdprConsent.gdprApplies === 'boolean') ? gdprConsent.gdprApplies : false;
    const suffix = gdprApplies ? 'gc=' + encodeURIComponent(gdprConsent.consentString) : 'gc=missing';
    serverResponses.forEach(resp => {
      if (resp.body) {
        const bidResponse = resp.body;
        if (bidResponse.ext && Array.isArray(bidResponse.ext[ 'utrk' ])) {
          bidResponse.ext[ 'utrk' ].forEach(pixel => {
            const url = pixel.url + (pixel.url.indexOf('?') > 0 ? '&' + suffix : '?' + suffix);
            return syncs.push({ type: pixel.type, url });
          });
        }
        if (Array.isArray(bidResponse.seatbid)) {
          bidResponse.seatbid.forEach(seatBid => {
            if (Array.isArray(seatBid.bid)) {
              seatBid.bid.forEach(bid => {
                if (bid.ext && Array.isArray(bid.ext[ 'utrk' ])) {
                  bid.ext[ 'utrk' ].forEach(pixel => {
                    const url = pixel.url + (pixel.url.indexOf('?') > 0 ? '&' + suffix : '?' + suffix);
                    return syncs.push({ type: pixel.type, url });
                  });
                }
              });
            }
          });
        }
      }
    });
    return syncs;
  },

  onTimeout: function(data) {
    utils.logWarn('Gambid request timed out.', data);
  }
};
registerBidder(spec);
