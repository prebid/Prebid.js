import { logError } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER, VIDEO, NATIVE} from '../src/mediaTypes.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'admixer';
const ALIASES = ['go2net', 'adblender', 'adsyield', 'futureads'];
const ENDPOINT_URL = 'https://inv-nets.admixer.net/prebid.1.2.aspx';
export const spec = {
  code: BIDDER_CODE,
  aliases: ALIASES,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  /**
   * Determines whether or not the given bid request is valid.
   */
  isBidRequestValid: function (bid) {
    return !!bid.params.zone;
  },
  /**
   * Make a server request from the list of BidRequests.
   */
  buildRequests: function (validRequest, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validRequest = convertOrtbRequestToProprietaryNative(validRequest);

    let w;
    let docRef;
    do {
      w = w ? w.parent : window;
      try {
        docRef = w.document.referrer;
      } catch (e) {
        break;
      }
    } while (w !== window.top);
    const payload = {
      imps: [],
      ortb2: bidderRequest.ortb2,
      docReferrer: docRef,
    };
    let endpointUrl;
    if (bidderRequest) {
      const {bidderCode} = bidderRequest;
      endpointUrl = config.getConfig(`${bidderCode}.endpoint_url`);
      // TODO: is 'page' the right value here?
      if (bidderRequest.refererInfo?.page) {
        payload.referrer = encodeURIComponent(bidderRequest.refererInfo.page);
      }
      if (bidderRequest.gdprConsent) {
        payload.gdprConsent = {
          consentString: bidderRequest.gdprConsent.consentString,
          // will check if the gdprApplies field was populated with a boolean value (ie from page config).  If it's undefined, then default to true
          gdprApplies: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true
        };
      }
      if (bidderRequest.uspConsent) {
        payload.uspConsent = bidderRequest.uspConsent;
      }
    }
    validRequest.forEach((bid) => {
      let imp = {};
      Object.keys(bid).forEach(key => imp[key] = bid[key]);
      payload.imps.push(imp);
    });
    return {
      method: 'POST',
      url: endpointUrl || ENDPOINT_URL,
      data: payload,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    try {
      const {body: {ads = []} = {}} = serverResponse;
      ads.forEach((ad) => bidResponses.push(ad));
    } catch (e) {
      logError(e);
    }
    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    const pixels = [];
    serverResponses.forEach(({body: {cm = {}} = {}}) => {
      const {pixels: img = [], iframes: frm = []} = cm;
      if (syncOptions.pixelEnabled) {
        img.forEach((url) => pixels.push({type: 'image', url}));
      }
      if (syncOptions.iframeEnabled) {
        frm.forEach((url) => pixels.push({type: 'iframe', url}));
      }
    });
    return pixels;
  }
};
registerBidder(spec);
