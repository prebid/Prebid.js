import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import find from 'core-js-pure/features/array/find.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';

const VERSION = '1.0';
const BIDDER_CODE = 'adyoulike';
const DEFAULT_DC = 'hb-api';
const CURRENCY = 'USD';

const NATIVE_IMAGE = {
  image: {
    required: true
  },
  title: {
    required: true
  },
  sponsoredBy: {
    required: true
  },
  clickUrl: {
    required: true
  },
  body: {
    required: false
  },
  icon: {
    required: false
  },
  cta: {
    required: false
  }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],
  aliases: ['ayl'], // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    const sizes = getSize(getSizeArray(bid));
    const sizeValid = sizes.width > 0 && sizes.height > 0;

    // allows no size fornative only
    return (bid.params && bid.params.placement &&
            (sizeValid || (bid.mediaTypes && bid.mediaTypes.native)));
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {bidRequests} - bidRequests.bids[] is an array of AdUnits and bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    const payload = {
      Version: VERSION,
      Bids: bidRequests.reduce((accumulator, bidReq) => {
        let mediatype = getMediatype(bidReq);
        let sizesArray = getSizeArray(bidReq);
        let size = getSize(sizesArray);
        accumulator[bidReq.bidId] = {};
        accumulator[bidReq.bidId].PlacementID = bidReq.params.placement;
        accumulator[bidReq.bidId].TransactionID = bidReq.transactionId;
        accumulator[bidReq.bidId].Width = size.width;
        accumulator[bidReq.bidId].Height = size.height;
        accumulator[bidReq.bidId].AvailableSizes = sizesArray.join(',');
        if (typeof bidReq.getFloor === 'function') {
          accumulator[bidReq.bidId].Pricing = getFloor(bidReq, size, mediatype);
        }
        if (mediatype === NATIVE) {
          let nativeReq = bidReq.mediaTypes.native;
          if (nativeReq.type === 'image') {
            nativeReq = Object.assign({}, NATIVE_IMAGE, nativeReq);
          }
          accumulator[bidReq.bidId].Native = nativeReq;
        }
        if (mediatype === VIDEO) {
          accumulator[bidReq.bidId].Video = bidReq.mediaTypes.video;
        }
        return accumulator;
      }, {}),
      PageRefreshed: getPageRefreshed()
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdprConsent = {
        consentString: bidderRequest.gdprConsent.consentString,
        consentRequired: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : null
      };
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.uspConsent = bidderRequest.uspConsent;
    }

    const data = JSON.stringify(payload);
    const options = {
      withCredentials: true
    };

    return {
      method: 'POST',
      url: createEndpoint(bidRequests, bidderRequest),
      data,
      options
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, request) {
    const bidResponses = [];
    var bidRequests = {};

    try {
      bidRequests = JSON.parse(request.data).Bids;
    } catch (err) {
      // json error initial request can't be read
    }

    // For this adapter, serverResponse is a list
    serverResponse.body.forEach(response => {
      const bid = createBid(response, bidRequests);
      if (bid) {
        bidResponses.push(bid);
      }
    });
    return bidResponses;
  }
}

/* Get hostname from bids */
function getHostname(bidderRequest) {
  let dcHostname = find(bidderRequest, bid => bid.params.DC);
  if (dcHostname) {
    return ('-' + dcHostname.params.DC);
  }
  return '';
}

/* Get current page canonical url */
function getCanonicalUrl() {
  let link;
  if (window.self !== window.top) {
    try {
      link = window.top.document.head.querySelector('link[rel="canonical"][href]');
    } catch (e) { }
  } else {
    link = document.head.querySelector('link[rel="canonical"][href]');
  }

  if (link) {
    return link.href;
  }
  return '';
}

/* Get mediatype from bidRequest */
function getMediatype(bidRequest) {
  var type = BANNER;

  if (utils.deepAccess(bidRequest, 'mediaTypes.native')) {
    type = NATIVE;
  } else if (utils.deepAccess(bidRequest, 'mediaTypes.video')) {
    type = VIDEO;
  }

  return type;
}
/* Get Floor price information */
function getFloor(bidRequest, size, mediaType) {
  const bidFloors = bidRequest.getFloor({
    currency: CURRENCY,
    mediaType,
    size: [ size.width, size.height ]
  });

  if (!isNaN(bidFloors.floor) && (bidFloors.currency === CURRENCY)) {
    return bidFloors.floor;
  }
}

