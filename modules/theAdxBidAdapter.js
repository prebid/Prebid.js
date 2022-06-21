import { logInfo, isEmpty, deepAccess, parseUrl, getDNT, parseSizesInput, _map } from '../src/utils.js';
import {
  BANNER,
  NATIVE,
  VIDEO
} from '../src/mediaTypes.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'theadx';
const ENDPOINT_URL = 'https://ssp.theadx.com/request';

const NATIVEASSETNAMES = {
  0: 'title',
  1: 'cta',
  2: 'icon',
  3: 'image',
  4: 'body',
  5: 'sponsoredBy',
  6: 'body2',
  7: 'phone',
  8: 'privacyLink',
  9: 'displayurl',
  10: 'rating',
  11: 'address',
  12: 'downloads',
  13: 'likes',
  14: 'price',
  15: 'saleprice',

};
const NATIVEPROBS = {
  title: {
    id: 0,
    name: 'title'
  },
  body: {
    id: 4,
    name: 'data',
    type: 2
  },
  body2: {
    id: 6,
    name: 'data',
    type: 10
  },
  privacyLink: {
    id: 8,
    name: 'data',
    type: 501
  },
  sponsoredBy: {
    id: 5,
    name: 'data',
    type: 1
  },
  image: {
    id: 3,
    type: 3,
    name: 'img'
  },
  icon: {
    id: 2,
    type: 1,
    name: 'img'
  },
  displayurl: {
    id: 9,
    name: 'data',
    type: 11
  },
  cta: {
    id: 1,
    type: 12,
    name: 'data'
  },
  rating: {
    id: 7,
    name: 'data',
    type: 3
  },
  address: {
    id: 11,
    name: 'data',
    type: 5
  },
  downloads: {
    id: 12,
    name: 'data',
    type: 5
  },
  likes: {
    id: 13,
    name: 'data',
    type: 4
  },
  phone: {
    id: 7,
    name: 'data',
    type: 8
  },
  price: {
    id: 14,
    name: 'data',
    type: 6
  },
  saleprice: {
    id: 15,
    name: 'data',
    type: 7
  },

};

