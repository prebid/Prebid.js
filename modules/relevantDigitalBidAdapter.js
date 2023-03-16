import {registerBidder} from '../src/adapters/bidderFactory.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import * as events from '../src/events.js'
import CONSTANTS from '../src/constants.json';
import {config} from '../src/config.js';
import {pbsExtensions} from '../libraries/pbsExtensions/pbsExtensions.js'
import {deepSetValue, isEmpty, deepClone, shuffle, triggerPixel, deepAccess} from '../src/utils.js';

const BIDDER_CODE = 'relevantdigital';

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300
  },
  processors: pbsExtensions,
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const { adUnitCode } = bidRequest.params;
    deepSetValue(imp, 'ext.prebid.storedrequest.id', adUnitCode);
    delete imp.ext.prebid.bidder;
    return imp;
  },
});

const configByBidder = {};

const FIELDS = [
  { name: 'pbsHost', checkParams: true, required: true },
  { name: 'accountId', checkParams: true, required: true },
  { name: 'pbsBufferMs', checkParams: false, required: false, default: 250 },
];

const SYNC_HTML = 'https://cdn.relevant-digital.com/resources/load-cookie.html';
const MAX_SYNC_COUNT = 10;

const getBidderConfig = (bids) => {
  const { bidder } = bids[0];
  const cfg = configByBidder[bidder] || {
    ...Object.fromEntries(FIELDS.filter((f) => 'default' in f).map((f) => [f.name, f.default])),
    syncedBidders: {},
  };
  if (cfg.complete) {
    return cfg;
  }
  configByBidder[bidder] = cfg;
  const bidderConfiguration = config.getConfig(bidder) || {};
  FIELDS.forEach(({ name, checkParams }) => {
    cfg[name] = bidderConfiguration[name] || cfg[name];
    if (!cfg[name] && checkParams) {
      bids.forEach((bid) => {
        cfg[name] = cfg[name] || bid.params?.[name];
      });
    }
  });
  cfg.complete = FIELDS.every((field) => !field.required || cfg[field.name]);
  if (cfg.complete) {
    cfg.pbsHost = cfg.pbsHost.trim().replace('http://', 'https://');
    if (cfg.pbsHost.indexOf('https://') < 0) {
      cfg.pbsHost = `https://${cfg.pbsHost}`;
    }
  }
  return cfg;
}

events.on(CONSTANTS.EVENTS.BID_WON, (bid) => {
  const { pbsWurl, bidder } = bid;
  if (pbsWurl && configByBidder[bidder]) {
    triggerPixel(pbsWurl);
  }
});

export const spec = {
  // ... rest of your spec goes here ...
  code: BIDDER_CODE,
  gvlid: 1100,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: (bid) => bid.params?.adUnitCode && getBidderConfig([bid]).complete,
  buildRequests(bidRequests, bidderRequest) {
    const { bidder } = bidRequests[0];
    const cfg = getBidderConfig(bidRequests);
    const data = converter.toORTB({bidRequests, bidderRequest});

    const pbjsTimeout = bidderRequest.timeout || 1000;
    data.tmax = Math.min(Math.max(pbjsTimeout - cfg.pbsBufferMs, cfg.pbsBufferMs), pbjsTimeout);
    delete data.ext?.prebid?.aliases;
    deepSetValue(data, 'ext.relevant', {
      ...data.ext?.relevant,
      adapter: true,
    });
    deepSetValue(data, 'ext.prebid.storedrequest.id', cfg.accountId);
    data.ext.prebid.passthrough = {
      ...data.ext.prebid.passthrough,
      relevant: { bidder },
    };
    return [{
      method: 'POST',
      url: `${cfg.pbsHost}/openrtb2/auction`,
      data
    }];
  },
  interpretResponse(response, request) {
    const resp = deepClone(response.body);
    const { bidder } = request.data.ext.prebid.passthrough.relevant;
    const editBid = (bid) => { // Modify bidder-codes in bid to the bidder code for this bidder
      const { prebid = {} } = bid.ext || {};
      const { meta, targeting } = prebid;
      if (meta?.adaptercode) {
        meta.adaptercode = bidder;
      }
      if (targeting?.hb_bidder) {
        targeting.hb_bidder = bidder;
      }
      return bid;
    };
    // Create a single seat for this bidder - that holds the bids for all seats returned
    if (Array.isArray(resp.seatbid)) {
      resp.seatbid = [{
        seat: bidder,
        bid: [].concat(...resp.seatbid.map(({ bid }) => (bid || []).map(editBid))),
      }];
    }
    // Modify response times for actual PBS bidders into a single value that should be the response-time for this bidder
    const { responsetimemillis } = resp.ext || {};
    if (!isEmpty(responsetimemillis)) {
      resp.ext.responsetimemillis = {
        [bidder]: Math.max(...Object.values(responsetimemillis)),
      };
    }
    const bids = converter.fromORTB({response: resp, request: request.data}).bids;
    return bids;
  },
  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return [];
    }
    const syncs = [];
    serverResponses.forEach(({ body }) => {
      const { pbsHost, syncedBidders } = configByBidder[body.ext.prebid.passthrough.relevant.bidder] || {};
      if (!pbsHost) {
        return;
      }
      const { gdprApplies, consentString } = gdprConsent || {};
      let bidders = Object.keys(body.ext?.responsetimemillis || {});
      bidders = bidders.reduce((acc, curr) => {
        if (!syncedBidders[curr]) {
          acc.push(curr);
          syncedBidders[curr] = true;
        }
        return acc;
      }, []);
      bidders = shuffle(bidders).slice(0, MAX_SYNC_COUNT);
      if (!bidders.length) {
        return;
      }
      if (syncOptions.iframeEnabled) {
        const params = {
          endpoint: `${pbsHost}/cookie_sync`,
          max_sync_count: bidders.length,
          gdpr: typeof gdprApplies === 'boolean' ? Number(gdprApplies) : null,
          gdpr_consent: consentString,
          us_privacy: uspConsent,
          bidders: bidders.join(','),
        };
        const qs = Object.entries(params)
          .filter(([k, v]) => ![null, undefined, ''].includes(v))
          .map(([k, v]) => `${k}=${encodeURIComponent(v.toString())}`)
          .join('&');
        syncs.push({ type: 'iframe', url: `${SYNC_HTML}?${qs}` });
      } else { // Else, try to pixel-sync (for future-compatibility)
        const pixels = deepAccess(body, `ext.relevant.sync`, []).filter(({ type }) => type === 'redirect');
        syncs.push(...pixels.map(({ url }) => ({ type: 'image', url })));
      }
    });
    return syncs;
  },
};

registerBidder(spec);
