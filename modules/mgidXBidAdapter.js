import { isPlainObject, isNumber, isArray, isStr } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { USERSYNC_DEFAULT_CONFIG } from '../src/userSync.js';
import { isBidRequestValid, buildRequestsBase, interpretResponse } from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'mgidX';
const GVLID = 358;
const AD_URL = 'https://#{REGION}#.mgid.com/pbjs';
const PIXEL_SYNC_URL = 'https://cm.mgid.com/i.gif';
const IFRAME_SYNC_URL = 'https://cm.mgid.com/i.html';

const buildRequests = (validBidRequests = [], bidderRequest = {}) => {
  const request = buildRequestsBase({ adUrl: AD_URL, validBidRequests, bidderRequest });
  const region = validBidRequests[0].params?.region;

  if (region === 'eu') {
    request.url = AD_URL.replace('#{REGION}#', 'eu');
  } else {
    request.url = AD_URL.replace('#{REGION}#', 'us-east-x');
  }

  return request;
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(),
  buildRequests,
  interpretResponse,

  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
    const spb = isPlainObject(config.getConfig('userSync')) &&
    isNumber(config.getConfig('userSync').syncsPerBidder)
      ? config.getConfig('userSync').syncsPerBidder : USERSYNC_DEFAULT_CONFIG.syncsPerBidder;

    if (spb > 0 && isPlainObject(syncOptions) && (syncOptions.iframeEnabled || syncOptions.pixelEnabled)) {
      let pixels = [];
      if (serverResponses &&
        isArray(serverResponses) &&
        serverResponses.length > 0 &&
        isPlainObject(serverResponses[0].body) &&
        isPlainObject(serverResponses[0].body.ext) &&
        isArray(serverResponses[0].body.ext.cm) &&
        serverResponses[0].body.ext.cm.length > 0) {
        pixels = serverResponses[0].body.ext.cm;
      }

      const syncs = [];
      const query = [];
      query.push('cbuster={cbuster}');
      query.push('gdpr_consent=' + encodeURIComponent(isPlainObject(gdprConsent) && isStr(gdprConsent?.consentString) ? gdprConsent.consentString : ''));
      if (isPlainObject(gdprConsent) && typeof gdprConsent?.gdprApplies === 'boolean' && gdprConsent.gdprApplies) {
        query.push('gdpr=1');
      } else {
        query.push('gdpr=0');
      }
      if (isPlainObject(uspConsent) && uspConsent?.consentString) {
        query.push(`us_privacy=${encodeURIComponent(uspConsent?.consentString)}`);
      }
      if (isPlainObject(gppConsent) && gppConsent?.gppString) {
        query.push(`gppString=${encodeURIComponent(gppConsent?.gppString)}`);
      }
      if (config.getConfig('coppa')) {
        query.push('coppa=1')
      }
      const q = query.join('&')
      if (syncOptions.iframeEnabled) {
        syncs.push({
          type: 'iframe',
          url: IFRAME_SYNC_URL + '?' + q.replace('{cbuster}', Math.round(new Date().getTime()))
        });
      } else if (syncOptions.pixelEnabled) {
        if (pixels.length === 0) {
          for (let i = 0; i < spb; i++) {
            syncs.push({
              type: 'image',
              url: PIXEL_SYNC_URL + '?' + q.replace('{cbuster}', Math.round(new Date().getTime())) // randomly selects partner if sync required
            });
          }
        } else {
          for (let i = 0; i < spb && i < pixels.length; i++) {
            syncs.push({
              type: 'image',
              url: pixels[i] + (pixels[i].indexOf('?') > 0 ? '&' : '?') + q.replace('{cbuster}', Math.round(new Date().getTime()))
            });
          }
        }
      }
      return syncs;
    }
  }
};

registerBidder(spec);
