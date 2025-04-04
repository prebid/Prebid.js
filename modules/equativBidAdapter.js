import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { tryAppendQueryString } from '../libraries/urlUtils/urlUtils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { deepAccess, deepSetValue, logError, logWarn, mergeDeep } from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 */

const BIDDER_CODE = 'equativ';
const COOKIE_SYNC_ORIGIN = 'https://apps.smartadserver.com';
const COOKIE_SYNC_URL = `${COOKIE_SYNC_ORIGIN}/diff/templates/asset/csync.html`;
const LOG_PREFIX = 'Equativ:';
const PID_STORAGE_NAME = 'eqt_pid';

let nwid = 0;

let impIdMap = {};

/**
 * Assigns values to new properties, removes temporary ones from an object
 * and remove temporary default bidfloor of -1
 * @param {*} obj An object
 * @param {string} key A name of the new property
 * @param {string} tempKey A name of the temporary property to be removed
 * @returns {*} An updated object
 */
function cleanObject(obj, key, tempKey) {
  const newObj = {};

  for (const prop in obj) {
    if (prop === key) {
      if (Object.prototype.hasOwnProperty.call(obj, tempKey)) {
        newObj[key] = obj[tempKey];
      }
    } else if (prop !== tempKey) {
      newObj[prop] = obj[prop];
    }
  }

  newObj.bidfloor === -1 && delete newObj.bidfloor;

  return newObj;
}

/**
 * Returns a floor price provided by the Price Floors module or the floor price set in the publisher parameters
 * @param {*} bid
 * @param {string} mediaType A media type
 * @param {number} width A width of the ad
 * @param {number} height A height of the ad
 * @param {string} currency A floor price currency
 * @returns {number} Floor price
 */
function getFloor(bid, mediaType, width, height, currency) {
  return bid.getFloor?.({ currency, mediaType, size: [width, height] })
    .floor || bid.params.bidfloor || -1;
}

/**
 * Evaluates impressions for validity.  The entry evaluated is considered valid if NEITHER of these conditions are met:
 * 1) it has a `video` property defined for `mediaTypes.video` which is an empty object
 * 2) it has a `native` property defined for `mediaTypes.native` which is an empty object
 * @param {*} bidReq A bid request object to evaluate
 * @returns boolean
 */
function isValid(bidReq) {
  return !(bidReq.mediaTypes.video && JSON.stringify(bidReq.mediaTypes.video) === '{}') && !(bidReq.mediaTypes.native && JSON.stringify(bidReq.mediaTypes.native) === '{}');
}

/**
 * Generates a 14-char string id
 * @returns {string}
 */
