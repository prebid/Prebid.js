import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { getAdUrlByRegion } from '../libraries/smartyadsUtils/getAdUrlByRegion.js';
import { interpretResponse, getUserSyncs } from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'smartyads';
const GVLID = 534;

const URL_SYNC = 'https://as.ck-ie.com/prebidjs?p=7c47322e527cf8bdeb7facc1bb03387a';

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && !isNaN(bid.params.sourceid) && !isNaN(bid.params.accountid) && bid.params.host === 'prebid');
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const winTop = window;
    let location;
    location = bidderRequest?.refererInfo ?? null;
    const placements = [];
    const request = {
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'host': location?.domain ?? '',
      'page': location?.page ?? '',
      'coppa': config.getConfig('coppa') === true ? 1 : 0,
      'placements': placements,
      'eeid': validBidRequests[0]?.userIdAsEids,
      'ifa': bidderRequest?.ortb2?.device?.ifa,
    };

    if (bidderRequest) {
      if (bidderRequest.gdprConsent) {
        request.gdpr = bidderRequest.gdprConsent
      }
      if (bidderRequest.gppConsent) {
        request.gpp = bidderRequest.gppConsent;
      }
    }
    const len = validBidRequests.length;

    let adUrl;

    for (let i = 0; i < len; i++) {
      const bid = validBidRequests[i];

      if (i === 0) adUrl = getAdUrlByRegion(bid);

      const traff = bid.params.traffic || BANNER;
      placements.push({
        placementId: bid.params.sourceid,
        bidId: bid.bidId,
        sizes: bid.mediaTypes && bid.mediaTypes[traff] && bid.mediaTypes[traff].sizes ? bid.mediaTypes[traff].sizes : [],
        traffic: traff,
        publisherId: bid.params.accountid
      });
      const schain = bid?.ortb2?.source?.ext?.schain;
      if (schain) {
        placements.schain = schain;
      }
    }

    return {
      method: 'POST',
      url: adUrl,
      data: request
    }
  },

  interpretResponse,
  getUserSyncs: getUserSyncs(URL_SYNC),
};

registerBidder(spec);
