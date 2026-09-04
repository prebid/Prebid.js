import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { AUDIO, BANNER, VIDEO } from '../src/mediaTypes.js';
import { deepAccess, deepSetValue, logWarn } from '../src/utils.js';

/**
 * Adferry bid adapter.
 *
 * Thin on purpose. The endpoint already speaks OpenRTB 2.6 and already returns
 * everything Prebid needs on the bid object - price, currency, adm, crid,
 * w/h, mtype - so the shape translation is delegated to Prebid's own
 * ortbConverter and the only code here is what is Adferry-specific: the
 * placementId -> imp.tagid join, mirroring consent into the oRTB 2.6 core
 * regs fields the endpoint binds, and the one-request-per-placement fan-out.
 * Any logic that looks like it belongs here almost certainly belongs on the
 * server, where it is tested and where it applies to every integration
 * rather than only to Prebid.js.
 *
 * Submitted to prebid/Prebid.js. Until it is merged, publishers cannot write
 * `bidder: 'adferry'` at all, which is the whole reason this file exists.
 */

const BIDDER_CODE = 'adferry';
const ENDPOINT = 'https://rtb.adferry.co/api/ortb/prebid';
const DEFAULT_TTL = 300;
const DEFAULT_CURRENCY = 'USD';

// US-only on purpose: no gvlid and no TCF handling. If Adferry ever serves
// EU traffic this needs an IAB Europe registration first, not a code patch.

type AdferryBidParams = {
  placementId: string;
  bidFloor?: number;
  currency?: string;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: AdferryBidParams;
  }
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
  },

  imp(buildImp: any, bidRequest: any, context: any) {
    const imp = buildImp(bidRequest, context);
    // The join to the portal. Everything else in the imp is standard oRTB the
    // converter assembles from mediaTypes - video params come from
    // AdUnit.mediaTypes.video per the module rules, never from bidder params.
    imp.tagid = String(bidRequest.params.placementId);
    // The floors module wins when installed; the param is only the fallback.
    if (imp.bidfloor == null && bidRequest.params.bidFloor != null) {
      imp.bidfloor = bidRequest.params.bidFloor;
      imp.bidfloorcur = bidRequest.params.currency || DEFAULT_CURRENCY;
    }
    return imp;
  },

  request(buildRequest: any, imps: any, bidderRequest: any, context: any) {
    const request = buildRequest(imps, bidderRequest, context);

    // Privacy signals travel or the server cannot make a lawful decision.
    // Passing them is not optional politeness: without them the request is
    // treated as having no consent at all, which is the correct default and
    // also the one that fills worst. The converter already merges ortb2
    // (covering consent modules that write there, including regs.coppa);
    // this mirrors the bidderRequest consent objects into the oRTB 2.6 core
    // fields the endpoint binds, without clobbering anything a module set.
    const usp = deepAccess(bidderRequest, 'uspConsent');
    if (usp && !deepAccess(request, 'regs.us_privacy')) {
      deepSetValue(request, 'regs.us_privacy', usp);
    }
    const gpp = deepAccess(bidderRequest, 'gppConsent.gppString');
    if (gpp && !deepAccess(request, 'regs.gpp')) {
      deepSetValue(request, 'regs.gpp', gpp);
      deepSetValue(request, 'regs.gpp_sid',
        deepAccess(bidderRequest, 'gppConsent.applicableSections') || []);
    }

    // schain: Prebid hands it through ortb2.source.ext.schain (the 2.5-era
    // location, already merged into the request above); very old setups pin
    // it per-bid. The endpoint binds the oRTB 2.6 core location,
    // source.schain, so mirror it there.
    const schain = deepAccess(request, 'source.ext.schain') ||
      deepAccess(context, 'bidRequests.0.ortb2.source.ext.schain') ||
      deepAccess(context, 'bidRequests.0.schain');
    if (schain && !deepAccess(request, 'source.schain')) {
      deepSetValue(request, 'source.schain', schain);
    }

    if (!request.cur) {
      request.cur = [DEFAULT_CURRENCY];
    }
    return request;
  },

  bidResponse(buildBidResponse: any, bid: any, context: any) {
    // oRTB 2.6 mtype says what the markup is (1 banner, 2 video, 3 audio);
    // older responses say it through the markup itself. Prebid's core
    // converter maps 1/2/4 only - audio (3) is absent from its table - so
    // that one has to be named here or buildBidResponse throws
    // "Cannot determine mediaType".
    if (bid.mtype === 3) {
      context.mediaType = AUDIO;
    } else if (bid.mtype == null) {
      context.mediaType = /<VAST/i.test(bid.adm || '') ? VIDEO : BANNER;
    }
    const bidResponse = buildBidResponse(bid, context);
    // Required on every bid response - Prebid reviews for it and publisher
    // brand-safety tooling blocks on it.
    bidResponse.meta = Object.assign({}, bidResponse.meta, {
      advertiserDomains: bid.adomain || [],
    });
    return bidResponse;
  },
});

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, AUDIO],

  /**
   * A placementId is the tag id issued in the portal. The server resolves it
   * from imp[].tagid, so the name a publisher types here has to survive
   * unchanged all the way to that field.
   */
  isBidRequestValid(bid: any): boolean {
    const placementId = deepAccess(bid, 'params.placementId');
    if (!placementId) {
      logWarn(`${BIDDER_CODE}: params.placementId is required.`);
      return false;
    }
    if (!deepAccess(bid, 'mediaTypes.video') &&
        !deepAccess(bid, 'mediaTypes.banner') &&
        !deepAccess(bid, 'mediaTypes.audio')) {
      logWarn(`${BIDDER_CODE}: video, banner or audio mediaTypes are required.`);
      return false;
    }
    return true;
  },

  /**
   * One HTTP call per placement rather than one per bidder.
   *
   * The server enforces a concurrency limit PER TAG, so collapsing several
   * placements into a single call would put them behind one another in the
   * same queue. Separate requests keep each placement in its own lane, which
   * is how the limit was designed to be used.
   */
  buildRequests(validBidRequests: any[], bidderRequest: any) {
    return validBidRequests.map((bid: any) => ({
      method: 'POST',
      url: ENDPOINT,
      // contentType is application/json on purpose, even though it makes the
      // POST a non-simple CORS request that triggers a preflight: the endpoint
      // is declared `[Consumes("application/json")]` and answers text/plain
      // with 415. The preflight is answered at the edge and cached for 24h
      // (Access-Control-Max-Age), so it costs one OPTIONS per origin per day,
      // not one per auction. withCredentials is false - no cookies, no sync.
      data: converter.toORTB({ bidRequests: [bid], bidderRequest }),
      options: { contentType: 'application/json', withCredentials: false },
    }));
  },

  interpretResponse(serverResponse: any, request: any) {
    // A no-bid is the common case (204 / empty seatbid), not an error.
    // Returning [] keeps one empty answer from taking down the whole auction.
    const body = serverResponse && serverResponse.body;
    if (!body || !body.seatbid || !body.seatbid.length) {
      return [];
    }
    const result = converter.fromORTB({ response: body, request: request.data });
    return (result as { bids: any[] }).bids;
  },

  // No getUserSyncs on purpose: there is no sync endpoint to register, and the
  // demand path is server-side and CTV-first, where cookie syncing buys
  // nothing. If a sync endpoint ever exists it registers here and nowhere
  // else - the module rules forbid pixels outside this hook.
};

registerBidder(spec);
