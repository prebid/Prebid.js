const utils = require('src/utils.js');
const ajax = require('src/ajax.js').ajax;
const bidfactory = require('src/bidfactory.js');
const bidmanager = require('src/bidmanager.js');
const constants = require('src/constants.json');
const adaptermanager = require('src/adaptermanager');
const BaseAdapter = require('src/adapter');

const AOL_BIDDERS_CODES = {
  aol: 'aol',
  onemobile: 'onemobile',
  onedisplay: 'onedisplay'
};

$$PREBID_GLOBAL$$.aolGlobals = {
  pixelsDropped: false
};

const AolAdapter = function AolAdapter() {
  let showCpmAdjustmentWarning = true;
  const pubapiTemplate = template`${'protocol'}://${'host'}/pubapi/3.0/${'network'}/${'placement'}/${'pageid'}/${'sizeid'}/ADTECH;v=2;cmd=bid;cors=yes;alias=${'alias'}${'bidfloor'};misc=${'misc'}`;
  const nexageBaseApiTemplate = template`${'protocol'}://${'host'}/bidRequest?`;
  const nexageGetApiTemplate = template`dcn=${'dcn'}&pos=${'pos'}&cmd=bid${'ext'}`;
  const MP_SERVER_MAP = {
    us: 'adserver-us.adtech.advertising.com',
    eu: 'adserver-eu.adtech.advertising.com',
    as: 'adserver-as.adtech.advertising.com'
  };
  const NEXAGE_SERVER = 'hb.nexage.com';
  const SYNC_TYPES = {
    iframe: 'IFRAME',
    img: 'IMG'
  };

  let domReady = (() => {
    let readyEventFired = false;
    return fn => {
      let idempotentFn = () => {
        if (readyEventFired) {
          return;
        }
        readyEventFired = true;
        return fn();
      };

      if (document.readyState === 'complete') {
        return idempotentFn();
      }

      document.addEventListener('DOMContentLoaded', idempotentFn, false);
      window.addEventListener('load', idempotentFn, false);
    };
  })();

  function dropSyncCookies(pixels) {
    if (!$$PREBID_GLOBAL$$.aolGlobals.pixelsDropped) {
      let pixelElements = parsePixelItems(pixels);
      renderPixelElements(pixelElements);
      $$PREBID_GLOBAL$$.aolGlobals.pixelsDropped = true;
    }
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
          let tagNameMatches = item.match(tagNameRegExp);
          let sourcesPathMatches = item.match(srcRegExp);
          if (tagNameMatches && sourcesPathMatches) {
            pixelsItems.push({
              tagName: tagNameMatches[0].toUpperCase(),
              src: sourcesPathMatches[2]
            });
          }
        });
      }
    }

    return pixelsItems;
  }

  function renderPixelElements(pixelsElements) {
    pixelsElements.forEach((element) => {
      switch (element.tagName) {
        case SYNC_TYPES.img:
          return renderPixelImage(element);
        case SYNC_TYPES.iframe:
          return renderPixelIframe(element);
      }
    });
  }

  function renderPixelImage(pixelsItem) {
    let image = new Image();
    image.src = pixelsItem.src;
  }

  function renderPixelIframe(pixelsItem) {
    let iframe = document.createElement('iframe');
    iframe.width = 1;
    iframe.height = 1;
    iframe.style.display = 'none';
    iframe.src = pixelsItem.src;
    if (document.readyState === 'interactive' ||
      document.readyState === 'complete') {
      document.body.appendChild(iframe);
    } else {
      domReady(() => {
        document.body.appendChild(iframe);
      });
    }
  }

  function template(strings, ...keys) {
    return function(...values) {
      let dict = values[values.length - 1] || {};
      let result = [strings[0]];
      keys.forEach(function(key, i) {
        let value = Number.isInteger(key) ? values[key] : dict[key];
        result.push(value, strings[i + 1]);
      });
      return result.join('');
    };
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
      protocol: (document.location.protocol === 'https:') ? 'https' : 'http',
      host: server,
      network: params.network,
      placement: parseInt(params.placement),
      pageid: params.pageId || 0,
      sizeid: params.sizeId || 0,
      alias: params.alias || utils.getUniqueIdentifierStr(),
      bidfloor: (typeof params.bidFloor !== 'undefined')
        ? `;bidfloor=${params.bidFloor.toString()}` : '',
      misc: new Date().getTime() // cache busting
    });
  }

  function _buildNexageApiUrl(bid) {
    let {dcn, pos} = bid.params;
    let nexageApi = nexageBaseApiTemplate({
      protocol: (document.location.protocol === 'https:') ? 'https' : 'http',
      host: bid.params.host || NEXAGE_SERVER
    });
    if (dcn && pos) {
      let ext = '';
      utils._each(bid.params.ext, (value, key) => {
        ext += `&${key}=${encodeURIComponent(value)}`;
      });
      nexageApi += nexageGetApiTemplate({dcn, pos, ext});
    }
    return nexageApi;
  }

  function _addErrorBidResponse(bid, response = {}) {
    const bidResponse = bidfactory.createBid(2, bid);
    bidResponse.bidderCode = bid.bidder;
    bidResponse.reason = response.nbr;
    bidResponse.raw = response;
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  function _addBidResponse(bid, response) {
    let bidData;

    try {
      bidData = response.seatbid[0].bid[0];
    } catch (e) {
      _addErrorBidResponse(bid, response);
      return;
    }

    let cpm;

    if (bidData.ext && bidData.ext.encp) {
      cpm = bidData.ext.encp;
    } else {
      cpm = bidData.price;

      if (cpm === null || isNaN(cpm)) {
        utils.logError('Invalid price in bid response', AOL_BIDDERS_CODES.aol, bid);
        _addErrorBidResponse(bid, response);
        return;
      }
    }

    let ad = bidData.adm;
    if (response.ext && response.ext.pixels) {
      if (bid.params.userSyncOn === constants.EVENTS.BID_RESPONSE) {
        dropSyncCookies(response.ext.pixels);
      } else {
        let formattedPixels = response.ext.pixels.replace(/<\/?script( type=('|")text\/javascript('|")|)?>/g, '');

        ad += '<script>if(!parent.$$PREBID_GLOBAL$$.aolGlobals.pixelsDropped){' +
          'parent.$$PREBID_GLOBAL$$.aolGlobals.pixelsDropped=true;' + formattedPixels +
          '}</script>';
      }
    }

    const bidResponse = bidfactory.createBid(1, bid);
    bidResponse.bidderCode = bid.bidder;
    bidResponse.ad = ad;
    bidResponse.cpm = cpm;
    bidResponse.width = bidData.w;
    bidResponse.height = bidData.h;
    bidResponse.creativeId = bidData.crid;
    bidResponse.pubapiId = response.id;
    bidResponse.currencyCode = response.cur;
    if (bidData.dealid) {
      bidResponse.dealId = bidData.dealid;
    }

    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  function _isMarketplaceBidder(bidder) {
    return bidder === AOL_BIDDERS_CODES.aol || bidder === AOL_BIDDERS_CODES.onedisplay;
  }

  function _isNexageBidder(bidder) {
    return bidder === AOL_BIDDERS_CODES.aol || bidder === AOL_BIDDERS_CODES.onemobile;
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

  function _isMarketplaceRequest(bid) {
    return _isMarketplaceBidder(bid.bidder) && bid.params.placement && bid.params.network;
  }

  function _callBids(params) {
    utils._each(params.bids, bid => {
      let apiUrl;
      let data = null;
      let options = {
        withCredentials: true
      };
      let isNexageRequestPost = _isNexageRequestPost(bid);
      let isNexageRequestGet = _isNexageRequestGet(bid);
      let isMarketplaceRequest = _isMarketplaceRequest(bid);

      if (isNexageRequestGet || isNexageRequestPost) {
        apiUrl = _buildNexageApiUrl(bid);
        if (isNexageRequestPost) {
          data = bid.params;
          options.customHeaders = {
            'x-openrtb-version': '2.2'
          };
          options.method = 'POST';
          options.contentType = 'application/json';
        }
      } else if (isMarketplaceRequest) {
        apiUrl = _buildMarketplaceUrl(bid);
      }

      if (apiUrl) {
        ajax(apiUrl, response => {
          // Needs to be here in case bidderSettings are defined after requestBids() is called
          if (showCpmAdjustmentWarning &&
            $$PREBID_GLOBAL$$.bidderSettings && $$PREBID_GLOBAL$$.bidderSettings.aol &&
            typeof $$PREBID_GLOBAL$$.bidderSettings.aol.bidCpmAdjustment === 'function'
          ) {
            utils.logWarn(
              'bidCpmAdjustment is active for the AOL adapter. ' +
              'As of Prebid 0.14, AOL can bid in net – please contact your accounts team to enable.'
            );
          }
          showCpmAdjustmentWarning = false; // warning is shown at most once

          if (!response && response.length <= 0) {
            utils.logError('Empty bid response', AOL_BIDDERS_CODES.aol, bid);
            _addErrorBidResponse(bid, response);
            return;
          }

          try {
            response = JSON.parse(response);
          } catch (e) {
            utils.logError('Invalid JSON in bid response', AOL_BIDDERS_CODES.aol, bid);
            _addErrorBidResponse(bid, response);
            return;
          }

          _addBidResponse(bid, response);
        }, data, options);
      }
    });
  }

  return Object.assign(BaseAdapter.createNew(AOL_BIDDERS_CODES.aol), {
    callBids: _callBids,
    createNew: function () {
      return new AolAdapter();
    }
  });
};

adaptermanager.registerBidAdapter(new AolAdapter(), AOL_BIDDERS_CODES.aol);
adaptermanager.aliasBidAdapter(AOL_BIDDERS_CODES.aol, AOL_BIDDERS_CODES.onedisplay);
adaptermanager.aliasBidAdapter(AOL_BIDDERS_CODES.aol, AOL_BIDDERS_CODES.onemobile);

module.exports = AolAdapter;
