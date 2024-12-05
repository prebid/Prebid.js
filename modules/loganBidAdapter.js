import { getWindowTop } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { buildUserSyncs, interpretResponse, isBidRequestValid, getBidFloor, consentCheck } from '../libraries/precisoUtils/bidUtilsCommon.js';

const BIDDER_CODE = 'logan';
const AD_URL = 'https://USeast2.logan.ai/pbjs';
const SYNC_URL = 'https://ssp-cookie.logan.ai';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid,

  buildRequests: (validBidRequests = [], bidderRequest) => {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const winTop = getWindowTop();
    const location = winTop.location;
    const placements = [];
    const request = {
      deviceWidth: winTop.screen.width,
      deviceHeight: winTop.screen.height,
      language: (navigator && navigator.language) ? navigator.language.split('-')[0] : '',
      secure: 1,
      host: location.host,
      page: location.pathname,
      placements: placements
    };

    consentCheck(bidderRequest, request);

    const len = validBidRequests.length;
    for (let i = 0; i < len; i++) {
      const bid = validBidRequests[i];
      const placement = {
        placementId: bid.params.placementId,
        bidId: bid.bidId,
        schain: bid.schain || {},
        bidfloor: getBidFloor(bid)
      };
      const mediaType = bid.mediaTypes;

      if (mediaType && mediaType[BANNER] && mediaType[BANNER].sizes) {
        placement.sizes = mediaType[BANNER].sizes;
        placement.adFormat = BANNER;
      } else if (mediaType && mediaType[VIDEO] && mediaType[VIDEO].playerSize) {
        placement.wPlayer = mediaType[VIDEO].playerSize[0];
        placement.hPlayer = mediaType[VIDEO].playerSize[1];
        placement.minduration = mediaType[VIDEO].minduration;
        placement.maxduration = mediaType[VIDEO].maxduration;
        placement.mimes = mediaType[VIDEO].mimes;
        placement.protocols = mediaType[VIDEO].protocols;
        placement.startdelay = mediaType[VIDEO].startdelay;
        placement.placement = mediaType[VIDEO].placement;
        placement.plcmt = mediaType[VIDEO].plcmt;
        placement.skip = mediaType[VIDEO].skip;
        placement.skipafter = mediaType[VIDEO].skipafter;
        placement.minbitrate = mediaType[VIDEO].minbitrate;
        placement.maxbitrate = mediaType[VIDEO].maxbitrate;
        placement.delivery = mediaType[VIDEO].delivery;
        placement.playbackmethod = mediaType[VIDEO].playbackmethod;
        placement.api = mediaType[VIDEO].api;
        placement.linearity = mediaType[VIDEO].linearity;
        placement.adFormat = VIDEO;
      } else if (mediaType && mediaType[NATIVE]) {
        placement.native = mediaType[NATIVE];
        placement.adFormat = NATIVE;
      }
      placements.push(placement);
    }

    return {
      method: 'POST',
      url: AD_URL,
      data: request
    };
  },

  interpretResponse: interpretResponse,
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    return buildUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, SYNC_URL);
  }

};

registerBidder(spec);