/* Get information on page refresh */
function getPageRefreshed() {
  try {
    if (performance && performance.navigation) {
      return performance.navigation.type === performance.navigation.TYPE_RELOAD;
    }
  } catch (e) { }
  return false;
}

/* Create endpoint url */
function createEndpoint(bidRequests, bidderRequest) {
  let host = getHostname(bidRequests);
  return utils.buildUrl({
    protocol: 'https',
    host: `${DEFAULT_DC}${host}.omnitagjs.com`,
    pathname: '/hb-api/prebid/v1',
    search: createEndpointQS(bidderRequest)
  });
}

/* Create endpoint query string */
function createEndpointQS(bidderRequest) {
  const qs = {};

  if (bidderRequest) {
    const ref = bidderRequest.refererInfo;
    if (ref) {
      qs.RefererUrl = encodeURIComponent(ref.referer);
      if (ref.numIframes > 0) {
        qs.SafeFrame = true;
      }
    }
  }

  const can = getCanonicalUrl();
  if (can) {
    qs.CanonicalUrl = encodeURIComponent(can);
  }

  const domain = config.getConfig('publisherDomain');
  if (domain) {
    qs.PublisherDomain = encodeURIComponent(domain);
  }

  return qs;
}

function getSizeArray(bid) {
  let inputSize = bid.sizes || [];
  if (bid.mediaTypes && bid.mediaTypes.banner) {
    inputSize = bid.mediaTypes.banner.sizes || [];
  }

  return utils.parseSizesInput(inputSize);
}

/* Get parsed size from request size */
function getSize(sizesArray) {
  const parsed = {};
  // the main requested size is the first one
  const size = sizesArray[0];

  if (typeof size !== 'string') {
    return parsed;
  }

  const parsedSize = size.toUpperCase().split('X');
  const width = parseInt(parsedSize[0], 10);
  if (width) {
    parsed.width = width;
  }

  const height = parseInt(parsedSize[1], 10);
  if (height) {
    parsed.height = height;
  }

  return parsed;
}

function getInternalImgUrl(uid) {
  if (!uid) return '';
  return 'https://blobs.omnitagjs.com/blobs/' + uid.substr(16, 2) + '/' + uid.substr(16) + '/' + uid;
}

function getImageUrl(config, resource, width, height) {
  let url = '';

  switch (resource.Kind) {
    case 'INTERNAL':
      url = getInternalImgUrl(resource.Data.Internal.BlobReference.Uid);

      break;

    case 'EXTERNAL':
      const dynPrefix = config.DynamicPrefix;
      let extUrl = resource.Data.External.Url;
      extUrl = extUrl.replace(/\[height\]/i, '' + height);
      extUrl = extUrl.replace(/\[width\]/i, '' + width);

      if (extUrl.indexOf(dynPrefix) >= 0) {
        const urlmatch = (/.*url=([^&]*)/gm).exec(extUrl);
        url = urlmatch ? urlmatch[1] : '';
        if (!url) {
          url = getInternalImgUrl((/.*key=([^&]*)/gm).exec(extUrl)[1]);
        }
      } else {
        url = extUrl;
      }

      break;
  }

  return url;
}

function getTrackers(eventsArray, jsTrackers) {
  const result = [];

  if (!eventsArray) return result;

  eventsArray.map((item, index) => {
    if ((jsTrackers && item.Kind === 'JAVASCRIPT_URL') ||
        (!jsTrackers && item.Kind === 'PIXEL_URL')) {
      result.push(item.Url);
    }
  });
  return result;
}

