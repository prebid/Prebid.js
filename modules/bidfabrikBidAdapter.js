import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { deepSetValue, replaceAuctionPrice, triggerPixel, isStr, isArray, logError } from '../src/utils.js';

const BIDDER_CODE = 'bidfabrik';
const GVLID = 1588; // TODO: confirm this is the GVL ID registered for BidFabrik
const DEFAULT_HOST = 'bid.bidfabrik.com';
const BID_PATH = '/bid';
const DEFAULT_TTL = 300;
const DEFAULT_CURRENCY = 'USD';

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    // The LB meters on the ?feed= query param, but also surface it in the body
    // so backends that read the request can key off it without parsing the URL.
    if (context.feed) {
      deepSetValue(req, 'ext.bidfabrik.feed', context.feed);
    }
    return req;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    // Keep the OpenRTB win-notice URL so we can fire it from onBidWon. The
    // backend points nurl at the LB's /win path, which mirrors to reporting.
    if (bid.nurl) {
      bidResponse.nurl = bid.nurl;
    }
    return bidResponse;
  },
});

function resolveHost(params) {
  const host = params && isStr(params.host) ? params.host.trim() : '';
  return host || DEFAULT_HOST;
}

function appendConsentParams(url, gdprConsent, uspConsent, gppConsent) {
  const params = [];
  if (gdprConsent) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      params.push(`gdpr=${Number(gdprConsent.gdprApplies)}`);
    }
    if (isStr(gdprConsent.consentString)) {
      params.push(`gdpr_consent=${encodeURIComponent(gdprConsent.consentString)}`);
    }
  }
  if (isStr(uspConsent)) {
    params.push(`us_privacy=${encodeURIComponent(uspConsent)}`);
  }
  if (gppConsent) {
    if (isStr(gppConsent.gppString)) {
      params.push(`gpp=${encodeURIComponent(gppConsent.gppString)}`);
    }
    if (isArray(gppConsent.applicableSections) && gppConsent.applicableSections.length > 0) {
      params.push(`gpp_sid=${encodeURIComponent(gppConsent.applicableSections.join(','))}`);
    }
  }
  if (!params.length) return url;
  return url + (url.includes('?') ? '&' : '?') + params.join('&');
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: [
    { code: 'revbid', gvlid: GVLID },
    { code: 'revantage', gvlid: GVLID },
  ],
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid(bid) {
    const feed = bid && bid.params && bid.params.feed;
    if (!isStr(feed) || feed.trim() === '') {
      logError(`${BIDDER_CODE}: missing required param "feed"`);
      return false;
    }
    if (bid.params.host != null && !isStr(bid.params.host)) {
      logError(`${BIDDER_CODE}: optional param "host" must be a string`);
      return false;
    }
    return true;
  },

  buildRequests(bidRequests, bidderRequest) {
    // Group by (host, feed) so each distinct supply feed maps to its own
    // OpenRTB request against the matching /bid?feed=... endpoint. Different
    // ad units in the same auction may carry different feeds. A nested map
    // (host -> feed -> group) avoids building a delimited string key, so an
    // arbitrary host/feed value can never collide across groups.
    const byHost = new Map();
    const groups = [];
    bidRequests.forEach((bid) => {
      const host = resolveHost(bid.params);
      const feed = bid.params.feed.trim();
      let byFeed = byHost.get(host);
      if (!byFeed) {
        byFeed = new Map();
        byHost.set(host, byFeed);
      }
      let g = byFeed.get(feed);
      if (!g) {
        g = { host, feed, bids: [] };
        byFeed.set(feed, g);
        groups.push(g);
      }
      g.bids.push(bid);
    });

    return groups.map((g) => {
      const data = converter.toORTB({
        bidRequests: g.bids,
        bidderRequest,
        context: { feed: g.feed },
      });
      return {
        method: 'POST',
        url: `https://${g.host}${BID_PATH}?feed=${encodeURIComponent(g.feed)}`,
        data,
        options: {
          // Send JSON as text/plain so the request stays a CORS-safelisted
          // "simple" request and the browser skips the OPTIONS preflight; the
          // extra round trip would otherwise eat into the bidder timeout. The
          // LB parses the body by content, not by Content-Type header.
          contentType: 'text/plain',
          // The LB answers CORS with Access-Control-Allow-Origin: * and no
          // Allow-Credentials, so credentialed mode would be blocked by the
          // browser. Keep this false unless the LB starts echoing Origin.
          withCredentials: false,
        },
        bids: g.bids,
      };
    });
  },

  interpretResponse(response, request) {
    if (!response || !response.body) {
      return [];
    }
    return converter.fromORTB({
      response: response.body,
      request: request.data,
    }).bids;
  },

  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];
    if ((!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) || !isArray(serverResponses)) {
      return syncs;
    }
    serverResponses.forEach((resp) => {
      const list = resp && resp.body && resp.body.ext && resp.body.ext.usersync;
      if (!isArray(list)) {
        return;
      }
      list.forEach((entry) => {
        if (!entry || !isStr(entry.url)) {
          return;
        }
        const url = appendConsentParams(entry.url, gdprConsent, uspConsent, gppConsent);
        if (entry.type === 'iframe' && syncOptions.iframeEnabled) {
          syncs.push({ type: 'iframe', url });
        } else if (entry.type === 'image' && syncOptions.pixelEnabled) {
          syncs.push({ type: 'image', url });
        }
      });
    });
    return syncs;
  },

  onBidWon(bid) {
    if (bid && isStr(bid.nurl) && bid.nurl !== '') {
      triggerPixel(replaceAuctionPrice(bid.nurl, bid.originalCpm || bid.cpm));
    }
  },
};

registerBidder(spec);
