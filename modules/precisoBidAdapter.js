import { isFn, deepAccess, logInfo,replaceAuctionPrice } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
// import { config } from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

const BIDDER_CODE = 'preciso';
const COOKIE_NAME = '_sharedid';
const AD_URL = 'https://ssp-bidder.mndtrk.com/bid_request/openrtb';
// const AD_URL = 'http://localhost:80/bid_request/openrtb';
const URL_SYNC = 'https://ck.2trk.info/rtb/user/usersync.aspx?';
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE, VIDEO];
const GVLID = 874;
let userId = 'NA';
let precisoId = 'NA';

export const storage2 = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: BIDDER_CODE });
export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: 'sharedId' });

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,

  isBidRequestValid: (bid) => {
    let sharedId = readFromAllStorages(COOKIE_NAME);
    let precisoBid = true;
    const preCall = 'https://ssp-usersync.mndtrk.com/getUUID?sharedId=' + sharedId;
    precisoId = window.localStorage.getItem('_pre|id');

    if (Object.is(precisoId, 'NA') || Object.is(precisoId, null) || Object.is(precisoId, undefined)) {
      if (!bid.precisoBid) {
        precisoBid = false;
        getapi(preCall);
      }
    }

    return Boolean(bid.bidId && bid.params && !isNaN(bid.params.publisherId) && bid.params.host == 'prebid' && precisoBid);
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
    if (validBidRequests !== 'undefined' && validBidRequests.length > 0) {
      userId = validBidRequests[0].userId.pubcid;
    }
    // let winTop = window;
    // let location;
    var offset = new Date().getTimezoneOffset();
    logInfo('timezone ' + offset);
    var city = Intl.DateTimeFormat().resolvedOptions().timeZone;
    logInfo('location test' + city);
    logInfo('test log');

    const countryCode = getCountryCodeByTimezone(city);
    logInfo(`The country code for ${city} is ${countryCode}`);
    let request = {
      // bidRequest: bidderRequest,
      id: validBidRequests[0].auctionId,
      cur: 'USD',
      imp: validBidRequests.map(request => {
        const { bidId, sizes } = request
        const item = {
          id: bidId,
          // region: request.params.region,
          // traffic: mediaType,
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
          region: validBidRequests[0].params.region || city,
        },

      },
      device: validBidRequests[0].ortb2.device,
      site: validBidRequests[0].ortb2.site,
      source: validBidRequests[0].ortb2.source
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
          ad: macroReplace (bid.adm,bid.price), 
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

  getUserSyncs: (syncOptions, serverResponses = [], gdprConsent = {}, uspConsent = '', gppConsent = '') => {
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
function macroReplace(adm, cpm){
  let replacedadm = replaceAuctionPrice(adm,cpm);
  return replacedadm;
}

function getCountryCodeByTimezone(city) {
  try {
    const now = new Date();
    const options = {
      timeZone: city,
      timeZoneName: 'long',
    };
    const [timeZoneName] = new Intl.DateTimeFormat('en-US', options)
      .formatToParts(now)
      .filter((part) => part.type === 'timeZoneName');

    if (timeZoneName) {
      // Extract the country code from the timezone name
      const parts = timeZoneName.value.split('-');
      if (parts.length >= 2) {
        return parts[1];
      }
    }
  } catch (error) {
    // Handle errors, such as an invalid timezone city
    logInfo(error);
  }

  // Handle the case where the city is not found or an error occurred
  return 'Unknown';
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
