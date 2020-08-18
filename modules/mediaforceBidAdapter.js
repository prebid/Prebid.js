import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';

const BIDDER_CODE = 'mediaforce';
const ENDPOINT_URL = 'https://rtb.mfadsrvr.com/header_bid';
const TEST_ENDPOINT_URL = 'https://rtb.mfadsrvr.com/header_bid?debug_key=abcdefghijklmnop';
const NATIVE_ID_MAP = {};
const NATIVE_PARAMS = {
  title: {
    id: 1,
    name: 'title'
  },
  icon: {
    id: 2,
    type: 1,
    name: 'img'
  },
  image: {
    id: 3,
    type: 3,
    name: 'img'
  },
  body: {
    id: 4,
    name: 'data',
    type: 2
  },
  sponsoredBy: {
    id: 5,
    name: 'data',
    type: 1
  },
  cta: {
    id: 6,
    type: 12,
    name: 'data'
  },
  body2: {
    id: 7,
    name: 'data',
    type: 10
  },
  rating: {
    id: 8,
    name: 'data',
    type: 3
  },
  likes: {
    id: 9,
    name: 'data',
    type: 4
  },
  downloads: {
    id: 10,
    name: 'data',
    type: 5
  },
  displayUrl: {
    id: 11,
    name: 'data',
    type: 11
  },
  price: {
    id: 12,
    name: 'data',
    type: 6
  },
  salePrice: {
    id: 13,
    name: 'data',
    type: 7
  },
  address: {
    id: 14,
    name: 'data',
    type: 9
  },
  phone: {
    id: 15,
    name: 'data',
    type: 8
  }
};

Object.keys(NATIVE_PARAMS).forEach((key) => {
  NATIVE_ID_MAP[NATIVE_PARAMS[key].id] = key;
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!((typeof bid.params === 'object') && bid.params.placement_id && bid.params.publisher_id);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @param {bidderRequest} bidderRequest bidder request object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return;
    }

    const referer = bidderRequest && bidderRequest.refererInfo ? encodeURIComponent(bidderRequest.refererInfo.referer) : '';
    const dnt = utils.getDNT() ? 1 : 0;
    let requests = [];
    validBidRequests.forEach(bid => {
      let tagid = bid.params.placement_id;
      let bidfloor = bid.params.bidfloor ? parseFloat(bid.params.bidfloor) : 0;
      let imp = [];
      let validImp = false;
      let impObj = {
        id: bid.bidId,
        tagid: tagid,
        secure: 1,
        bidfloor: bidfloor,
      };
      for (let mediaTypes in bid.mediaTypes) {
        switch (mediaTypes) {
          case BANNER:
            impObj.banner = createBannerRequest(bid);
            validImp = true;
            break;
          case NATIVE:
            impObj.native = createNativeRequest(bid);
            validImp = true;
            break;
          default: return;
        }
      }
      validImp && imp.push(impObj);

      let request = {
        id: bid.transactionId,
        site: {
          page: referer,
          ref: referer,
          id: bid.params.publisher_id,
          publisher: {
            id: bid.params.publisher_id
          },
        },
        device: {
          ua: navigator.userAgent,
          js: 1,
          dnt: dnt,
          language: getLanguage()
        },
        imp
      };
      requests.push({
        method: 'POST',
        url: bid.params.is_test ? TEST_ENDPOINT_URL : ENDPOINT_URL,
        data: JSON.stringify(request)
      });
    });
    return requests;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {BidRequest} bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    if (!serverResponse || !serverResponse.body) {
      return [];
    }

    const responseBody = serverResponse.body;
    const bidResponses = [];
    const cur = responseBody.cur;
    responseBody.seatbid.forEach((bids) => {
      bids.bid.forEach((serverBid) => {
        const bid = {
          requestId: serverBid.impid,
          cpm: parseFloat(serverBid.price),
          creativeId: serverBid.adid,
          currency: cur,
          netRevenue: true,
          ttl: serverBid.ttl || 300,
          burl: serverBid.burl,
        };
        if (serverBid.dealid) {
          bid.dealId = serverBid.dealid;
        }
        let jsonAdm;
        let adm = serverBid.adm;
        let ext = serverBid.ext;
        try {
          jsonAdm = JSON.parse(adm);
        } catch (err) {}
        if (jsonAdm && jsonAdm.native) {
          ext = ext || {};
          ext.native = jsonAdm.native;
          adm = null;
        }
        if (adm) {
          bid.width = serverBid.w;
          bid.height = serverBid.h;
          bid.ad = adm;
          bid.mediaType = BANNER;
        } else if (ext && ext.native) {
          bid.native = parseNative(ext.native);
          bid.mediaType = NATIVE;
        }

        bidResponses.push(bid);
      })
    });

    return bidResponses;
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: function(bid) {
    const cpm = utils.deepAccess(bid, 'adserverTargeting.hb_pb') || '';
    if (utils.isStr(bid.burl) && bid.burl !== '') {
      bid.burl = utils.replaceAuctionPrice(bid.burl, cpm);
      utils.triggerPixel(bid.burl);
    }
  },
};

registerBidder(spec);

function getLanguage() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return navigator[language].split('-')[0];
}

function createBannerRequest(bid) {
  const sizes = bid.mediaTypes.banner.sizes;
  if (!sizes.length) return;

  let format = [];
  let r = utils.parseGPTSingleSizeArrayToRtbSize(sizes[0]);
  for (let f = 1; f < sizes.length; f++) {
    format.push(utils.parseGPTSingleSizeArrayToRtbSize(sizes[f]));
  }
  if (format.length) {
    r.format = format
  }
  return r
}

function parseNative(native) {
  const {assets, link, imptrackers, jstracker} = native;
  const result = {
    clickUrl: link.url,
    clickTrackers: link.clicktrackers || [],
    impressionTrackers: imptrackers || [],
    javascriptTrackers: jstracker ? [jstracker] : []
  };

  (assets || []).forEach((asset) => {
    const {id, img, data, title} = asset;
    const key = NATIVE_ID_MAP[id];
    if (key) {
      if (!utils.isEmpty(title)) {
        result.title = title.text
      } else if (!utils.isEmpty(img)) {
        result[key] = {
          url: img.url,
          height: img.h,
          width: img.w
        }
      } else if (!utils.isEmpty(data)) {
        result[key] = data.value;
      }
    }
  });

  return result;
}

function createNativeRequest(bid) {
  const assets = [];
  if (bid.nativeParams) {
    Object.keys(bid.nativeParams).forEach((key) => {
      if (NATIVE_PARAMS[key]) {
        const {name, type, id} = NATIVE_PARAMS[key];
        const assetObj = type ? {type} : {};
        let {len, sizes, required, aspect_ratios: aRatios} = bid.nativeParams[key];
        if (len) {
          assetObj.len = len;
        }
        if (aRatios && aRatios[0]) {
          aRatios = aRatios[0];
          let wmin = aRatios.min_width || 0;
          let hmin = aRatios.ratio_height * wmin / aRatios.ratio_width | 0;
          assetObj.wmin = wmin;
          assetObj.hmin = hmin;
        }
        if (sizes && sizes.length) {
          sizes = [].concat(...sizes);
          assetObj.w = sizes[0];
          assetObj.h = sizes[1];
        }
        const asset = {required: required ? 1 : 0, id};
        asset[name] = assetObj;
        assets.push(asset);
      }
    });
  }
  return {
    ver: '1.2',
    request: {
      assets: assets,
      context: 1,
      plcmttype: 1,
      ver: '1.2'
    }
  }
}
