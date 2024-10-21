import { ortbConverter } from '../libraries/ortbConverter/converter.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { BANNER } from '../src/mediaTypes.js'
import * as utils from '../src/utils.js'

export const BIDDER_CODE = 'eightPod'
const url = 'https://demo.8pod.com/bidder/rtb/eightpod_exchange/bid?trace=true';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  isBannerBid,
  isVideoBid,
  onBidWon
}

registerBidder(spec)

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context)
    return req
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    const response = buildResponse(bidResponses, ortbResponse, context)
    return response.bids
  },
  imp(buildImp, bidRequest, context) {
    return buildImp(bidRequest, context)
  },
  bidResponse
})

function hasRequiredParams(bidRequest) {
  return !!bidRequest?.params?.placementId
}

function isBidRequestValid(bidRequest) {
  return hasRequiredParams(bidRequest)
}

function buildRequests(bids, bidderRequest) {
  let bannerBids = bids.filter((bid) => isBannerBid(bid))
  let requests = bannerBids.length
    ? [createRequest(bannerBids, bidderRequest, BANNER)]
    : []
  return requests
}

function bidResponse(buildBidResponse, bid, context) {
  bid.nurl = replacePriceInUrl(bid.nurl, bid.price);

  const bidResponse = buildBidResponse(bid, context);

  bidResponse.height = context?.imp?.banner?.format?.[0].h;
  bidResponse.width = context?.imp?.banner?.format?.[0].w;

  bidResponse.burl = replacePriceInUrl(bid.burl, bidResponse.originalCpm || bidResponse.cpm);
  return bidResponse;
}

function onBidWon(bid) {
  if (bid.burl) {
    utils.triggerPixel(bid.burl)
  }
}
function replacePriceInUrl(url, price) {
  return url.replace(/\${AUCTION_PRICE}/, price)
}

export function parseUserAgent() {
  const ua = navigator.userAgent.toLowerCase();

  // Check if it's iOS
  if (/iphone|ipad|ipod/.test(ua)) {
    // Extract iOS version and device type
    const iosInfo = /(iphone|ipad|ipod) os (\d+[._]\d+)|((iphone|ipad|ipod)(\D+cpu) os (\d+(?:[._\s]\d+)?))/.exec(ua);
    return {
      platform: 'ios',
      version: iosInfo ? iosInfo[1] : '',
      device: iosInfo ? iosInfo[2].replace('_', '.') : ''
    };
  } else if (/android/.test(ua)) {
    // Check if it's Android
    // Extract Android version
    const androidVersion = /android (\d+([._]\d+)?)/.exec(ua);
    return {
      platform: 'android',
      version: androidVersion ? androidVersion[1].replace('_', '.') : '',
      device: ''
    };
  } else {
    // If neither iOS nor Android, return unknown
    return {
      platform: 'Unknown',
      version: '',
      device: ''
    };
  }
}

export function getPageKeywords(win = window) {
  let element;

  try {
    element = win.top.document.querySelector('meta[name="keywords"]');
  } catch (e) {
    element = document.querySelector('meta[name="keywords"]');
  }

  return ((element && element.content) || '').replaceAll(' ', '');
}

function createRequest(bidRequests, bidderRequest, mediaType) {
  const data = converter.toORTB({
    bidRequests,
    bidderRequest,
    context: { mediaType },
  });

  data.adSlotPositionOnScreen = 'ABOVE_THE_FOLD';
  data.at = 1;

  const params = getBidderParams(bidRequests);

  data.device = {
    ...data.device,
    model: parseUserAgent().device,
    os: parseUserAgent().platform,
    osv: parseUserAgent().version,
    geo: {
      country: params.country || 'GRB'
    },
    language: params.language || data.device.language,
  }
  data.site = {
    ...data.site,
    keywords: getPageKeywords(window),
  }
  data.imp = [
    {
      ...data.imp?.[0],
      pmp: params.dealId
        ? {
          ...data.pmp,
          deals: [
            {
              bidfloor: 0.5,
              at: 2,
              id: params.dealId,
            },
          ],
          private_auction: 1,
        }
        : data.pmp,
    }
  ]
  data.adSlotPlacementId = params.placementId;

  const req = {
    method: 'POST',
    url,
    data
  }
  return req
}

function getBidderParams(bidRequests) {
  const bid = bidRequests.find(bid => {
    return bid.bidder === BIDDER_CODE
  });

  return bid?.params ? bid.params : undefined;
}

function isVideoBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.video')
}

function isBannerBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.banner')
}

function interpretResponse(resp, req) {
  return converter.fromORTB({ request: req.data, response: resp.body })
}
