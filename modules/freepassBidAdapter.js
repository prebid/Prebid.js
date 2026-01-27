import {registerBidder} from '../src/adapters/bidderFactory.js';
import {logMessage} from '../src/utils.js';
import {BANNER} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'

const BIDDER_SERVICE_URL = 'https://bidding-dsp.ad-m.asia/dsp/api/bid/s/s/freepass';

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30
  }
});

function injectIdsToUser(user, freepassIdObj) {
  const userInfo = user || {};
  const extendedUserInfo = userInfo.ext || {};

  if (freepassIdObj.ext.userId) {
    userInfo.id = freepassIdObj.ext.userId;
  }

  if (freepassIdObj.id) {
    extendedUserInfo.fuid = freepassIdObj.id;
  }
  userInfo.ext = extendedUserInfo;

  return userInfo;
}

function injectIPtoDevice(device, freepassIdObj) {
  const deviceInfo = device || {};
  const extendedDeviceInfo = deviceInfo.ext || {};

  extendedDeviceInfo.is_accurate_ip = 0;
  if (freepassIdObj.ext.ip) {
    deviceInfo.ip = freepassIdObj.ext.ip;
    extendedDeviceInfo.is_accurate_ip = 1;
  }
  deviceInfo.ext = extendedDeviceInfo;

  return deviceInfo;
}

export const spec = {
  code: 'freepass',
  supportedMediaTypes: [BANNER],

  isBidRequestValid(bid) {
    logMessage('Validating bid: ', bid);
    return !(!bid.adUnitCode || !bid.params || !bid.params.publisherId);
  },

  buildRequests(validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      logMessage('FreePass BidAdapter has no valid bid requests');
      return [];
    }

    logMessage('FreePass BidAdapter is preparing bid request: ', validBidRequests);
    logMessage('FreePass BidAdapter is using bidder request: ', bidderRequest);

    const data = converter.toORTB({
      bidderRequest: bidderRequest,
      bidRequests: validBidRequests,
      context: { mediaType: BANNER }
    });
    logMessage('FreePass BidAdapter interpreted ORTB bid request as ', data);

    const freepassIdObj = validBidRequests[0].userIdAsEids?.find(eid => eid.source === 'freepass.jp');
    data.user = injectIdsToUser(data.user, freepassIdObj.uids[0]);
    data.device = injectIPtoDevice(data.device, freepassIdObj.uids[0]);

    // set site.page & site.publisher
    data.site = data.site || {};
    data.site.publisher = data.site.publisher || {};
    // set site.publisher.id. from params.publisherId required
    data.site.publisher.id = validBidRequests[0].params.publisherId;
    // set site.publisher.domain from params.publisherUrl. optional
    data.site.publisher.domain = validBidRequests[0].params?.publisherUrl;

    // set source
    data.source = data.source || {};
    data.source.fd = 0;
    data.source.tid = validBidRequests.ortb2?.source?.tid;
    data.source.pchain = '';

    // set imp.ext
    validBidRequests.forEach((bidRequest, index) => {
      data.imp[index].tagId = bidRequest.adUnitCode;
    });

    data.test = validBidRequests[0].test || 0;

    logMessage('FreePass BidAdapter augmented ORTB bid request user: ', data.user);
    logMessage('FreePass BidAdapter augmented ORTB bid request device: ', data.device);

    return {
      method: 'POST',
      url: BIDDER_SERVICE_URL,
      data,
      options: { withCredentials: false }
    };
  },

  interpretResponse(serverResponse, bidRequest) {
    logMessage('FreePass BidAdapter is interpreting server response: ', serverResponse);
    logMessage('FreePass BidAdapter is using bid request: ', bidRequest);
    const bids = converter.fromORTB({response: serverResponse.body, request: bidRequest.data}).bids;
    logMessage('FreePass BidAdapter interpreted ORTB bids as ', bids);

    return bids;
  },
};

registerBidder(spec);
