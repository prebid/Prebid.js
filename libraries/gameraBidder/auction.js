import { interpretGameraResponse, normalizePrebidVideo } from "./response.js";

export const GAMERA_ENDPOINT = "https://bidder.rapidedge.io";
export const GAMERA_GVL_ID = 1447;
const id = (value) => typeof value === "string" && value.length > 0 && value.length <= 128;
const object = (value) => value && typeof value === "object" && !Array.isArray(value);
const enabledMode = (value) => value === "all" || value === "custom";

export function publisherHostname(value) {
  if (typeof value !== "string" || value !== value.trim() || value.length > 253) {
    return;
  }
  const host = value.toLowerCase();
  if (
    !host.includes(".") ||
        !host.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  ) {
    return;
  }
  return host;
}

export function hasAuctionConsent(consent) {
  return (
    consent?.gdprApplies === false ||
        (consent?.gdprApplies === true &&
            typeof consent.consentString === "string" &&
            consent.consentString.trim().length > 0 &&
            consent.vendorData?.vendor?.consents?.[GAMERA_GVL_ID] === true)
  );
}

// Clone only auction ad-unit definitions; never mutate publisher-owned bids arrays.
// Used by a supported Prebid requestBids hook, not by replacing requestBids itself.
export function enrollGameraUnits(adUnits, mode) {
  if (mode !== "all" || !Array.isArray(adUnits)) {
    return adUnits;
  }
  return adUnits.map((unit) => {
    if (!object(unit)) {
      return unit;
    }
    const bids = Array.isArray(unit.bids) ? unit.bids : [];
    if (bids.some((bid) => bid?.bidder === "gamera")) {
      return unit;
    }
    return { ...unit, bids: [...bids, { bidder: "gamera", params: {} }] };
  });
}

function normalizedMedia(bid) {
  const sizes = bid.mediaTypes?.banner?.sizes;
  const banner =
        Array.isArray(sizes) &&
        sizes.length > 0 &&
        sizes.length <= 16 &&
        sizes.every(
          (size) =>
            Array.isArray(size) &&
                size.length === 2 &&
                size.every((n) => Number.isInteger(n) && n > 0 && n <= 8192)
        );
  const video = normalizePrebidVideo(bid.mediaTypes?.video);
  if (banner) {
    return { banner: { sizes: sizes.map((size) => [...size]) } };
  }
  if (video) {
    return { video };
  }
}

