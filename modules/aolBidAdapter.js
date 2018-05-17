import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';
import { EVENTS } from 'src/constants.json';
import { BANNER } from 'src/mediaTypes';

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

const pubapiTemplate = template`//${'host'}/pubapi/3.0/${'network'}/${'placement'}/${'pageid'}/${'sizeid'}/ADTECH;v=2;cmd=bid;cors=yes;alias=${'alias'};misc=${'misc'}${'bidfloor'}${'keyValues'}${'consentData'}`;
const nexageBaseApiTemplate = template`//${'host'}/bidRequest?`;
const nexageGetApiTemplate = template`dcn=${'dcn'}&pos=${'pos'}&cmd=bid${'dynamicParams'}`;
const MP_SERVER_MAP = {
  us: 'adserver-us.adtech.advertising.com',
  eu: 'adserver-eu.adtech.advertising.com',
  as: 'adserver-as.adtech.advertising.com'
};
const NEXAGE_SERVER = 'hb.nexage.com';
const ONE_DISPLAY_TTL = 60;
const ONE_MOBILE_TTL = 3600;

$$PREBID_GLOBAL$$.aolGlobals = {
  pixelsDropped: false
};

let showCpmAdjustmentWarning = (function() {
  let showCpmWarning = true;

  return function() {
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

function template(strings, ...keys) {
  return function(...values) {
    let dict = values[values.length - 1] || {};
    let result = [strings[0]];
    keys.forEach(function(key, i) {
      let value = utils.isInteger(key) ? values[key] : dict[key];
      result.push(value, strings[i + 1]);
    });
    return result.join('');
  };
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

function _isMarketplaceBidder(bidder) {
  return bidder === AOL_BIDDERS_CODES.AOL || bidder === AOL_BIDDERS_CODES.ONEDISPLAY;
}

function _isOneMobileBidder(bidderCode) {
  return bidderCode === AOL_BIDDERS_CODES.AOL || bidderCode === AOL_BIDDERS_CODES.ONEMOBILE;
}

function _isNexageRequestPost(bid) {
  if (_isOneMobileBidder(bid.bidder) && bid.params.id && bid.params.imp && bid.params.imp[0]) {
    let imp = bid.params.imp[0];
    return imp.id && imp.tagid &&
      ((imp.banner && imp.banner.w && imp.banner.h) ||
        (imp.video && imp.video.mimes && imp.video.minduration && imp.video.maxduration));
  }
}

function _isNexageRequestGet(bid) {
  return _isOneMobileBidder(bid.bidder) && bid.params.dcn && bid.params.pos;
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

export const spec = {
  code: AOL_BIDDERS_CODES.AOL,
  aliases: [AOL_BIDDERS_CODES.ONEMOBILE, AOL_BIDDERS_CODES.ONEDISPLAY],
  supportedMediaTypes: [BANNER],
  isBidRequestValid(bid) {
    return isMarketplaceBid(bid) || isMobileBid(bid);
  },
  buildRequests(bids, bidderRequest) {
    let consentData = bidderRequest ? bidderRequest.gdprConsent : null;

    return bids.map(bid => {
      const endpointCode = resolveEndpointCode(bid);

      if (endpointCode) {
        return this.formatBidRequest(endpointCode, bid, consentData);
      }
    });
  },
  interpretResponse({body}, bidRequest) {
    showCpmAdjustmentWarning();

    if (!body) {
      utils.logError('Empty bid response', bidRequest.bidderCode, body);
    } else {
      let bid = this._parseBidResponse(body, bidRequest);

      if (bid) {
        return bid;
      }
    }
  },
  getUserSyncs(options, bidResponses) {
    let bidResponse = bidResponses[0];

    if (config.getConfig('aol.userSyncOn') === EVENTS.BID_RESPONSE) {
      if (!$$PREBID_GLOBAL$$.aolGlobals.pixelsDropped && bidResponse && bidResponse.ext && bidResponse.ext.pixels) {
        $$PREBID_GLOBAL$$.aolGlobals.pixelsDropped = true;

        return parsePixelItems(bidResponse.ext.pixels);
      }
    }

    return [];
  },

  formatBidRequest(endpointCode, bid, consentData) {
    let bidRequest;

    switch (endpointCode) {
      case AOL_ENDPOINTS.DISPLAY.GET:
        bidRequest = {
          url: this.buildMarketplaceUrl(bid, consentData),
          method: 'GET',
          ttl: ONE_DISPLAY_TTL
        };
        break;

      case AOL_ENDPOINTS.MOBILE.GET:
        bidRequest = {
          url: this.buildOneMobileGetUrl(bid, consentData),
          method: 'GET',
          ttl: ONE_MOBILE_TTL
        };
        break;

      case AOL_ENDPOINTS.MOBILE.POST:
        bidRequest = {
          url: this.buildOneMobileBaseUrl(bid),
          method: 'POST',
          ttl: ONE_MOBILE_TTL,
          data: this.buildOpenRtbRequestData(bid, consentData),
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
  },
  buildMarketplaceUrl(bid, consentData) {
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
      misc: new Date().getTime(), // cache busting,
      bidfloor: formatMarketplaceBidFloor(params.bidFloor),
      keyValues: formatMarketplaceKeyValues(params.keyValues),
      consentData: this.formatMarketplaceConsentData(consentData)
    });
  },
  buildOneMobileGetUrl(bid, consentData) {
    let {dcn, pos, ext} = bid.params;
    let nexageApi = this.buildOneMobileBaseUrl(bid);
    if (dcn && pos) {
      let dynamicParams = this.formatOneMobileDynamicParams(ext, consentData);
      nexageApi += nexageGetApiTemplate({dcn, pos, dynamicParams});
    }
    return nexageApi;
  },
  buildOneMobileBaseUrl(bid) {
    return nexageBaseApiTemplate({
      host: bid.params.host || NEXAGE_SERVER
    });
  },
  formatOneMobileDynamicParams(params = {}, consentData) {
    if (this.isSecureProtocol()) {
      params.secure = 1;
    }

    if (this.isConsentRequired(consentData)) {
      params.euconsent = consentData.consentString;
      params.gdpr = 1;
    }

    let paramsFormatted = '';
    utils._each(params, (value, key) => {
      paramsFormatted += `&${key}=${encodeURIComponent(value)}`;
    });

    return paramsFormatted;
  },
  buildOpenRtbRequestData(bid, consentData) {
    let openRtbObject = {
      id: bid.params.id,
      imp: bid.params.imp
    };

    if (this.isConsentRequired(consentData)) {
      openRtbObject.user = {
        ext: {
          consent: consentData.consentString
        }
      };
      openRtbObject.regs = {
        ext: {
          gdpr: 1
        }
      };
    }

    return openRtbObject;
  },
  isConsentRequired(consentData) {
    return !!(consentData && consentData.consentString && consentData.gdprApplies);
  },
  formatMarketplaceConsentData(consentData) {
    let consentRequired = this.isConsentRequired(consentData);

    return consentRequired ? `;euconsent=${consentData.consentString};gdpr=1` : '';
  },

  _parseBidResponse(response, bidRequest) {
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

    let bidResponse = {
      bidderCode: bidRequest.bidderCode,
      requestId: bidRequest.bidId,
      ad: bidData.adm,
      cpm: cpm,
      width: bidData.w,
      height: bidData.h,
      creativeId: bidData.crid,
      pubapiId: response.id,
      currency: response.cur,
      dealId: bidData.dealid,
      netRevenue: true,
      ttl: bidRequest.ttl
    };

    if (response.ext && response.ext.pixels) {
      if (config.getConfig('aol.userSyncOn') !== EVENTS.BID_RESPONSE) {
        bidResponse.ad += this.formatPixels(response.ext.pixels);
      }
    }

    return bidResponse;
  },
  formatPixels(pixels) {
    let formattedPixels = pixels.replace(/<\/?script( type=('|")text\/javascript('|")|)?>/g, '');

    return '<script>var w=window,prebid;' +
      'for(var i=0;i<10;i++){w = w.parent;prebid=w.$$PREBID_GLOBAL$$;' +
      'if(prebid && prebid.aolGlobals && !prebid.aolGlobals.pixelsDropped){' +
      'try{prebid.aolGlobals.pixelsDropped=true;' + formattedPixels + 'break;}' +
      'catch(e){continue;}' +
      '}}</script>';
  },
  isOneMobileBidder: _isOneMobileBidder,
  isSecureProtocol() {
    return document.location.protocol === 'https:';
  }
};

registerBidder(spec);
