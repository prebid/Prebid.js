import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { NATIVE } from '../src/mediaTypes.js';
import { politeTriggerPixel } from '../src/utils.js';

export const ENDPOINT = 'https://api.prnmx.com/api/v1/openrtb/prebid';
const ID_BODY = '[0-7][0-9a-hjkmnp-tv-z]{25}';
const PUBLISHER_ID = new RegExp(`^pub_${ID_BODY}$`);
const PLACEMENT_ID = new RegExp(`^plc_${ID_BODY}$`);
const MAX_IMPRESSIONS = 10;
// Prebid keeps the winning bid object for its render callbacks. Do not retain
// old auctions after Prebid releases them, or notify twice for that object.
// Notices go out as a keepalive fetch with an image fallback. Omitting
// credentials would drop that fallback, and a page whose content security policy
// blocks the fetch would then never bill. We set no cookies on the notice domain,
// so there is nothing for the request to carry.
const notifiedWins = new WeakSet();
const billedBids = new WeakSet();
const viewedBids = new WeakSet();

function noticeUrl(url, price) {
  if (typeof url !== 'string' || !url) return;
  try {
    const parsed = new URL(url.replace(/\$\{AUCTION_PRICE\}/g, encodeURIComponent(price)));
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
  } catch (_error) { /* A missing or invalid notice URL must not prevent rendering. */ }
}

const converter = ortbConverter({
  context: {
    mediaType: NATIVE,
    currency: 'USD',
    // Net: the publisher is paid the price we bid, with nothing deducted. Saying
    // gross invites a wrapper to apply a revenue-share adjustment and shade us
    // down against bidders who report net.
    netRevenue: true,
    ttl: 60,
    nativeRequest: { ver: '1.2', eventtrackers: [{ event: 1, methods: [1] }] }
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if ((imp.bidfloorcur && imp.bidfloorcur !== 'USD') ||
        (imp.bidfloor != null && (!Number.isFinite(imp.bidfloor) || imp.bidfloor < 0))) {
      throw new Error('Shopnomix requires a non-negative USD floor');
    }
    imp.tagid = bidRequest.params.placementId;
    imp.bidfloorcur = 'USD';
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    request.cur = ['USD'];
    // How viewability is measured on this page, so the exchange can tell "not
    // viewable" from "never measured" rather than reading both as zero. A string
    // rather than a flag: a publisher's own check is invisible to us here, and
    // this adapter can't gain a field later without every publisher rebuilding.
    // bidViewabilityIO also calls onBidViewable, but only for banner, so it
    // never sees a native bid. Revisit this line if it gains native support.
    request.ext = {
      ...request.ext,
      shopnomix: { viewability: config.getConfig('bidViewability')?.enabled ? 'module' : 'none' }
    };
    // Only ever a web request. Adding site to an app request would leave both in
    // place, which is invalid ORTB, so leave that for the exchange to reject.
    if (!request.app) {
      // Keep the publisher's own site.publisher fields; only the id is ours.
      request.site = {
        ...request.site,
        publisher: {
          ...request.site?.publisher, id: context.bidRequests[0].params.publisherId
        }
      };
    }
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    if (!Number.isFinite(bid.price) || bid.price <= 0 ||
        !bid.id || !bid.crid || (context.ortbResponse.cur || 'USD') !== 'USD') {
      throw new Error('Invalid Shopnomix bid');
    }

    // The exchange returns the Native 1.2 wrapper. The converter expects its contents.
    const adm = typeof bid.adm === 'string' ? JSON.parse(bid.adm) : bid.adm;
    const native = adm?.native || adm;
    const billingUrl = noticeUrl(bid.burl, bid.price);
    if (!native?.link?.url || !Array.isArray(native.assets) || !native.assets.length ||
        !billingUrl) {
      throw new Error('Incomplete Shopnomix native bid');
    }

    // Billing goes through Prebid's billing API, so a publisher can defer it to
    // their own visibility check. Never place burl among the render trackers:
    // that would bill on render even when the publisher defers billing.
    const trackers = Array.isArray(native.eventtrackers) ? native.eventtrackers : [];
    const eventtrackers = trackers.filter(tracker => tracker.url !== billingUrl && tracker.url !== bid.burl);
    // Trackers belong in the creative, where the filter above can see them. In
    // bid.ext the converter would copy them onto the response, and core would
    // fire them at billing time — a second request for the same impression.
    const { eventtrackers: _ignored, ...ext } = bid.ext || {};

    const response = buildBidResponse({
      ...bid,
      ext,
      adm: { ...native, eventtrackers }
    }, context);
    // The native converter drops nurl. Keep it for onBidWon, using the exchange
    // price before any publisher bid adjustment. Reading a bid sends no notice.
    response.nurl = noticeUrl(bid.nurl, bid.price);
    response.shopnomixBillingUrl = billingUrl;
    // Fired from onBidViewable when the exchange supplies one. Nothing today
    // does, so this stays unset until the exchange starts sending it.
    const viewableUrl = noticeUrl(bid.ext?.vurl, bid.price);
    if (viewableUrl) response.shopnomixViewableUrl = viewableUrl;
    // A publisher who defers billing still renders straight away, so their
    // visibility check has something to measure. Only payment waits.
    response.deferRendering = false;
    delete response.burl;
    return response;
  }
});