function makeId() {
  const length = 14;
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let counter = 0;
  let str = '';

  while (counter++ < length) {
    str += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return str;
}

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

export const spec = {
  code: BIDDER_CODE,
  gvlid: 45,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * @param bidRequests
   * @param bidderRequest
   * @returns {ServerRequest[]}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    if (bidRequests.filter(isValid).length === 0) {
      logError(`${LOG_PREFIX} No useful bid requests to process. No requests will be sent.`, bidRequests);
      return undefined;
    }

    const requests = [];

    bidRequests.forEach(bid => {
      const data = converter.toORTB({bidRequests: [bid], bidderRequest});
      requests.push({
        data,
        method: 'POST',
        url: 'https://ssb-global.smartadserver.com/api/bid?callerId=169',
      })
    });

    return requests;
  },

  /**
   * @param serverResponse
   * @param bidRequest
   * @returns {Bid[]}
   */
  interpretResponse: (serverResponse, bidRequest) => {
    if (bidRequest.data?.imp?.length) {
      bidRequest.data.imp.forEach(imp => imp.id = impIdMap[imp.id]);
    }

    if (serverResponse.body?.seatbid?.length) {
      serverResponse.body.seatbid
        .filter(seat => seat?.bid?.length)
        .forEach(seat =>
          seat.bid.forEach(bid => bid.impid = impIdMap[bid.impid])
        );
    }

    return converter.fromORTB({
      request: bidRequest.data,
      response: serverResponse.body,
    });
  },

  /**
   * @param bidRequest
   * @returns {boolean}
   */
  isBidRequestValid: (bidRequest) => {
    return !!(
      deepAccess(bidRequest, 'params.networkId') ||
      deepAccess(bidRequest, 'ortb2.site.publisher.id') ||
      deepAccess(bidRequest, 'ortb2.app.publisher.id') ||
      deepAccess(bidRequest, 'ortb2.dooh.publisher.id')
    );
  },

  /**
   * @param syncOptions
   * @returns {{type: string, url: string}[]}
   */
  getUserSyncs: (syncOptions, serverResponses, gdprConsent) => {
    if (syncOptions.iframeEnabled) {
      window.addEventListener('message', function handler(event) {
        if (event.origin === COOKIE_SYNC_ORIGIN && event.data.action === 'getConsent') {
          event.source.postMessage({
            action: 'consentResponse',
            id: event.data.id,
            consents: gdprConsent.vendorData.vendor.consents
          }, event.origin);

          if (event.data.pid) {
            storage.setDataInLocalStorage(PID_STORAGE_NAME, event.data.pid);
          }

          this.removeEventListener('message', handler);
        }
      });

      let url = tryAppendQueryString(COOKIE_SYNC_URL + '?', 'nwid', nwid);
      url = tryAppendQueryString(url, 'gdpr', (gdprConsent.gdprApplies ? '1' : '0'));

      return [{ type: 'iframe', url }];
    }

    return [];
  }
};

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const { siteId, pageId, formatId } = bidRequest.params;

    delete imp.dt;

    imp.secure = 1;
    imp.tagid = bidRequest.adUnitCode;

    if (!deepAccess(bidRequest, 'ortb2Imp.rwdd') && deepAccess(bidRequest, 'mediaTypes.video.ext.rewarded')) {
      mergeDeep(imp, { rwdd: bidRequest.mediaTypes.video.ext.rewarded });
    }

    const bidder = { ...(siteId && { siteId }), ...(pageId && { pageId }), ...(formatId && { formatId }) };
    if (Object.keys(bidder).length) {
      mergeDeep(imp.ext, { bidder });
    }

    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const bid = context.bidRequests[0];
    const currency = config.getConfig('currency.adServerCurrency') || 'USD';
    const splitImps = [];

    imps.forEach(item => {
      const floorMap = {};

      const updateFloorMap = (type, name, width = 0, height = 0) => {
        const floor = getFloor(bid, type, width, height, currency);

        if (!floorMap[floor]) {
          floorMap[floor] = {
            ...item,
            bidfloor: floor
          };
        }

        if (!floorMap[floor][name]) {
          floorMap[floor][name] = type === 'banner' ? { format: [] } : item[type];
        }

        if (type === 'banner') {
          floorMap[floor][name].format.push({ w: width, h: height });
        }
      };

      if (item.banner?.format?.length) {
        item.banner.format.forEach(format => updateFloorMap('banner', 'bannerTemp', format?.w, format?.h));
      }
      updateFloorMap('native', 'nativeTemp');
      updateFloorMap('video', 'videoTemp', item.video?.w, item.video?.h);

      Object.values(floorMap).forEach(obj => {
        [
          ['banner', 'bannerTemp'],
          ['native', 'nativeTemp'],
          ['video', 'videoTemp']
        ].forEach(([name, tempName]) => obj = cleanObject(obj, name, tempName));

        if (obj.banner || obj.video || obj.native) {
          const id = makeId();
          impIdMap[id] = obj.id;
          obj.id = id;

          splitImps.push(obj);
        }
      });
    });

    const req = buildRequest(splitImps, bidderRequest, context);

    let env = ['ortb2.site.publisher', 'ortb2.app.publisher', 'ortb2.dooh.publisher'].find(propPath => deepAccess(bid, propPath)) || 'ortb2.site.publisher';
    nwid = deepAccess(bid, env + '.id') || bid.params.networkId;
    deepSetValue(req, env.replace('ortb2.', '') + '.id', nwid);

    [
      { path: 'mediaTypes.video', props: ['mimes', 'placement'] },
      { path: 'ortb2Imp.audio', props: ['mimes'] },
      { path: 'mediaTypes.native.ortb', props: ['privacy', 'plcmttype', 'eventtrackers'] },
    ].forEach(({ path, props }) => {
      if (deepAccess(bid, path)) {
        props.forEach(prop => {
          if (!deepAccess(bid, `${path}.${prop}`)) {
            logWarn(`${LOG_PREFIX} Property "${path}.${prop}" is missing from request.  Request will proceed, but the use of "${prop}" is strongly encouraged.`, bid);
          }
        });
      }
    });

    const pid = storage.getDataFromLocalStorage(PID_STORAGE_NAME);
    if (pid) {
      deepSetValue(req, 'user.buyeruid', pid);
    }

    return req;
  }
});

registerBidder(spec);
