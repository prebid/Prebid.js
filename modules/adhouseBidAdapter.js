import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { deepSetValue, isFn, isPlainObject, logWarn } from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('./adhouseBidAdapter.d.ts').AdhouseBidderParams} AdhouseBidderParams
 * @typedef {BidRequest & { params: AdhouseBidderParams }} AdhouseBidRequest
 */

const BIDDER_CODE = 'adhouse';
const ENDPOINT = 'https://bid.adhouse.pro/openrtb2/auction';
// Line-item CPMs may be stored in TRY. bidMotor converts them and always
// responds with cur=USD. This constant is only the Prebid-side fallback.
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;
const VIDEO_TYPES = ['standart_video', 'sticky_video'];

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const placementId = String(bidRequest.params.placementId);
    // bidMotor reads the placement from tagid and ext.adhouse.placementId.
    imp.tagid = placementId;
    deepSetValue(imp, 'ext.adhouse.placementId', placementId);

    // Optional slot hint so a line item limited to one video player
    // (standart_video or sticky_video) is not matched against the other.
    // Omitted on banner requests and on video requests that accept either.
    if (bidRequest.params.videoType) {
      deepSetValue(imp, 'ext.adhouse.videoType', String(bidRequest.params.videoType));
    }

    const floor = getFloor(bidRequest);
    if (floor != null) {
      imp.bidfloor = floor.floor;
      imp.bidfloorcur = floor.currency;
    }
    return imp;
  },
});

function getFloor(bidRequest) {
  if (isFn(bidRequest.getFloor)) {
    const f = bidRequest.getFloor({ currency: DEFAULT_CURRENCY, mediaType: '*', size: '*' });
    if (isPlainObject(f) && !isNaN(f.floor)) {
      return { floor: f.floor, currency: f.currency || DEFAULT_CURRENCY };
    }
  }
  if (bidRequest.params && bidRequest.params.bidfloor != null && bidRequest.params.bidfloor !== '') {
    return { floor: Number(bidRequest.params.bidfloor), currency: bidRequest.params.currency || DEFAULT_CURRENCY };
  }
  return null;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER].concat(FEATURES.VIDEO ? [VIDEO] : []),

  /**
   * @param {AdhouseBidRequest} bid
   * @returns {boolean}
   */
  isBidRequestValid(bid) {
    if (!bid || !bid.params) {
      return false;
    }
    const pid = bid.params.placementId;
    if (pid === undefined || pid === null || pid === '') {
      logWarn('adhouse: missing params.placementId');
      return false;
    }
    const videoType = bid.params.videoType;
    if (videoType != null && videoType !== '' && VIDEO_TYPES.indexOf(String(videoType)) === -1) {
      logWarn('adhouse: videoType must be standart_video or sticky_video');
      return false;
    }
    return true;
  },

  buildRequests(validBidRequests, bidderRequest) {
    if (!validBidRequests || validBidRequests.length === 0) {
      return [];
    }
    const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });
    return [{
      method: 'POST',
      url: ENDPOINT,
      data,
      // Content-Type stays at the ajax default (text/plain). The body is still
      // JSON; bidMotor parses it regardless of the header. text/plain keeps the
      // cross-origin POST a simple request, so the browser skips the preflight.
      options: {
        withCredentials: true,
      },
    }];
  },

  interpretResponse(response, request) {
    if (!response || !response.body || !response.body.seatbid) {
      return [];
    }
    return converter.fromORTB({ response: response.body, request: request.data }).bids;
  },

  getUserSyncs() {
    return [];
  },
};

registerBidder(spec);
