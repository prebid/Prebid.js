import * as utils from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';

const BIDDER_CODE = 'discovery';
const ENDPOINT_URL = 'https://rtb-jp.mediago.io/api/bid?tn=';
const TIME_TO_LIVE = 500;
const storage = getStorageManager();
let globals = {};
let itemMaps = {};
const MEDIATYPE = [BANNER, NATIVE];

/* ----- _ss_pp_id:start ------ */
const COOKIE_KEY_MGUID = '_ss_pp_id';

const NATIVERET = {
  id: 'id',
  bidfloor: 0,
  // TODO Dynamic parameters
  native: {
    ver: '1.2',
    plcmtcnt: 1,
    assets: [
      {
        id: 1,
        required: 1,
        img: {
          type: 3,
          w: 300,
          wmin: 300,
          h: 174,
          hmin: 174,
        },
      },
      {
        id: 2,
        required: 1,
        title: {
          len: 75,
        },
      }
    ],
    plcmttype: 1,
    privacy: 1,
    eventtrackers: [
      {
        event: 1,
        methods: [1, 2],
      },
    ],
  },
  ext: {},
};

/**
 * 获取用户id
 * @return {string}
 */
const getUserID = () => {
  const i = storage.getCookie(COOKIE_KEY_MGUID);

  if (i === null) {
    const uuid = utils.generateUUID();
    storage.setCookie(COOKIE_KEY_MGUID, uuid);
    return uuid;
  }
  return i;
};

/* ----- _ss_pp_id:end ------ */

/**
 * get object key -> value
 * @param  {Object}    obj  对象
 * @param  {...string} keys 键名
 * @return {any}
 */
function getKv(obj, ...keys) {
  let o = obj;

  for (let key of keys) {
    // console.log(key, o);
    if (o && o[key]) {
      o = o[key];
    } else {
      return '';
    }
  }
  return o;
}

/**
 * get device
 * @return {boolean}
 */
