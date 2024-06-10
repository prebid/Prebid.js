import { isFn, deepAccess, logInfo, replaceAuctionPrice } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import {ajax} from '../src/ajax.js';
// import { config } from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

const BIDDER__CODE = 'preciso';
const COOKIE_NAME = '_sharedid';
const AD_URL = 'https://ssp-bidder.mndtrk.com/bid_request/openrtb';
// const AD_URL = 'http://localhost:80/bid_request/openrtb';
const URL_SYNC = 'https://ck.2trk.info/rtb/user/usersync.aspx?';
const SUPPORTED_MEDIA_TYPES = [BANNER];
const GVLID = 874;
let userId = 'NA';
let precisoId = 'NA';
let sharedId = 'NA'

export const storage2 = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: BIDDER__CODE });
export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: 'sharedId' });

export const spec = {
  code: BIDDER__CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,

  isBidRequestValid: (bid) => {
    sharedId = readFromAllStorages(COOKIE_NAME);
    let precisoBid = true;
    const preCall = 'https://ssp-usersync.mndtrk.com/getUUID?sharedId=' + sharedId;
    precisoId = window.localStorage.getItem('_pre|id');

    if (Object.is(precisoId, 'NA') || Object.is(precisoId, null) || Object.is(precisoId, undefined)) {
      if (!bid.precisoBid) {
        precisoBid = false;
        getapi(preCall);
      }
    }

    return Boolean(bid.bidId && bid.params && bid.params.publisherId && precisoBid);
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
    if (validBidRequests !== 'undefined' && validBidRequests.length > 0) {
      userId = validBidRequests[0].userId.pubcid;
    }
    // let winTop = window;
    // let location;
    var city = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let request = {
      // bidRequest: bidderRequest,
      id: validBidRequests[0].auctionId,
      cur: validBidRequests[0].params.currency || ['USD'],
      imp: validBidRequests.map(request => {
        const { bidId, sizes } = request
        const item = {
          id: bidId,
          bidFloor: getBidFloor(request),
          bidfloorcur: request.params.currency
        }

        if (request.mediaTypes.banner) {
          item.banner = {
            format: (request.mediaTypes.banner.sizes || sizes).map(size => {
              return { w: size[0], h: size[1] }
            }),

          }
        }
        return item
      }),
      user: {
        id: validBidRequests[0].userId.pubcid || '',
        buyeruid: window.localStorage.getItem('_pre|id'),
        geo: {
          country: validBidRequests[0].params.region || city,
        },

      },
      device: validBidRequests[0].ortb2.device,
      site: validBidRequests[0].ortb2.site,
      source: validBidRequests[0].ortb2.source,
      bcat: validBidRequests[0].ortb2.bcat || validBidRequests[0].params.bcat,
      badv: validBidRequests[0].ortb2.badv || validBidRequests[0].params.badv,
      wlang: validBidRequests[0].ortb2.wlang || validBidRequests[0].params.wlang,
    };
    request.site.publisher = {
      publisherId: validBidRequests[0].params.publisherId
    };

    //  request.language.indexOf('-') != -1 && (request.language = request.language.split('-')[0])
    if (bidderRequest) {
      if (bidderRequest.uspConsent) {
        request.ccpa = bidderRequest.uspConsent;
      }
      if (bidderRequest.gdprConsent) {
        request.gdpr = bidderRequest.gdprConsent
      }
      if (bidderRequest.gppConsent) {
        request.gpp = bidderRequest.gppConsent;
      }
    }

    return {
      method: 'POST',
      url: AD_URL,
      data: request,

    };
  },

  interpretResponse: function (serverResponse) {
    const response = serverResponse.body

    const bids = []

    response.seatbid.forEach(seat => {
      seat.bid.forEach(bid => {
        bids.push({
          requestId: bid.impid,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          creativeId: bid.crid,
          ad: macroReplace(bid.adm, bid.price),
          currency: 'USD',
          netRevenue: true,
          ttl: 300,
          meta: {
            advertiserDomains: bid.adomain || '',
          },
        })
      })
    })
    return bids
  },

  onBidWon: (bid) => {
    if (bid.nurl) {
      const resolvedNurl = replaceAuctionPrice(bid.nurl, bid.price);
      ajax(resolvedNurl);
    }
  },

  getUserSyncs: (syncOptions, serverResponses = [], gdprConsent = {}, uspConsent = '', gppConsent = '') => {
    userId = sharedId;
    let syncs = [];
    let { gdprApplies, consentString = '' } = gdprConsent;

    if (serverResponses.length > 0) {
      logInfo('preciso bidadapter getusersync serverResponses:' + serverResponses.toString);
    }
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `${URL_SYNC}id=${userId}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}&us_privacy=${uspConsent}&t=4`
      });
    } else {
      syncs.push({
        type: 'image',
        url: `${URL_SYNC}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}&us_privacy=${uspConsent}&t=2`
      });
    }

    return syncs
  }

};

/* replacing auction_price macro from adm */
function macroReplace(adm, cpm) {
  let replacedadm = replaceAuctionPrice(adm, cpm);
  return replacedadm;
}

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.bidFloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });
    return bidFloor.floor;
  } catch (_) {
    return 0
  }
}

async function getapi(url) {
  try {
    // Storing response
    const response = await fetch(url);

    // Storing data in form of JSON
    var data = await response.json();

    const dataMap = new Map(Object.entries(data));

    const uuidValue = dataMap.get('UUID');

    if (!Object.is(uuidValue, null) && !Object.is(uuidValue, undefined)) {
      storage2.setDataInLocalStorage('_pre|id', uuidValue);
      logInfo('DEBUG nonNull uuidValue:' + uuidValue);
    }

    return data;
  } catch (error) {
    logInfo('Error in preciso precall' + error);
  }
}

function readFromAllStorages(name) {
  const fromCookie = storage.getCookie(name);
  const fromLocalStorage = storage.getDataFromLocalStorage(name);

  return fromCookie || fromLocalStorage || undefined;
}

registerBidder(spec);
