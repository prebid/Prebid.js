import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
// import { config } from 'src/config';
import { BANNER } from '../src/mediaTypes'

// const VIDEONOW_CALLBACK_NAME = 'videoNowResponse'
// const VIDEONOW_REQUESTS_MAP = 'videoNowRequests'

// import { addBidResponse } from '../src/bidmanager'
// import { registerBidAdapter } from '../src/adaptermanager'

const RTB_URL = '//localhost:8085/bid' // 'rtb.videonow.com/bid'
// const RTB_URL = 'rtb.videonow.com/bid'
// const RTB_URL = '//poligon.videonow.ru/tests/hbiding.php' // 'localhost:8085/bid' // 'rtb.videonow.com/bid'

const BIDDER_CODE = 'videonow'
const TTL_SECONDS = 60 * 5;

function isBidRequestValid(bid) {
  const params = bid.params || {};
  return !!(params.cId);
}

function buildRequest(bid, size, bidderRequest) {
  const {params, bidId, bidFloor, cId, url: rtbUrl} = bid;
  const {placementId} = params || {};
  const [width, height] = size.split('x');

  let url = rtbUrl || RTB_URL
  url = `${url}${~url.indexOf('?') ? '&' : '?'}cId=${cId}`
  const dto = {
    method: 'GET',
    url,
    data: {
      cb: Date.now(),
      bidFloor,
      placementId,
      bidId: bidId,
      // publisherId: pId,
      // consent: bidderRequest.gdprConsent && bidderRequest.gdprConsent.consentString,
      width,
      height
    }
  }
  // utils._each(ext, (value, key) => {
  //   dto.data['ext.' + key] = value;
  // });
  //
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
  const {id, code, price, crid, adm, ttl, netRevenue} = bidInfo

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

export const spec = {
  code: BIDDER_CODE,
  aliases: ['videonow'], // short code
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs: function(syncOptions, serverResponses) {

  },
  onTimeout: function(timeoutData) {},
  onBidWon: function(bid) {

  },
  onSetTargeting: function(bid) {}
}

registerBidder(spec);

// const json = {
//   'id': '2955a162-699e-4811-ce88-5c3ac973e73c',
//   'seatbid': [{
//     'bid': [{
//       'id': '1',
//       'impid': '0005110c-8db7-44d8-d47c-cea0908dea9e',
//       'price': 0.1,
//       'adid': 'e3bf2b82e3e9485113fad6c9b27f8768.1',
//       'nurl': 'http://rtb.videonow.ru/?profile_id=111',
//       'adomain': ['www.paulig.ru'],
//       'ext': {
//         'pixels': ['http://sync.videonow.ru/ssp?uuid=1&dsp_id=1', 'http://sync.videonow.ru/ssp?uuid=1&dsp_id=2'],
//         adm: {
//           vastUrl: 'vast',
//           moduleUrl: 'vn_module.js'
//         }
//       },
//       'crid': 'e3bf2b82e3e9485113fad6c9b27f8768.1',
//     }],
//     'group': 0,
//   }],
//   'bidid': '2955a162-699e-4811-ce88-5c3ac973e73c',
//   'cur': 'USD',
// }

// const bidResponse = JSON.stringify(json)
