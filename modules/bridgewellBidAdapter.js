import {_each, deepSetValue, inIframe} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'bridgewell';
const REQUEST_ENDPOINT = 'https://prebid.scupio.com/recweb/prebid.aspx?cb=';
const BIDDER_VERSION = '1.1.0';

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
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const adUnits = [];
    const bidderUrl = REQUEST_ENDPOINT + Math.random();

    _each(validBidRequests, function (bid) {
      const passthrough = bid.ortb2Imp?.ext?.prebid?.passthrough;
      const filteredPassthrough = passthrough ? Object.fromEntries(
        Object.entries({
          bucket: passthrough.bucket,
          client: passthrough.client,
          gamAdCode: passthrough.gamAdCode,
          gamLoc: passthrough.gamLoc,
          colo: passthrough.colo,
          device: passthrough.device,
          lang: passthrough.lang,
          pt: passthrough.pt,
          region: passthrough.region,
          site: passthrough.site,
          ver: passthrough.ver
        }).filter(([_, value]) => value !== undefined)
      ) : undefined;

      const adUnit = {
        adUnitCode: bid.adUnitCode,
        requestId: bid.bidId,
        transactionId: bid.transactionId,
        adUnitId: bid.adUnitId,
        sizes: bid.sizes,
        mediaTypes: bid.mediaTypes || {
          banner: {
            sizes: bid.sizes
          }
        },
        ortb2Imp: {
          ext: {
            prebid: {
              passthrough: filteredPassthrough
            },
            data: {
              adserver: {
                name: bid.ortb2Imp?.ext?.data?.adserver?.name,
                adslot: bid.ortb2Imp?.ext?.data?.adserver?.adslot
              },
              pbadslot: bid.ortb2Imp?.ext?.data?.pbadslot
            },
            gpid: bid.ortb2Imp?.ext?.gpid
          },
          banner: {
            pos: bid.ortb2Imp?.banner?.pos
          }
        }
      };

      if (bid.params?.cid) {
        adUnit.cid = bid.params.cid;
      } else if (bid.params?.ChannelID) {
        adUnit.ChannelID = bid.params.ChannelID;
      }

      let floorInfo = {};
      if (typeof bid.getFloor === 'function') {
        const mediaType = bid.mediaTypes?.banner ? BANNER : (bid.mediaTypes?.native ? NATIVE : '*');
        const sizes = bid.mediaTypes?.banner?.sizes || bid.sizes || [];
        const size = sizes.length === 1 ? sizes[0] : '*';
        floorInfo = bid.getFloor({currency: 'USD', mediaType: mediaType, size: size}) || {};
      }
      adUnit.floor = floorInfo.floor;
      adUnit.currency = floorInfo.currency;
      adUnits.push(adUnit);
    });

    let topUrl = '';
    if (bidderRequest?.refererInfo?.page) {
      topUrl = bidderRequest.refererInfo.page;
    }

    const firstBid = validBidRequests[0] || {};

    return {
      method: 'POST',
      url: bidderUrl,
      data: {
        version: {
          prebid: '$prebid.version$',
          bridgewell: BIDDER_VERSION
        },
        inIframe: inIframe(),
        url: topUrl,
        referrer: bidderRequest?.refererInfo?.ref,
        auctionId: firstBid?.auctionId,
        bidderRequestId: firstBid?.bidderRequestId,
        src: firstBid?.src,
        userIds: firstBid?.userId || {},
        userIdAsEids: firstBid?.userIdAsEids || [],
        auctionsCount: firstBid?.auctionsCount,
        bidRequestsCount: firstBid?.bidRequestsCount,
        bidderRequestsCount: firstBid?.bidderRequestsCount,
        bidderWinsCount: firstBid?.bidderWinsCount,
        deferBilling: firstBid?.deferBilling,
        metrics: firstBid?.metrics || {},
        adUnits: adUnits,
        // TODO: please do not send internal data structures over the network
        refererInfo: bidderRequest?.refererInfo?.legacy,
        ortb2: bidderRequest?.ortb2
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
    _each(bidRequest.validBidRequests, function (req) {
      const bidResponse = {};

      if (!serverResponse.body) {
        return;
      }

      const matchedResponse = ((serverResponse.body) || []).find(function (res) {
        let valid = false;

        if (res && !res.consumed) {
          const mediaTypes = req.mediaTypes;
          const adUnitCode = req.adUnitCode;
          if (res.adUnitCode) {
            return res.adUnitCode === adUnitCode;
          } else if (res.width && res.height && mediaTypes) {
            if (mediaTypes.native) { // dont care native sizes
              valid = true;
            } else if (mediaTypes.banner) {
              if (mediaTypes.banner.sizes) {
                const width = res.width;
                const height = res.height;
                const sizes = mediaTypes.banner.sizes;
                // check response size validation
                if (typeof sizes[0] === 'number') { // for foramt Array[Number] check
                  valid = width === sizes[0] && height === sizes[1];
                } else { // for format Array[Array[Number]] check
                  valid = !!((sizes) || []).find(function (size) {
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

        if (matchedResponse.adomain) {
          deepSetValue(bidResponse, 'meta.advertiserDomains', Array.isArray(matchedResponse.adomain) ? matchedResponse.adomain : [matchedResponse.adomain]);
        }

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

            const reqNativeLayout = req.mediaTypes.native;
            const resNative = matchedResponse.native;

            // check title
            const title = reqNativeLayout.title;
            if (title && title.required) {
              if (typeof resNative.title !== 'string') {
                return;
              } else if (title.len && title.len < resNative.title.length) {
                return;
              }
            }

            // check body
            const body = reqNativeLayout.body;
            if (body && body.required) {
              if (typeof resNative.body !== 'string') {
                return;
              }
            }

            // check image
            const image = reqNativeLayout.image;
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
            const sponsoredBy = reqNativeLayout.sponsoredBy;
            if (sponsoredBy && sponsoredBy.required) {
              if (typeof resNative.sponsoredBy !== 'string') {
                return;
              }
            }

            // check icon
            const icon = reqNativeLayout.icon;
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
            const clickTrackers = resNative.clickTrackers;
            if (clickTrackers) {
              if (clickTrackers.length === 0) {
                return;
              }
            } else {
              return;
            }

            // check impressionTrackers
            const impressionTrackers = resNative.impressionTrackers;
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
