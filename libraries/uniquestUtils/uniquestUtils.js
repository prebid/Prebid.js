export function interpretResponse (serverResponse) {
  const response = serverResponse.body;

  if (!response || Object.keys(response).length === 0) {
    return []
  }

  const bid = {
    requestId: response.request_id,
    cpm: response.cpm,
    currency: response.currency,
    width: response.width,
    height: response.height,
    ad: response.ad,
    creativeId: response.bid_id,
    netRevenue: response.net_revenue,
    mediaType: response.media_type,
    ttl: response.ttl,
    meta: {
      advertiserDomains: response.meta && response.meta.advertiser_domains ? response.meta.advertiser_domains : [],
    },
  };
  return [bid];
}