function getVideoAd(response) {
  var adJson = {};
  if (typeof response.Ad === 'string') {
    adJson = JSON.parse(response.Ad.match(/\/\*PREBID\*\/(.*)\/\*PREBID\*\//)[1]);
    return utils.deepAccess(adJson, 'Content.MainVideo.Vast');
  }
}

function getNativeAssets(response, nativeConfig) {
  const native = {};

  var adJson = {};
  var textsJson = {};
  if (typeof response.Ad === 'string') {
    adJson = JSON.parse(response.Ad.match(/\/\*PREBID\*\/(.*)\/\*PREBID\*\//)[1]);
    textsJson = adJson.Content.Preview.Text;

    var impressionUrl = adJson.TrackingPrefix +
            '/pixel?event_kind=IMPRESSION&attempt=' + adJson.Attempt;
    var insertionUrl = adJson.TrackingPrefix +
            '/pixel?event_kind=INSERTION&attempt=' + adJson.Attempt;

    if (adJson.Campaign) {
      impressionUrl += '&campaign=' + adJson.Campaign;
      insertionUrl += '&campaign=' + adJson.Campaign;
    }

    native.clickUrl = adJson.TrackingPrefix + '/ar?event_kind=CLICK&attempt=' + adJson.Attempt +
      '&campaign=' + adJson.Campaign + '&url=' + encodeURIComponent(adJson.Content.Landing.Url);

    if (adJson.OnEvents) {
      native.clickTrackers = getTrackers(adJson.OnEvents['CLICK']);
      native.impressionTrackers = getTrackers(adJson.OnEvents['IMPRESSION']);
      native.javascriptTrackers = getTrackers(adJson.OnEvents['IMPRESSION'], true);
    } else {
      native.impressionTrackers = [];
    }

    native.impressionTrackers.push(impressionUrl, insertionUrl);
  }

  Object.keys(nativeConfig).map(function(key, index) {
    if (typeof response.Native === 'object') {
      native[key] = response.Native[key];
    } else {
      switch (key) {
        case 'title':
          native[key] = textsJson.TITLE;
          break;
        case 'body':
          native[key] = textsJson.DESCRIPTION;
          break;
        case 'cta':
          native[key] = textsJson.CALLTOACTION;
          break;
        case 'sponsoredBy':
          native[key] = adJson.Content.Preview.Sponsor.Name;
          break;
        case 'image':
          // main image requested size
          const imgSize = nativeConfig.image.sizes || [];
          if (!imgSize.length) {
            imgSize[0] = response.Width || 300;
            imgSize[1] = response.Height || 250;
          }

          native[key] = {
            url: getImageUrl(adJson, adJson.Content.Preview.Thumbnail.Image, imgSize[0], imgSize[1]),
            width: imgSize[0],
            height: imgSize[1]
          };
          break;
        case 'icon':
          if (adJson.HasSponsorImage) {
            // icon requested size
            const iconSize = nativeConfig.icon.sizes || [];
            if (!iconSize.length) {
              iconSize[0] = 50;
              iconSize[1] = 50;
            }

            native[key] = {
              url: getImageUrl(adJson, adJson.Content.Preview.Sponsor.Logo.Resource, iconSize[0], iconSize[1]),
              width: iconSize[0],
              height: iconSize[1]
            };
          }
          break;
        case 'privacyIcon':
          native[key] = getImageUrl(adJson, adJson.Content.Preview.Credit.Logo.Resource, 25, 25);
          break;
        case 'privacyLink':
          native[key] = adJson.Content.Preview.Credit.Url;
          break;
      }
    }
  });

  return native;
}

/* Create bid from response */
function createBid(response, bidRequests) {
  if (!response || (!response.Ad && !response.Native)) {
    return
  }

  const request = bidRequests && bidRequests[response.BidID];

  // In case we don't retreive the size from the adserver, use the given one.
  if (request) {
    if (!response.Width || response.Width === '0') {
      response.Width = request.Width;
    }

    if (!response.Height || response.Height === '0') {
      response.Height = request.Height;
    }
  }

  const bid = {
    requestId: response.BidID,
    ttl: 3600,
    creativeId: response.CreativeID,
    cpm: response.Price,
    netRevenue: true,
    currency: CURRENCY
  };

  if (request && request.Native) {
    bid.native = getNativeAssets(response, request.Native);
    bid.mediaType = 'native';
  } else if (request && request.Video) {
    const vast64 = response.Vast || getVideoAd(response);
    bid.vastXml = vast64 ? window.atob(vast64) : '';
    bid.mediaType = 'video';
  } else {
    bid.width = response.Width;
    bid.height = response.Height;
    bid.ad = response.Ad;
  }

  return bid;
}

registerBidder(spec);
