import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'bmtm';
const AD_URL = 'https://one.elitebidder.com/api/hb';
const SYNC_URL = 'https://console.brightmountainmedia.com:8443/cookieSync';

const videoExt = [
  'video/x-ms-wmv',
  'video/x-flv',
  'video/mp4',
  'video/3gpp',
  'application/x-mpegURL',
  'video/quicktime',
  'video/x-msvideo',
  'application/x-shockwave-flash',
  'application/javascript'
];

export const spec = {
  code: BIDDER_CODE,
  aliases: ['brightmountainmedia'],
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && bid.params.placement_id);
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    let winTop = window;
    let location;
    try {
      location = new URL(bidderRequest.refererInfo.referer)
      winTop = window.top;
    } catch (e) {
      location = winTop.location;
      utils.logMessage(e);
    };
    let placements = [];
    let request = {
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'language': (navigator && navigator.language) ? navigator.language : '',
      'secure': 1,
      'host': location.host,
      'page': location.pathname,
      'placements': placements
    };
    if (bidderRequest) {
      if (bidderRequest.gdprConsent) {
        request.gdpr_consent = bidderRequest.gdprConsent.consentString || 'ALL'
        request.gdpr_require = bidderRequest.gdprConsent.gdprApplies ? 1 : 0
      }
    }
    for (let i = 0; i < validBidRequests.length; i++) {
      let bid = validBidRequests[i];
      let placement = {
        placementId: bid.params.placement_id,
        bidId: bid.bidId,
      };

      if (bid.mediaTypes.hasOwnProperty(BANNER)) {
        placement['traffic'] = BANNER;
        if (bid.mediaTypes.banner.sizes) {
          placement['sizes'] = bid.mediaTypes.banner.sizes;
        }
      }

      if (bid.mediaTypes.hasOwnProperty(VIDEO)) {
        placement['traffic'] = VIDEO;
        if (bid.mediaTypes.video.context) {
          placement['context'] = bid.mediaTypes.video.context;
        }
        if (bid.mediaTypes.video.playerSize) {
          placement['sizes'] = bid.mediaTypes.video.playerSize;
        }
        if (bid.mediaTypes.video.mimes && Array.isArray(bid.mediaTypes.video.mimes)) {
          placement['mimes'] = bid.mediaTypes.video.mimes;
        } else {
          placement['mimes'] = videoExt;
        }
        if (bid.mediaTypes.video.skip != undefined) {
          placement['skip'] = bid.mediaTypes.video.skip;
        }
        if (bid.mediaTypes.video.playbackmethod && Array.isArray(bid.mediaTypes.video.playbackmethod)) {
          placement['playbackmethod'] = bid.mediaTypes.video.playbackmethod;
        }
      }
      if (bid.schain) {
        placement.schain = bid.schain;
      }
      placements.push(placement);
    }
    return {
      method: 'POST',
      url: AD_URL,
      data: request
    };
  },

  interpretResponse: (serverResponse) => {
    let bidResponse = [];
    const response = serverResponse.body;
    if (response && Array.isArray(response) && response.length > 0) {
      for (let i = 0; i < response.length; i++) {
        if (response[i].cpm > 0) {
          if (response[i].mediaType && response[i].mediaType === 'video') {
            response[i].vastXml = response[i].ad;
          }
          bidResponse.push(response[i]);
        }
      }
    }
    return bidResponse;
  },

  getUserSyncs: (syncOptions) => {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: SYNC_URL
      }];
    }
  },

};

registerBidder(spec);
