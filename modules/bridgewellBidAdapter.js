import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import {BANNER, NATIVE} from 'src/mediaTypes';
import find from 'core-js/library/fn/array/find';

const BIDDER_CODE = 'bridgewell';
const REQUEST_ENDPOINT = '//rec.scupio.com/recweb/prebid.aspx?cb=' + Math.random();
const BIDDER_VERSION = '0.0.1';

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
    let valid = false;
    let typeOfCpmWeight;

    if (bid && bid.params) {
      if (bid.params.ChannelID) {
        // cpmWeight is optinal parameter and should above than zero
        typeOfCpmWeight = typeof bid.params.cpmWeight;
        if (typeOfCpmWeight === 'undefined') {
          bid.params.cpmWeight = 1;
          valid = true;
        } else if (typeOfCpmWeight === 'number' && bid.params.cpmWeight > 0) {
          valid = true;
        } else {
          valid = false;
        }
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
  buildRequests: function(validBidRequests) {
    const adUnits = [];
    utils._each(validBidRequests, function(bid) {
      adUnits.push({
        ChannelID: bid.params.ChannelID,
        mediaTypes: bid.mediaTypes || {
          banner: {
            sizes: bid.sizes
          }
        }
      });
    });

    return {
      method: 'POST',
      url: REQUEST_ENDPOINT,
      data: {
        version: {
          prebid: '$prebid.version$',
          bridgewell: BIDDER_VERSION
        },
        adUnits: adUnits
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
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];

    // map responses to requests
    utils._each(bidRequest.validBidRequests, function(req) {
      const bidResponse = {};

      if (!serverResponse.body) {
        return;
      }

      let matchedResponse = find(serverResponse.body, function(res) {
        let valid = false;

        if (!!res && !res.consumed) { // response exists and not consumed
          if (res.width && res.height) {
            let mediaTypes = req.mediaTypes;
            // for prebid 1.0 and later usage, mediaTypes.banner.sizes
            let sizes = mediaTypes && mediaTypes.banner && mediaTypes.banner.sizes ? mediaTypes.banner.sizes : req.sizes;
            if (sizes) {
              let sizeValid;
              let width = res.width;
              let height = res.height;
              // check response size validation
              if (typeof sizes[0] === 'number') { // for foramt Array[Number] check
                sizeValid = width === sizes[0] && height === sizes[1];
              } else { // for format Array[Array[Number]] check
                sizeValid = find(sizes, function(size) {
                  return (width === size[0] && height === size[1]);
                });
              }

              if (sizeValid || (mediaTypes && mediaTypes.native)) { // dont care native sizes
                valid = true;
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
        bidResponse.cpm = matchedResponse.cpm * req.params.cpmWeight;
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

            let req_nativeLayout = req.mediaTypes.native;
            let res_native = matchedResponse.native;

            // check title
            let title = req_nativeLayout.title;
            if (title && title.required) {
              if (typeof res_native.title !== 'string') {
                return;
              } else if (title.len && title.len < res_native.title.length) {
                return;
              }
            }

            // check body
            let body = req_nativeLayout.body;
            if (body && body.required) {
              if (typeof res_native.body !== 'string') {
                return;
              }
            }

            // check image
            let image = req_nativeLayout.image;
            if (image && image.required) {
              if (res_native.image) {
                if (typeof res_native.image.url !== 'string') { // check image url
                  return;
                } else {
                  if (res_native.image.width !== image.sizes[0] || res_native.image.height !== image.sizes[1]) { // check image sizes
                    return;
                  }
                }
              } else {
                return;
              }
            }

            // check sponsoredBy
            let sponsoredBy = req_nativeLayout.sponsoredBy;
            if (sponsoredBy && sponsoredBy.required) {
              if (typeof res_native.sponsoredBy !== 'string') {
                return;
              }
            }

            // check icon
            let icon = req_nativeLayout.icon;
            if (icon && icon.required) {
              if (res_native.icon) {
                if (typeof res_native.icon.url !== 'string') { // check icon url
                  return;
                } else {
                  if (res_native.icon.width !== icon.sizes[0] || res_native.icon.height !== icon.sizes[0]) { // check image sizes
                    return;
                  }
                }
              } else {
                return;
              }
            }

            // check clickUrl
            if (typeof res_native.clickUrl !== 'string') {
              return;
            }

            // check clickTracker
            let clickTrackers = res_native.clickTrackers;
            if (clickTrackers) {
              if (clickTrackers.length === 0) {
                return;
              }
            } else {
              return;
            }

            // check impressionTrackers
            let impressionTrackers = res_native.impressionTrackers;
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

registerBidder(spec);
