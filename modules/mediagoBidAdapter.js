/**
 * gulp serve --modules=mediagoBidAdapter --nolint   --notest
 */

import * as utils from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'mediago';
const PROTOCOL = window.document.location.protocol;
const IS_SECURE = (PROTOCOL === 'https:') ? 1 : 0;
const ENDPOINT_URL =
  // ((PROTOCOL === 'https:') ? 'https' : 'http') +
  'https://rtb-us.mediago.io/api/bid?tn=';
const TIME_TO_LIVE = 500;
// const ENDPOINT_URL = '/api/bid?tn=';
const storage = getStorageManager();
let globals = {};
let itemMaps = {};

/**
 * 获取随机id
 * @param  {number} a random number from 0 to 15
 * @return {string}   random number or random string
 */
function getRandomId(
  a // placeholder
) {
  return a // if the placeholder was passed, return
    ? ( // a random number from 0 to 15
      a ^ // unless b is 8,
      Math.random() * // in which case
      16 >> // a random number from
      a / 4 // 8 to 11
    ).toString(16) // in hexadecimal
    : ( // or otherwise a concatenated string:
      [1e7] + // 10000000 +
      1e3 + // -1000 +
      4e3 + // -4000 +
      8e3 + // -80000000 +
      1e11 // -100000000000,
    ).replace( // replacing
      /[018]/g, // zeroes, ones, and eights with
      getRandomId // random hex digits
    );
}

/* ----- mguid:start ------ */
const COOKIE_KEY_MGUID = '__mguid_';

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

/* ----- mguid:end ------ */

/**
 * 获取一个对象的某个值，如果没有则返回空字符串
 * @param  {Object}    obj  对象
 * @param  {...string} keys 键名
 * @return {any}
 */
