import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import * as utils from '../src/utils.js';
import { Renderer } from '../src/Renderer.js';
import { OUTSTREAM } from '../src/video.js';

const ENDPOINT = `https://d.vidoomy.com/api/rtbserver/prebid/`;
const BIDDER_CODE = 'vidoomy';
const isBidRequestValid = bid => {
  if (!bid.params) {
    utils.logError(BIDDER_CODE + ': bid.params should be non-empty');
    return false;
  }

  if (!+bid.params.pid) {
    utils.logError(BIDDER_CODE + ': bid.params.pid should be non-empty Number');
    return false;
  }

  if (!+bid.params.id) {
    utils.logError(BIDDER_CODE + ': bid.params.id should be non-empty Number');
    return false;
  }

  return true;
};

const buildRequests = (validBidRequests, bidderRequest) => {
  const serverRequests = validBidRequests.map(bid => {
    const adType = Object.keys(bid.mediaTypes)[0];

    let w, h;

    if (adType === VIDEO) {
      [w, h] = bid.mediaTypes[adType].playerSize;
    }

    if (adType === BANNER) {
      [w, h] = bid.mediaTypes[adType].sizes[0];
    }
    const videoContext = utils.deepAccess(bid, 'mediaTypes.video.context');

    const queryParams = new URLSearchParams();
    queryParams.append('id', bid.params.id);
    queryParams.append('adtype', adType);
    queryParams.append('w', w);
    queryParams.append('h', h);
    queryParams.append('pos', parseInt(bid.params.position) || 1);
    queryParams.append('ua', navigator.userAgent);
    queryParams.append('l', navigator.language && navigator.language.indexOf('-') !== -1 ? navigator.language.split('-')[0] : '');
    queryParams.append('dt', /Mobi/.test(navigator.userAgent) ? 2 : 1);
    queryParams.append('pid', bid.params.pid);
    queryParams.append('dealId', bid.bidId);
    queryParams.append('d', new URL(bidderRequest.refererInfo.referer).hostname);
    queryParams.append('sp', encodeURIComponent(bidderRequest.refererInfo.referer));
    if (bidderRequest.gdprConsent) {
      queryParams.append('gdpr', bidderRequest.gdprConsent.gdprApplies);
      queryParams.append('gdprcs', bidderRequest.gdprConsent.consentString);
    }
    queryParams.append('usp', bidderRequest.uspConsent || '');
    queryParams.append('coppa', !!config.getConfig('coppa'));

    const url = `${ENDPOINT}?${queryParams.toString()}`;
    return {
      method: 'GET',
      url: url,
      data: {videoContext}
    }
  });
  return serverRequests;
};

const render = (bid) => {
  bid.ad = bid.vastUrl;
  var obj = {
    vastTimeout: 5000,
    maxAllowedVastTagRedirects: 3,
    allowVpaid: true,
    autoPlay: true,
    preload: true,
    mute: true,
  }
  window.outstreamPlayer(bid, bid.adUnitCode, obj);
}

const interpretResponse = (serverResponse, bidRequest) => {
  try {
    let responseBody = serverResponse.body;
    responseBody.requestId = responseBody.dealId;
    if (responseBody.mediaType === 'video') {
      responseBody.ad = responseBody.vastUrl;
      const videoContext = bidRequest.data.videoContext;

      if (videoContext === OUTSTREAM) {
        try {
          const renderer = Renderer.install({
            id: bidRequest.bidId,
            adunitcode: bidRequest.tagId,
            loaded: false,
            config: responseBody.mediaType,
            url: responseBody.meta.rendererUrl
          });
          renderer.setRender(render);

          responseBody.renderer = renderer;
        } catch (e) {
          responseBody.ad = responseBody.vastUrl;
        }
      }
    }

    return [responseBody];
  } catch (e) {
    return [];
  }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
};

registerBidder(spec);
