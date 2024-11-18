import {_each, getDefinedParams, parseGPTSingleSizeArrayToRtbSize} from '../src/utils.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {formatRequest, getRtbBid, getSiteObj, getSyncResponse, videoBid, bannerBid, createVideoTag} from '../libraries/targetVideoUtils/bidderUtils.js';
import {SOURCE, GVLID, BIDDER_CODE, VIDEO_PARAMS, BANNER_ENDPOINT_URL, VIDEO_ENDPOINT_URL, MARGIN, TIME_TO_LIVE} from '../libraries/targetVideoUtils/constants.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

export const spec = {

  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.placementId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidderRequest) {
    const requests = [];
    const sdk = {
      source: SOURCE,
      version: '$prebid.version$'
    };

    for (let {params, bidId, sizes, mediaTypes} of bidRequests) {
      for (const mediaType in mediaTypes) {
        switch (mediaType) {
          case VIDEO: {
            const video = mediaTypes[VIDEO];
            const placementId = params.placementId;
            const site = getSiteObj();

            if (sizes && !Array.isArray(sizes[0])) sizes = [sizes];

            const payload = {
              sdk,
              id: bidderRequest.bidderRequestId,
              site,
              imp: []
            }

            const imp = {
              ext: {
                prebid: {
                  storedrequest: { id: placementId }
                }
              },
              video: getDefinedParams(video, VIDEO_PARAMS)
            }

            if (video.playerSize) {
              imp.video = Object.assign(
                imp.video, parseGPTSingleSizeArrayToRtbSize(video.playerSize[0]) || {}
              );
            } else if (video.w && video.h) {
              imp.video.w = video.w;
              imp.video.h = video.h;
            }

            payload.imp.push(imp);

            const gdprConsent = bidderRequest && bidderRequest.gdprConsent;
            const uspConsent = bidderRequest && bidderRequest.uspConsent;

            if (gdprConsent || uspConsent) {
              payload.regs = { ext: {} };

              if (uspConsent) {
                payload.regs.ext.us_privacy = uspConsent;
              };

              if (gdprConsent) {
                if (typeof gdprConsent.gdprApplies !== 'undefined') {
                  payload.regs.ext.gdpr = gdprConsent.gdprApplies ? 1 : 0;
                };

                if (typeof gdprConsent.consentString !== 'undefined') {
                  payload.user = {
                    ext: { consent: gdprConsent.consentString }
                  };
                };
              };
            };

            if (bidRequests[0].schain) {
              payload.schain = bidRequests[0].schain;
            }

            requests.push(formatRequest({ payload, url: VIDEO_ENDPOINT_URL, bidId }));
            break;
          }

          case BANNER: {
            const tags = bidRequests.map(createVideoTag);
            const schain = bidRequests[0].schain;

            const payload = {
              tags,
              sdk,
              schain,
            };

            if (bidderRequest && bidderRequest.gdprConsent) {
              payload.gdpr_consent = {
                consent_string: bidderRequest.gdprConsent.consentString,
                consent_required: bidderRequest.gdprConsent.gdprApplies
              };

              if (bidderRequest.gdprConsent.addtlConsent && bidderRequest.gdprConsent.addtlConsent.indexOf('~') !== -1) {
                let ac = bidderRequest.gdprConsent.addtlConsent;
                let acStr = ac.substring(ac.indexOf('~') + 1);
                payload.gdpr_consent.addtl_consent = acStr.split('.').map(id => parseInt(id, 10));
              }
            }

            if (bidderRequest && bidderRequest.uspConsent) {
              payload.us_privacy = bidderRequest.uspConsent
            }

            return formatRequest({ payload, url: BANNER_ENDPOINT_URL, bidderRequest });
          }
        }
      }
    }

    return requests;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, { bidderRequest, ...bidRequest }) {
    serverResponse = serverResponse.body;
    const currency = serverResponse.cur;
    const bids = [];

    if (serverResponse.tags) {
      serverResponse.tags.forEach(serverBid => {
        const rtbBid = getRtbBid(serverBid);
        if (rtbBid && rtbBid.cpm !== 0 && rtbBid.ad_type == VIDEO) {
          bids.push(bannerBid(serverBid, rtbBid, bidderRequest, MARGIN));
        }
      });
    }

    if (serverResponse.seatbid) {
      _each(serverResponse.seatbid, (resp) => {
        _each(resp.bid, (bid) => {
          const requestId = bidRequest.bidId;
          const params = bidRequest.params;
          const vBid = videoBid(bid, requestId, currency, params, TIME_TO_LIVE);
          if (bids.length == 0 || bids[0].cpm < vBid.cpm) {
            bids[0] = vBid;
          }
        });
      });
    }

    return bids;
  },

  /**
   * Determine the user sync type (either 'iframe' or 'image') based on syncOptions.
   * Construct the sync URL by appending required query parameters such as gdpr, ccpa, and coppa consents.
   * Return an array containing an object with the sync type and the constructed URL.
   */
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
    return getSyncResponse(syncOptions, gdprConsent, uspConsent, gppConsent, 'targetvideo');
  }

}

registerBidder(spec);
