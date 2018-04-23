'use strict';

import * as utils from 'src/utils';
import { BANNER } from 'src/mediaTypes';
import { config } from 'src/config';
import { registerBidder } from 'src/adapters/bidderFactory';

const helper = (() => {
  let srTestCapabilities = () => { // Legacy
    let plugins = navigator.plugins;
    let flashVer = -1;
    let sf = 'Shockwave Flash';

    if (plugins && plugins.length > 0) {
      if (plugins[sf + ' 2.0'] || plugins[sf]) {
        var swVer2 = plugins[sf + ' 2.0'] ? ' 2.0' : '';
        var flashDescription = plugins[sf + swVer2].description;
        flashVer = flashDescription.split(' ')[2].split('.')[0];
      }
    }
    if (flashVer > 4) return 15; else return 7;
  };

  let getRand = () => {
    return Math.round(Math.random() * 100000000);
  };

  // State variables
  let env = '';
  let tag = {};
  let placementMap = {};

  return {
    ingest: function(rawBids = []) {
      const adZoneAttributeKeys = ['id', 'size', 'thirdPartyClickUrl', 'dealId'];
      const otherKeys = ['siteId', 'wrapper', 'referrerUrl'];

      rawBids.forEach(oneBid => {
        let params = oneBid.params || {};

        tag.auctionId = oneBid.auctionId;
        tag.responseJSON = true;

        if (params.id && (/^\d+x\d+$/).test(params.size)) {
          let adZoneKey = 'as' + params.id;
          let zone = {};

          zone.transactionId = oneBid.transactionId;
          zone.bidId = oneBid.bidId;
          tag.zones = tag.zones || {};
          tag.zones[adZoneKey] = zone;

          adZoneAttributeKeys.forEach(key => { if (params[key]) zone[key] = params[key]; });
          otherKeys.forEach(key => { if (params[key]) tag[key] = params[key]; });

          // Check for an environment setting
          if (params.env) env = params.env;

          // Update the placement map
          let [x, y] = (params.size).split('x');
          placementMap[adZoneKey] = {
            'b': oneBid.bidId,
            'w': x,
            'h': y
          };
        }
      });
    },

    transform: function(coxRawBids = {}) {
      const pbjsBids = [];

      for (let adZoneKey in placementMap) {
        let responded = coxRawBids[adZoneKey]
        let ingested = placementMap[adZoneKey];

        utils.logInfo('coxBidAdapter.transform', adZoneKey, responded, ingested);

        if (ingested && responded && responded['ad'] && responded['price'] > 0) {
          pbjsBids.push({
            requestId: ingested['b'],
            cpm: responded['price'],
            width: ingested['w'],
            height: ingested['h'],
            creativeId: responded['adid'],
            dealId: responded['dealid'],
            currency: 'USD',
            netRevenue: true,
            ttl: 300,
            ad: responded['ad']
          });
        }
      }
      return pbjsBids;
    },

    getUrl: function() {
      // Bounce if the tag is invalid
      if (!tag.zones) return null;

      let src = (document.location.protocol === 'https:' ? 'https://' : 'http://') + (!env || env === 'PRD' ? '' : env === 'PPE' ? 'ppe-' : env === 'STG' ? 'staging-' : '') + 'ad.afy11.net/ad' + '?mode=11' + '&ct=' + srTestCapabilities() + '&nif=0' + '&sf=0' + '&sfd=0' + '&ynw=0' + '&rand=' + getRand() + '&hb=1' + '&rk1=' + getRand() + '&rk2=' + new Date().valueOf() / 1000;

      tag.pageUrl = config.getConfig('pageUrl') || utils.getTopWindowUrl();
      tag.puTop = true;

      // Attach the serialized tag to our string
      src += '&ab=' + encodeURIComponent(JSON.stringify(tag));

      return src;
    },

    resetState: function() {
      env = '';
      tag = {};
      placementMap = {};
    }
  };
})();

export const spec = {
  code: 'cox',
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.id && bid.params.size);
  },

  buildRequests: function(validBidReqs) {
    helper.resetState();
    helper.ingest(validBidReqs);
    let url = helper.getUrl();

    return !url ? {} : {
      method: 'GET',
      url: url
    };
  },

  interpretResponse: function({ body: { zones: coxRawBids } }) {
    let bids = helper.transform(coxRawBids);

    utils.logInfo('coxBidAdapter.interpretResponse', bids);
    return bids;
  },

  getUserSyncs: function(syncOptions, [{ body: { tpCookieSync: urls = [] } }]) {
    let syncs = [];
    if (syncOptions.pixelEnabled && urls.length > 0) {
      syncs = urls.map((url) => ({ type: 'image', url: url }))
    }
    utils.logInfo('coxBidAdapter.getuserSyncs', syncs);
    return syncs;
  }
};

registerBidder(spec);
