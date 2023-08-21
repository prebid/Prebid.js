import { logMessage } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'preciso';
const AD_URL = 'https://ssp-bidder.mndtrk.com/bid_request/openrtb';
const URL_SYNC = 'https://ck.2trk.info/rtb/user/usersync.aspx?id=preciso_srl';
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE, VIDEO];
const GVLID = 874;

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

    let winTop = window;
    let location;
    // TODO: this odd try-catch block was copied in several adapters; it doesn't seem to be correct for cross-origin
    try {
      location = new URL(bidderRequest.refererInfo.page)
      winTop = window.top;
    } catch (e) {
      location = winTop.location;
      logMessage(e);
    };
    let placements = [];
    let imp = [];
    let site = {
      'domain': location.domain || '',
      'page': location || ''
    }

    let request = {
      'id': '123456',
      'imp': imp,
      'site': site,
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'language': (navigator && navigator.language) ? navigator.language : '',
      'secure': 1,
      'host': location.host,
      'page': location.pathname,
      'coppa': config.getConfig('coppa') === true ? 1 : 0,
      'placements': placements
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

    const len = validBidRequests.length;

    for (let i = 0; i < len; i++) {
      let bid = validBidRequests[i];
      let traff = bid.params.traffic || BANNER
      placements.push({
        region: bid.params.region,
        bidId: bid.bidId,
        sizes: bid.mediaTypes && bid.mediaTypes[traff] && bid.mediaTypes[traff].sizes ? bid.mediaTypes[traff].sizes : [],
        traffic: traff,
        publisherId: bid.params.publisherId
      });
      imp.push({
        id: bid.bidId,
        sizes: bid.mediaTypes && bid.mediaTypes[traff] && bid.mediaTypes[traff].sizes ? bid.mediaTypes[traff].sizes : [],
        traffic: traff,
        publisherId: bid.params.publisherId
      })
      if (bid.schain) {
        placements.schain = bid.schain;
      }
    }
    return {
      method: 'POST',
      url: AD_URL,
      data: request
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

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `${URL_SYNC}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}&us_privacy=${uspConsent}&t=4`
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

registerBidder(spec);
