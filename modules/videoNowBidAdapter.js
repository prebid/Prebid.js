import * as utils from '../src/utils';
// import {config} from '../src/config';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes'
import { pixel } from './justpremiumBidAdapter'
// import { pixel } from './justpremiumBidAdapter'

const RTB_URL = '//localhost:8085/bid' // 'rtb.videonow.com/bid'
// const RTB_URL = 'rtb.videonow.com/bid'
// const RTB_URL = '//poligon.videonow.ru/tests/hbiding.php' // 'localhost:8085/bid' // 'rtb.videonow.com/bid'

const BIDDER_CODE = 'videonow'
const TTL_SECONDS = 60 * 5;

function isBidRequestValid(bid) {
  return !!(bid.pId);
}

function buildRequest(bid, size, bidderRequest) {
  const {refererInfo} = bidderRequest
  const {ext, bidId, pId, placementId, code, url: rtbUrl} = bid;
  const [width, height] = size.split('x');

  let url = rtbUrl || RTB_URL
  url = `${url}${~url.indexOf('?') ? '&' : '?'}pId=${pId}`
  const dto = {
    method: 'GET',
    url,
    data: {
      referer: refererInfo && refererInfo.referer,
      cb: Date.now(),
      placementId,
      bidId: bidId,
      code,
      width,
      height
    }
  }

  ext && Object.keys(ext).forEach(key => {
    dto[key] = ext.key
  })

  return dto;
}

function buildRequests(validBidRequests, bidderRequest) {
  console.log('buildRequests')
  // const topWindowUrl = utils.getTopWindowUrl();
  const requests = [];
  validBidRequests.forEach(validBidRequest => {
    const sizes = utils.parseSizesInput(validBidRequest.sizes);
    sizes.forEach(size => {
      const request = buildRequest(validBidRequest, size, bidderRequest);
      requests.push(request);
    });
  });
  return requests;
}

function interpretResponse(serverResponse, bidRequest) {
  if (!serverResponse || !serverResponse.body) {
    return [];
  }
  const { bidId, width, height, placementId } = (bidRequest && bidRequest.data) || {}
  if (!bidId) return []

  const {seatbid, cur} = serverResponse.body;

  if (!seatbid || !seatbid.length) return []

  const bids = []
  seatbid.forEach(sb => {
    const { bid } = sb
    if (bid && bid.length) {
      bid.forEach(b => {
        const res = createResponseBid(b, bidId, cur, width, height, placementId)
        bids.push(res)
      })
    }
  })

  return bids
}

function createResponseBid(bidInfo, bidId, cur, width, height, placementId) {
  const {id, nurl, code, price, crid, adm, ttl, netRevenue} = bidInfo

  if (!id || !price) {
    return null;
  }
  const { dataUrl, vastUrl, moduleUrl, vast, options, profileId } = adm || {}
  try {
    return {
      requestId: bidId,
      cpm: price,
      width: width,
      height: height,
      creativeId: crid,
      currency: cur || 'RUB',
      netRevenue: netRevenue !== undefined ? netRevenue : true,
      ttl: ttl || TTL_SECONDS,
      ad: code,
      nurl,
      renderer: {
        url: dataUrl || vastUrl,
        /**
         * injects javascript code into page
         * <script src='adm.init' data-module-url='adm.moduleUrl' data-vast-url='adm.vastUrl' data-vast="" data-opts='adm.options'></script>
         */
        render: function() {
          const d = window.document
          const elem = d.createElement('script')
          const params = {}
          dataUrl && (params['data-url'] = dataUrl)
          moduleUrl && (params['data-module-url'] = moduleUrl)
          vast && (params['data-vast'] = JSON.stringify(vast))
          vastUrl && (params['data-vast-url'] = vastUrl)
          options && (params['data-opts'] = JSON.stringify(options))
          Object.keys(params).forEach(key => elem.setAttribute(key, params[key]))
          elem.src = adm.init + (profileId ? `?profileId=${profileId}` : '')
          const el = placementId ? d.getElementById(placementId) : d.head;

          (el || d.head).appendChild(elem)
        }
      }
    }
  } catch (e) {
    return null
  }
}

function getUserSyncs(syncOptions, serverResponses) {
  const syncs = []

  if (!serverResponses || !serverResponses.length) return sync

  serverResponses.forEach(response => {
    const {ext} = (response && response.body) || {}
    const {pixels, iframes} = ext || {}

    if (syncOptions.iframeEnabled && iframes && iframes.length) {
      iframes.forEach(i => syncs.push({
        type: 'iframe',
        url: i
      })
      )
    }

    if (syncOptions.pixelEnabled && pixels && pixels.length) {
      pixels.forEach(p => syncs.push({
        type: 'image',
        url: p
      })
      )
    }
  })

  return syncs;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['videonow'], // short code
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onTimeout: function(timeoutData) {},
  onBidWon: function(bid) {
    const { nurl } = bid
    nurl && pixel.fire(nurl)
  }
}

registerBidder(spec);
