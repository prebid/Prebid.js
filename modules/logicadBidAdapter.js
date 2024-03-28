import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { deepAccess } from '../src/utils.js';

const BIDDER_CODE = 'logicad';
const ENDPOINT_URL = 'https://pb.ladsp.com/adrequest/prebid';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.tid);
  },
  buildRequests: function (bidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    bidRequests = convertOrtbRequestToProprietaryNative(bidRequests);

    const requests = [];
    for (let i = 0, len = bidRequests.length; i < len; i++) {
      const request = {
        method: 'POST',
        url: ENDPOINT_URL,
        data: JSON.stringify(newBidRequest(bidRequests[i], bidderRequest)),
        options: {},
        bidderRequest
      };
      requests.push(request);
    }
    return requests;
  },
  interpretResponse: function (serverResponse, bidderRequest) {
    serverResponse = serverResponse.body;

    const bids = [];

    if (!serverResponse || serverResponse.error) {
      return bids;
    }

    serverResponse.seatbid.forEach(function (seatbid) {
      bids.push(seatbid.bid);
    })

    const fledgeAuctionConfigs = deepAccess(serverResponse, 'ext.fledgeAuctionConfigs') || [];
    if (fledgeAuctionConfigs.length) {
      return {
        bids,
        fledgeAuctionConfigs,
      };
    }

    return bids;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    if (serverResponses.length > 0 && serverResponses[0].body.userSync &&
      syncOptions.pixelEnabled && serverResponses[0].body.userSync.type == 'image') {
      return [{
        type: 'image',
        url: serverResponses[0].body.userSync.url
      }];
    }
    return [];
  },
};

function newBidRequest(bidRequest, bidderRequest) {
  const bid = {
    adUnitCode: bidRequest.adUnitCode,
    bidId: bidRequest.bidId,
    transactionId: bidRequest.ortb2Imp?.ext?.tid,
    sizes: bidRequest.sizes,
    params: bidRequest.params,
    mediaTypes: bidRequest.mediaTypes,
  }

  const fledgeEnabled = deepAccess(bidderRequest, 'fledgeEnabled')
  if (fledgeEnabled) {
    const ae = deepAccess(bidRequest, 'ortb2Imp.ext.ae');
    if (ae) {
      bid.ae = ae;
    }
  }

  const data = {
    // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
    auctionId: bidRequest.auctionId,
    bidderRequestId: bidRequest.bidderRequestId,
    bids: [bid],
    prebidJsVersion: '$prebid.version$',
    // TODO: is 'page' the right value here?
    referrer: bidderRequest.refererInfo.page,
    auctionStartTime: bidderRequest.auctionStart,
    eids: bidRequest.userIdAsEids,
  };

  const sua = deepAccess(bidRequest, 'ortb2.device.sua');
  if (sua) {
    data.sua = sua;
  }

  const userData = deepAccess(bidRequest, 'ortb2.user.data');
  if (userData) {
    data.userData = userData;
  }

  return data;
}

registerBidder(spec);