function sendBillingNotice(bid) {
  if (!bid?.shopnomixBillingUrl || billedBids.has(bid)) return;
  billedBids.add(bid);
  politeTriggerPixel(billedOn(bid.shopnomixBillingUrl, bid.deferBilling === true));
}

// Says which moment billed this impression: rendering, or the publisher releasing
// deferred billing after their own visibility check.
function billedOn(url, deferred) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('billed_on', deferred ? 'deferred' : 'render');
    return parsed.href;
  } catch (_error) {
    return url;
  }
}

export const spec = {
  code: 'shopnomix',
  supportedMediaTypes: [NATIVE],

  onBidWon(bid) {
    if (!bid?.nurl || notifiedWins.has(bid)) return;
    notifiedWins.add(bid);
    politeTriggerPixel(bid.nurl);
  },

  // Prebid's billing point, and the only one that covers every render flow: the
  // GAM native template asks for assets over postMessage and never reports
  // render success, so billing from onAdRenderSucceeded would miss those
  // publishers entirely. A bid handed over for rendering is billed here; a
  // deferred bid arrives here when the publisher calls pbjs.triggerBilling.
  // The exchange's render tracker is what reconciles bills against renders.
  onBidBillable(bid) {
    sendBillingNotice(bid);
  },

  // Prebid's viewability module reports a bid viewable. Our own helper and a
  // publisher's own check can send the same notice themselves from the bid.
  onBidViewable(bid) {
    if (!bid?.shopnomixViewableUrl || viewedBids.has(bid)) return;
    viewedBids.add(bid);
    politeTriggerPixel(bid.shopnomixViewableUrl);
  },

  isBidRequestValid(bid) {
    const trackers = bid?.mediaTypes?.native?.ortb?.eventtrackers;
    const allowsImpressionPixel = trackers == null || (Array.isArray(trackers) &&
      trackers.some(tracker => tracker?.event === 1 &&
        Array.isArray(tracker.methods) && tracker.methods.includes(1)));
    return Boolean(bid?.mediaTypes?.native && allowsImpressionPixel &&
      typeof bid.params?.publisherId === 'string' && PUBLISHER_ID.test(bid.params.publisherId) &&
      typeof bid.params?.placementId === 'string' && PLACEMENT_ID.test(bid.params.placementId));
  },

  buildRequests(bidRequests, bidderRequest) {
    const publishers = new Map();
    bidRequests.filter(bid => spec.isBidRequestValid(bid)).forEach(bid => {
      const group = publishers.get(bid.params.publisherId) || [];
      group.push(bid);
      publishers.set(bid.params.publisherId, group);
    });
    const requests = [];
    publishers.forEach((bids, publisherId) => {
      for (let start = 0; start < bids.length; start += MAX_IMPRESSIONS) {
        const data = converter.toORTB({
          bidRequests: bids.slice(start, start + MAX_IMPRESSIONS), bidderRequest
        });
        if (data.imp.length) {
          requests.push({
            method: 'POST',
            url: `${ENDPOINT}/${publisherId}`,
            data,
            options: { contentType: 'text/plain', withCredentials: false }
          });
        }
      }
    });
    return requests;
  },

  interpretResponse(serverResponse, request) {
    const body = serverResponse?.body;
    if (!body || body.id !== request?.data?.id || !Array.isArray(body.seatbid)) return [];
    try {
      // Keep the original request object: the converter uses it to match imp IDs.
      return converter.fromORTB({ response: body, request: request.data }).bids;
    } catch (_error) {
      return [];
    }
  }
};

registerBidder(spec);
