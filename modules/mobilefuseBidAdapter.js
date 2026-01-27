import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {deepAccess, deepSetValue} from '../src/utils.js';
import { config } from '../src/config.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import { userSync } from '../src/userSync.js';

const ADAPTER_VERSION = '1.0.0';
const ENDPOINT_URL = 'https://mfx.mobilefuse.com/prebidjs';
const SYNC_URL = 'https://mfx.mobilefuse.com/usync';

export const spec = {
  code: 'mobilefuse',
  supportedMediaTypes: [BANNER, VIDEO],
  gvlid: 909,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    currency: 'USD',
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const floor = getBidfloor(bidRequest);

    imp.tagid = bidRequest.params.placement_id;
    imp.displaymanager = 'Prebid.js';
    imp.displaymanagerver = '$prebid.version$';

    if (floor) {
      imp.bidfloor = parseFloat(floor);
    }

    if (bidRequest.gpid) {
      deepSetValue(imp, 'ext.gpid', bidRequest.gpid);
    }

    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    deepSetValue(request, 'ext.prebid.mobilefuse.version', ADAPTER_VERSION);

    const syncEnabled = deepAccess(config.getConfig('userSync'), 'syncEnabled');
    const canSyncWithIframe = syncEnabled && userSync.canBidderRegisterSync('iframe', 'mobilefuse');
    deepSetValue(request, 'ext.prebid.mobilefuse.ifsync', canSyncWithIframe);

    if (bidderRequest.uspConsent) {
      deepSetValue(request, 'regs.us_privacy', bidderRequest.uspConsent);
    }

    if (bidderRequest.gppConsent) {
      deepSetValue(request, 'regs.gpp', bidderRequest.gppConsent.gppString);
      deepSetValue(request, 'regs.gpp_sid', bidderRequest.gppConsent.applicableSections);
    }

    return request;
  }
});

function isBidRequestValid(bid) {
  return !!bid.params.placement_id;
}

function buildRequests(validBidRequests, bidderRequest) {
  return {
    method: 'POST',
    url: ENDPOINT_URL,
    data: converter.toORTB({validBidRequests, bidderRequest}),
  };
}

function interpretResponse(response, request) {
  if (!response.body || !response.body.seatbid) {
    return [];
  }

  return converter.fromORTB({
    request: request.data,
    response: response.body,
  }).bids;
}

function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
  if (syncOptions.iframeEnabled) {
    const params = [];

    if (gppConsent) {
      params.push('gpp=' + encodeURIComponent(gppConsent.gppString));
      params.push('gpp_sid=' + gppConsent.applicableSections.join(','));
    }

    if (uspConsent) {
      params.push('us_privacy=' + encodeURIComponent(uspConsent));
    }

    const querystring = params.length ? `?${params.join('&')}` : '';

    return [{type: 'iframe', url: `${SYNC_URL}${querystring}`}];
  }

  const pixels = [];

  serverResponses.forEach(response => {
    if (response.body.ext && response.body.ext.syncs) {
      response.body.ext.syncs.forEach(url => {
        pixels.push({type: 'image', url: url});
      });
    }
  });

  return pixels;
}

function getBidfloor(bidRequest) {
  if (bidRequest.params.bidfloor) {
    return bidRequest.params.bidfloor;
  }

  if (typeof bidRequest.getFloor !== 'function') {
    return null;
  }

  let floor = bidRequest.getFloor();
  if (floor.currency === 'USD') {
    return floor.floor;
  }

  return null;
}
