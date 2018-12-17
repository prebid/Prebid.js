'use strict';

import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER, VIDEO } from 'src/mediaTypes';

const BIDDER_CODE = 'adhese';
const USER_SYNC_BASE_URL = 'https://user-sync.adhese.com/iframe/user_sync.html';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function(bid) {
    return !!(bid.params.account && bid.params.location && bid.params.format);
  },

  mergeTargets: function(targets, target) {
    if (target) {
      Object.keys(target).forEach(function (key) {
        let val = target[key];
        let values = Array.isArray(val) ? val : [val];
        if (targets[key]) {
          let distinctValues = values.filter(v => targets[key].indexOf(v) < 0);
          targets[key].push.apply(targets[key], distinctValues);
        } else {
          targets[key] = values;
        }
      });
    }
    return targets;
  },

  bidToSlotName: function(bid) {
    return bid.params.location + '-' + bid.params.format;
  },

  getAccount: function(validBidRequests) {
    return validBidRequests[0].params.account;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return null;
    }

    let account = this.getAccount(validBidRequests);
    let targets = validBidRequests.map(bid => bid.params.data).reduce(this.mergeTargets, {});
    let gdprParams = (bidderRequest.gdprConsent && bidderRequest.gdprConsent.consentString) ? [ 'xt' + bidderRequest.gdprConsent.consentString ] : [];
    let targetsParams = Object.keys(targets).map(targetCode => targetCode + targets[targetCode].join(';'));
    let slotsParams = validBidRequests.map(bid => 'sl' + this.bidToSlotName(bid));
    let params = [...slotsParams, ...targetsParams, ...gdprParams].map(s => '/' + s).join('');
    let cacheBuster = '?t=' + new Date().getTime();
    let uri = 'https://ads-' + account + '.adhese.com/json' + params + cacheBuster;

    return {
      method: 'GET',
      url: uri,
      bids: validBidRequests
    };
  },

  baseAdResponse: function(response) {
    return Object.assign({ netRevenue: true, ttl: 360 }, response);
  },

  isAdheseAd: function(ad) {
    return !ad.origin || ad.origin === 'JERLICIA';
  },

  getMediaType: function(markup) {
    let isVideo = markup.trim().toLowerCase().match(/<\?xml|<vast/);
    return isVideo ? VIDEO : BANNER;
  },

  getAdMarkup: function(ad) {
    if (!this.isAdheseAd(ad) || (ad.ext === 'js' && ad.body !== undefined && ad.body !== '' && ad.body.match(/<script|<SCRIPT|<html|<HTML|<\?xml/))) {
      return ad.body
    } else {
      return ad.tag;
    }
  },

  getPrice: function (ad) {
    if (ad.extension && ad.extension.prebid && ad.extension.prebid.cpm) {
      return ad.extension.prebid.cpm;
    }
    return { amount: 0, currency: 'USD' };
  },

  getAdDetails: function (ad) {
    let creativeId = '';
    let dealId = '';

    if (this.isAdheseAd(ad)) {
      creativeId = ad.id;
      dealId = ad.orderId;
    } else {
      creativeId = ad.origin + (ad.originInstance ? '-' + ad.originInstance : '');
      if (ad.originData && ad.originData.seatbid && ad.originData.seatbid.length) {
        const seatbid = ad.originData.seatbid[0];
        if (seatbid.bid && seatbid.bid.length) {
          const bid = seatbid.bid[0];
          creativeId = String(bid.crid || '');
          dealId = String(bid.dealid || '');
        }
      }
    }
    return { creativeId: creativeId, dealId: dealId };
  },

  adResponse: function(bid, ad) {
    let price = this.getPrice(ad);
    let adDetails = this.getAdDetails(ad);
    let markup = this.getAdMarkup(ad);

    const bidResponse = this.baseAdResponse({
      requestId: bid.bidId,
      mediaType: this.getMediaType(markup),
      cpm: Number(price.amount),
      currency: price.currency,
      width: Number(ad.width),
      height: Number(ad.height),
      creativeId: adDetails.creativeId,
      dealId: adDetails.dealId
    });

    if (bidResponse.mediaType === VIDEO) {
      bidResponse.vastXml = markup;
    } else {
      const counter = ad.impressionCounter ? "<img src='" + ad.impressionCounter + "' style='height:1px; width:1px; margin: -1px -1px; display:none;'/>" : '';
      bidResponse.ad = markup + counter;
    }
    return bidResponse;
  },

  interpretResponse: function(serverResponse, request) {
    let serverAds = serverResponse.body.reduce(function(map, ad) {
      map[ad.slotName] = ad;
      return map;
    }, {});

    serverResponse.account = this.getAccount(request.bids);

    return request.bids
      .map(bid => ({
        bid: bid,
        ad: serverAds[this.bidToSlotName(bid)]
      }))
      .filter(item => item.ad)
      .map(item => this.adResponse(item.bid, item.ad));
  },

  getUserSyncs: function(syncOptions, serverResponse, gdprConsent) {
    const account = serverResponse.account || '';
    if (syncOptions.iframeEnabled) {
      let syncurl = USER_SYNC_BASE_URL + '?account=' + account;
      if (gdprConsent) {
        syncurl += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
        syncurl += '&consentString=' + encodeURIComponent(gdprConsent.consentString || '');
      }
      return [{ type: 'iframe', url: syncurl }];
    }
  },

  onTimeout: function(timeoutData) {},
};
registerBidder(spec);
