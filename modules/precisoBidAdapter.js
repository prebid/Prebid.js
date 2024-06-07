import { logMessage, isFn, deepAccess, logInfo } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'preciso';
const AD_URL = 'https://ssp-bidder.mndtrk.com/bid_request/openrtb';
const URL_SYNC = 'https://ck.2trk.info/rtb/user/usersync.aspx?';
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE, VIDEO];
const GVLID = 874;
let userId = 'NA';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && !isNaN(bid.params.publisherId) && bid.params.host == 'prebid');
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
    // userId = validBidRequests[0].userId.pubcid;
    let winTop = window;
    let location;
    var offset = new Date().getTimezoneOffset();
    logInfo('timezone ' + offset);
    var city = Intl.DateTimeFormat().resolvedOptions().timeZone;
    logInfo('location test' + city)

    const countryCode = getCountryCodeByTimezone(city);
    logInfo(`The country code for ${city} is ${countryCode}`);

    // TODO: this odd try-catch block was copied in several adapters; it doesn't seem to be correct for cross-origin
    try {
      location = new URL(bidderRequest.refererInfo.page)
      winTop = window.top;
    } catch (e) {
      location = winTop.location;
      logMessage(e);
    };

    let request = {
      id: validBidRequests[0].bidderRequestId,

      imp: validBidRequests.map(request => {
        const { bidId, sizes, mediaType, ortb2 } = request
        const item = {
          id: bidId,
          region: request.params.region,
          traffic: mediaType,
          bidFloor: getBidFloor(request),
          ortb2: ortb2

        }

        if (request.mediaTypes.banner) {
          item.banner = {
            format: (request.mediaTypes.banner.sizes || sizes).map(size => {
              return { w: size[0], h: size[1] }
            }),
          }
        }

        if (request.schain) {
          item.schain = request.schain;
        }

        if (request.floorData) {
          item.bidFloor = request.floorData.floorMin;
        }
        return item
      }),
      auctionId: validBidRequests[0].auctionId,
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'language': (navigator && navigator.language) ? navigator.language : '',
      geo: navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        return {
          latitude: latitude,
          longitude: longitude
        }
        // Show a map centered at latitude / longitude.
      }) || { utcoffset: new Date().getTimezoneOffset() },
      city: city,
      'host': location.host,
      'page': location.pathname,
      'coppa': config.getConfig('coppa') === true ? 1 : 0
      // userId: validBidRequests[0].userId
    };

    request.language.indexOf('-') != -1 && (request.language = request.language.split('-')[0])
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
          ad: bid.adm,
          currency: 'USD',
          netRevenue: true,
          ttl: 300,
          meta: {
            advertiserDomains: bid.adomain || [],
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

registerBidder(spec);
