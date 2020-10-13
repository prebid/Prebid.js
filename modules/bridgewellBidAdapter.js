import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import find from 'core-js-pure/features/array/find.js';

const BIDDER_CODE = 'bridgewell';
const REQUEST_ENDPOINT = 'https://prebid.scupio.com/recweb/prebid.aspx?cb=' + Math.random();
const BIDDER_VERSION = '0.0.3';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    let valid = false;
    if (bid && bid.params) {
      if ((bid.params.cid) && (typeof bid.params.cid === 'number')) {
        valid = true;
      } else if (bid.params.ChannelID) {
        valid = true;
      }
    }
    return valid;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const adUnits = [];
    utils._each(validBidRequests, function (bid) {
      if (bid.params.cid) {
        adUnits.push({
          cid: bid.params.cid,
          adUnitCode: bid.adUnitCode,
          requestId: bid.bidId,
          mediaTypes: bid.mediaTypes || {
            banner: {
              sizes: bid.sizes
            }
          }
        });
      } else {
        adUnits.push({
          ChannelID: bid.params.ChannelID,
          adUnitCode: bid.adUnitCode,
          requestId: bid.bidId,
          mediaTypes: bid.mediaTypes || {
            banner: {
              sizes: bid.sizes
            }
          }
        });
      }
    });

    let topUrl = '';
    if (bidderRequest && bidderRequest.refererInfo) {
      topUrl = bidderRequest.refererInfo.referer;
    }

    return {
      method: 'POST',
      url: REQUEST_ENDPOINT,
      data: {
        version: {
          prebid: '$prebid.version$',
          bridgewell: BIDDER_VERSION
        },
        inIframe: utils.inIframe(),
        url: topUrl,
        referrer: getTopWindowReferrer(),
        adUnits: adUnits,
        refererInfo: bidderRequest.refererInfo,
      },
      validBidRequests: validBidRequests
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {*} bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];

    // map responses to requests
    utils._each(bidRequest.validBidRequests, function (req) {
      const bidResponse = {};

      if (!serverResponse.body) {
        return;
      }

      let matchedResponse = find(serverResponse.body, function (res) {
        let valid = false;

        if (res && !res.consumed) {
          let mediaTypes = req.mediaTypes;
          let adUnitCode = req.adUnitCode;
          if (res.adUnitCode) {
            return res.adUnitCode === adUnitCode;
          } else if (res.width && res.height && mediaTypes) {
            if (mediaTypes.native) { // dont care native sizes
              valid = true;
            } else if (mediaTypes.banner) {
              if (mediaTypes.banner.sizes) {
                let width = res.width;
                let height = res.height;
                let sizes = mediaTypes.banner.sizes;
                // check response size validation
                if (typeof sizes[0] === 'number') { // for foramt Array[Number] check
                  valid = width === sizes[0] && height === sizes[1];
                } else { // for format Array[Array[Number]] check
                  valid = !!find(sizes, function (size) {
                    return (width === size[0] && height === size[1]);
                  });
                }
              }
            }
          }
        }

        return valid;
      });

      if (matchedResponse) {
        matchedResponse.consumed = true;

        // check required parameters
        if (typeof matchedResponse.cpm !== 'number') {
          return;
        } else if (typeof matchedResponse.netRevenue !== 'boolean') {
          return;
        } else if (typeof matchedResponse.currency !== 'string') {
          return;
        } else if (typeof matchedResponse.mediaType !== 'string') {
          return;
        }

        bidResponse.requestId = req.bidId;
        bidResponse.cpm = matchedResponse.cpm;
        bidResponse.width = matchedResponse.width;
        bidResponse.height = matchedResponse.height;
        bidResponse.ttl = matchedResponse.ttl;
        bidResponse.creativeId = matchedResponse.id;
        bidResponse.netRevenue = matchedResponse.netRevenue;
        bidResponse.currency = matchedResponse.currency;
        bidResponse.mediaType = matchedResponse.mediaType;

        // check required parameters by matchedResponse.mediaType
        switch (matchedResponse.mediaType) {
          case BANNER:
            // check banner required parameters
            if (typeof matchedResponse.ad !== 'string') {
              return;
            }

            bidResponse.ad = matchedResponse.ad;
            break;
          case NATIVE:
            // check native required parameters
            if (!matchedResponse.native) {
              return;
            }

            let reqNativeLayout = req.mediaTypes.native;
            let resNative = matchedResponse.native;

            // check title
            let title = reqNativeLayout.title;
            if (title && title.required) {
              if (typeof resNative.title !== 'string') {
                return;
              } else if (title.len && title.len < resNative.title.length) {
                return;
              }
            }

            // check body
            let body = reqNativeLayout.body;
            if (body && body.required) {
              if (typeof resNative.body !== 'string') {
                return;
              }
            }

            // check image
            let image = reqNativeLayout.image;
            if (image && image.required) {
              if (resNative.image) {
                if (typeof resNative.image.url !== 'string') { // check image url
                  return;
                } else {
                  if (resNative.image.width !== image.sizes[0] || resNative.image.height !== image.sizes[1]) { // check image sizes
                    return;
                  }
                }
              } else {
                return;
              }
            }

            // check sponsoredBy
            let sponsoredBy = reqNativeLayout.sponsoredBy;
            if (sponsoredBy && sponsoredBy.required) {
              if (typeof resNative.sponsoredBy !== 'string') {
                return;
              }
            }

            // check icon
            let icon = reqNativeLayout.icon;
            if (icon && icon.required) {
              if (resNative.icon) {
                if (typeof resNative.icon.url !== 'string') { // check icon url
                  return;
                } else {
                  if (resNative.icon.width !== icon.sizes[0] || resNative.icon.height !== icon.sizes[0]) { // check image sizes
                    return;
                  }
                }
              } else {
                return;
              }
            }

            // check clickUrl
            if (typeof resNative.clickUrl !== 'string') {
              return;
            }

            // check clickTracker
            let clickTrackers = resNative.clickTrackers;
            if (clickTrackers) {
              if (clickTrackers.length === 0) {
                return;
              }
            } else {
              return;
            }

            // check impressionTrackers
            let impressionTrackers = resNative.impressionTrackers;
            if (impressionTrackers) {
              if (impressionTrackers.length === 0) {
                return;
              }
            } else {
              return;
            }

            bidResponse.native = matchedResponse.native;

            break;

          default: // response mediaType is not supported
            return;
        }

        bidResponses.push(bidResponse);
      }
    });

    return bidResponses;
  }
};

function getTopWindowReferrer() {
  try {
    return window.top.document.referrer;
  } catch (e) {
    return '';
  }
}

registerBidder(spec);
