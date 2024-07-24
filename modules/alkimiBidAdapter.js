import {registerBidder} from '../src/adapters/bidderFactory.js';
import {deepAccess, deepClone, getDNT, generateUUID, replaceAuctionPrice} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import {VIDEO, BANNER} from '../src/mediaTypes.js';
import {config} from '../src/config.js';

const BIDDER_CODE = 'alkimi';
const GVLID = 1169;
const USER_ID_KEY = 'alkimiUserID';
export const ENDPOINT = 'https://exchange.alkimi-onboarding.com/bid?prebid=true';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

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

    const ortb2 = bidderRequest.ortb2
    const site = ortb2?.site

    const id = getUserId()
    const alkimiConfig = config.getConfig('alkimi')
    const fpa = ortb2?.source?.ext?.fpa
    const source = fpa != undefined ? { ext: { fpa } } : undefined
    const walletID = alkimiConfig && alkimiConfig.walletID
    const userParams = alkimiConfig && alkimiConfig.userParams
    const user = (walletID != undefined || userParams != undefined || id != undefined) ? { id, ext: { walletID, userParams } } : undefined

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
          keywords: site?.keywords,
          sectioncat: site?.sectioncat,
          pagecat: site?.pagecat,
          cat: site?.cat
        },
        at: ortb2?.at,
        bcat: ortb2?.bcat,
        wseat: ortb2?.wseat
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
    if (!Array.isArray(prebidResponse)) {
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
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    if (syncOptions.iframeEnabled && serverResponses.length > 0) {
      const serverBody = serverResponses[0].body;
      if (!serverBody || typeof serverBody !== 'object') return [];

      const { iframeList } = serverBody;
      if (!Array.isArray(iframeList)) return [];

      const urls = [];
      iframeList.forEach(url => {
        urls.push({type: 'iframe', url});
      })

      return urls;
    }
    return [];
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

const getUserId = () => {
  if (storage.localStorageIsEnabled()) {
    let userId = storage.getDataFromLocalStorage(USER_ID_KEY)
    if (!userId) {
      userId = generateUUID()
      storage.setDataInLocalStorage(USER_ID_KEY, userId)
    }
    return userId
  }
}

registerBidder(spec);