export const spec = {
  code: BIDDER_CODE,
  aliases: ['theadx'], // short code
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    logInfo('theadx.isBidRequestValid', bid);
    let res = false;
    if (bid && bid.params) {
      res = !!(bid.params.pid && bid.params.tagId);
    }

    return res;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    logInfo('theadx.buildRequests', 'validBidRequests', validBidRequests, 'bidderRequest', bidderRequest);
    let results = [];
    const requestType = 'POST';
    if (!isEmpty(validBidRequests)) {
      results = validBidRequests.map(
        bidRequest => {
          return {
            method: requestType,
            type: requestType,
            url: `${ENDPOINT_URL}?tagid=${bidRequest.params.tagId}`,
            options: {
              withCredentials: true,
            },
            bidder: 'theadx',
            // TODO: is 'page' the right value here?
            referrer: encodeURIComponent(bidderRequest.refererInfo.page || ''),
            data: generatePayload(bidRequest, bidderRequest),
            mediaTypes: bidRequest['mediaTypes'],
            requestId: bidderRequest.bidderRequestId,
            bidId: bidRequest.bidId,
            adUnitCode: bidRequest['adUnitCode'],
            auctionId: bidRequest['auctionId'],
          };
        }
      );
    }
    return results;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse, request) => {
    logInfo('theadx.interpretResponse', 'serverResponse', serverResponse, ' request', request);

    let responses = [];

    if (serverResponse.body) {
      let responseBody = serverResponse.body;

      let seatBids = responseBody.seatbid;

      if (!(isEmpty(seatBids) ||
          isEmpty(seatBids[0].bid))) {
        let seatBid = seatBids[0];
        let bid = seatBid.bid[0];

        // handle any values that may end up undefined
        let nullify = (value) => typeof value === 'undefined' ? null : parseInt(value);

        let ttl = null;
        if (bid.ext) {
          ttl = nullify(bid.ext.ttl) ? nullify(bid.ext.ttl) : 2000;
        }

        let bidWidth = nullify(bid.w);
        let bidHeight = nullify(bid.h);

        let creative = null
        let videoXml = null;
        let mediaType = null;
        let native = null;

        if (request.mediaTypes && request.mediaTypes.video) {
          videoXml = bid.ext.vast_url;
          mediaType = VIDEO;
        } else if (request.mediaTypes && request.mediaTypes.banner) {
          mediaType = BANNER;
          creative = bid.adm;
        } else if (request.mediaTypes && request.mediaTypes.native) {
          mediaType = NATIVE;
          const {
            assets,
            link,
            imptrackers,
            jstracker
          } = bid.ext.native;
          native = {
            clickUrl: link.url,
            clickTrackers: link.clicktrackers || bid.ext.cliu ? [] : undefined,
            impressionTrackers: imptrackers || bid.nurl ? [] : undefined,
            javascriptTrackers: jstracker ? [jstracker] : undefined
          };
          if (bid.nurl) {
            native.impressionTrackers.unshift(bid.ext.impu);
            native.impressionTrackers.unshift(bid.nurl);
            if (native.clickTrackers) {
              native.clickTrackers.unshift(bid.ext.cliu);
            }
          }

          assets.forEach(asset => {
            const kind = NATIVEASSETNAMES[asset.id];
            const content = kind && asset[NATIVEPROBS[kind].name];
            if (content) {
              native[kind] = content.text || content.value || {
                url: content.url,
                width: content.w,
                height: content.h
              };
            }
          });
        }

        let response = {
          bidderCode: BIDDER_CODE,
          requestId: request.bidId,
          cpm: bid.price,
          width: bidWidth | 0,
          height: bidHeight | 0,
          ad: creative,
          ttl: ttl || 3000,
          creativeId: bid.crid,
          netRevenue: true,
          currency: responseBody.cur,
          mediaType: mediaType,
          native: native,
        };
        if (mediaType == VIDEO && videoXml) {
          response.vastUrl = videoXml;
          response.videoCacheKey = bid.ext.rid;
        }

        responses.push(response);
      }
    }
    return responses;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    logInfo('theadx.getUserSyncs', 'syncOptions', syncOptions, 'serverResponses', serverResponses)
    const syncs = [];

    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return syncs;
    }

    serverResponses.forEach(resp => {
      const syncIframeUrls = deepAccess(resp, 'body.ext.sync.iframe');
      const syncImageUrls = deepAccess(resp, 'body.ext.sync.image');
      if (syncOptions.iframeEnabled && syncIframeUrls) {
        syncIframeUrls.forEach(syncIframeUrl => {
          syncs.push({
            type: 'iframe',
            url: syncIframeUrl
          });
        });
      }
      if (syncOptions.pixelEnabled && syncImageUrls) {
        syncImageUrls.forEach(syncImageUrl => {
          syncs.push({
            type: 'image',
            url: syncImageUrl
          });
        });
      }
    });

    return syncs;
  },

}

let buildSiteComponent = (bidRequest, bidderRequest) => {
  let loc = parseUrl(bidderRequest.refererInfo.page || '', {
    decodeSearchAsString: true
  });

  let site = {
    domain: loc.hostname,
    page: loc.href,
    id: bidRequest.params.wid,
    publisher: {
      id: bidRequest.params.pid,
    }
  };
  if (loc.search) {
    site.search = loc.search;
  }
  if (document) {
    let keywords = document.getElementsByTagName('meta')['keywords'];
    if (keywords && keywords.content) {
      site.keywords = keywords.content;
    }
  }

  return site;
}

function isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
}

function isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
}