function getProperty(obj, ...keys) {
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
 * 是不是移动设备或者平板
 * @return {boolean}
 */
function isMobileAndTablet() {
  let check = false;
  (function(a) {
    let reg1 = new RegExp(['(android|bb\d+|meego)',
      '.+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)',
      '|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone',
      '|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap',
      '|windows ce|xda|xiino|android|ipad|playbook|silk'
    ].join(''), 'i');
    let reg2 = new RegExp(['1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)',
      '|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )',
      '|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell',
      '|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)',
      '|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene',
      '|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c',
      '|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom',
      '|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)',
      '|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)',
      '|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]',
      '|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)',
      '|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio',
      '|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms',
      '|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al',
      '|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)',
      '|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|',
      'v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)',
      '|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-',
      '|your|zeto|zte\-'
    ].join(''), 'i');
    if (reg1.test(a) ||
      reg2.test(a.substr(0, 4))) {
      check = true;
    }
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
}

/**
 * 将尺寸转为RTB识别的尺寸
 *
 * @param  {Array|Object} requestSizes 配置尺寸
 * @return {Object}
 */
function transformSizes(requestSizes) {
  let sizes = [];
  let sizeObj = {};

  if (utils.isArray(requestSizes) && requestSizes.length === 2 &&
    !utils.isArray(requestSizes[0])) {
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

/**
 * 获取广告位配置
 * @param {Array}  validBidRequests an an array of bids
 * @param {Object} bidderRequest  The master bidRequest object
 * @return {Object}
 */
function getItems(validBidRequests, bidderRequest) {
  let items = [];
  for (let i in validBidRequests) {
    let req = validBidRequests[i];
    let ret;
    let mediaTypes = getProperty(req, 'mediaTypes');

    let sizes = transformSizes(getProperty(req, 'sizes'));
    let matchSize;

    // 确认尺寸是否符合我们要求
    for (let size of sizes) {
      if (size.width === 300 && size.height === 250) {
        matchSize = size;
        break;
      }
    }

    // Continue only if there is a matching size
    if (matchSize) {
      // banner广告类型
      if (mediaTypes.banner) {
        let id = '' + (+i + 1);
        ret = {
          id: id,
          // bidFloor: 0, // todo
          banner: {
            h: matchSize.height,
            w: matchSize.width,
            pos: 1,
          },
          secure: IS_SECURE // for server-side to check if it's secure page
        };
        itemMaps[id] = {
          req,
          ret
        };
      }
    }

    if (ret) {
      items.push(ret);
    }
  }

  return items;
}

/**
 * 获取rtb请求参数
 *
 * @param {Array}  validBidRequests an an array of bids
 * @param {Object} bidderRequest  The master bidRequest object
 * @return {Object}
 */
function getParam(validBidRequests, bidderRequest) {
  // console.log(validBidRequests, bidderRequest);
  let isMobile = isMobileAndTablet() ? 1 : 0;
  let isTest = 0;
  let auctionId = getProperty(bidderRequest, 'auctionId') || getRandomId();
  let items = getItems(validBidRequests, bidderRequest);

  const domain = document.domain;
  const location = utils.deepAccess(bidderRequest, 'refererInfo.referer');

  if (items && items.length) {
    let c = {
      'id': 'mgprebidjs_' + auctionId,
      'test': +isTest,
      'at': 1,
      'cur': ['USD'],
      'device': {
        // 'dnt':0,
        // 'devicetype':2,
        'js': 1,
        'os': navigator.platform || '',
        'ua': navigator.userAgent,
        'language': /en/.test(navigator.language) ? 'en' : navigator.language,
        // 'geo':{
        //     'country':'USA'
        // }
      },
      'user': {
        'id': getUserID() // todo
      },
      'site': {
        'name': domain,
        'domain': domain,
        'page': location,
        'ref': location,
        'mobile': isMobile,
        'cat': [], // todo
        'publisher': { // todo
          'id': domain,
          'name': domain
        }
      },
      'imp': items
    };
    return c;
  } else {
    return null;
  }
}

export const spec = {
  code: BIDDER_CODE,
  // aliases: ['ex'], // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    // console.log('mediago', {
    //   bid
    // });
    if (bid.params.token) {
      globals['token'] = bid.params.token;
    }
    return !!(bid.params.token);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Array}  validBidRequests an an array of bids
   * @param {Object} bidderRequest  The master bidRequest object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    let payload = getParam(validBidRequests, bidderRequest);

    // request ad only if there is a matching size
    if (payload) {
      const payloadString = JSON.stringify(payload);
      return {
        method: 'POST',
        url: ENDPOINT_URL + globals['token'],
        data: payloadString,
      };
    } else {
      return null;
    }
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bids = getProperty(serverResponse, 'body', 'seatbid', 0, 'bid');
    const cur = getProperty(serverResponse, 'body', 'cur');

    const bidResponses = [];

    for (let bid of bids) {
      let impid = getProperty(bid, 'impid');
      if (itemMaps[impid]) {
        let bidId = getProperty(itemMaps[impid], 'req', 'bidId');
        const bidResponse = {
          requestId: bidId,
          cpm: getProperty(bid, 'price'),
          width: getProperty(bid, 'w'),
          height: getProperty(bid, 'h'),
          creativeId: getProperty(bid, 'crid'),
          dealId: '',
          currency: cur,
          netRevenue: true,
          ttl: TIME_TO_LIVE,
          // referrer: REFERER,
          ad: getProperty(bid, 'adm')
        };
        bidResponses.push(bidResponse);
      }
    }

    return bidResponses;
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {data} Containing timeout specific data
   */
  onTimeout: function(data) {
    // console.log('onTimeout', data);
    // Bidder specifc code
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: function(bid) {
    // console.log('onBidWon', bid);
    // Bidder specific code
  },

  /**
   * Register bidder specific code, which will execute when the adserver targeting has been set for a bid from this bidder
   * @param {Bid} The bid of which the targeting has been set
   */
  onSetTargeting: function(bid) {
    // console.log('onSetTargeting', bid);
    // Bidder specific code
  }
};
registerBidder(spec);
