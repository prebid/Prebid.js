import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import find from 'core-js-pure/features/array/find.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';

const VERSION = '1.0';
const BIDDER_CODE = 'adyoulike';
const DEFAULT_DC = 'hb-api';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],
  aliases: ['ayl'], // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    const sizes = getSize(getSizeArray(bid));

    // allows no size fornative only
    return bid.params && bid.params.placement &&
    (bid.mediaTypes.native || (sizes.width && sizes.height));
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
      Bids: bidRequests.reduce((accumulator, bid) => {
        let sizesArray = getSizeArray(bid);
        let size = getSize(sizesArray);
        accumulator[bid.bidId] = {};
        accumulator[bid.bidId].PlacementID = bid.params.placement;
        accumulator[bid.bidId].TransactionID = bid.transactionId;
        accumulator[bid.bidId].Width = size.width;
        accumulator[bid.bidId].Height = size.height;
        accumulator[bid.bidId].AvailableSizes = sizesArray.join(',');
        accumulator[bid.bidId].Native = !!bid.mediaTypes.native;
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
  let inputSize = bid.sizes;
  if (bid.mediaTypes && bid.mediaTypes.banner) {
    inputSize = bid.mediaTypes.banner.sizes;
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

function getImageUrl(config, resource, width, height) {
  // use default cropping
  var auto = resource.ZoneHeight === 0 || resource.ZoneWidth === 0;

  let url = '';
  const crop = 1 / 3;

  const dynPrefix = config.DynamicPrefix;

  switch (resource.Kind) {
    case 'INTERNAL':
      url = dynPrefix + '/native/preview/image?key=' + resource.Data.Internal.BlobReference.Uid;
      url += '&kind=INTERNAL';
      if (!auto) {
        url += '&ztop=' + resource.ZoneTop;
        url += '&zleft=' + resource.ZoneLeft;
        url += '&zwidth=' + resource.ZoneWidth;
        url += '&zheight=' + resource.ZoneHeight;
      } else {
        url += '&ztop=' + crop;
        url += '&zleft=' + crop;
        url += '&zwidth=' + crop;
        url += '&zheight=' + crop;
      }
      url += '&width=' + width;
      url += '&height=' + height;

      break;

    case 'EXTERNAL':
      let extUrl = resource.Data.External.Url;
      extUrl = extUrl.replace(/\[height\]/i, '' + height);
      extUrl = extUrl.replace(/\[width\]/i, '' + width);
      if (extUrl.indexOf(dynPrefix) >= 0) {
        url = extUrl;
      } else {
        url = dynPrefix + '/native/preview/image?url=' + extUrl;
        url += '&kind=' + resource.Kind;
        if (!auto) {
          url += '&ztop=' + resource.ZoneTop;
          url += '&zleft=' + resource.ZoneLeft;
          url += '&zwidth=' + resource.ZoneWidth;
          url += '&zheight=' + resource.ZoneHeight;
        } else {
          url += '&ztop=' + crop;
          url += '&zleft=' + crop;
          url += '&zwidth=' + crop;
          url += '&zheight=' + crop;
        }
        url += '&width=' + width;
        url += '&height=' + height;
      }

      if (resource.Smart) { // resource.Smart could have the string value 'false'
        url += '&smart=' + (resource.Smart);
      }

      if (resource.NoTransform) {
        url += '&notransform=' + resource.NoTransform;
      }

      break
  }

  return url;
}

function getNativeAssets(response) {
  if (typeof response.Native === 'object') {
    return response.Native;
  } else {
    const adJson = JSON.parse(response.Ad.match(/\/\*PREBID\*\/(.*)\/\*PREBID\*\//));
    const textsJson = adJson.Content.Preview.Text;

    const width = response.Width || 300;
    const height = response.Height || 250;

    var impressionUrl = adJson.TrackingPrefix +
            '/pixel?event_kind=IMPRESSION&attempt=' + adJson.Attempt;

    if (adJson.Campaign) {
      impressionUrl += '&campaign=' + adJson.Campaign;
    }

    return {
      title: textsJson.TITLE,
      body: textsJson.DESCRIPTION,
      cta: textsJson.CALLTOACTION,
      sponsoredBy: textsJson.SPONSOR,
      image: {
        url: getImageUrl(adJson, adJson.Thumbnail.Image, width, height),
        height: height,
        width: width,
      },
      icon: {
        url: adJson.HasSponsorImage && getImageUrl(adJson, adJson.Content.Preview.Sponsor.Logo.Resource, 50, 50),
        height: 50,
        width: 50,
      },
      clickUrl: adJson.Content.Landing.Url,
      impressionTrackers: [
        impressionUrl
      ],
    };
  }
}

/* Create bid from response */
function createBid(response, bidRequests) {
  if (!response || !response.Ad) {
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
    width: response.Width,
    height: response.Height,
    ttl: 3600,
    creativeId: response.CreativeID,
    cpm: response.Price,
    netRevenue: true,
    currency: 'USD'
  };

  if (request && request.mediaTypes === 'native') {
    bid.native = getNativeAssets(response);
  } else {
    bid.ad = response.Ad;
  }

  return bid;
}

registerBidder(spec);
