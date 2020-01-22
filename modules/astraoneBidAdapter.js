import * as utils from '../src/utils'
import { registerBidder } from '../src/adapters/bidderFactory'
import { BANNER } from '../src/mediaTypes'

const BIDDER_CODE = 'astraone';
const SSP_ENDPOINT = 'https://ssp.astraone.io/auction/prebid';
const TTL = 60;

function buildBidRequests(validBidRequests) {
  return utils._map(validBidRequests, function(validBidRequest) {
    const params = validBidRequest.params;
    const bidRequest = {
      bidId: validBidRequest.bidId,
      transactionId: validBidRequest.transactionId,
      sizes: validBidRequest.sizes,
      placement: params.placement,
      placeId: params.placeId,
      imageUrl: params.imageUrl
    };

    return bidRequest;
  })
}

function buildBid(bidData) {
  const bid = {
    requestId: bidData.bidId,
    cpm: bidData.price,
    width: bidData.width,
    height: bidData.height,
    creativeId: bidData.content.seanceId,
    currency: bidData.currency,
    netRevenue: true,
    mediaType: BANNER,
    ttl: TTL,
    content: bidData.content
  };

  bid.ad = wrapAd(bid, bidData);

  return bid;
}

function getMediaTypeFromBid(bid) {
  return bid.mediaTypes && Object.keys(bid.mediaTypes)[0]
}

function wrapAd(bid, bidData) {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title></title>
        <script src="https://st.astraone.io/prebidrenderer.js"></script>
        <style>html, body {width: 100%; height: 100%; margin: 0;}</style>
    </head>
    <body>
        <div data-hyb-ssp-in-image-overlay="${bidData.content.placeId}" style="width: 100%; height: 100%;"></div>
        <script>
            if (parent.window.frames[window.name]) {
                var parentDocument = window.parent.document.getElementById(parent.window.frames[window.name].name);
                parentDocument.style.height = "100%";
                parentDocument.style.width = "100%";
            }
            var _html = "${encodeURIComponent(JSON.stringify(bid))}";
            window._ao_ssp.registerInImage(JSON.parse(decodeURIComponent(_html)));
        </script>
    </body>
  </html>`;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid(bid) {
    return (
      getMediaTypeFromBid(bid) === BANNER &&
      !!bid.params.placeId &&
      !!bid.params.imageUrl &&
      !!bid.params.placement &&
      (bid.params.placement === 'inImage')
    );
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests(validBidRequests, bidderRequest) {
    const payload = {
      url: bidderRequest.refererInfo.referer,
      cmp: !!bidderRequest.gdprConsent,
      bidRequests: buildBidRequests(validBidRequests)
    };

    if (payload.cmp) {
      const gdprApplies = bidderRequest.gdprConsent.gdprApplies;
      if (gdprApplies !== undefined) payload['ga'] = gdprApplies;
      payload['cs'] = bidderRequest.gdprConsent.consentString;
    }

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: SSP_ENDPOINT,
      data: payloadString,
      options: {
        contentType: 'application/json'
      }
    }
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse) {
    const serverBody = serverResponse.body;
    if (serverBody && utils.isArray(serverBody)) {
      return utils._map(serverBody, function(bid) {
        return buildBid(bid);
      });
    } else {
      return [];
    }
  }

}
registerBidder(spec);
