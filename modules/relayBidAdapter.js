import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';
import { BANNER, VIDEO, NATIVE } from 'src/mediaTypes.js';
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
  return utils.isNumber((bid.params || {}).accountId);
};

function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  let syncs = []
  for (const response of serverResponses) {
    const response_syncs = ((((response || {}).body || {}).ext || {}).user_syncs || [])
    // Relay returns user_syncs in the format expected by prebid. If for any
    // reason the request/response failed to properly capture the GDPR settings
    // -- fallback to those identified by Prebid.
    for (const sync of response_syncs) {
      const sync_url = new URL(sync.url);
      const missing_gdpr = !sync_url.searchParams.has('gdpr');
      const missing_gdpr_consent = !sync_url.searchParams.has('gdpr_consent');
      if (missing_gdpr) {
        sync_url.searchParams.set('gdpr', Number(gdprConsent.gdprApplies))
        sync.url = sync_url.toString();
      }
      if (missing_gdpr_consent) {
        sync_url.searchParams.set('gdpr_consent', gdprConsent.consentString);
        sync.url = sync_url.toString();
      }
      if (syncOptions.iframeEnabled && sync.type === 'iframe') { syncs.push(sync); }
      if (syncOptions.pixelEnabled && sync.type === 'image') { syncs.push(sync); }
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
    utils.logMessage('Timeout: ', timeoutData);
  },
  onBidWon: function (bid) {
    utils.logMessage('Bid won: ', bid);
  },
  onBidderError: function ({ error, bidderRequest }) {
    utils.logMessage('Error: ', error, bidderRequest);
  },
  supportedMediaTypes: [BANNER, VIDEO, NATIVE]
}
registerBidder(spec);
