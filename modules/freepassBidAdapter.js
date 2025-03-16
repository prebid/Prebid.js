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

function prepareUserInfo(user, freepassId) {
  let userInfo = user || {};
  let extendedUserInfo = userInfo.ext || {};

  if (freepassId.userId) {
    userInfo.id = freepassId.userId;
  }

  if (freepassId.commonId) {
    extendedUserInfo.fuid = freepassId.commonId;
  }
  userInfo.ext = extendedUserInfo;

  return userInfo;
}

function prepareDeviceInfo(device, freepassId) {
  let deviceInfo = device || {};
  let extendedDeviceInfo = deviceInfo.ext || {};

  extendedDeviceInfo.is_accurate_ip = 0;
  if (freepassId.userIp) {
    deviceInfo.ip = freepassId.userIp;
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

    // Only freepassId is supported
    let freepassId = (validBidRequests[0].userId && validBidRequests[0].userId.freepassId) || {};
    data.user = prepareUserInfo(data.user, freepassId);
    data.device = prepareDeviceInfo(data.device, freepassId);

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
