import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
// import { config } from 'src/config';
import { BANNER } from '../src/mediaTypes'

// const VIDEONOW_CALLBACK_NAME = 'videoNowResponse'
// const VIDEONOW_REQUESTS_MAP = 'videoNowRequests'

// import { addBidResponse } from '../src/bidmanager'
// import { registerBidAdapter } from '../src/adaptermanager'

// const RTB_URL = 'localhost:8085/bid' // 'rtb.videonow.com/bid'
// const RTB_URL = 'rtb.videonow.com/bid'
const RTB_URL = 'poligon.videonow.ru/tests/hbiding.php' // 'localhost:8085/bid' // 'rtb.videonow.com/bid'

const BIDDER_CODE = 'videoNow'
const TTL_SECONDS = 60 * 5;

function isBidRequestValid(bid) {
  const params = bid.params || {};
  return !!(params.cId /* && params.pId */);
}

function buildRequest(bid, size, bidderRequest) {
  const {params, bidId} = bid;
  const {bidFloor, cId} = params;
  const [width, height] = size.split('x');

  const dto = {
    method: 'GET',
    url: `${RTB_URL}/${cId}`,
    data: {
      cb: Date.now(),
      bidFloor: bidFloor,
      bidId: bidId,
      // publisherId: pId,
      consent: bidderRequest.gdprConsent && bidderRequest.gdprConsent.consentString,
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
  const {crid: creativeId, ad, price, exp, ext} = serverResponse.body;

  if (!ad || !price) {
    return [];
  }
  const { adm } = ext
  const {bidId, width, height, cur} = bidRequest.data;

  try {
    return [{
      requestId: bidId,
      cpm: price,
      width: width,
      height: height,
      creativeId: creativeId,
      currency: cur || 'RUB',
      netRevenue: true,
      ttl: exp || TTL_SECONDS,
      ad: ad,
      renderer: {
        url: adm.vastUrl,
        /**
         * injects javascript code into page
         * <script src='adm.init' data-module-url='adm.moduleUrl' data-vast-url='adm.vastUrl' data-vast="" data-opts='adm.options'></script>
         * @param bid
         */
        render: function(bid) {
          const d = window.top.document
          const elem = d.createElement('script')
          const params = {}
          adm.moduleUrl && (params['data-module-url'] = adm.moduleUrl)
          adm.vast && (params['data-vast'] = JSON.stringify(adm.vast))
          adm.vastUrl && (params['data-vast-url'] = adm.vastUrl)
          adm.options && (params['data-opts'] = JSON.stringify(adm.options))
          Object.keys(params).forEach(key => elem.setAttribute(key, params[key]))
          elem.src = adm.init
          d.head.appendChild(elem)
        }
      }
    }
    ];
  } catch (e) {
    return [];
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
