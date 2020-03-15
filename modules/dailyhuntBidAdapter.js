import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as mediaTypes from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'dailyhunt';
const BIDDER_ALIAS = 'dh';
const SUPPORTED_MEDIA_TYPES = [mediaTypes.BANNER, mediaTypes.NATIVE];

const PROD_PREBID_ENDPOINT_URL = 'http://dh2-van-qa-n1.dailyhunt.in:8000/openrtb2/auction';

// Encode URI.
const _encodeURIComponent = function (a) {
  let b = window.encodeURIComponent(a);
  b = b.replace(/'/g, '%27');
  return b;
}

// Extract key from collections.
const extractKeyInfo = (collection, key) => {
  for (let i = 0, result; i < collection.length; i++) {
    result = utils.deepAccess(collection[i].param, key);
    if (result) {
      return result;
    }
  }
  return undefined
}

export const spec = {
  code: BIDDER_CODE,

  aliases: [BIDDER_ALIAS],

  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: bid => !!bid.params.placement_id && !!bid.params.publisher_id,

  buildRequests: function (validBidRequests, bidderRequest) {
    let serverRequests = [];

    const userAgent = navigator.userAgent;
    const page = bidderRequest.refererInfo.referer;

    // Device Info.
    let device = {...extractKeyInfo(validBidRequests, `device`)};
    device.ua = userAgent

    // User Info.
    let user = {...extractKeyInfo(validBidRequests, `user`)};

    // Site Info.
    let site = {...extractKeyInfo(validBidRequests, `site`)};
    site.page = page;

    // Publisher Info.
    let publisher = {...extractKeyInfo(validBidRequests, `publisher`)}
    if (!utils.isEmpty(publisher)) {
      site.publisher = publisher
    }

    // ORTB Request.
    let ortbReq = {
      id: bidderRequest.auctionId,
      imp: [],
      site,
      device,
      user,
    };

    let request = '';

    validBidRequests.forEach((bid) => {
      let params = bid.params
      let imp = {
        id: bid.bidId,
        bidfloor: 0,
        ext: {
          dailyhunt: {
            placement_id: params.placement_id,
            publisher_id: params.publisher_id
          }
        }
      };

      // Validate Banner Request.
      let bannerObj = utils.deepAccess(bid.mediaTypes, `banner`);
      if (bannerObj) {
        let format = [];
        bannerObj.sizes.forEach(size => format.push({ w: size[0], h: size[1] }))
        imp.banner = {
          id: 'banner-' + bid.bidId,
          format
        }
      }

      ortbReq.imp.push(imp);
    });

    request = {
      method: 'POST',
      url: PROD_PREBID_ENDPOINT_URL,
      data: JSON.stringify(ortbReq),
      options: {
        contentType: 'application/json',
        withCredentials: true
      },
      bids: validBidRequests
    };

    serverRequests.push(request);

    return serverRequests;
  },

  interpretResponse: function (serverResponse, request) {
    let bidResponses = [];
    if (!request.bids) {
      let bid = serverResponse.body[0][0].ad;
      if (bid.typeId != 2 && bid.typeId != 3) {
        return bidResponses;
      }
      let impTrackers = [];
      impTrackers.push(bid.beaconUrl);
      impTrackers = (bid.beaconUrlAdditional && bid.beaconUrlAdditional.length !== 0) ? impTrackers.concat(bid.beaconUrlAdditional) : impTrackers;
      let bidResponse = {
        requestId: bid.pbRequestId,
        cpm: bid.price,
        creativeId: bid.bannerid,
        currency: 'USD',
        ttl: 360,
        netRevenue: true,
      };
      bidResponse.mediaType = 'native'
      bidResponse.native = {
        title: bid.content.itemTitle.data,
        body: bid.content.itemSubtitle1.data,
        body2: bid.content.itemSubtitle1.data,
        cta: bid.content.itemSubtitle2.data,
        clickUrl: _encodeURIComponent(bid.action),
        impressionTrackers: impTrackers,
        clickTrackers: bid.landingUrlAdditional && bid.landingUrlAdditional.length !== 0 ? bid.landingUrlAdditional : [],
        image: {
          url: bid.content.iconLink,
          height: bid.height,
          width: bid.width
        },
        icon: {
          url: bid.content.iconLink,
          height: bid.height,
          width: bid.width
        }
      }
      bidResponses.push(bidResponse);
      return bidResponses;
    } else {
      if (!serverResponse.body) {
        return;
      }
      const { seatbid } = serverResponse.body;
      let bids = request.bids;
      return bids.reduce((accumulator, bid, index) => {
        const _cbid = seatbid && seatbid[index] && seatbid[index].bid;
        const bidResponse = _cbid && _cbid[0];
        if (bidResponse) {
          accumulator.push({
            requestId: bid.bidId,
            cpm: 1.40,
            creativeId: bidResponse.crid,
            width: bidResponse.w,
            height: bidResponse.h,
            ttl: 360,
            netRevenue: bid.netRevenue === 'net',
            currency: 'USD',
            ad: bidResponse.adm
          });
        }
        return accumulator;
      }, []);
    }
  },
}
registerBidder(spec);
