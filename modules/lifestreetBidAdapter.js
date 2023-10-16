import { isInteger } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'lifestreet';
const ADAPTER_VERSION = '$prebid.version$';

const urlTemplate = template`https://ads.lfstmedia.com/gate/${'adapter'}/${'slot'}?adkey=${'adkey'}&ad_size=${'ad_size'}&__location=${'location'}&__referrer=${'referrer'}&__wn=${'wn'}&__sf=${'sf'}&__fif=${'fif'}&__if=${'if'}&__stamp=${'stamp'}&__pp=1&__hb=1&_prebid_json=1&__gz=1&deferred_format=vast_2_0,vast_3_0&__hbver=${'hbver'}`;

/**
 * A helper function for template to generate string from boolean
 */
function boolToString(value) {
  return value ? '1' : '0';
}

/**
 * A helper function to form URL from the template
 */
function template(strings, ...keys) {
  return function(...values) {
    let dict = values[values.length - 1] || {};
    let result = [strings[0]];
    keys.forEach(function(key, i) {
      let value = isInteger(key) ? values[key] : dict[key];
      result.push(value, strings[i + 1]);
    });
    return result.join('');
  };
}

/**
 * Creates a bid requests for a given bid.
 *
 * @param {BidRequest} bid The bid params to use for formatting a request
 */
function formatBidRequest(bid, bidderRequest = {}) {
  const {params} = bid;
  const {referer} = (bidderRequest.refererInfo || {});
  let url = urlTemplate({
    adapter: 'prebid',
    slot: params.slot,
    adkey: params.adkey,
    ad_size: params.ad_size,
    location: referer,
    referrer: referer,
    wn: boolToString(/fb_http/i.test(window.name)),
    sf: boolToString(window['sfAPI'] || window['$sf']),
    fif: boolToString(window['inDapIF'] === true),
    if: boolToString(window !== window.top),
    stamp: new Date().getTime(),
    hbver: ADAPTER_VERSION
  });

  if (bidderRequest.gdprConsent) {
    if (bidderRequest.gdprConsent.gdprApplies !== undefined) {
      const gdpr = '&__gdpr=' + (bidderRequest.gdprConsent.gdprApplies ? '1' : '0');
      url += gdpr;
    }
    if (bidderRequest.gdprConsent.consentString !== undefined) {
      url += `&__consent=${bidderRequest.gdprConsent.consentString}`;
    }
  }

  // ccpa support
  if (bidderRequest.uspConsent) {
    url += `&__us_privacy=${bidderRequest.uspConsent}`
  }

  return {
    method: 'GET',
    url: url,
    bidId: bid.bidId
  };
}

function isResponseValid(response) {
  return !/^\s*\{\s*"advertisementAvailable"\s*:\s*false/i.test(response.content) &&
    response.content.indexOf('<VAST version="2.0"></VAST>') === -1 && /* (typeof response.cpm !== 'undefined') && */
    response.status === 1;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['lsm'],
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: (bid = {}) => {
    const {params = {}} = bid;
    return !!(params.slot && params.adkey && params.ad_size);
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    return validBidRequests.map(bid => {
      return formatBidRequest(bid, bidderRequest)
    });
  },

  interpretResponse: (serverResponse, bidRequest) => {
    const bidResponses = [];
    let response = serverResponse.body;
    if (!isResponseValid(response)) {
      return bidResponses;
    }

    const isVideo = response.content_type.indexOf('vast') > -1;
    const mediaType = isVideo ? VIDEO : BANNER;

    const bidResponse = {
      requestId: bidRequest.bidId,
      cpm: response.cpm,
      currency: response.currency ? response.currency : 'USD',
      width: response.width,
      height: response.height,
      creativeId: response.creativeId,
      netRevenue: response.netRevenue ? response.netRevenue : true,
      ttl: response.ttl ? response.ttl : 86400,
      mediaType,
      meta: {
        mediaType,
        advertiserDomains: response.advertiserDomains
      }
    };

    if (response.hasOwnProperty('dealId')) {
      bidResponse.dealId = response.dealId;
    }
    if (isVideo) {
      if (typeof response.vastUrl !== 'undefined') {
        bidResponse.vastUrl = response.vastUrl;
      } else {
        bidResponse.vastXml = response.content;
      }
    } else {
      bidResponse.ad = response.content;
    }

    bidResponses.push(bidResponse);
    return bidResponses;
  }
};

registerBidder(spec);
