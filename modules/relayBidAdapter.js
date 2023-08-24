import { isNumber, logMessage } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js'

const BIDDER_CODE = 'relay';
const METHOD = 'POST';
const ENDPOINT_URL = 'https://e.relay.bid/p/openrtb2';

// The default impl from the prebid docs.
const CONVERTER =
  ortbConverter({
    context: {
      netRevenue: true,
      ttl: 30
    }
  });

function buildRequests(bidRequests, bidderRequest) {
  const prebidVersion = config.getConfig('prebid_version') || 'v8.1.0';
  // Group bids by accountId param
  const groupedByAccountId = bidRequests.reduce((accu, item) => {
    const accountId = ((item || {}).params || {}).accountId;
    if (!accu[accountId]) { accu[accountId] = []; };
    accu[accountId].push(item);
    return accu;
  }, {});
  // Send one overall request with all grouped bids per accountId
  let reqs = [];
  for (const [accountId, accountBidRequests] of Object.entries(groupedByAccountId)) {
    const url = `${ENDPOINT_URL}?a=${accountId}&pb=1&pbv=${prebidVersion}`;
    const data = CONVERTER.toORTB({ bidRequests: accountBidRequests, bidderRequest })
    const req = {
      method: METHOD,
      url,
      data
    };
    reqs.push(req);
  }
  return reqs;
};

function interpretResponse(response, request) {
  return CONVERTER.fromORTB({ response: response.body, request: request.data }).bids;
};

function isBidRequestValid(bid) {
  return isNumber((bid.params || {}).accountId);
};

function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  let syncs = []
  for (const response of serverResponses) {
    const responseSyncs = ((((response || {}).body || {}).ext || {}).user_syncs || [])
    // Relay returns user_syncs in the format expected by prebid. If for any
    // reason the request/response failed to properly capture the GDPR settings
    // -- fallback to those identified by Prebid.
    for (const sync of responseSyncs) {
      const syncUrl = new URL(sync.url);
      const missingGdpr = !syncUrl.searchParams.has('gdpr');
      const missingGdprConsent = !syncUrl.searchParams.has('gdpr_consent');
      if (missingGdpr) {
        syncUrl.searchParams.set('gdpr', Number(gdprConsent.gdprApplies))
        sync.url = syncUrl.toString();
      }
      if (missingGdprConsent) {
        syncUrl.searchParams.set('gdpr_consent', gdprConsent.consentString);
        sync.url = syncUrl.toString();
      }
      if (syncOptions.iframeEnabled && sync.type === 'iframe') {
        syncs.push(sync);
      } else if (syncOptions.pixelEnabled && sync.type === 'image') {
        syncs.push(sync);
      }
    }
  }

  return syncs;
}

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onTimeout: function (timeoutData) {
    logMessage('Timeout: ', timeoutData);
  },
  onBidWon: function (bid) {
    logMessage('Bid won: ', bid);
  },
  onBidderError: function ({ error, bidderRequest }) {
    logMessage('Error: ', error, bidderRequest);
  },
  supportedMediaTypes: [BANNER, VIDEO, NATIVE]
}
registerBidder(spec);