function safeContext(value, now) {
  if (
    !object(value) ||
        value.schema_version !== 1 ||
        !Number.isFinite(value.observed_at_ms) ||
        value.observed_at_ms > now + 1000 ||
        now - value.observed_at_ms > 30000
  ) {
    return;
  }
  const result = {};
  if (id(value.gamera_placement_id)) {
    result.gamera_placement_id = value.gamera_placement_id;
  }
  const context = value.context;
  if (
    object(context) &&
        typeof context.visible === "boolean" &&
        [context.engagement, context.scroll_depth].every(
          (n) => Number.isFinite(n) && n >= 0 && n <= 1
        )
  ) {
    result.context = {
      visible: context.visible,
      engagement: context.engagement,
      scroll_depth: context.scroll_depth
    };
  }
  const placement = value.placement_context;
  if (
    object(placement) &&
        ["renders", "clicks", "viewable_ms", "snapshot_age_ms"].every(
          (key) => Number.isInteger(placement[key]) && placement[key] >= 0
        ) &&
        placement.renders <= 65535 &&
        placement.clicks <= 65535 &&
        placement.viewable_ms <= 86400000 &&
        placement.snapshot_age_ms <= 30000 &&
        placement.observation_kind === "tracker_derived"
  ) {
    result.placement_context = {
      renders: placement.renders,
      clicks: placement.clicks,
      viewable_ms: placement.viewable_ms,
      snapshot_age_ms: placement.snapshot_age_ms,
      observation_kind: "tracker_derived"
    };
  }
  const prior = value.prior_context;
  if (
    object(prior) &&
        typeof prior.page_path === "string" &&
        prior.page_path.startsWith("/") &&
        !prior.page_path.startsWith("//") &&
        prior.page_path.length <= 2048 &&
        // eslint-disable-next-line no-control-regex -- Reject control characters in untrusted page paths.
        !/[?#\\\x00-\x20\x7f]/.test(prior.page_path) &&
        ["desktop", "mobile", "tablet", "tv"].includes(prior.device_type)
  ) {
    result.prior_context = { page_path: prior.page_path, device_type: prior.device_type };
  }
  return Object.keys(result).length ? result : undefined;
}

function pageHostname(request) {
  try {
    return publisherHostname(new URL(request?.refererInfo?.page).hostname);
  } catch {

  }
}

/** Stable, data-only interface. The adapter works without a tracker or downloaded SDK. */
export function createAuctionSpec({
  bundled = false,
  getConfig = () => undefined,
  getContext = () => undefined,
  getPublisherHostname = () => undefined,
  onConsent = () => {},
  onSession = () => {},
  logError = () => {},
  endpoint = GAMERA_ENDPOINT,
  clock = Date.now
} = {}) {
  // Production wrappers never expose endpoint as a publisher setting.
  const origin = new URL(endpoint);
  if (
    origin.protocol !== "https:" &&
        !(
          origin.protocol === "http:" &&
            ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
        )
  ) {
    throw new Error("Unsafe Gamera endpoint");
  }
  let account;
  let selectedSetting;
  let locked = false;
  let generation = 0;
  let consentKey;
  let session;
  let lastMode;
  const requestGenerations = new Map();
  function invalidate() {
    generation++;
    session = undefined;
    consentKey = undefined;
  }
  function notify(callback, ...args) {
    try {
      Promise.resolve(callback(...args)).catch(() =>
        logError("Optional Gamera telemetry callback failed.")
      );
    } catch {
      logError("Optional Gamera telemetry callback failed.");
    }
  }
  function syncConfig() {
    const mode = bundled ? "custom" : getConfig("gameraEnabled");
    if (mode !== lastMode) {
      if (!enabledMode(mode) || !enabledMode(lastMode)) {
        invalidate();
      }
      lastMode = mode;
    }
    if (locked && getConfig("gameraPublisher") !== selectedSetting) {
      logError(
        "Gamera publisher account is locked for this pageview; later changes are ignored."
      );
    }
    return enabledMode(mode);
  }
  function selectAccount(request) {
    if (locked) {
      return account;
    }
    const explicit = getConfig("gameraPublisher");
    const hostname =
            explicit !== undefined
              ? publisherHostname(explicit)
              : publisherHostname(getPublisherHostname(request)) || pageHostname(request);
    selectedSetting = explicit;
    account = hostname;
    locked = true;
    if (!account) {
      logError(
        "Gamera requires a valid publisher hostname; no account fallback was applied."
      );
    }
    return account;
  }
  const spec = {
    code: "gamera",
    gvlid: GAMERA_GVL_ID,
    supportedMediaTypes: ["banner", "video"],
    // Enrollment is deliberately broader than media eligibility. Unsupported formats no-bid in buildRequests.
    isBidRequestValid(bid) {
      return syncConfig() && id(bid?.bidId) && id(bid?.adUnitCode);
    },
    buildRequests(bids, request) {
      if (!syncConfig()) {
        return [];
      }
      const consent = request?.gdprConsent;
      if (!hasAuctionConsent(consent)) {
        invalidate();
        notify(onConsent, consent, account);
        return [];
      }
      if (!selectAccount(request)) {
        return [];
      }
      const key = JSON.stringify([consent.gdprApplies, consent.consentString]);
      if (consentKey !== key) {
        invalidate();
        consentKey = key;
      }
      notify(onConsent, consent, account);
      const normalized = [];
      const seen = new Set();
      const priors = new Map();
      for (const bid of (Array.isArray(bids) ? bids : []).slice(0, 32)) {
        if (!id(bid?.bidId) || !id(bid?.adUnitCode) || seen.has(bid.bidId)) {
          continue;
        }
        seen.add(bid.bidId);
        const media = normalizedMedia(bid);
        if (!media) {
          continue;
        }
        const rtd = bid.ortb2Imp?.ext?.data;
        let direct;
        try {
          direct = safeContext(getContext(bid, request), clock());
        } catch {
          /* Optional context never blocks ordinary bidding. */
        }
        const rtdContext = safeContext(rtd?.gameraBidder, clock());
        const context = direct || rtdContext || {};
        const contextSource = direct
          ? "tracker"
          : rtdContext || id(rtd?.gameraPlacementId)
            ? "rtd"
            : "prebid";
        if (context.prior_context) {
          priors.set(JSON.stringify(context.prior_context), context.prior_context);
        }
        const placement =
                    context.gamera_placement_id ||
                    (id(rtd?.gameraPlacementId)
                      ? rtd.gameraPlacementId
                      : `prebid:${bid.adUnitCode}`);
        if (!id(placement)) {
          continue;
        }
        normalized.push({
          bid_id: bid.bidId,
          ...(bid.params?.test === true ? { test: true } : {}),
          ad_unit_code: bid.adUnitCode,
          ...(id(bid.transactionId) ? { transaction_id: bid.transactionId } : {}),
          gamera_placement_id: placement,
          media_types: media,
          context_source: contextSource,
          ...(context.context ? { context: context.context } : {}),
          ...(context.placement_context
            ? { placement_context: context.placement_context }
            : {})
        });
      }
      if (!normalized.length || !id(request?.bidderRequestId)) {
        return [];
      }
      const body = {
        publisher_hostname: account,
        ...(priors.size === 1 ? { prior_context: [...priors.values()][0] } : {}),
        bidder_request_id: request.bidderRequestId,
        ...(id(request.auctionId) ? { auction_id: request.auctionId } : {}),
        timeout_ms: Math.max(1, Math.min(10000, Math.round(request.timeout || 1000))),
        gdpr_applies: consent.gdprApplies,
        ...(consent.gdprApplies
          ? { consent_string: consent.consentString, vendor_consent: true }
          : {}),
        ...(session
          ? { session_id: session.session_id, session_token: session.token }
          : {}),
        bids: normalized
      };
      if (requestGenerations.size >= 256) {
        requestGenerations.delete(requestGenerations.keys().next().value);
      }
      requestGenerations.set(request.bidderRequestId, generation);
      return {
        method: "POST",
        url: origin.origin + "/v1/prebid/auction",
        data: JSON.stringify(body),
        options: { contentType: "text/plain", withCredentials: false },
        gameraGeneration: generation,
        gameraPublisher: account,
        gameraAuction: request.auctionId,
        gameraConsent: consent
      };
    },
    interpretResponse(response, request) {
      if (
        !syncConfig() ||
                request.gameraGeneration !== generation ||
                request.gameraPublisher !== account
      ) {
        return [];
      }
      let sent;
      try {
        sent = JSON.parse(request.data);
      } catch {
        return [];
      }
      if (
        response?.body?.bidder_request_id !== sent.bidder_request_id ||
                !Array.isArray(response?.body?.bids)
      ) {
        return [];
      }
      const received = response?.body?.session;
      if (
        received &&
                id(received.session_id) &&
                typeof received.token === "string" &&
                received.token.length <= 4096
      ) {
        // Two initial auctions may race before either returns a session. Keep one
        // telemetry identity; bids belonging to the other session are not rendered.
        if (session && session.session_id !== received.session_id) {
          return [];
        }
        session = { ...received };
        notify(onSession, session, account, request.gameraConsent, request);
      }
      return interpretGameraResponse(response, request);
    },
    onBidderError({ error, bidderRequest } = {}) {
      const requestId = bidderRequest?.bidderRequestId;
      if (
        [401, 403].includes(error?.status) &&
                requestGenerations.get(requestId) === generation
      ) {
        invalidate();
        notify(onConsent, undefined, account);
      }
      requestGenerations.delete(requestId);
    },
    getUserSyncs() {
      return [];
    },
    gameraV1: {
      invalidate,
      syncConfig,
      getState: () => ({
        publisher: account,
        locked,
        generation,
        session: session?.session_id
      })
    }
  };
  return spec;
}
