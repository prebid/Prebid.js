import * as utils from 'src/utils';
import { config } from 'src/config';
import { registerBidder } from 'src/adapters/bidderFactory';
const BIDDER_CODE = 'underdogmedia';
const UDM_ADAPTER_VERSION = '1.0';

export const spec = {
  code: BIDDER_CODE,
  bidParams: [],

  isBidRequestValid: function (bid) {
    return !!((bid.params && bid.params.siteId) && (bid.sizes && bid.sizes.length > 0));
  },

  buildRequests: function (validBidRequests) {
    var sizes = [];
    var siteId = 0;

    validBidRequests.forEach(bidParam => {
      sizes = utils.flatten(sizes, utils.parseSizesInput(bidParam.sizes));
      siteId = bidParam.params.siteId;
    });

    return {
      method: 'GET',
      url: `${window.location.protocol}//udmserve.net/udm/img.fetch`,
      data: `tid=1;dt=10;sid=${siteId};sizes=${sizes.join(',')}`,
      bidParams: validBidRequests
    };
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

        var size_not_found = true;
        utils.parseSizesInput(bidParam.sizes).forEach(size => {
          if (size === mid.width + 'x' + mid.height) {
            size_not_found = false;
          }
        });

        if (size_not_found) {
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

function makeNotification (bid, mid, bidParam) {
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
