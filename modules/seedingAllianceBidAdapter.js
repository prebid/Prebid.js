// jshint esversion: 6, es3: false, node: true
'use strict';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';
import {_map, generateUUID, deepSetValue, isArray, isEmpty, replaceAuctionPrice} from '../src/utils.js';
import {config} from '../src/config.js';
import {convertOrtbRequestToProprietaryNative} from '../src/native.js';
import {getStorageManager} from '../src/storageManager.js';

const GVL_ID = 371;
const BIDDER_CODE = 'seedingAlliance';
const DEFAULT_CUR = 'EUR';
const ENDPOINT_URL = 'https://b.nativendo.de/cds/rtb/bid?format=openrtb2.5&ssp=pb';
const NATIVENDO_KEY = 'nativendo_id';

const NATIVE_ASSET_IDS = { 0: 'title', 1: 'body', 2: 'sponsoredBy', 3: 'image', 4: 'cta', 5: 'icon' };

export const storage = getStorageManager({bidderCode: BIDDER_CODE});

const NATIVE_PARAMS = {
  title: { id: 0, name: 'title' },
  body: { id: 1, name: 'data', type: 2 },
  sponsoredBy: { id: 2, name: 'data', type: 1 },
  image: { id: 3, type: 3, name: 'img' },
  cta: { id: 4, type: 12, name: 'data' },
  icon: { id: 5, type: 1, name: 'img' }
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [NATIVE, BANNER],

  isBidRequestValid: function (bid) {
    return !!bid.params.adUnitId;
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    let url = bidderRequest.refererInfo.page;
    let eids = getEids(validBidRequests[0]);

    const imps = validBidRequests.map((bidRequest, id) => {
      const imp = {
        id: String(id + 1),
        tagid: bidRequest.params.adUnitId
      };

      /**
       * Native Ad
       */
      if (bidRequest.nativeParams) {
        const assets = _map(bidRequest.nativeParams, (nativeAsset, key) => {
          const props = NATIVE_PARAMS[key];

          if (props) {
            let wmin, hmin, w, h;
            let aRatios = nativeAsset.aspect_ratios;

            if (aRatios && aRatios[0]) {
              aRatios = aRatios[0];
              wmin = aRatios.min_width || 0;
              hmin = aRatios.ratio_height * wmin / aRatios.ratio_width | 0;
            }

            if (nativeAsset.sizes) {
              const sizes = flatten(nativeAsset.sizes);
              w = parseInt(sizes[0], 10);
              h = parseInt(sizes[1], 10);
            }

            const asset = {
              id: props.id,
              required: nativeAsset.required & 1
            };

            asset[props.name] = {
              len: nativeAsset.len,
              type: props.type,
              wmin,
              hmin,
              w,
              h
            };

            return asset;
          } else {
            // TODO Filter impressions with required assets we don't support
          }
        }).filter(Boolean);

        imp.native = {
          request: JSON.stringify({assets})
        };
      } else {
        let sizes = transformSizes(bidRequest.sizes);

        imp.banner = {
          format: sizes,
          w: sizes[0] ? sizes[0].w : 0,
          h: sizes[0] ? sizes[0].h : 0
        }
      }

      if (bidRequest.params.url) {
        url = bidRequest.params.url;
      }

      return imp;
    });

    const request = {
      id: bidderRequest.bidderRequestId,
      site: {
        page: url
      },
      cur: [config.getConfig('currency.adServerCurrency') || DEFAULT_CUR],
      imp: imps,
      tmax: bidderRequest.timeout,
      regs: {
        ext: {
          gdpr: 0,
          pb_ver: '$prebid.version$'
        }
      }
    };

    if (bidderRequest.gdprConsent) {
      request.user = {};

      deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(request, 'regs.ext.gdpr', (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean' && bidderRequest.gdprConsent.gdprApplies) ? 1 : 0);
      deepSetValue(request, 'user.ext.eids', eids);
    }

    let endpoint = config.getConfig('seedingAlliance.endpoint') || ENDPOINT_URL;

    return {
      method: 'POST',
      url: endpoint,
      data: JSON.stringify(request),
      bidRequests: validBidRequests
    };
  },

  interpretResponse: function (serverResponse, { bidRequests }) {
    if (isEmpty(serverResponse.body)) {
      return [];
    }

    const { seatbid, cur } = serverResponse.body;

    const bidResponses = (typeof seatbid != 'undefined') ? flatten(seatbid.map(seat => seat.bid)).reduce((result, bid) => {
      result[bid.impid - 1] = bid;
      return result;
    }, []) : [];

    return bidRequests
      .map((bidRequest, id) => {
        const bidResponse = bidResponses[id];

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
            bidObject.native = parseNative(bidResponse);
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

function transformSizes(requestSizes) {
  if (!isArray(requestSizes)) {
    return [];
  }

  if (requestSizes.length === 2 && !isArray(requestSizes[0])) {
    return [{
      w: parseInt(requestSizes[0], 10),
      h: parseInt(requestSizes[1], 10)
    }];
  } else if (isArray(requestSizes[0])) {
    return requestSizes.map(item => ({
      w: parseInt(item[0], 10),
      h: parseInt(item[1], 10)
    }));
  }

  return [];
}

function flatten(arr) {
  return [].concat(...arr);
}

function parseNative(bid) {
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

  let clickUrl = link.url.replace(/\$\{AUCTION_PRICE\}/g, bid.price);

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

  assets.forEach(asset => {
    const kind = NATIVE_ASSET_IDS[asset.id];
    const content = kind && asset[NATIVE_PARAMS[kind].name];

    if (content) {
      result[kind] = content.text || content.value || { url: content.url, width: content.w, height: content.h };
    }
  });

  return result;
}

registerBidder(spec);
