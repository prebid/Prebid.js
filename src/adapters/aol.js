const utils = require('../utils.js');
const ajax = require('../ajax.js').ajax;
const bidfactory = require('../bidfactory.js');
const bidmanager = require('../bidmanager.js');
const constants = require('../constants.json');

const AolAdapter = function AolAdapter() {

  let showCpmAdjustmentWarning = true;
  const pubapiTemplate = template`${'protocol'}://${'host'}/pubapi/3.0/${'network'}/${'placement'}/${'pageid'}/${'sizeid'}/ADTECH;v=2;cmd=bid;cors=yes;alias=${'alias'}${'bidfloor'};misc=${'misc'}`;
  const nexageBaseApiTemplate = template`${'protocol'}://hb.nexage.com/bidRequest?`;
  const nexageGetApiTemplate = template`dcn=${'dcn'}&pos=${'pos'}&cmd=bid${'ext'}`;
  const BIDDER_CODE = 'aol';
  const SERVER_MAP = {
    us: 'adserver-us.adtech.advertising.com',
    eu: 'adserver-eu.adtech.advertising.com',
    as: 'adserver-as.adtech.advertising.com'
  };

  const SYNC_TYPES = {
    iframe: 'IFRAME',
    img: 'IMG'
  };

  let DOMReady = (() => {
    let readyEventFired = false;
    return fn => {
      let idempotentFn = () => {
        if (readyEventFired) {
          return;
        }
        readyEventFired = true;
        return fn();
      };
      let doScrollCheck = () => {
        if (readyEventFired) {
          return;
        }
        try {
          document.documentElement.doScroll('left');
        } catch (e) {
          setTimeout(doScrollCheck, 1);
          return;
        }
        return idempotentFn();
      };
      if (document.readyState === "complete") {
        return idempotentFn();
      }
      if (document.addEventListener) {
        document.addEventListener("DOMContentLoaded", idempotentFn, false);
        window.addEventListener("load", idempotentFn, false);
      } else if (document.attachEvent) {
        document.attachEvent("onreadystatechange", idempotentFn);
        window.attachEvent("onload", idempotentFn);
        let topLevel = false;
        try {
          topLevel = window.frameElement === null;
        } catch (e) {
        }
        if (document.documentElement.doScroll && topLevel) {
          return doScrollCheck();
        }
      }
    };
  })();

  function dropSyncCookies(pixels) {
    let pixelElements = parsePixelItems(pixels);
    renderPixelElements(pixelElements);
  }

  function parsePixelItems(pixels) {
    let itemsRegExp = /(img|iframe)[\s\S]*?src\s*=\s*("|')(.*?)\2/gi;
    let tagNameRegExp = /\w*(?=\s)/;
    let srcRegExp = /src=("|')(.*?)\1/;
    let pixelsItems = [];

    if (pixels) {
      pixels.match(itemsRegExp).forEach(item => {
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
      DOMReady(() => {
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

  function _buildPubApiUrl(bid) {
    const params = bid.params;
    const serverParam = params.server;
    let regionParam = params.region || 'us';
    let server;

    if (!SERVER_MAP.hasOwnProperty(regionParam)) {
      utils.logWarn(`Unknown region '${regionParam}' for AOL bidder.`);
      regionParam = 'us'; // Default region.
    }

    if (serverParam) {
      server = serverParam;
    } else {
      server = SERVER_MAP[regionParam];
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
      bidfloor: (typeof params.bidFloor !== 'undefined') ?
        `;bidfloor=${params.bidFloor.toString()}` : '',
      misc: new Date().getTime() // cache busting
    });
  }

  function _buildNexageApiUrl(bid) {
    let nexageApi = nexageBaseApiTemplate({protocol: 'http'});
    if (bid) {
      const params = bid.params;
      let ext = '';
      utils._each(params.ext, (value, key) => {
        ext += `&${key}=${value}`;
      });
      nexageApi += nexageGetApiTemplate({
        dcn: params.dcn,
        pos: params.pos,
        ext : ext
      });
    }
    return nexageApi;
  }

  function _addErrorBidResponse(bid, response = {}) {
    const bidResponse = bidfactory.createBid(2, bid);
    bidResponse.bidderCode = BIDDER_CODE;
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
        utils.logError('Invalid price in bid response', BIDDER_CODE, bid);
        _addErrorBidResponse(bid, response);
        return;
      }
    }

    let ad = bidData.adm;
    if (response.ext && response.ext.pixels) {
      if (bid.params.userSyncOn === constants.EVENTS.BID_RESPONSE) {
        dropSyncCookies(response.ext.pixels);
      } else {
        ad += response.ext.pixels;
      }
    }

    const bidResponse = bidfactory.createBid(1, bid);
    bidResponse.bidderCode = BIDDER_CODE;
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

  function _isRequestNexagePostReady(bid) {
    if (bid.params.id && bid.params.imp && bid.params.imp[0]) {
      let imp = bid.params.imp[0];
      return imp.id && imp.tagid
          && ((imp.banner && imp.banner.w && imp.banner.h)
          || (imp.video && imp.video.mimes && imp.video.minduration && imp.video.maxduration));
    }
    return false;
  }

  function _callBids(params) {
    utils._each(params.bids, bid => {
      let apiUrl;
      let data = null;
      let options = {
        withCredentials: true
      };
      if (bid.params.placement && bid.params.network) {
        apiUrl = _buildPubApiUrl(bid);
      } else if (bid.params.dcn && bid.params.pos) {
        apiUrl = _buildNexageApiUrl(bid);
      } else if (_isRequestNexagePostReady(bid)) {
        apiUrl = _buildNexageApiUrl();
        data = bid.params;
        options.openrtb = '2.2';
        options.method = 'POST';
        options.contentType = 'application/json';
      }
      if (apiUrl) {
        ajax(apiUrl, response => {
          // needs to be here in case bidderSettings are defined after requestBids() is called
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
            utils.logError('Empty bid response', BIDDER_CODE, bid);
            _addErrorBidResponse(bid, response);
            return;
          }

          try {
            response = JSON.parse(response);
          } catch (e) {
            utils.logError('Invalid JSON in bid response', BIDDER_CODE, bid);
            _addErrorBidResponse(bid, response);
            return;
          }

          _addBidResponse(bid, response);

        }, data, options);
      }
    });
  }

  return {
    callBids: _callBids
  };
};

module.exports = AolAdapter;
