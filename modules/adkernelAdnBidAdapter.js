import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import { BANNER, VIDEO } from 'src/mediaTypes';
import includes from 'core-js/library/fn/array/includes';

const DEFAULT_ADKERNEL_DSP_DOMAIN = 'tag.adkernel.com';
const VIDEO_TARGETING = ['mimes', 'protocols', 'api'];
const DEFAULT_MIMES = ['video/mp4', 'video/webm', 'application/x-shockwave-flash', 'application/javascript'];
const DEFAULT_PROTOCOLS = [2, 3, 5, 6];
const DEFAULT_APIS = [1, 2];

function isRtbDebugEnabled() {
  return utils.getTopWindowLocation().href.indexOf('adk_debug=true') !== -1;
}

function buildImp(bidRequest) {
  const sizes = bidRequest.sizes;
  let imp = {
    id: bidRequest.bidId,
    tagid: bidRequest.placementCode
  };
  if (bidRequest.mediaType === 'video' || utils.deepAccess(bidRequest, 'mediaTypes.video')) {
    imp.video = {
      w: sizes[0],
      h: sizes[1],
      mimes: DEFAULT_MIMES,
      protocols: DEFAULT_PROTOCOLS,
      api: DEFAULT_APIS
    };
    if (bidRequest.params.video) {
      Object.keys(bidRequest.params.video)
        .filter(param => includes(VIDEO_TARGETING, param))
        .forEach(param => imp.video[param] = bidRequest.params.video[param]);
    }
  } else {
    imp.banner = {
      format: utils.parseSizesInput(bidRequest.sizes)
    };
  }
  return imp;
}

function buildRequestParams(auctionId, transactionId, tags) {
  let loc = utils.getTopWindowLocation();
  return {
    id: auctionId,
    tid: transactionId,
    site: {
      page: loc.href,
      ref: utils.getTopWindowReferrer(),
      secure: ~~(loc.protocol === 'https:')
    },
    imp: tags
  };
}

function buildBid(tag) {
  let bid = {
    requestId: tag.impid,
    bidderCode: spec.code,
    cpm: tag.bid,
    width: tag.w,
    height: tag.h,
    creativeId: tag.crid,
    currency: 'USD',
    ttl: 720,
    netRevenue: true
  };
  if (tag.tag) {
    bid.ad = `<!DOCTYPE html><html><head><title></title><body style='margin:0px;padding:0px;'>${tag.tag}</body></head>`;
    bid.mediaType = BANNER;
  } else if (tag.vast_url) {
    bid.vastUrl = tag.vast_url;
    bid.mediaType = VIDEO;
  }
  return bid;
}

export const spec = {

  code: 'adkernelAdn',

  supportedMediaTypes: [VIDEO],

  isBidRequestValid: function(bidRequest) {
    return 'params' in bidRequest && (typeof bidRequest.params.host === 'undefined' || typeof bidRequest.params.host === 'string') &&
      typeof bidRequest.params.pubId === 'number';
  },

  buildRequests: function(bidRequests) {
    let transactionId;
    let auctionId;
    let dispatch = bidRequests.map(buildImp)
      .reduce((acc, curr, index) => {
        let bidRequest = bidRequests[index];
        let pubId = bidRequest.params.pubId;
        let host = bidRequest.params.host || DEFAULT_ADKERNEL_DSP_DOMAIN;
        acc[host] = acc[host] || {};
        acc[host][pubId] = acc[host][pubId] || [];
        acc[host][pubId].push(curr);
        transactionId = bidRequest.transactionId;
        auctionId = bidRequest.bidderRequestId;
        return acc;
      }, {});
    let requests = [];
    Object.keys(dispatch).forEach(host => {
      Object.keys(dispatch[host]).forEach(pubId => {
        let request = buildRequestParams(auctionId, transactionId, dispatch[host][pubId]);
        requests.push({
          method: 'POST',
          url: `//${host}/tag?account=${pubId}&pb=1${isRtbDebugEnabled() ? '&debug=1' : ''}`,
          data: JSON.stringify(request)
        })
      });
    });
    return requests;
  },

  interpretResponse: function(serverResponse) {
    let response = serverResponse.body;
    if (!response.tags) {
      return [];
    }
    if (response.debug) {
      utils.logInfo(`ADKERNEL DEBUG:\n${response.debug}`);
    }
    return response.tags.map(buildBid);
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    if (!syncOptions.iframeEnabled || !serverResponses || serverResponses.length === 0) {
      return [];
    }
    return serverResponses.filter(rps => 'syncpages' in rps.body)
      .map(rsp => rsp.body.syncpages)
      .reduce((a, b) => a.concat(b), [])
      .map(sync_url => {
        return {
          type: 'iframe',
          url: sync_url
        }
      });
  }
};

registerBidder(spec);
