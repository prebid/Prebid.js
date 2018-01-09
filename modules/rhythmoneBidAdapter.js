'use strict';

import {registerBidder} from 'src/adapters/bidderFactory';
import { BANNER, VIDEO } from 'src/mediaTypes';

function RhythmOneBidAdapter() {
  this.code = 'rhythmone';
  this.supportedMediaTypes = [VIDEO, BANNER];

  this.isBidRequestValid = function (bid) {
    return true;
  };

  this.getUserSyncs = function (syncOptions) {
    let slots = [];
    let placementIds = [];

    for (let k in slotsToBids) {
      slots.push(k);
      placementIds.push(getFirstParam('placementId', [slotsToBids[k]]));
    }

    let data = {
      doc_version: 1,
      doc_type: 'Prebid Audit',
      placement_id: placementIds.join(',').replace(/[,]+/g, ',').replace(/^,|,$/g, '')
    };
    let w = typeof (window) !== 'undefined' ? window : {document: {location: {href: ''}}};
    let ao = w.document.location.ancestorOrigins;
    let q = [];
    let u = '//hbevents.1rx.io/audit?';

    if (ao && ao.length > 0) {
      data.ancestor_origins = ao[ao.length - 1];
    }

    data.popped = w.opener !== null ? 1 : 0;
    data.framed = w.top === w ? 0 : 1;

    try {
      data.url = w.top.document.location.href.toString();
    } catch (ex) {
      data.url = w.document.location.href.toString();
    }

    try {
      data.prebid_version = '$prebid.version$';
      data.prebid_timeout = config.getConfig('bidderTimeout');
    } catch (ex) { }

    data.response_ms = Date.now() - loadStart;
    data.placement_codes = slots.join(',');
    data.bidder_version = version;

    for (let k in data) {
      q.push(encodeURIComponent(k) + '=' + encodeURIComponent((typeof data[k] === 'object' ? JSON.stringify(data[k]) : data[k])));
    }

    q.sort();

    if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: u + q.join('&')
      }];
    }
  };

  function getFirstParam(key, validBidRequests) {
    for (let i = 0; i < validBidRequests.length; i++) {
      if (validBidRequests[i].params && validBidRequests[i].params[key]) {
        return validBidRequests[i].params[key];
      }
    }
  }

  let slotsToBids = {};
  let that = this;
  let version = '1.0.0.0';
  let loadStart = Date.now();

  this.buildRequests = function (BRs) {
    let fallbackPlacementId = getFirstParam('placementId', BRs);
    if (fallbackPlacementId === undefined || BRs.length < 1) {
      return [];
    }

    loadStart = Date.now();
    slotsToBids = {};

    let query = [];
    let w = (typeof window !== 'undefined' ? window : {});

    function p(k, v, d) {
      if (v instanceof Array) { v = v.join((d || ',')); }
      if (typeof v !== 'undefined') { query.push(encodeURIComponent(k) + '=' + encodeURIComponent(v)); }
    }

    function attempt(valueFunction, defaultValue) {
      try {
        return valueFunction();
      } catch (ex) { }
      return defaultValue;
    }

    p('domain', attempt(function() {
      var d = w.document.location.ancestorOrigins;
      if (d && d.length > 0) {
        return d[d.length - 1];
      }
      return w.top.document.location.hostname; // try/catch is in the attempt function
    }, ''));
    p('url', attempt(function() {
      var l;
      // try/catch is in the attempt function
      try {
        l = w.top.document.location.href.toString();
      } catch (ex) {
        l = w.document.location.href.toString();
      }
      return l;
    }, ''));

    function getRMPUrl() {
      let url = getFirstParam('endpoint', BRs) || '//tag.1rx.io/rmp/{placementId}/0/{path}?z={zone}';
      let defaultZone = getFirstParam('zone', BRs) || '1r';
      let defaultPath = getFirstParam('path', BRs) || 'mvo';

      url = url.replace(/\{placementId\}/i, fallbackPlacementId);
      url = url.replace(/\{zone\}/i, defaultZone);
      url = url.replace(/\{path\}/i, defaultPath);

      p('title', attempt(function() { return w.top.document.title; }, '')); // try/catch is in the attempt function
      p('dsh', (w.screen ? w.screen.height : ''));
      p('dsw', (w.screen ? w.screen.width : ''));
      p('tz', (new Date()).getTimezoneOffset());
      p('dtype', ((/(ios|ipod|ipad|iphone|android)/i).test(w.navigator.userAgent) ? 1 : ((/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(w.navigator.userAgent) ? 3 : 2)));
      p('flash', attempt(function() {
        let n = w.navigator;
        let p = n.plugins;
        let m = n.mimeTypes;
        let t = 'application/x-shockwave-flash';
        let x = w.ActiveXObject;

        if (p &&
          p['Shockwave Flash'] &&
          m &&
          m[t] &&
          m[t].enabledPlugin) {
          return 1;
        }

        if (x) {
          try {
            if ((new w.ActiveXObject('ShockwaveFlash.ShockwaveFlash'))) {
              return 1;
            }
          } catch (e) { }
        }

        return 0;
      }, 0));

      let heights = [];
      let widths = [];
      let floors = [];
      let mediaTypes = [];
      let i = 0;
      let configuredPlacements = [];
      let fat = /(^v|(\.0)+$)/gi;

      p('hbv', w.$$PREBID_GLOBAL$$.version.replace(fat, '') + ',' + version.replace(fat, ''));

      for (; i < BRs.length; i++) {
        let th = [];
        let tw = [];
        let params = BRs[i].params || {};

        slotsToBids[BRs[i].adUnitCode || BRs[i].placementCode] = BRs[i];

        if (BRs[i].sizes.length > 0 && typeof BRs[i].sizes[0] === 'number') {
          BRs[i].sizes = [BRs[i].sizes];
        }

        for (let j = 0; j < BRs[i].sizes.length; j++) {
          tw.push(BRs[i].sizes[j][0]);
          th.push(BRs[i].sizes[j][1]);
        }
        configuredPlacements.push(BRs[i].adUnitCode || BRs[i].placementCode);
        heights.push(th.join('|'));
        widths.push(tw.join('|'));
        mediaTypes.push((BRs[i].mediaTypes && BRs[i].mediaTypes.video ? 'v' : 'd'));
        floors.push(params.floor || 0);
      }

      p('imp', configuredPlacements);
      p('w', widths);
      p('h', heights);
      p('floor', floors);
      p('t', mediaTypes);

      url += '&' + query.join('&') + '&';

      return url;
    }

    return [{
      method: 'GET',
      url: getRMPUrl()
    }];
  };

  this.interpretResponse = function (serverResponse) {
    let responses = serverResponse.body || [];
    let bids = [];
    let i = 0;

    if (responses.seatbid) {
      let temp = [];
      for (i = 0; i < responses.seatbid.length; i++) {
        for (let j = 0; j < responses.seatbid[i].bid.length; j++) {
          temp.push(responses.seatbid[i].bid[j]);
        }
      }
      responses = temp;
    }

    for (i = 0; i < responses.length; i++) {
      let bid = responses[i];
      let bidRequest = slotsToBids[bid.impid];
      let bidResponse = {
        requestId: bidRequest.bidId,
        bidderCode: that.code,
        cpm: parseFloat(bid.price),
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid,
        currency: 'USD',
        netRevenue: true,
        ttl: 1000
      };

      if (bidRequest.mediaTypes && bidRequest.mediaTypes.video) {
        bidResponse.vastUrl = bid.nurl;
        bidResponse.mediaType = 'video';
        bidResponse.ttl = 10000;
      } else {
        bidResponse.ad = bid.adm;
      }
      bids.push(bidResponse);
    }

    return bids;
  };
}

export const spec = new RhythmOneBidAdapter();
registerBidder(spec);
