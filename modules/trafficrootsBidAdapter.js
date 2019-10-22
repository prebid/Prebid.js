import {registerBidder} from '../src/adapters/bidderFactory';
import * as utils from '../src/utils';

const TR_BIDDER_CODE = 'trafficroots';
const TR_CURRENCY = 'USD';
const TR_DEFAULT_BID_URL = 'https://service.trafficroots.com/prebid';
const TR_TTL = 60;

const LOCATION_PARAM_NAME = 'siteurl';
const ID_PARAM_NAME = 'id';
const IFRAME_PARAM_NAME = 'if';
const ZONE_ID_PARAM_NAME = 'zoneId';
const SIZE_PARAM_NAME = 'size';
const KEYWORDS_PARAM_NAME = 'keywords';
const MOBILE_PARAM_NAME = 'mobile';
const TRID_PARAM_NAME = 'trid';

const ARRAY_PARAM_SEPARATOR = ';';
const ARRAY_SIZE_SEPARATOR = ',';
const SIZE_SEPARATOR = 'x';
const IS_MOBILE = window.navigator.userAgent.toLowerCase().indexOf('mobi');

let keywords = () => {
  let clean = input => {
    return input.replace(/\W/g, ' ').replace(/[ ]{2,}/g, ' ').trim();
  };
  let meta = name => {
    let tag = document.querySelector("meta[name='" + name + "']");
    return (tag !== null) ? tag.getAttribute('content') : '';
  };
  return encodeURIComponent(
    clean(
      meta('keywords') + ' ' + meta('description') + ' ' + document.title
    )
  ).substring(0, 400);
};

export const spec = {
  code: TR_BIDDER_CODE,
  isBidRequestValid: function(bid) {
    return bid.params && !!bid.params.zoneId;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    let deliveryUrl = '';
    const idParams = [];
    const sizeParams = [];
    const zoneIds = [];
    let trid = '';
    if (window.localStorage) {
      try {
        var myid = window.localStorage.getItem('trafficroots:trid');
        if (myid) {
          trid = myid;
        }
      } catch (ex) {
      }
    }
    utils._each(validBidRequests, function(bid) {
      if (!deliveryUrl && typeof bid.params.deliveryUrl === 'string') {
        deliveryUrl = bid.params.deliveryUrl;
      }
      idParams.push(bid.bidId);
      sizeParams.push(bid.sizes.map(size => size.join(SIZE_SEPARATOR)).join(ARRAY_SIZE_SEPARATOR));
      zoneIds.push(bid.params.zoneId);
    });

    if (!deliveryUrl) {
      deliveryUrl = TR_DEFAULT_BID_URL;
    }

    let data = {
      [IFRAME_PARAM_NAME]: 0,
      [LOCATION_PARAM_NAME]: utils.getTopWindowUrl(),
      [SIZE_PARAM_NAME]: sizeParams.join(ARRAY_PARAM_SEPARATOR),
      [ID_PARAM_NAME]: idParams.join(ARRAY_PARAM_SEPARATOR),
      [ZONE_ID_PARAM_NAME]: zoneIds.join(ARRAY_PARAM_SEPARATOR),
      [MOBILE_PARAM_NAME]: IS_MOBILE,
      [KEYWORDS_PARAM_NAME]: decodeURIComponent(keywords()),
      [TRID_PARAM_NAME]: trid
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      data.gdpr = {
        applies: bidderRequest.gdprConsent.gdprApplies,
        consent: bidderRequest.gdprConsent.consentString
      };
    }

    return {
      method: 'GET',
      url: deliveryUrl,
      data: data
    };
  },

  interpretResponse: function(serverResponses, request) {
    const bidResponses = [];
    var tridSet = false;
    utils._each(serverResponses.body, function(response) {
      if (!tridSet) {
        try {
          if (window.localStorage) {
            window.localStorage.setItem('trafficroots:trid', response.trid);
            tridSet = true;
          }
        } catch (ex) {}
      }
      if (response.cpm > 0) {
        const bidResponse = {
          requestId: response.id,
          creativeId: response.id,
          adId: response.id,
          cpm: response.cpm,
          width: response.width,
          height: response.height,
          currency: TR_CURRENCY,
          netRevenue: true,
          ttl: TR_TTL,
          ad: response.ad
        };
        bidResponses.push(bidResponse);
      }
    });
    return bidResponses;
  }
};

registerBidder(spec);
