import { deepSetValue, generateUUID, logError } from '../src/utils.js';
import { AdapterRequest, BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { getUserSyncs, setUserSyncContext } from '../libraries/sparkUtils/index.js';
import { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import { ORTBImp, ORTBRequest } from '../src/prebid.public.js';

// Spark adapter identifiers and endpoint.
const BIDDER_CODE = 'spark';
const BIDDER_VERSION = '1.0';
const GVLID = 1408;
// const REQUEST_URL = 'https://example.com/openrtb2'; // TODO: remplacer par l'endpoint réel
// const REQUEST_URL = 'https://prebid-server.pbstck.com/openrtb2/auction'; // Cname &/ou path
const REQUEST_URL = 'https://unthreatening-harriet-soughless.ngrok-free.dev/auction'; // Cname &/ou path

// Parameters accepted in the adUnit for this bidder.
type SparkBidParams = {
  siteId: string;
  adUnitName: string;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: SparkBidParams;
  }
}

// ORTB converter: builds imps and the global ORTB request.
const converter = ortbConverter({
  context: {
    // Default values for bid responses.
    netRevenue: true,
    ttl: 60,
  },
  imp(buildImp, bidRequest: BidRequest<typeof BIDDER_CODE>, context) {
    // Build the ORTB imp and add Spark-specific data.
    let imp: ORTBImp = buildImp(bidRequest, context);
    deepSetValue(imp, 'ext.spark', bidRequest.params);
    deepSetValue(imp, 'ext.spark.version', BIDDER_VERSION);
    deepSetValue(imp, 'id', bidRequest.params.adUnitName); // peut etre divId tester avec un uuid généré a chaque auction
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    // Hook to enrich the global request if needed.
    const request: ORTBRequest = buildRequest(imps, bidderRequest, context);
    imps.forEach((imp) => {
      const adUnitName = bidderRequest?.bids?.[0]?.params?.adUnitName;
      if (adUnitName) {
        deepSetValue(imp, 'ext.prebid.bidder.pubstack.adUnitName', adUnitName); // nom connu par le ssp
      }
    });
    const siteId = bidderRequest?.bids?.[0]?.params?.siteId;
    if (siteId) {
      deepSetValue(request, 'site.publisher.id', siteId);
    }
    const gdprConsent = bidderRequest?.gdprConsent;
    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        deepSetValue(request, 'regs.ext.gdpr', gdprConsent.gdprApplies ? 1 : 0);
      }
      if (typeof gdprConsent.consentString === 'string') {
        deepSetValue(request, 'user.ext.consent', gdprConsent.consentString);
      }
    }
    if (bidderRequest?.uspConsent) {
      deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }
    const gppConsent = bidderRequest?.gppConsent;
    if (gppConsent?.gppString) {
      deepSetValue(request, 'regs.ext.gpp', gppConsent.gppString);
      if (Array.isArray(gppConsent.applicableSections)) {
        deepSetValue(request, 'regs.ext.gpp_sid', gppConsent.applicableSections);
      }
    }
    deepSetValue(request, 'ext.prebid', {});
    // Todo add viewport distance 
    return request;
  },
});

// Basic validation of required parameters.
const isBidRequestValid = (bid: BidRequest<typeof BIDDER_CODE>): boolean => {
  if (!bid.params.siteId || typeof bid.params.siteId !== 'string') {
    logError('bid.params.siteId needs to be a string');
    return false;
  }
  if (!bid.params.adUnitName || typeof bid.params.adUnitName !== 'string') {
    logError('bid.params.adUnitName needs to be a string');
    return false;
  }
  return true;
};

// Builds a single ORTB POST request containing all imps.
const buildRequests = (
  bidRequests: BidRequest<typeof BIDDER_CODE>[],
  bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>,
): AdapterRequest => {
  const siteId = bidderRequest?.bids?.[0]?.params?.siteId;
  setUserSyncContext({ siteId });
  const data: ORTBRequest = converter.toORTB({ bidRequests, bidderRequest });
  // TODO: ajouter le call des user syncs dans le request auction (nouveau endpoint auction) pour parser la response dans la buildRequests dans la function getUserSyncs
  
  return {
    method: 'POST',
    url: REQUEST_URL,
    data,
  };
};

// Converts the ORTB response to Prebid bids.
const interpretResponse = (serverResponse, bidRequest) => {
  if (!serverResponse?.body) {
    return [];
  }
  return converter.fromORTB({ request: bidRequest.data, response: serverResponse.body });
};

// Bidder declaration for Prebid.
export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
