import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { STATUS } from 'src/constants';
import * as url from 'src/url';
import adloader from 'src/adloader';

const VIDEO_REQUIRED_PARAMS_MAP = {
  siteID: true,
  playerType: true,
  protocols: true,
  maxduration: true
};
const VIDEO_OPTIONAL_PARAMS_MAP = {
  minduration: 0,
  startdelay: 'preroll',
  linearity: 'linear',
  mimes: [],
  allowVPAID: true,
  apiList: []
};
const SUPPORTED_PLAYER_TYPES_MAP = {
  HTML5: true,
  FLASH: true
};
const SUPPORTED_PROTOCOLS_MAP = {
  'VAST2': [2, 5],
  'VAST3': [3, 6]
};
const SUPPORTED_API_MAP = {
  FLASH: [1, 2],
  HTML5: [2]
};
const LINEARITY_MAP = {
  linear: 1,
  nonlinear: 2
};
const START_DELAY_MAP = {
  preroll: 0,
  midroll: -1,
  postroll: -2
};
const SLOT_ID_PREFIX_MAP = {
  preroll: 'pr',
  midroll: 'm',
  postroll: 'po'
};
const DEFAULT_MIMES_MAP = {
  FLASH: ['video/mp4', 'video/x-flv'],
  HTML5: ['video/mp4', 'video/webm']
};
const DEFAULT_VPAID_MIMES_MAP = {
  FLASH: ['application/x-shockwave-flash'],
  HTML5: ['application/javascript']
};

const BASE_CYGNUS_VIDEO_URL_INSECURE = 'http://as.casalemedia.com/cygnus?v=8&fn=handleCygnusResponse';
const BASE_CYGNUS_VIDEO_URL_SECURE = 'https://as-sec.casalemedia.com/cygnus?v=8&fn=handleCygnusResponse';

