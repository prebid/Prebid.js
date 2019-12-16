import * as utils from '../src/utils';
import { config } from '../src/config';
import { registerBidder } from '../src/adapters/bidderFactory';
const BIDDER_CODE = 'underdogmedia';
const UDM_ADAPTER_VERSION = '3.0V';
const UDM_VENDOR_ID = '159';
const prebidVersion = '$prebid.version$';

utils.logMessage(`Initializing UDM Adapter. PBJS Version: ${prebidVersion} with adapter version: ${UDM_ADAPTER_VERSION}  Updated 20191028`);

export const spec = {
  code: BIDDER_CODE,
  bidParams: [],

  isBidRequestValid: function (bid) {
    const bidSizes = bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes ? bid.mediaTypes.banner.sizes : bid.sizes;
    return !!((bid.params && bid.params.siteId) && (bidSizes && bidSizes.length > 0));
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    var sizes = [];
    var siteId = 0;

    validBidRequests.forEach(bidParam => {
      let bidParamSizes = bidParam.mediaTypes && bidParam.mediaTypes.banner && bidParam.mediaTypes.banner.sizes ? bidParam.mediaTypes.banner.sizes : bidParam.sizes;
      sizes = utils.flatten(sizes, utils.parseSizesInput(bidParamSizes));
      siteId = bidParam.params.siteId;
    });

    let data = {
      tid: 1,
      dt: 10,
      sid: siteId,
      sizes: sizes.join(',')
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
        data.gdprApplies = !!(bidderRequest.gdprConsent.gdprApplies);
      }
      if (bidderRequest.gdprConsent.vendorData && bidderRequest.gdprConsent.vendorData.vendorConsents &&
        typeof bidderRequest.gdprConsent.vendorData.vendorConsents[UDM_VENDOR_ID] !== 'undefined') {
        data.consentGiven = !!(bidderRequest.gdprConsent.vendorData.vendorConsents[UDM_VENDOR_ID]);
      }
      if (typeof bidderRequest.gdprConsent.consentString !== 'undefined') {
        data.consentData = bidderRequest.gdprConsent.consentString;
      }
    }

    if (!data.gdprApplies || data.consentGiven) {
      return {
        method: 'GET',
        url: 'https://udmserve.net/udm/img.fetch',
        data: data,
        bidParams: validBidRequests
      };
    }
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    bidRequest.bidParams.forEach(bidParam => {
      serverResponse.body.mids.forEach(mid => {
        if (mid.useCount > 0) {
          return;
        }

        if (!mid.useCount) {
          mid.useCount = 0;
        }

        var sizeNotFound = true;
        const bidParamSizes = bidParam.mediaTypes && bidParam.mediaTypes.banner && bidParam.mediaTypes.banner.sizes ? bidParam.mediaTypes.banner.sizes : bidParam.sizes
        utils.parseSizesInput(bidParamSizes).forEach(size => {
          if (size === mid.width + 'x' + mid.height) {
            sizeNotFound = false;
          }
        });

        if (sizeNotFound) {
          return;
        }

        const bidResponse = {
          requestId: bidParam.bidId,
          bidderCode: spec.code,
          cpm: parseFloat(mid.cpm),
          width: mid.width,
          height: mid.height,
          ad: mid.ad_code_html,
          creativeId: mid.mid,
          currency: 'USD',
          netRevenue: false,
          ttl: config.getConfig('_bidderTimeout'),
        };

        if (bidResponse.cpm <= 0) {
          return;
        }
        if (bidResponse.ad.length <= 0) {
          return;
        }

        mid.useCount++;

        bidResponse.ad += makeNotification(bidResponse, mid, bidParam);

        bidResponses.push(bidResponse);
      });
    });

    return bidResponses;
  },
};

function makeNotification(bid, mid, bidParam) {
  var url = mid.notification_url;

  url += UDM_ADAPTER_VERSION;
  url += ';cb=' + Math.random();
  url += ';qqq=' + (1 / bid.cpm);
  url += ';hbt=' + config.getConfig('_bidderTimeout');
  url += ';style=adapter';
  url += ';vis=' + encodeURIComponent(document.visibilityState);

  url += ';traffic_info=' + encodeURIComponent(JSON.stringify(getUrlVars()));
  if (bidParam.params.subId) {
    url += ';subid=' + encodeURIComponent(bidParam.params.subId);
  }
  return '<script async src="' + url + '"></script>';
}

function getUrlVars() {
  var vars = {};
  var hash;
  var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  for (var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    if (hash[0].match(/^utm_/)) {
      vars[hash[0]] = hash[1].substr(0, 150);
    }
  }
  return vars;
}

registerBidder(spec);
