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

  return {
    ingest: function(rawBids = []) {
      const adZoneAttributeKeys = ['id', 'size', 'thirdPartyClickUrl', 'dealId'];
      const otherKeys = ['siteId', 'wrapper', 'referrerUrl'];
      let state = this.createState();

      rawBids.forEach(oneBid => {
        let params = oneBid.params || {};

        state.tag.auctionId = oneBid.auctionId;
        state.tag.responseJSON = true;

        if (params.id && (/^\d+x\d+$/).test(params.size)) {
          let adZoneKey = 'as' + params.id;
          let zone = {};

          zone.transactionId = oneBid.transactionId;
          zone.bidId = oneBid.bidId;
          state.tag.zones = state.tag.zones || {};
          state.tag.zones[adZoneKey] = zone;

          adZoneAttributeKeys.forEach(key => { if (params[key]) zone[key] = params[key]; });
          otherKeys.forEach(key => { if (params[key]) state.tag[key] = params[key]; });

          // Check for an environment setting
          if (params.env) state.env = params.env;

          // Update the placement map
          let [x, y] = (params.size).split('x');
          state.placementMap[adZoneKey] = {
            'b': oneBid.bidId,
            'w': x,
            'h': y
          };
        }
      });
      return state;
    },

    transform: function(coxRawBids = {}, state) {
      const pbjsBids = [];

      for (let adZoneKey in state.placementMap) {
        let responded = coxRawBids[adZoneKey]
        let ingested = state.placementMap[adZoneKey];

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

    getUrl: state => {
      // Bounce if the tag is invalid
      if (!state.tag.zones) return null;

      let src = (document.location.protocol === 'https:' ? 'https://' : 'http://') +
        (!state.env || state.env === 'PRD' ? '' : state.env === 'PPE' ? 'ppe-' : state.env === 'STG' ? 'staging-' : '') +
        'ad.afy11.net/ad?mode=11&nif=0&sf=0&sfd=0&ynw=0&hb=1' +
        '&ct=' + srTestCapabilities() +
        '&rand=' + getRand() +
        '&rk1=' + getRand() +
        '&rk2=' + new Date().valueOf() / 1000;

      state.tag.pageUrl = config.getConfig('pageUrl') || utils.getTopWindowUrl();
      state.tag.puTop = true;

      // Attach the serialized tag to our string
      src += '&ab=' + encodeURIComponent(JSON.stringify(state.tag));

      return src;
    },

    createState: () => ({
      env: '',
      tag: {},
      placementMap: {}
    })
  };
})();

export const spec = {
  code: 'cox',
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.id && bid.params.size);
  },

  buildRequests: function(validBidReqs) {
    let state = helper.ingest(validBidReqs);
    let url = helper.getUrl(state);

    return !url ? {} : {
      method: 'GET',
      url: url,
      state
    };
  },

  interpretResponse: function({ body: { zones: coxRawBids } }, { state }) {
    let bids = helper.transform(coxRawBids, state);

    utils.logInfo('coxBidAdapter.interpretResponse', bids);
    return bids;
  },

  getUserSyncs: function(syncOptions, thing) {
    try {
      var [{ body: { tpCookieSync: urls = [] } }] = thing;
    } catch (ignore) {
      return [];
    }

    let syncs = [];
    if (syncOptions.pixelEnabled && urls.length > 0) {
      syncs = urls.map((url) => ({ type: 'image', url: url }))
    }
    utils.logInfo('coxBidAdapter.getuserSyncs', syncs);
    return syncs;
  }
};

registerBidder(spec);
