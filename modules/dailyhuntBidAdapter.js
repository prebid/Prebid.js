import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as mediaTypes from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'dailyhunt';
const BIDDER_ALIAS = 'dh';
const SUPPORTED_MEDIA_TYPES = [mediaTypes.BANNER, mediaTypes.NATIVE];

const PROD_PREBID_ENDPOINT_URL = 'https://money.dailyhunt.in/openrtb2/auction';

const PROD_ENDPOINT_URL = 'https://money.dailyhunt.in/openx/ads/index.php';

function buildParams(bid) {
  let params = { ...bid.params };
  params.pagetype = 'sources';
  params.placementId = 12345;
  params.env = 'prod';
  if (params.testmode && params.testmode === true) {
    params.customEvent = 'pb-testmode';
  }
  let hasWeb5Size = false;
  let hasWeb3Size = false;
  bid && bid.sizes && bid.sizes.forEach((size, i) => {
    if (!hasWeb3Size && size[0] == 300 && size[1] == 250) {
      hasWeb3Size = true;
    }
    if (!hasWeb5Size && (size[0] == 300 || size[0] == 320) && size[1] == 50) {
      hasWeb5Size = true;
    }
  })
  params.zone = 'web';
  if (!hasWeb3Size && hasWeb5Size) {
    params.subSlots = 'web-5';
  } else {
    params.subSlots = 'web-3';
  }
  if (bid.nativeParams) {
    params.subSlots = 'web-3';
    params.ad_type = '2,3';
  }
  if (!params.partnerId) {
    params.partnerId = 'unknown-pb-partner';
  }
  params.pbRequestId = bid.bidId;
  params.format = 'json';
  return params;
}

const _encodeURIComponent = function (a) {
  let b = window.encodeURIComponent(a);
  b = b.replace(/'/g, '%27');
  return b;
}

export const spec = {
  code: BIDDER_CODE,

  aliases: [BIDDER_ALIAS],

  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: bid => !!bid.params.partnerId,

  buildRequests: function (validBidRequests, bidderRequest) {
    let serverRequests = [];
    const userAgent = navigator.userAgent;
    const page = bidderRequest.refererInfo.referer;

    validBidRequests.forEach((bid, i) => {
      let params = buildParams(bid);
      let request = '';
      if (bid.nativeParams) {
        request = {
          method: 'GET',
          url: PROD_ENDPOINT_URL,
          data: utils.parseQueryStringParameters(params)
        };
      } else {
        let ortbReq = {
          id: bidderRequest.auctionId,
          imp: [{
            id: i.toString(),
            banner: {
              id: 'banner-' + bidderRequest.auctionId,
              format: [
                {
                  'h': 250,
                  'w': 300
                },
                {
                  'h': 50,
                  'w': 320
                }
              ]
            },
            bidfloor: 0,
            ext: {
              dailyhunt: {
                ...params
              }
            }
          }],
          site: { id: i.toString(), page },
          device: { userAgent },
          user: {
            id: params.clientId || '',
          }
        };
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
      }
      serverRequests.push(request);
    });
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
            cpm: bidResponse.price,
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