let buildDeviceComponent = (bidRequest, bidderRequest) => {
  let device = {
    js: 1,
    language: ('language' in navigator) ? navigator.language : null,
    ua: ('userAgent' in navigator) ? navigator.userAgent : null,
    devicetype: isMobile() ? 1 : isConnectedTV() ? 3 : 2,
    dnt: getDNT() ? 1 : 0,
  };
  // Include connection info if available
  const CONNECTION = navigator.connection || navigator.webkitConnection;
  if (CONNECTION && CONNECTION.type) {
    device['connectiontype'] = CONNECTION.type;
    if (CONNECTION.downlinkMax) {
      device['connectionDownlinkMax'] = CONNECTION.downlinkMax;
    }
  }

  return device;
};

let determineOptimalRequestId = (bidRequest, bidderRequest) => {
  return bidRequest.bidId;
}

let extractValidSize = (bidRequest, bidderRequest) => {
  let width = null;
  let height = null;

  let requestedSizes = [];
  let mediaTypes = bidRequest.mediaTypes;
  if (mediaTypes && ((mediaTypes.banner && mediaTypes.banner.sizes) || (mediaTypes.video && mediaTypes.video.sizes))) {
    if (mediaTypes.banner) {
      requestedSizes = mediaTypes.banner.sizes;
    } else {
      requestedSizes = mediaTypes.video.sizes;
    }
  } else if (!isEmpty(bidRequest.sizes)) {
    requestedSizes = bidRequest.sizes
  }

  // Ensure the size array is normalized
  let conformingSize = parseSizesInput(requestedSizes);

  if (!isEmpty(conformingSize) && conformingSize[0] != null) {
    // Currently only the first size is utilized
    let splitSizes = conformingSize[0].split('x');

    width = parseInt(splitSizes[0]);
    height = parseInt(splitSizes[1]);
  }

  return {
    w: width,
    h: height
  };
};

let generateVideoComponent = (bidRequest, bidderRequest) => {
  let impSize = extractValidSize(bidRequest);

  return {
    w: impSize.w,
    h: impSize.h
  }
}

let generateBannerComponent = (bidRequest, bidderRequest) => {
  let impSize = extractValidSize(bidRequest);

  return {
    w: impSize.w,
    h: impSize.h
  }
}

let generateNativeComponent = (bidRequest, bidderRequest) => {
  const assets = _map(bidRequest.mediaTypes.native, (bidParams, key) => {
    const props = NATIVEPROBS[key];
    const asset = {
      required: bidParams.required & 1,
    };
    if (props) {
      asset.id = props.id;
      asset[props.name] = {
        len: bidParams.len,
        wmin: bidParams.sizes && bidParams.sizes[0],
        hmin: bidParams.sizes && bidParams.sizes[1],
        type: props.type
      };

      return asset;
    }
  }).filter(Boolean);
  return {
    request: {
      assets
    }
  }
}

let generateImpBody = (bidRequest, bidderRequest) => {
  let mediaTypes = bidRequest.mediaTypes;

  let banner = null;
  let video = null;
  let native = null;

  if (mediaTypes && mediaTypes.video) {
    video = generateVideoComponent(bidRequest, bidderRequest);
  } else if (mediaTypes && mediaTypes.banner) {
    banner = generateBannerComponent(bidRequest, bidderRequest);
  } else if (mediaTypes && mediaTypes.native) {
    native = generateNativeComponent(bidRequest, bidderRequest);
  }

  const result = {
    id: bidRequest.index,
    tagid: bidRequest.params.tagId + '',
  };
  if (banner) {
    result['banner'] = banner;
  }
  if (video) {
    result['video'] = video;
  }
  if (native) {
    result['native'] = native;
  }

  return result;
}

let generatePayload = (bidRequest, bidderRequest) => {
  // Generate the expected OpenRTB payload

  let payload = {
    id: determineOptimalRequestId(bidRequest, bidderRequest),
    site: buildSiteComponent(bidRequest, bidderRequest),
    device: buildDeviceComponent(bidRequest, bidderRequest),
    imp: [generateImpBody(bidRequest, bidderRequest)],
  };
  // return payload;
  return JSON.stringify(payload);
};

registerBidder(spec);
