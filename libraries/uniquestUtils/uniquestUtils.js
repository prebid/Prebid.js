import { deepAccess, getBidIdParameter } from '../../src/utils.js';
import { tryAppendQueryString } from '../urlUtils/urlUtils.js';

export function buildQueryString(request, bidderRequest, paramKey) {
  const eids = (request.userIdAsEids?.length ? request.userIdAsEids : deepAccess(request, 'ortb2.user.ext.eids')) || [];
  const imuidEid = eids.find(eid => eid.source === 'intimatemerger.com');
  const imuid = deepAccess(imuidEid, 'uids.0.id');
  const widths = request.sizes.map(size => size[0]).join(',');
  const heights = request.sizes.map(size => size[1]).join(',');

  let queryString = '';
  queryString = tryAppendQueryString(queryString, 'bid', request.bidId);
  queryString = tryAppendQueryString(queryString, paramKey, getBidIdParameter(paramKey, request.params));
  queryString = tryAppendQueryString(queryString, 'widths', widths);
  queryString = tryAppendQueryString(queryString, 'heights', heights);
  queryString = tryAppendQueryString(queryString, 'timeout', bidderRequest.timeout);
  queryString = tryAppendQueryString(queryString, 'im_uid', imuid);
  return queryString;
}

export function interpretResponse (serverResponse) {
  const response = serverResponse.body;

  if (!response || Object.keys(response).length === 0) {
    return [];
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
