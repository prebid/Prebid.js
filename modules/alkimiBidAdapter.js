import {registerBidder} from '../src/adapters/bidderFactory.js';
import {deepAccess, deepClone, getDNT, generateUUID, replaceAuctionPrice} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import {VIDEO, BANNER} from '../src/mediaTypes.js';
import {config} from '../src/config.js';

const BIDDER_CODE = 'alkimi';
const GVLID = 1169;
export const ENDPOINT = 'https://exchange.alkimi-onboarding.com/bid?prebid=true';

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.token);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let bids = [];
    let bidIds = [];
    let eids;
    validBidRequests.forEach(bidRequest => {
      let formatTypes = getFormatType(bidRequest)

      if (bidRequest.userIdAsEids) {
        eids = eids || bidRequest.userIdAsEids
      }

      bids.push({
        token: bidRequest.params.token,
        instl: bidRequest.params.instl,
        exp: bidRequest.params.exp,
        bidFloor: getBidFloor(bidRequest, formatTypes),
        sizes: prepareSizes(deepAccess(bidRequest, 'mediaTypes.banner.sizes')),
        playerSizes: prepareSizes(deepAccess(bidRequest, 'mediaTypes.video.playerSize')),
        impMediaTypes: formatTypes,
        adUnitCode: bidRequest.adUnitCode,
        video: deepAccess(bidRequest, 'mediaTypes.video'),
        banner: deepAccess(bidRequest, 'mediaTypes.banner')
      })
      bidIds.push(bidRequest.bidId)
    })

    const alkimiConfig = config.getConfig('alkimi')
    const fullPageAuction = bidderRequest.ortb2?.source?.ext?.full_page_auction
    const source = fullPageAuction != undefined ? { ext: { full_page_auction: fullPageAuction } } : undefined
    const walletID = alkimiConfig && alkimiConfig.walletID
    const user = walletID != undefined ? { ext: { walletID: walletID } } : undefined

    let payload = {
      requestId: generateUUID(),
      signRequest: {bids, randomUUID: alkimiConfig && alkimiConfig.randomUUID},
      bidIds,
      referer: bidderRequest.refererInfo.page,
      signature: alkimiConfig && alkimiConfig.signature,
      schain: validBidRequests[0].schain,
      cpp: config.getConfig('coppa') ? 1 : 0,
      device: {
        dnt: getDNT() ? 1 : 0,
        w: screen.width,
        h: screen.height
      },
      ortb2: {
        source,
        user,
        site: {
          keywords: bidderRequest.ortb2?.site?.keywords
        },
        at: bidderRequest.ortb2?.at,
        bcat: bidderRequest.ortb2?.bcat,
        wseat: bidderRequest.ortb2?.wseat
      }
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdprConsent = {
        consentRequired: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : false,
        consentString: bidderRequest.gdprConsent.consentString
      }
    }

    if (bidderRequest.uspConsent) {
      payload.uspConsent = bidderRequest.uspConsent;
    }

    if (eids) {
      payload.eids = eids
    }

    const options = {
      contentType: 'application/json',
      customHeaders: {
        'Rtb-Direct': true
      }
    }

    return {
      method: 'POST',
      url: ENDPOINT,
      data: payload,
      options
    };
  },

  interpretResponse: function (serverResponse, request) {
    const serverBody = serverResponse.body;
    if (!serverBody || typeof serverBody !== 'object') {
      return [];
    }

    const {prebidResponse} = serverBody;
    if (!prebidResponse || typeof prebidResponse !== 'object') {
      return [];
    }

    let bids = [];
    prebidResponse.forEach(bidResponse => {
      let bid = deepClone(bidResponse);
      bid.cpm = parseFloat(bidResponse.cpm);

      // banner or video
      if (VIDEO === bid.mediaType) {
        bid.vastUrl = replaceAuctionPrice(bid.winUrl, bid.cpm);
      }

      bid.meta = {};
      bid.meta.advertiserDomains = bid.adomain || [];

      bids.push(bid);
    })

    return bids;
  },

  onBidWon: function (bid) {
    if (BANNER == bid.mediaType && bid.winUrl) {
      const winUrl = replaceAuctionPrice(bid.winUrl, bid.cpm);
      ajax(winUrl, null);
      return true;
    }
    return false;
  }
}

function prepareSizes(sizes) {
  return sizes ? sizes.map(size => ({width: size[0], height: size[1]})) : []
}

function prepareBidFloorSize(sizes) {
  return sizes && sizes.length === 1 ? sizes : ['*'];
}

function getBidFloor(bidRequest, formatTypes) {
  let minFloor
  if (typeof bidRequest.getFloor === 'function') {
    const bidFloorSizes = prepareBidFloorSize(bidRequest.sizes)
    formatTypes.forEach(formatType => {
      bidFloorSizes.forEach(bidFloorSize => {
        const floor = bidRequest.getFloor({currency: 'USD', mediaType: formatType.toLowerCase(), size: bidFloorSize});
        if (floor && !isNaN(floor.floor) && (floor.currency === 'USD')) {
          minFloor = !minFloor || floor.floor < minFloor ? floor.floor : minFloor
        }
      })
    })
  }
  return minFloor || bidRequest.params.bidFloor;
}

const getFormatType = bidRequest => {
  let formats = []
  if (deepAccess(bidRequest, 'mediaTypes.banner')) formats.push('Banner')
  if (deepAccess(bidRequest, 'mediaTypes.video')) formats.push('Video')
  return formats
}

registerBidder(spec);