function IndexExchangeVideoAdapter() {
  let baseAdapter = Adapter.createNew('indexExchangeVideo');
  let bidRequests = {};

  baseAdapter.callBids = function (bidRequest) {
    if (typeof bidRequest === 'undefined' || utils.isEmpty(bidRequest)) {
      return;
    }
    const bids = bidRequest.bids;
    const cygnusImpressions = bids
      .filter(bid => validateBid(bid))
      .map(bid => {
        bid = transformBid(bid);

        // map request id to bid object to retrieve adUnit code in callback
        bidRequests[bid.bidId] = {};
        bidRequests[bid.bidId].prebid = bid;

        let cygnusImpression = {};
        cygnusImpression.id = bid.bidId;

        cygnusImpression.ext = {};
        cygnusImpression.ext.siteID = bid.params.video.siteID;
        delete bid.params.video.siteID;

        let podType = bid.params.video.startdelay;
        if (bid.params.video.startdelay === 0) {
          podType = 'preroll';
        } else if (typeof START_DELAY_MAP[bid.params.video.startdelay] === 'undefined') {
          podType = 'midroll';
        }
        cygnusImpression.ext.sid = [SLOT_ID_PREFIX_MAP[podType], 1, 1, 's'].join('_');

        cygnusImpression.video = {};

        if (bid.params.video) {
          Object.keys(bid.params.video)
            .filter(param => typeof VIDEO_REQUIRED_PARAMS_MAP[param] !== 'undefined' || typeof VIDEO_OPTIONAL_PARAMS_MAP[param] !== 'undefined')
            .forEach(param => {
              if (param === 'startdelay' && typeof START_DELAY_MAP[bid.params.video[param]] !== 'undefined') {
                bid.params.video[param] = START_DELAY_MAP[bid.params.video[param]];
              }
              if (param === 'linearity' && typeof LINEARITY_MAP[bid.params.video[param]] !== 'undefined') {
                bid.params.video[param] = LINEARITY_MAP[bid.params.video[param]];
              }
              cygnusImpression.video[param] = bid.params.video[param];
            });
        } else {
          return;
        }

        let bidSize = getSizes(bid.sizes).shift();
        if (!bidSize || !bidSize.width || !bidSize.height) {
          return;
        }
        cygnusImpression.video.w = bidSize.width;
        cygnusImpression.video.h = bidSize.height;

        bidRequests[bid.bidId].cygnus = cygnusImpression;

        return cygnusImpression;
      });

    let cygnusRequest = {
      'id': bidRequest.bidderRequestId,
      'imp': cygnusImpressions,
      'site': {
        'page': utils.getTopWindowUrl()
      }
    };

    if (!utils.isEmpty(cygnusRequest.imp)) {
      let cygnusRequestUrl = createCygnusRequest(cygnusRequest.imp[0].ext.siteID, cygnusRequest);

      sendCygnusRequest(cygnusRequestUrl);
    }
  };

  function createCygnusRequest(siteID, cygnusRequest) {
    let cygnusUrl = (window.location.protocol === 'https:') ? url.parse(BASE_CYGNUS_VIDEO_URL_SECURE) : url.parse(BASE_CYGNUS_VIDEO_URL_INSECURE);
    cygnusUrl.search.s = siteID;
    cygnusUrl.search.r = encodeURIComponent(JSON.stringify(cygnusRequest));
    let formattedCygnusUrl = url.format(cygnusUrl);
    return formattedCygnusUrl;
  }

  function sendCygnusRequest(cygnusRequest) {
    adloader.loadScript(cygnusRequest);
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  window.handleCygnusResponse = function (response) {
    if (!response || !response.seatbid || utils.isEmpty(response.seatbid)) {
      utils.logInfo('Cynus returned no bids');

      // signal this response is complete
      Object.keys(bidRequests)
        .forEach(bidId => {
          let prebidRequest = bidRequests[bidId].prebid;
          let bid = createBidObj(STATUS.NO_BID, prebidRequest);
          utils.logInfo(JSON.stringify(bid));
          bidmanager.addBidResponse(prebidRequest.placementCode, bid);
        });

      return;
    }

    response.seatbid
      .forEach(seat => {
        seat.bid.forEach(cygnusBid => {
          let validBid = true;

          if (typeof bidRequests[cygnusBid.impid] === 'undefined') {
            utils.logInfo('Cynus returned mismatched id');

            // signal this response is complete
            Object.keys(bidRequests)
              .forEach(bidId => {
                let prebidRequest = bidRequests[bidId].prebid;
                let bid = createBidObj(STATUS.NO_BID, prebidRequest);
                bidmanager.addBidResponse(prebidRequest.placementCode, bid);
              });
            return;
          }

          if (!cygnusBid.ext.vasturl) {
            utils.logInfo('Cynus returned no vast url');
            validBid = false;
          }

          if (url.parse(cygnusBid.ext.vasturl).host === window.location.host) {
            utils.logInfo('Cynus returned no vast url');
            validBid = false;
          }

          let cpm;
          if (typeof cygnusBid.ext.pricelevel === 'string') {
            cpm = cygnusBid.ext.pricelevel.slice(1) / 100;
            if (!utils.isNumber(cpm) || isNaN(cpm)) {
              utils.logInfo('Cynus returned invalid price');
              validBid = false;
            }
          } else {
            validBid = false;
          }

          let prebidRequest = bidRequests[cygnusBid.impid].prebid;
          let cygnusRequest = bidRequests[cygnusBid.impid].cygnus;

          if (!validBid) {
            let bid = createBidObj(STATUS.NO_BID, prebidRequest);
            bidmanager.addBidResponse(prebidRequest.placementCode, bid);
            return;
          }

          let bid = createBidObj(STATUS.GOOD, prebidRequest);
          bid.cpm = cpm;
          bid.width = cygnusRequest.video.w;
          bid.height = cygnusRequest.video.h;
          bid.vastUrl = cygnusBid.ext.vasturl;
          bid.descriptionUrl = cygnusBid.ext.vasturl;

          bidmanager.addBidResponse(prebidRequest.placementCode, bid);
        });
      });
  };

  function createBidObj(status, request) {
    let bid = bidfactory.createBid(status, request);
    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = baseAdapter.getBidderCode();

    return bid;
  }

  /* Check that a bid has required paramters */
  function validateBid(bid) {
    if (
      bid.mediaType === 'video' &&
      utils.hasValidBidRequest(bid.params.video, Object.keys(VIDEO_REQUIRED_PARAMS_MAP), baseAdapter) &&
      isValidSite(bid.params.video.siteID) &&
      isValidPlayerType(bid.params.video.playerType) &&
      isValidProtolArray(bid.params.video.protocols) &&
      isValidDuration(bid.params.video.maxduration) && bid.params.video.maxduration > 0
    ) {
      return bid;
    }
  }

  function isValidSite(siteID) {
    let intSiteID = +siteID;
    if (isNaN(intSiteID) || !utils.isNumber(intSiteID) || intSiteID < 0 || utils.isArray(siteID)) {
      utils.logError(`Site ID is invalid, must be a number > 0. Got: ${siteID}`);
      return false;
    }
    return true;
  }

  function isValidPlayerType(playerType) {
    if (typeof playerType === 'undefined' || !utils.isStr(playerType)) {
      utils.logError(`Player type is invalid, must be one of: ${Object.keys(SUPPORTED_PLAYER_TYPES_MAP)}`);
      return false;
    }
    playerType = playerType.toUpperCase();
    if (!SUPPORTED_PLAYER_TYPES_MAP[playerType]) {
      utils.logError(`Player type is invalid, must be one of: ${Object.keys(SUPPORTED_PLAYER_TYPES_MAP)}`);
      return false;
    }
    return true;
  }

  function isValidProtolArray(protocolArray) {
    if (!utils.isArray(protocolArray) || utils.isEmpty(protocolArray)) {
      utils.logError(`Protocol array is not an array. Got: ${protocolArray}`);
      return false;
    } else {
      for (var i = 0; i < protocolArray.length; i++) {
        let protocol = protocolArray[i];
        if (!SUPPORTED_PROTOCOLS_MAP[protocol]) {
          utils.logError(`Protocol array contains an invalid protocol, must be one of: ${SUPPORTED_PROTOCOLS_MAP}. Got: ${protocol}`);
          return false;
        }
      }
    }
    return true;
  }

  function isValidDuration(duration) {
    let intDuration = +duration;
    if (isNaN(intDuration) || !utils.isNumber(intDuration) || utils.isArray(duration)) {
      utils.logError(`Duration is invalid, must be a number. Got: ${duration}`);
      return false;
    }
    return true;
  }

  function isValidMimeArray(mimeArray) {
    if (!utils.isArray(mimeArray) || utils.isEmpty(mimeArray)) {
      utils.logError(`MIMEs array is not an array. Got: ${mimeArray}`);
      return false;
    } else {
      for (var i = 0; i < mimeArray.length; i++) {
        let mimeType = mimeArray[i];
        if (!utils.isStr(mimeType) || utils.isEmptyStr(mimeType) || !/^\w+\/[\w-]+$/.test(mimeType)) {
          utils.logError(`MIMEs array contains an invalid MIME type. Got: ${mimeType}`);
          return false;
        }
      }
    }
    return true;
  }

  function isValidLinearity(linearity) {
    if (!LINEARITY_MAP[linearity]) {
      utils.logInfo(`Linearity is invalid, must be one of: ${Object.keys(LINEARITY_MAP)}. Got: ${linearity}`);
      return false;
    }
    return true;
  }

  function isValidStartDelay(startdelay) {
    if (typeof START_DELAY_MAP[startdelay] === 'undefined') {
      let intStartdelay = +startdelay;
      if (isNaN(intStartdelay) || !utils.isNumber(intStartdelay) || intStartdelay < -2 || utils.isArray(startdelay)) {
        utils.logInfo(`Start delay is invalid, must be a number >= -2. Got: ${startdelay}`);
        return false;
      }
    }
    return true;
  }

  function isValidApiArray(apiArray, playerType) {
    if (!utils.isArray(apiArray) || utils.isEmpty(apiArray)) {
      utils.logInfo(`API array is not an array. Got: ${apiArray}`);
      return false;
    } else {
      for (var i = 0; i < apiArray.length; i++) {
        let api = +apiArray[i];
        if (isNaN(api) || !SUPPORTED_API_MAP[playerType].includes(api)) {
          utils.logInfo(`API array contains an invalid API version. Got: ${api}`);
          return false;
        }
      }
    }
    return true;
  }

  function transformBid(bid) {
    bid.params.video.siteID = +bid.params.video.siteID;
    bid.params.video.maxduration = +bid.params.video.maxduration;

    bid.params.video.protocols = bid.params.video.protocols.reduce((arr, protocol) => {
      return arr.concat(SUPPORTED_PROTOCOLS_MAP[protocol]);
    }, []);

    let minduration = bid.params.video.minduration;
    if (typeof minduration === 'undefined' || !isValidDuration(minduration)) {
      utils.logInfo(`Using default value for 'minduration', default: ${VIDEO_OPTIONAL_PARAMS_MAP.minduration}`);
      bid.params.video.minduration = VIDEO_OPTIONAL_PARAMS_MAP.minduration;
    }

    let startdelay = bid.params.video.startdelay;
    if (typeof startdelay === 'undefined' || !isValidStartDelay(startdelay)) {
      utils.logInfo(`Using default value for 'startdelay', default: ${VIDEO_OPTIONAL_PARAMS_MAP.startdelay}`);
      bid.params.video.startdelay = VIDEO_OPTIONAL_PARAMS_MAP.startdelay;
    }

    let linearity = bid.params.video.linearity;
    if (typeof linearity === 'undefined' || !isValidLinearity(linearity)) {
      utils.logInfo(`Using default value for 'linearity', default: ${VIDEO_OPTIONAL_PARAMS_MAP.linearity}`);
      bid.params.video.linearity = VIDEO_OPTIONAL_PARAMS_MAP.linearity;
    }

    let mimes = bid.params.video.mimes;
    let playerType = bid.params.video.playerType.toUpperCase();
    if (typeof mimes === 'undefined' || !isValidMimeArray(mimes)) {
      utils.logInfo(`Using default value for 'mimes', player type: '${playerType}', default: ${DEFAULT_MIMES_MAP[playerType]}`);
      bid.params.video.mimes = DEFAULT_MIMES_MAP[playerType];
    }

    let apiList = bid.params.video.apiList;
    if (typeof apiList !== 'undefined' && !isValidApiArray(apiList, playerType)) {
      utils.logInfo(`Removing invalid api versions from api list.`);
      if (utils.isArray(apiList)) {
        bid.params.video.apiList = apiList.filter(api => SUPPORTED_API_MAP[playerType].includes(api));
      } else {
        bid.params.video.apiList = [];
      }
    }

    if (typeof apiList === 'undefined' && bid.params.video.allowVPAID && utils.isA(bid.params.video.allowVPAID, 'Boolean')) {
      bid.params.video.mimes = bid.params.video.mimes.concat(DEFAULT_VPAID_MIMES_MAP[playerType]);
      bid.params.video.apiList = SUPPORTED_API_MAP[playerType];
    }

    if (utils.isEmpty(bid.params.video.apiList)) {
      utils.logInfo(`API list is empty, VPAID ads will not be requested.`);
      delete bid.params.video.apiList;
    }

    delete bid.params.video.playerType;
    delete bid.params.video.allowVPAID;

    return bid;
  }

  /* Turn bid request sizes into ut-compatible format */
  function getSizes(requestSizes) {
    let sizes = [];
    let sizeObj = {};

    if (utils.isArray(requestSizes) && requestSizes.length === 2 && !utils.isArray(requestSizes[0])) {
      if (!utils.isNumber(requestSizes[0]) || !utils.isNumber(requestSizes[1])) {
        return sizes;
      }
      sizeObj.width = requestSizes[0];
      sizeObj.height = requestSizes[1];
      sizes.push(sizeObj);
    } else if (typeof requestSizes === 'object') {
      for (let i = 0; i < requestSizes.length; i++) {
        let size = requestSizes[i];
        sizeObj = {};
        sizeObj.width = parseInt(size[0], 10);
        sizeObj.height = parseInt(size[1], 10);
        sizes.push(sizeObj);
      }
    }

    return sizes;
  }

  return {
    createNew: IndexExchangeVideoAdapter.createNew,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  };
}

IndexExchangeVideoAdapter.createNew = function () {
  return new IndexExchangeVideoAdapter();
};

module.exports = IndexExchangeVideoAdapter;
