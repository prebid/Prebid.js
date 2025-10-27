/**
 * Helper function to build request payload for banner ads.
 * @param {Object} bidRequest - The bid request object.
 * @param {string} endpointUrl - The endpoint URL specific to the bidder.
 * @returns {Array} An array of server requests.
 */
export function buildBannerRequests(bidRequest, endpointUrl) {
  const serverRequests = [];
  const sizes = bidRequest.mediaTypes.banner.sizes;

  sizes.forEach(([width, height]) => {
    bidRequest.params.requestedSizes = [width, height];

    const payload = {
      ctype: 'div',
      pzoneid: bidRequest.params.zoneId,
      width,
      height,
    };

    const payloadString = Object.keys(payload)
      .map((key) => `${key}=${encodeURIComponent(payload[key])}`)
      .join('&');

    serverRequests.push({
      method: 'GET',
      url: endpointUrl,
      data: payloadString,
      bidderRequest: bidRequest,
    });
  });

  return serverRequests;
}

/**
 * Helper function to interpret server response for banner ads.
 * @param {Object} serverResponse - The server response object.
 * @param {Object} bidderRequest - The matched bid request for this response.
 * @returns {Array} An array of bid responses.
 */
export function interpretBannerResponse(serverResponse, bidderRequest) {
  const response = serverResponse.body;
  const bidResponses = [];

  if (response && response.template && response.template.html) {
    const { bidId } = bidderRequest;
    const [width, height] = bidderRequest.params.requestedSizes;

    const bidResponse = {
      requestId: bidId,
      cpm: response.hb.cpm,
      creativeId: response.banner.hash,
      currency: 'USD',
      netRevenue: response.hb.netRevenue,
      ttl: 600,
      ad: response.template.html,
      mediaType: 'banner',
      meta: {
        advertiserDomains: response.hb.adomains || [],
      },
      width,
      height,
    };

    bidResponses.push(bidResponse);
  }

  return bidResponses;
}
