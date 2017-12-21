import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';
import constants from 'src/constants.json';

const AOL_BIDDERS_CODES = {
  AOL: 'aol',
  ONEMOBILE: 'onemobile',
  ONEDISPLAY: 'onedisplay'
};

const AOL_ENDPOINTS = {
  DISPLAY: {
    GET: 'display-get'
  },
  MOBILE: {
    GET: 'mobile-get',
    POST: 'mobile-post'
  }
};

const SYNC_TYPES = {
  IFRAME: {
    TAG: 'iframe',
    TYPE: 'iframe'
  },
  IMAGE: {
    TAG: 'img',
    TYPE: 'image'
  }
};

const pubapiTemplate = template`//${'host'}/pubapi/3.0/${'network'}/${'placement'}/${'pageid'}/${'sizeid'}/ADTECH;v=2;cmd=bid;cors=yes;alias=${'alias'}${'bidfloor'}${'keyValues'};misc=${'misc'}`;
const nexageBaseApiTemplate = template`//${'host'}/bidRequest?`;
const nexageGetApiTemplate = template`dcn=${'dcn'}&pos=${'pos'}&cmd=bid${'ext'}`;
const MP_SERVER_MAP = {
  us: 'adserver-us.adtech.advertising.com',
  eu: 'adserver-eu.adtech.advertising.com',
  as: 'adserver-as.adtech.advertising.com'
};
const NEXAGE_SERVER = 'hb.nexage.com';
const BID_RESPONSE_TTL = 300;

$$PREBID_GLOBAL$$.aolGlobals = {
  pixelsDropped: false
};

let showCpmAdjustmentWarning = (function () {
  let showCpmWarning = true;

  return function () {
    let bidderSettings = $$PREBID_GLOBAL$$.bidderSettings;
    if (showCpmWarning && bidderSettings && bidderSettings.aol &&
      typeof bidderSettings.aol.bidCpmAdjustment === 'function') {
      utils.logWarn(
        'bidCpmAdjustment is active for the AOL adapter. ' +
        'As of Prebid 0.14, AOL can bid in net – please contact your accounts team to enable.'
      );
      showCpmWarning = false; // warning is shown at most once
    }
  };
})();

function isInteger(value) {
  return typeof value === 'number' &&
    isFinite(value) &&
    Math.floor(value) === value;
}

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

function isSecureProtocol() {
  return document.location.protocol === 'https:';
}

