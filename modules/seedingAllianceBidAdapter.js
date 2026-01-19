// jshint esversion: 6, es3: false, node: true
'use strict';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';
import {generateUUID, deepSetValue, isEmpty, replaceAuctionPrice} from '../src/utils.js';
import {config} from '../src/config.js';
import {getStorageManager} from '../src/storageManager.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';

const GVL_ID = 371;
const BIDDER_CODE = 'seedingAlliance';
const DEFAULT_CUR = 'EUR';
const ENDPOINT_URL = 'https://b.nativendo.de/cds/rtb/bid?format=openrtb2.5&ssp=pb';
const NATIVENDO_KEY = 'nativendo_id';

export const storage = getStorageManager({bidderCode: BIDDER_CODE});

const converter = ortbConverter({
  context: {
    ttl: 360,
    netRevenue: true
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    // set basic page, this might be updated later by adunit param
    deepSetValue(request, 'site.page', bidderRequest.refererInfo.page);
    deepSetValue(request, 'regs.ext.pb_ver', '$prebid.version$');
    deepSetValue(request, 'cur', [config.getConfig('currency.adServerCurrency') || DEFAULT_CUR]);

    // As this is client side, we get needed info from headers
    delete request.device;

    return request;
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // add tagid from params
    imp.tagid = bidRequest.params.adUnitId;

    return imp;
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [NATIVE, BANNER],

  isBidRequestValid: function (bid) {
    return !!bid.params.adUnitId;
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
    const oRtbRequest = converter.toORTB({bidRequests: validBidRequests, bidderRequest});
    const eids = getEids(validBidRequests[0]);

    // check for url in params and set in site object
    validBidRequests.forEach(bidRequest => {
      if (bidRequest.params.url) {
        deepSetValue(oRtbRequest, 'site.page', bidRequest.params.url);
      }
    });

    if (bidderRequest.gdprConsent) {
      oRtbRequest.user = {};

      deepSetValue(oRtbRequest, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(oRtbRequest, 'regs.ext.gdpr', (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean' && bidderRequest.gdprConsent.gdprApplies) ? 1 : 0);
      deepSetValue(oRtbRequest, 'user.ext.eids', eids);
    }

    const endpoint = config.getConfig('seedingAlliance.endpoint') || ENDPOINT_URL;

    return {
      method: 'POST',
      url: endpoint,
      data: JSON.stringify(oRtbRequest),
      bidRequests: validBidRequests
    };
  },

  interpretResponse: function (serverResponse, { bidRequests }) {
    if (isEmpty(serverResponse.body)) {
      return [];
    }

    const { seatbid, cur } = serverResponse.body;

    const bidResponses = (typeof seatbid !== 'undefined') ? flatten(seatbid.map(seat => seat.bid)).reduce((result, bid) => {
      result[bid.impid] = bid;
      return result;
    }, []) : [];
    return bidRequests
      .map((bidRequest) => {
        const bidId = bidRequest.bidId;
        const bidResponse = bidResponses[bidId];
        const type = bidRequest.nativeParams ? NATIVE : BANNER;

        if (bidResponse) {
          const bidObject = {
            requestId: bidRequest.bidId, // TODO get this value from response?
            cpm: bidResponse.price,
            creativeId: bidResponse.crid,
            ttl: 600,
            netRevenue: true,
            currency: cur,
            mediaType: type,
            meta: {
              advertiserDomains: bidResponse.adomain && bidResponse.adomain.length > 0 ? bidResponse.adomain : []
            }
          };

          if (type === NATIVE) {
            bidObject.native = parseNative(bidResponse, bidRequest.nativeParams);
            bidObject.mediaType = NATIVE;
          }

          if (type === BANNER) {
            bidObject.ad = replaceAuctionPrice(bidResponse.adm, bidResponse.price);
            bidObject.width = bidResponse.w;
            bidObject.height = bidResponse.h;
            bidObject.mediaType = BANNER;
          }

          return bidObject;
        }
        return null;
      })
      .filter(Boolean);
  }
};

const getNativendoID = () => {
  let nativendoID = storage.localStorageIsEnabled() &&
      storage.getDataFromLocalStorage(NATIVENDO_KEY);

  if (!nativendoID) {
    if (storage.localStorageIsEnabled()) {
      nativendoID = generateUUID();
      storage.setDataInLocalStorage(NATIVENDO_KEY, nativendoID);
    }
  }

  return nativendoID;
}

const getEids = (bidRequest) => {
  const eids = [];
  const nativendoID = getNativendoID();

  if (nativendoID) {
    const nativendoUserEid = {
      source: 'nativendo.de',
      uids: [
        {
          id: nativendoID,
          atype: 1
        }
      ]
    };

    eids.push(nativendoUserEid);
  }

  if (bidRequest.userIdAsEids) {
    eids.push(bidRequest.userIdAsEids);
  }

  return eids;
}

function flatten(arr) {
  return [].concat(...arr);
}

function parseNative(bid, nativeParams) {
  let native;
  if (typeof bid.adm === 'string') {
    try {
      native = JSON.parse(bid.adm).native;
    } catch (e) {
      return;
    }
  } else {
    native = bid.adm.native;
  }

  const { assets, link, imptrackers } = native;

  const clickUrl = link.url.replace(/\$\{AUCTION_PRICE\}/g, bid.price);

  if (link.clicktrackers) {
    link.clicktrackers.forEach(function (clicktracker, index) {
      link.clicktrackers[index] = clicktracker.replace(/\$\{AUCTION_PRICE\}/g, bid.price);
    });
  }

  if (imptrackers) {
    imptrackers.forEach(function (imptracker, index) {
      imptrackers[index] = imptracker.replace(/\$\{AUCTION_PRICE\}/g, bid.price);
    });
  }

  const result = {
    url: clickUrl,
    clickUrl: clickUrl,
    clickTrackers: link.clicktrackers || undefined,
    impressionTrackers: imptrackers || undefined
  };

  const nativeParamKeys = Object.keys(nativeParams);
  let id = 0;

  nativeParamKeys.forEach(nativeParam => {
    assets.forEach(asset => {
      if (asset.id === id) {
        switch (nativeParam) {
          case 'title':
            result.title = asset.title.text;
            break;
          case 'body':
          case 'cta':
          case 'sponsoredBy':
            result[nativeParam] = asset.data.value;
            break;
          case 'image':
          case 'icon':
            result[nativeParam] = {
              url: asset.img.url,
              width: asset.img.w,
              height: asset.img.h
            };
            break;
        }
      }
    });

    id++;
  });

  return result;
}

registerBidder(spec);