function getDevice() {
  let check = false;
  (function (a) {
    let reg1 = new RegExp(
      [
        '(android|bbd+|meego)',
        '.+mobile|avantgo|bada/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)',
        '|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone',
        '|p(ixi|re)/|plucker|pocket|psp|series(4|6)0|symbian|treo|up.(browser|link)|vodafone|wap',
        '|windows ce|xda|xiino|android|ipad|playbook|silk',
      ].join(''),
      'i'
    );
    let reg2 = new RegExp(
      [
        '1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)',
        '|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )',
        '|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55/|capi|ccwa|cdm-|cell',
        '|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)',
        '|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene',
        '|gf-5|g-mo|go(.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c',
        '|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|/)|ibro|idea|ig01|ikom',
        '|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |/)|klon|kpt |kwc-|kyo(c|k)',
        '|le(no|xi)|lg( g|/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50/|ma(te|ui|xo)|mc(01|21|ca)',
        '|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]',
        '|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)',
        '|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio',
        '|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55/|sa(ge|ma|mm|ms',
        '|ny|va)|sc(01|h-|oo|p-)|sdk/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al',
        '|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)',
        '|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(.b|g1|si)|utst|',
        'v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)',
        '|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-',
        '|your|zeto|zte-',
      ].join(''),
      'i'
    );
    if (reg1.test(a) || reg2.test(a.substr(0, 4))) {
      check = true;
    }
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
}

/**
 * get BidFloor
 * @param {*} bid
 * @param {*} mediaType
 * @param {*} sizes
 * @returns
 */
function getBidFloor(bid) {
  if (!utils.isFn(bid.getFloor)) {
    return utils.deepAccess(bid, 'params.bidfloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });
    return bidFloor.floor;
  } catch (_) {
    return 0;
  }
}

/**
 * get sizes for rtb
 * @param  {Array|Object} requestSizes
 * @return {Object}
 */
function transformSizes(requestSizes) {
  let sizes = [];
  let sizeObj = {};

  if (
    utils.isArray(requestSizes) &&
    requestSizes.length === 2 &&
    !utils.isArray(requestSizes[0])
  ) {
    sizeObj.width = parseInt(requestSizes[0], 10);
    sizeObj.height = parseInt(requestSizes[1], 10);
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

// Support sizes
const popInAdSize = [
  { w: 300, h: 250 },
  { w: 300, h: 600 },
  { w: 728, h: 90 },
  { w: 970, h: 250 },
  { w: 320, h: 50 },
  { w: 160, h: 600 },
  { w: 320, h: 180 },
  { w: 320, h: 100 },
  { w: 336, h: 280 },
];

/**
 * get aditem setting
 * @param {Array}  validBidRequests an an array of bids
 * @param {Object} bidderRequest  The master bidRequest object
 * @return {Object}
 */
function getItems(validBidRequests, bidderRequest) {
  let items = [];
  items = validBidRequests.map((req, i) => {
    let ret = {};
    // eslint-disable-next-line no-debugger
    let mediaTypes = getKv(req, 'mediaTypes');

    const bidFloor = getBidFloor(req);
    let id = '' + (i + 1);

    if (mediaTypes.native) {
      ret = {...NATIVERET, ...{id, bidFloor}}
    }
    // banner
    if (mediaTypes.banner) {
      let sizes = transformSizes(getKv(req, 'sizes'));
      let matchSize;

      for (let size of sizes) {
        matchSize = popInAdSize.find(
          (item) => size.width === item.w && size.height === item.h
        );
        if (matchSize) {
          break;
        }
      }
      if (!matchSize) {
        return {};
      }
      ret = {
        id: id,
        bidfloor: bidFloor,
        banner: {
          h: matchSize.h,
          w: matchSize.w,
          pos: 1,
        },
        ext: {},
      };
    }
    itemMaps[id] = {
      req,
      ret,
    };
    return ret;
  });
  return items;
}

/**
 * get rtb qequest params
 *
 * @param {Array}  validBidRequests an an array of bids
 * @param {Object} bidderRequest  The master bidRequest object
 * @return {Object}
 */
function getParam(validBidRequests, bidderRequest) {
  const pubcid = utils.deepAccess(validBidRequests[0], 'crumbs.pubcid');
  let isMobile = getDevice() ? 1 : 0;
  let auctionId = getKv(bidderRequest, 'auctionId');
  let items = getItems(validBidRequests, bidderRequest);

  const location = utils.deepAccess(bidderRequest, 'refererInfo.referer');

  const timeout = bidderRequest.timeout || 2000;

  if (items && items.length) {
    let c = {
      id: 'pp_hbjs_' + auctionId,
      at: 1,
      cur: ['USD'],
      device: {
        connectiontype: 0,
        js: 1,
        os: navigator.platform || '',
        ua: navigator.userAgent,
        language: /en/.test(navigator.language) ? 'en' : navigator.language,
      },
      user: {
        buyeruid: getUserID(),
        id: pubcid,
      },
      tmax: timeout,
      site: {
        name: globals['media'],
        domain: globals['media'],
        page: location,
        ref: location,
        mobile: isMobile,
        cat: [], // todo
        publisher: {
          // todo
          id: globals['media'],
          name: globals['media'],
        },
      },
      imp: items,
    };
    return c;
  } else {
    return null;
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: MEDIATYPE,
  // aliases: ['ex'], // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (bid.params.token) {
      globals['token'] = bid.params.token;
    }
    if (bid.params.media) {
      globals['media'] = bid.params.media;
    }
    return !!(bid.params.token && bid.params.media);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Array}  validBidRequests an an array of bids
   * @param {Object} bidderRequest  The master bidRequest object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    let payload = getParam(validBidRequests, bidderRequest);

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL + globals['token'],
      data: payloadString,
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bids = getKv(serverResponse, 'body', 'seatbid', 0, 'bid');
    const cur = getKv(serverResponse, 'body', 'cur');
    const bidResponses = [];
    for (let bid of bids) {
      let impid = getKv(bid, 'impid');
      if (itemMaps[impid]) {
        let bidId = getKv(itemMaps[impid], 'req', 'bidId');
        const mediaType = getKv(bid, 'w') ? 'banner' : 'native';
        let bidResponse = {
          requestId: bidId,
          cpm: getKv(bid, 'price'),
          creativeId: getKv(bid, 'cid'),
          mediaType,
          currency: cur,
          netRevenue: true,
          nurl: getKv(bid, 'nurl'),
          meta: {
            advertiserDomains:  getKv(bid, 'adomain') || []
          }
        };
        if (mediaType === 'native') {
          const adm = getKv(bid, 'adm');
          const admObj = JSON.parse(adm);
          var native = {};
          admObj.assets.forEach((asset) => {
            if (asset.title) {
              native.title = asset.title.text;
            } else if (asset.data) {
              native.data = asset.data.value;
            } else if (asset.img) {
              switch (asset.img.type) {
                case 1:
                  native.icon = {
                    url: asset.img.url,
                    width: asset.img.w,
                    height: asset.img.h,
                  };
                  break;
                default:
                  native.image = {
                    url: asset.img.url,
                    width: asset.img.w,
                    height: asset.img.h,
                  };
                  break;
              }
            }
          });
          if (admObj.link) {
            if (admObj.link.url) {
              native.clickUrl = admObj.link.url;
            }
          }
          if (Array.isArray(admObj.eventtrackers)) {
            native.impressionTrackers = [];
            admObj.eventtrackers.forEach((tracker) => {
              if (tracker.event !== 1) {
                return;
              }
              switch (tracker.method) {
                case 1:
                  native.impressionTrackers.push(tracker.url);
                  break;
                // case 2:
                //   native.javascriptTrackers = `<script src=\"${tracker.url}\"></script>`;
                //   break;
              }
            });
          }
          if (admObj.purl) {
            native.purl = admObj.purl;
          }
          bidResponse['navitve'] = native;
        } else {
          bidResponse['width'] = getKv(bid, 'w');
          bidResponse['height'] = getKv(bid, 'h');
          bidResponse['ad'] = getKv(bid, 'adm');
        }
        bidResponses.push(bidResponse);
      }
    }

    return bidResponses;
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {data} Containing timeout specific data
   */
  onTimeout: function (data) {
    utils.logError('DiscoveryDSP adapter timed out for the auction.');
    // TODO send request timeout to serve, the interface is not ready
  },

  /**
   * Register bidder specific code, which  will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: function (bid) {
    if (bid['nurl']) {
      utils.triggerPixel(bid['nurl'])
    }
  }
};
registerBidder(spec);
