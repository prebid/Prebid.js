import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { deepSetValue, getParameterByName, logError } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { ORTB_MTYPES } from '../libraries/ortbConverter/processors/mediaType.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const BIDDER_CODE = 'akcelo';
const COOKIE_SYNC_ENDPOINT = 'akcelo';

const AUCTION_URL = 'https://s2s.sportslocalmedia.com/openrtb2/auction';
const IFRAME_SYNC_URL = 'https://ads.sportslocalmedia.com/load-cookie.html';

const DEFAULT_TTL = 300;

const akceloDemoIsOn = () => getParameterByName('akcelo_demo') === 'true';

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    if (bidRequest.params.siteId) {
      deepSetValue(imp, 'ext.akcelo.siteId', bidRequest.params.siteId);
    } else {
      logError('Missing parameter : siteId');
    }

    if (bidRequest.params.adUnitId) {
      deepSetValue(imp, 'ext.akcelo.adUnitId', bidRequest.params.adUnitId);
    } else {
      logError('Missing parameter : adUnitId');
    }

    if (akceloDemoIsOn()) {
      deepSetValue(imp, 'ext.akcelo.test', 1);
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    deepSetValue(request, 'test', akceloDemoIsOn() ? 1 : 0);

    const siteId = bidderRequest.bids.map((bid) => bid.params.siteId).find(Boolean);
    deepSetValue(request, 'site.publisher.ext.prebid.parentAccount', siteId);

    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    // In ORTB 2.5, bid responses do not specify their mediatype, which is something Prebid.js requires
    context.mediaType = bid.mtype && ORTB_MTYPES[bid.mtype]
      ? ORTB_MTYPES[bid.mtype]
      : bid.ext?.prebid?.type;

    return buildBidResponse(bid, context);
  },
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],

  /**
   * Determines whether the given bid request is valid.
   *
   * @param {Bid} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid(bid) {
    if (!bid?.params?.adUnitId) {
      logError("Missing required parameter 'adUnitId'");
      return false;
    }
    if (!bid?.params?.siteId) {
      logError("Missing required parameter 'siteId'");
      return false;
    }
    return true;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @param {BidderRequest} bidderRequest bidder request object.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests(bidRequests, bidderRequest) {
    const data = converter.toORTB({ bidRequests, bidderRequest });

    return [{ method: 'POST', url: AUCTION_URL, data }];
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param  {BidRequest} bidRequest  The bid request sent to the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse(serverResponse, bidRequest) {
    const { bids } = converter.fromORTB({
      response: serverResponse.body,
      request: bidRequest.data,
    });

    return bids;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @param {*} gdprConsent
   * @param {*} uspConsent
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
    if (syncOptions.iframeEnabled) {
      let syncParams = `?endpoint=${COOKIE_SYNC_ENDPOINT}`;
      if (gdprConsent) {
        syncParams += `&gdpr=${gdprConsent.gdprApplies ? 1 : 0}`;
        syncParams += `&gdpr_consent=${encodeURIComponent(gdprConsent.consentString || '')}`;
      }
      if (uspConsent) {
        syncParams += `&us_privacy=${encodeURIComponent(uspConsent)}`;
      }

      return [{ type: 'iframe', url: IFRAME_SYNC_URL + syncParams }];
    }
    return [];
  },
};

registerBidder(spec);
