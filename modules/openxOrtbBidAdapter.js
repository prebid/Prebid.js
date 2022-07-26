import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import {mergeDeep} from '../src/utils.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';

const bidderConfig = 'hb_pb_ortb';
const bidderVersion = '1.0';
export const REQUEST_URL = 'https://rtb.openx.net/openrtbb/prebidjs';
export const SYNC_URL = 'https://u.openx.net/w/1.0/pd';
export const DEFAULT_PH = '2d1251ae-7f3a-47cf-bd2a-2f288854a0ba';
export const spec = {
  code: 'openx',
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  transformBidParams
};

registerBidder(spec);

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    mergeDeep(imp, {
      tagid: bidRequest.params.unit,
      ext: {
        divid: bidRequest.adUnitCode
      }
    });
    if (bidRequest.params.customParams) {
      utils.deepSetValue(imp, 'ext.customParams', bidRequest.params.customParams);
    }
    if (bidRequest.params.customFloor && !imp.bidfloor) {
      imp.bidfloor = bidRequest.params.customFloor;
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    mergeDeep(req, {
      at: 1,
      ext: {
        bc: `${bidderConfig}_${bidderVersion}`
      },
      regs: {
        // always set regs.coppa, even when not configured
        // TODO: is this necessary?
        coppa: config.getConfig('coppa') ? 1 : 0
      }
    })
    const bid = context.bidRequests[0];
    if (bid.params.doNotTrack) {
      utils.deepSetValue(req, 'device.dnt', 1);
    }
    if (bid.params.platform) {
      utils.deepSetValue(req, 'ext.platform', bid.params.platform);
    }
    if (bid.params.delDomain) {
      utils.deepSetValue(req, 'ext.delDomain', bid.params.delDomain);
    }
    if (bid.params.test) {
      req.test = 1
    }
    return req;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    if (bid.ext) {
      bidResponse.meta.networkId = bid.ext.dsp_id;
      bidResponse.meta.advertiserId = bid.ext.buyer_id;
      bidResponse.meta.brandId = bid.ext.brand_id;
    }
    const {ortbResponse} = context;
    if (ortbResponse.ext && ortbResponse.ext.paf) {
      // TODO: the following is likely incorrect when an ORTB response contains more than one bid
      // all of them would be set with the same content_id (from the last bid), since they share the same `paf` object
      bidResponse.meta.paf = ortbResponse.ext.paf;
      bidResponse.meta.paf.content_id = utils.deepAccess(bid, 'ext.paf.content_id');
    }
    return bidResponse;
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    // pass these from request to the responses for use in userSync
    const {ortbRequest} = context;
    if (ortbRequest.ext) {
      if (ortbRequest.ext.delDomain) {
        utils.deepSetValue(ortbResponse, 'ext.delDomain', ortbRequest.ext.delDomain);
      }
      if (ortbRequest.ext.platform) {
        utils.deepSetValue(ortbResponse, 'ext.platform', ortbRequest.ext.platform);
      }
    }
    return buildResponse(bidResponses, ortbResponse, context);
  },
  overrides: {
    imp: {
      bidfloor(setBidFloor, imp, bidRequest, context) {
        // enforce floors should always be in USD
        // TODO: does it make sense that request.cur can be any currency, but request.imp[].bidfloorcur must be USD?
        const floor = {};
        setBidFloor(floor, bidRequest, {...context, currency: 'USD'});
        if (floor.bidfloorcur === 'USD') {
          Object.assign(imp, floor);
        }
      }
    }
  }
});

function transformBidParams(params, isOpenRtb) {
  return utils.convertTypes({
    'unit': 'string',
    'customFloor': 'number'
  }, params);
}

function isBidRequestValid(bidRequest) {
  const hasDelDomainOrPlatform = bidRequest.params.delDomain ||
    bidRequest.params.platform;

  if (utils.deepAccess(bidRequest, 'mediaTypes.banner') &&
    hasDelDomainOrPlatform) {
    return !!bidRequest.params.unit ||
      utils.deepAccess(bidRequest, 'mediaTypes.banner.sizes.length') > 0;
  }

  return !!(bidRequest.params.unit && hasDelDomainOrPlatform);
}

function buildRequests(bids, bidderRequest) {
  let videoBids = bids.filter(bid => isVideoBid(bid));
  let bannerBids = bids.filter(bid => isBannerBid(bid));
  let requests = bannerBids.length ? [createRequest(bannerBids, bidderRequest, BANNER)] : [];
  videoBids.forEach(bid => {
    // TODO: why is this creating a request for each bid, instead of aggregating them together as with banner?
    requests.push(createRequest([bid], bidderRequest, VIDEO));
  });
  return requests;
}

function createRequest(bidRequests, bidderRequest, mediaType) {
  return {
    method: 'POST',
    url: REQUEST_URL,
    data: converter.toORTB({bidRequests, bidderRequest, context: {mediaType}})
  }
}

function isVideoBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.video');
}

function isBannerBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.banner') || !isVideoBid(bid);
}

function interpretResponse(resp, req) {
  return converter.fromORTB({request: req.data, response: resp.body}).bids;
}

/**
 * @param syncOptions
 * @param responses
 * @param gdprConsent
 * @param uspConsent
 * @return {{type: (string), url: (*|string)}[]}
 */
function getUserSyncs(syncOptions, responses, gdprConsent, uspConsent) {
  if (syncOptions.iframeEnabled || syncOptions.pixelEnabled) {
    let pixelType = syncOptions.iframeEnabled ? 'iframe' : 'image';
    let queryParamStrings = [];
    let syncUrl = SYNC_URL;
    if (gdprConsent) {
      queryParamStrings.push('gdpr=' + (gdprConsent.gdprApplies ? 1 : 0));
      queryParamStrings.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
    }
    if (uspConsent) {
      queryParamStrings.push('us_privacy=' + encodeURIComponent(uspConsent));
    }
    if (responses.length > 0 && responses[0].body && responses[0].body.ext) {
      const ext = responses[0].body.ext;
      if (ext.delDomain) {
        syncUrl = `https://${ext.delDomain}/w/1.0/pd`
      } else if (ext.platform) {
        queryParamStrings.push('ph=' + ext.platform)
      }
    } else {
      queryParamStrings.push('ph=' + DEFAULT_PH)
    }
    return [{
      type: pixelType,
      url: `${syncUrl}${queryParamStrings.length > 0 ? '?' + queryParamStrings.join('&') : ''}`
    }];
  }
}
