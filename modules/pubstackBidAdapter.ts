import { deepSetValue, logError } from '../src/utils.js';
import { AdapterRequest, BidderSpec, registerBidder, ServerResponse } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { getElementForAdUnitCode, getViewportDistance, isPageVisible } from '../libraries/pubstackUtils/index.js';
import { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import { ORTBRequest } from '../src/prebid.public.js';
import { config } from '../src/config.js';
import { SyncType } from '../src/userSync.js';
import { ConsentData, CONSENT_GDPR, CONSENT_USP, CONSENT_GPP } from '../src/consentHandler.js';
import { getGlobal } from '../src/prebidGlobal.js';

const BIDDER_CODE = 'pubstack';
const GVLID = 1408;
const REQUEST_URL = 'https://node.pbstck.com/openrtb2/auction';
const COOKIESYNC_IFRAME_URL = 'https://cdn.pbstck.com/async_usersync.html';
const COOKIESYNC_PIXEL_URL = 'https://cdn.pbstck.com/async_usersync.png';

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: {
      siteId: string;
      adUnitName: string;
    };
  }
}

type GetUserSyncFn = (
  syncOptions: {
    iframeEnabled: boolean;
    pixelEnabled: boolean;
  },
  responses: ServerResponse[],
  gdprConsent: null | ConsentData[typeof CONSENT_GDPR],
  uspConsent: null | ConsentData[typeof CONSENT_USP],
  gppConsent: null | ConsentData[typeof CONSENT_GPP]) => ({ type: SyncType, url: string })[]

const siteIds: Set<string> = new Set();
let cntRequest = 0;
let cntImp = 0;
const uStart = performance.now();

const converter = ortbConverter({
  imp(buildImp, bidRequest: BidRequest<typeof BIDDER_CODE>, context) {
    cntImp++;
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, `ext.prebid.bidder.${BIDDER_CODE}.adUnitName`, bidRequest.params.adUnitName);
    deepSetValue(imp, `ext.prebid.bidder.${BIDDER_CODE}.adUnitCode`, bidRequest.adUnitCode);
    deepSetValue(imp, `ext.prebid.bidder.${BIDDER_CODE}.divId`, getElementForAdUnitCode(bidRequest.adUnitCode)?.id);
    deepSetValue(imp, `ext.prebid.bidder.${BIDDER_CODE}.vpl`, getViewportDistance(bidRequest.adUnitCode));
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    cntRequest++;
    const request = buildRequest(imps, bidderRequest, context)
    const siteId = bidderRequest.bids[0].params.siteId
    siteIds.add(siteId);
    deepSetValue(request, 'site.publisher.id', siteId)
    deepSetValue(request, 'test', config.getConfig('debug') ? 1 : 0)
    deepSetValue(request, 'ext.prebid.version', getGlobal()?.version ?? 'unknown');
    deepSetValue(request, `ext.prebid.cntRequest`, cntRequest);
    deepSetValue(request, `ext.prebid.cntImp`, cntImp);
    deepSetValue(request, `ext.prebid.pVisible`, isPageVisible())
    deepSetValue(request, `ext.prebid.uStart`, Math.trunc((performance.now() - uStart) / 1000))
    return request;
  },
});

const isBidRequestValid = (bid: BidRequest<typeof BIDDER_CODE>): boolean => {
  if (!bid.params.siteId || typeof bid.params.siteId !== 'string') {
    logError('bid.params.siteId needs to be a string');
    if (config.getConfig('debug') === false) return false;
  }
  if (!bid.params.adUnitName || typeof bid.params.adUnitName !== 'string') {
    logError('bid.params.adUnitName needs to be a string');
    if (config.getConfig('debug') === false) return false;
  }
  return true;
};

const buildRequests = (
  bidRequests: BidRequest<typeof BIDDER_CODE>[],
  bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>,
): AdapterRequest => {
  const data: ORTBRequest = converter.toORTB({ bidRequests, bidderRequest });
  const siteId = data.site.publisher.id;
  return {
    method: 'POST',
    url: `${REQUEST_URL}?siteId=${siteId}`,
    data,
  };
};

const interpretResponse = (serverResponse, bidRequest) => {
  if (!serverResponse?.body) {
    return [];
  }
  return converter.fromORTB({ request: bidRequest.data, response: serverResponse.body });
};

const getUserSyncs: GetUserSyncFn = (syncOptions, _serverResponses, gdprConsent, uspConsent, gppConsent) => {
  const isIframeEnabled = syncOptions.iframeEnabled;
  const isPixelEnabled = syncOptions.pixelEnabled;

  if (!isIframeEnabled && !isPixelEnabled) {
    return [];
  }

  const payload = btoa(JSON.stringify({
    gdprConsentString: gdprConsent?.consentString,
    gdprApplies: gdprConsent?.gdprApplies,
    uspConsent,
    gpp: gppConsent?.gppString,
    gpp_sid: gppConsent?.applicableSections

  }));
  const syncUrl = isIframeEnabled ? COOKIESYNC_IFRAME_URL : COOKIESYNC_PIXEL_URL;

  return Array.from(siteIds).map(siteId => ({
    type: isIframeEnabled ? 'iframe' : 'image',
    url: `${syncUrl}?consent=${payload}&siteId=${siteId}`,
  }));
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  aliases: [{code: `${BIDDER_CODE}_server`, gvlid: GVLID}],
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
