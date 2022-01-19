import { logWarn, isNumber } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {config} from '../src/config.js';

const BIDDER_CODE = 'interactiveOffers';
const ENDPOINT = 'https://prebid.ioadx.com/bidRequest/?partnerId=';

const DEFAULT = {
  'OpenRTBBidRequest': {},
  'OpenRTBBidRequestSite': {},
  'OpenRTBBidRequestSitePublisher': {},
  'OpenRTBBidRequestSiteContent': {
    language: navigator.language,
  },
  'OpenRTBBidRequestSource': {},
  'OpenRTBBidRequestDevice': {
    ua: navigator.userAgent,
    language: navigator.language
  },
  'OpenRTBBidRequestUser': {},
  'OpenRTBBidRequestImp': {},
  'OpenRTBBidRequestImpBanner': {},
  'PrebidBid': {
    currency: 'USD',
    ttl: 60,
    netRevenue: false
  }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    let ret = true;
    if (bid && bid.params) {
      if (!bid.params.partnerId) {
        logWarn('partnerId must be a valid ID');
        ret = false;
      }
      if (bid.params.tmax && !isNumber(bid.params.tmax)) {
        logWarn('tmax must be a valid numeric ID');
        ret = false;
      }
    } else {
      logWarn('invalid request');
      ret = false;
    }
    return ret;
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    let aux = parseRequestPrebidjsToOpenRTB(bidderRequest);
    let payload = aux.payload;
    return {
      method: 'POST',
      url: ENDPOINT + aux.partnerId,
      data: JSON.stringify(payload),
      bidderRequest: bidderRequest
    };
  },

  interpretResponse: function(response, request) {
    let bidResponses = [];
    if (response.body) {
      if (!response.body.length) {
        response.body = [response.body];
      }
      bidResponses = parseResponseOpenRTBToPrebidjs(response.body);
    }
    return bidResponses;
  }
};

function parseRequestPrebidjsToOpenRTB(prebidRequest) {
  let ret = {
    payload: {},
    partnerId: null
  };
  let pageURL = window.location.href;
  let domain = window.location.hostname;
  let secure = (window.location.protocol == 'https:' ? 1 : 0);
  let openRTBRequest = JSON.parse(JSON.stringify(DEFAULT['OpenRTBBidRequest']));
  openRTBRequest.id = prebidRequest.auctionId;
  openRTBRequest.ext = {
    refererInfo: prebidRequest.refererInfo,
    auctionId: prebidRequest.auctionId
  };

  openRTBRequest.site = JSON.parse(JSON.stringify(DEFAULT['OpenRTBBidRequestSite']));
  openRTBRequest.site.id = domain;
  openRTBRequest.site.name = domain;
  openRTBRequest.site.domain = domain;
  openRTBRequest.site.page = pageURL;
  openRTBRequest.site.ref = prebidRequest.refererInfo.referer;

  openRTBRequest.site.publisher = JSON.parse(JSON.stringify(DEFAULT['OpenRTBBidRequestSitePublisher']));
  openRTBRequest.site.publisher.id = 0;
  openRTBRequest.site.publisher.name = config.getConfig('publisherDomain');
  openRTBRequest.site.publisher.domain = domain;
  openRTBRequest.site.publisher.domain = domain;

  openRTBRequest.site.content = JSON.parse(JSON.stringify(DEFAULT['OpenRTBBidRequestSiteContent']));

  openRTBRequest.source = JSON.parse(JSON.stringify(DEFAULT['OpenRTBBidRequestSource']));
  openRTBRequest.source.fd = 0;
  openRTBRequest.source.tid = prebidRequest.auctionId;
  openRTBRequest.source.pchain = '';

  openRTBRequest.device = JSON.parse(JSON.stringify(DEFAULT['OpenRTBBidRequestDevice']));

  openRTBRequest.user = JSON.parse(JSON.stringify(DEFAULT['OpenRTBBidRequestUser']));

  openRTBRequest.imp = [];
  prebidRequest.bids.forEach(function(bid) {
    if (!ret.partnerId) {
      ret.partnerId = bid.params.partnerId;
    }
    let imp = JSON.parse(JSON.stringify(DEFAULT['OpenRTBBidRequestImp']));
    imp.id = bid.bidId;
    imp.secure = secure;
    imp.tagid = bid.adUnitCode;
    imp.ext = {
      rawdata: bid
    };

    openRTBRequest.site.publisher.id = openRTBRequest.site.publisher.id || 0;
    openRTBRequest.tmax = openRTBRequest.tmax || bid.params.tmax || 0;

    Object.keys(bid.mediaTypes).forEach(function(mediaType) {
      if (mediaType == 'banner') {
        imp.banner = JSON.parse(JSON.stringify(DEFAULT['OpenRTBBidRequestImpBanner']));
        imp.banner.w = 0;
        imp.banner.h = 0;
        imp.banner.format = [];
        bid.mediaTypes[mediaType].sizes.forEach(function(adSize) {
          if (!imp.banner.w) {
            imp.banner.w = adSize[0];
            imp.banner.h = adSize[1];
          }
          imp.banner.format.push({w: adSize[0], h: adSize[1]});
        });
      }
    });
    openRTBRequest.imp.push(imp);
  });
  ret.payload = openRTBRequest;
  return ret;
}
function parseResponseOpenRTBToPrebidjs(openRTBResponse) {
  let prebidResponse = [];
  openRTBResponse.forEach(function(response) {
    if (response.seatbid && response.seatbid.forEach) {
      response.seatbid.forEach(function(seatbid) {
        if (seatbid.bid && seatbid.bid.forEach) {
          seatbid.bid.forEach(function(bid) {
            let prebid = JSON.parse(JSON.stringify(DEFAULT['PrebidBid']));
            prebid.requestId = bid.impid;
            prebid.ad = bid.adm;
            prebid.creativeId = bid.crid;
            prebid.cpm = bid.price;
            prebid.width = bid.w;
            prebid.height = bid.h;
            prebid.mediaType = 'banner';
            prebid.meta = {
              advertiserDomains: bid.adomain,
              advertiserId: bid.adid,
              mediaType: 'banner',
              primaryCatId: bid.cat[0] || '',
              secondaryCatIds: bid.cat
            }
            prebidResponse.push(prebid);
          });
        }
      });
    }
  });
  return prebidResponse;
}

registerBidder(spec);
