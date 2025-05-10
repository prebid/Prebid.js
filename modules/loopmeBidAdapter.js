import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { pbsExtensions } from '../libraries/pbsExtensions/pbsExtensions.js'
import { deepSetValue } from '../src/utils.js';

const BIDDER_CODE = 'loopme';
const url = 'https://prebid.loopmertb.com/';
const GVLID = 109;

export const converter = ortbConverter({
  processors: pbsExtensions,
  context: {
    netRevenue: true,
    ttl: 30
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'ext.bidder', {...bidRequest.params});
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    req.at = 1;
    const {bundleId, publisherId} = bidderRequest.bids[0].params;
    deepSetValue(req, 'site.domain', bundleId);
    deepSetValue(req, 'site.publisher.domain', bundleId);
    deepSetValue(req, 'site.publisher.id', publisherId);
    return req;
  }
});

export const spec = {
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  code: BIDDER_CODE,
  gvlid: GVLID,

  isBidRequestValid: ({params = {}}) => Boolean(params.publisherId && params.bundleId),

  buildRequests: (bidRequests, bidderRequest) =>
    ({url, method: 'POST', data: converter.toORTB({bidRequests, bidderRequest})}),

  interpretResponse: ({body}, {data}) => converter.fromORTB({ request: data, response: body }).bids,

  getUserSyncs: (syncOptions, serverResponses) =>
    serverResponses.flatMap(({body}) =>
      (body.ext?.usersyncs || [])
        .filter(({type}) => type === 'image' || type === 'iframe')
        .filter(({url}) => url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')))
        .filter(({type}) => (type === 'image' && syncOptions.pixelEnabled) || (type === 'iframe' && syncOptions.iframeEnabled))
    )
}
registerBidder(spec);