function parsePixelItems(pixels) {
  let itemsRegExp = /(img|iframe)[\s\S]*?src\s*=\s*("|')(.*?)\2/gi;
  let tagNameRegExp = /\w*(?=\s)/;
  let srcRegExp = /src=("|')(.*?)\1/;
  let pixelsItems = [];

  if (pixels) {
    let matchedItems = pixels.match(itemsRegExp);
    if (matchedItems) {
      matchedItems.forEach(item => {
        let tagName = item.match(tagNameRegExp)[0];
        let url = item.match(srcRegExp)[2];

        if (tagName && tagName) {
          pixelsItems.push({
            type: tagName === SYNC_TYPES.IMAGE.TAG ? SYNC_TYPES.IMAGE.TYPE : SYNC_TYPES.IFRAME.TYPE,
            url: url
          });
        }
      });
    }
  }

  return pixelsItems;
}

function _buildMarketplaceUrl(bid) {
  const params = bid.params;
  const serverParam = params.server;
  let regionParam = params.region || 'us';
  let server;

  if (!MP_SERVER_MAP.hasOwnProperty(regionParam)) {
    utils.logWarn(`Unknown region '${regionParam}' for AOL bidder.`);
    regionParam = 'us'; // Default region.
  }

  if (serverParam) {
    server = serverParam;
  } else {
    server = MP_SERVER_MAP[regionParam];
  }

  // Set region param, used by AOL analytics.
  params.region = regionParam;

  return pubapiTemplate({
    host: server,
    network: params.network,
    placement: parseInt(params.placement),
    pageid: params.pageId || 0,
    sizeid: params.sizeId || 0,
    alias: params.alias || utils.getUniqueIdentifierStr(),
    bidfloor: formatMarketplaceBidFloor(params.bidFloor),
    keyValues: formatMarketplaceKeyValues(params.keyValues),
    misc: new Date().getTime() // cache busting
  });
}

function formatMarketplaceBidFloor(bidFloor) {
  return (typeof bidFloor !== 'undefined') ? `;bidfloor=${bidFloor.toString()}` : '';
}

function formatMarketplaceKeyValues(keyValues) {
  let formattedKeyValues = '';

  utils._each(keyValues, (value, key) => {
    formattedKeyValues += `;kv${key}=${encodeURIComponent(value)}`;
  });

  return formattedKeyValues;
}

function _buildOneMobileBaseUrl(bid) {
  return nexageBaseApiTemplate({
    host: bid.params.host || NEXAGE_SERVER
  });
}

function _buildOneMobileGetUrl(bid) {
  let {dcn, pos} = bid.params;
  let nexageApi = _buildOneMobileBaseUrl(bid);
  if (dcn && pos) {
    let ext = '';
    if (isSecureProtocol()) {
      bid.params.ext = bid.params.ext || {};
      bid.params.ext.secure = 1;
    }
    utils._each(bid.params.ext, (value, key) => {
      ext += `&${key}=${encodeURIComponent(value)}`;
    });
    nexageApi += nexageGetApiTemplate({dcn, pos, ext});
  }
  return nexageApi;
}

function _parseBidResponse(response, bidRequest) {
  let bidData;

  try {
    bidData = response.seatbid[0].bid[0];
  } catch (e) {
    return;
  }

  let cpm;

  if (bidData.ext && bidData.ext.encp) {
    cpm = bidData.ext.encp;
  } else {
    cpm = bidData.price;

    if (cpm === null || isNaN(cpm)) {
      utils.logError('Invalid price in bid response', AOL_BIDDERS_CODES.AOL, bid);
      return;
    }
  }

  let ad = bidData.adm;
  if (response.ext && response.ext.pixels) {
    if (config.getConfig('aol.userSyncOn') !== constants.EVENTS.BID_RESPONSE) {
      let formattedPixels = response.ext.pixels.replace(/<\/?script( type=('|")text\/javascript('|")|)?>/g, '');

      ad += '<script>if(!parent.$$PREBID_GLOBAL$$.aolGlobals.pixelsDropped){' +
        'parent.$$PREBID_GLOBAL$$.aolGlobals.pixelsDropped=true;' + formattedPixels +
        '}</script>';
    }
  }

  return {
    bidderCode: bidRequest.bidderCode,
    requestId: bidRequest.bidId,
    ad: ad,
    cpm: cpm,
    width: bidData.w,
    height: bidData.h,
    creativeId: bidData.crid,
    pubapiId: response.id,
    currency: response.cur,
    dealId: bidData.dealid,
    netRevenue: true,
    ttl: BID_RESPONSE_TTL
  };
}

function _isMarketplaceBidder(bidder) {
  return bidder === AOL_BIDDERS_CODES.AOL || bidder === AOL_BIDDERS_CODES.ONEDISPLAY;
}

function _isNexageBidder(bidder) {
  return bidder === AOL_BIDDERS_CODES.AOL || bidder === AOL_BIDDERS_CODES.ONEMOBILE;
}

function _isNexageRequestPost(bid) {
  if (_isNexageBidder(bid.bidder) && bid.params.id && bid.params.imp && bid.params.imp[0]) {
    let imp = bid.params.imp[0];
    return imp.id && imp.tagid &&
      ((imp.banner && imp.banner.w && imp.banner.h) ||
        (imp.video && imp.video.mimes && imp.video.minduration && imp.video.maxduration));
  }
}

function _isNexageRequestGet(bid) {
  return _isNexageBidder(bid.bidder) && bid.params.dcn && bid.params.pos;
}

function isMarketplaceBid(bid) {
  return _isMarketplaceBidder(bid.bidder) && bid.params.placement && bid.params.network;
}

function isMobileBid(bid) {
  return _isNexageRequestGet(bid) || _isNexageRequestPost(bid);
}

function resolveEndpointCode(bid) {
  if (_isNexageRequestGet(bid)) {
    return AOL_ENDPOINTS.MOBILE.GET;
  } else if (_isNexageRequestPost(bid)) {
    return AOL_ENDPOINTS.MOBILE.POST;
  } else if (isMarketplaceBid(bid)) {
    return AOL_ENDPOINTS.DISPLAY.GET;
  }
}

function formatBidRequest(endpointCode, bid) {
  let bidRequest;

  switch (endpointCode) {
    case AOL_ENDPOINTS.DISPLAY.GET:
      bidRequest = {
        url: _buildMarketplaceUrl(bid),
        method: 'GET'
      };
      break;

    case AOL_ENDPOINTS.MOBILE.GET:
      bidRequest = {
        url: _buildOneMobileGetUrl(bid),
        method: 'GET'
      };
      break;

    case AOL_ENDPOINTS.MOBILE.POST:
      bidRequest = {
        url: _buildOneMobileBaseUrl(bid),
        method: 'POST',
        data: bid.params,
        options: {
          contentType: 'application/json',
          customHeaders: {
            'x-openrtb-version': '2.2'
          }
        }
      };
      break;
  }

  bidRequest.bidderCode = bid.bidder;
  bidRequest.bidId = bid.bidId;
  bidRequest.userSyncOn = bid.params.userSyncOn;

  return bidRequest;
}

function interpretResponse({body}, bidRequest) {
  showCpmAdjustmentWarning();

  if (!body) {
    utils.logError('Empty bid response', bidRequest.bidderCode, body);
  } else {
    let bid = _parseBidResponse(body, bidRequest);

    if (bid) {
      return bid;
    }
  }
}

export const spec = {
  code: AOL_BIDDERS_CODES.AOL,
  aliases: [AOL_BIDDERS_CODES.ONEMOBILE, AOL_BIDDERS_CODES.ONEDISPLAY],
  isBidRequestValid: function(bid) {
    return isMarketplaceBid(bid) || isMobileBid(bid);
  },
  buildRequests: function (bids) {
    return bids.map(bid => {
      const endpointCode = resolveEndpointCode(bid);

      if (endpointCode) {
        return formatBidRequest(endpointCode, bid);
      }
    });
  },
  interpretResponse: interpretResponse,
  getUserSyncs: function(options, bidResponses) {
    let bidResponse = bidResponses[0];

    if (config.getConfig('aol.userSyncOn') === constants.EVENTS.BID_RESPONSE) {
      if (!$$PREBID_GLOBAL$$.aolGlobals.pixelsDropped && bidResponse.ext && bidResponse.ext.pixels) {
        $$PREBID_GLOBAL$$.aolGlobals.pixelsDropped = true;

        return parsePixelItems(bidResponse.ext.pixels);
      }
    }

    return [];
  }
};

registerBidder(spec);
