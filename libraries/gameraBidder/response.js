// Resident tracker owns canonical inventory; Prebid owns HTTP dispatch and player delivery.
const escapeAttribute = (value) =>
  value.replace(
    /[&"<>]/g,
    (char) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[char]
  );
const size = (s) =>
  Array.isArray(s) && s.length === 2 && s.every((n) => Number.isInteger(n) && n > 0 && n <= 8192);
export function normalizePrebidVideo(v) {
  if (!v || v.context !== "instream" || v.linearity !== 1) {
    return;
  }
  const player =
        Array.isArray(v.playerSize?.[0]) && v.playerSize.length === 1
          ? v.playerSize[0]
          : v.playerSize;
  if (
    !size(player) ||
        !Number.isInteger(v.maxduration) ||
        v.maxduration < 1 ||
        v.maxduration > 300 ||
        !Number.isInteger(v.minduration ?? 0) ||
        (v.minduration ?? 0) < 0 ||
        (v.minduration ?? 0) > v.maxduration
  ) {
    return;
  }
  if (
    !Array.isArray(v.mimes) ||
        !v.mimes.length ||
        v.mimes.length > 16 ||
        !v.mimes.includes("video/mp4") ||
        new Set(v.mimes).size !== v.mimes.length ||
        v.mimes.some((m) => typeof m !== "string" || !m || m.length > 128)
  ) {
    return;
  }
  if (
    !Array.isArray(v.protocols) ||
        !v.protocols.length ||
        v.protocols.length > 16 ||
        !v.protocols.includes(13) ||
        new Set(v.protocols).size !== v.protocols.length ||
        v.protocols.some((p) => !Number.isInteger(p) || p < 1 || p > 16)
  ) {
    return;
  }
  return {
    context: "instream",
    player_size: [...player],
    mimes: [...v.mimes],
    protocols: [...v.protocols],
    minduration: v.minduration ?? 0,
    maxduration: v.maxduration,
    linearity: 1
  };
}
export function interpretGameraResponse(response, request) {
  let sent;
  try {
    sent = JSON.parse(request.data);
  } catch {
    return [];
  }
  const body = response.body;
  if (
    !body ||
        body.bidder_request_id !== sent.bidder_request_id ||
        !Array.isArray(body.bids) ||
        body.bids.length > 32
  ) {
    return [];
  }
  const byID = new Map(sent.bids.map((b) => [b.bid_id, b]));
  const seen = new Set();
  const out = [];
  for (const b of body.bids) {
    const original = byID.get(b.bid_id);
    if (!original || seen.has(b.bid_id)) {
      continue;
    }
    seen.add(b.bid_id);
    if (
      !size([b.width, b.height]) ||
            !Number.isSafeInteger(b.cpm_micros) ||
            b.cpm_micros <= 0 ||
            b.currency !== "USD" ||
            b.net_revenue !== false ||
            !Number.isInteger(b.ttl) ||
            b.ttl < 1 ||
            b.ttl > 30 ||
            typeof b.creative_id !== "string" ||
            !b.creative_id ||
            !Array.isArray(b.advertiser_domains) ||
            !b.advertiser_domains.length ||
            b.advertiser_domains.length > 8 ||
            b.advertiser_domains.some((d) => typeof d !== "string" || !d || d.length > 253)
    ) {
      continue;
    }
    const video = b.media_type === "video";
    const requestedVideo = original.media_types?.video;
    if (video) {
      if (
        !requestedVideo ||
                b.protocol !== 13 ||
                !Number.isInteger(b.duration_seconds) ||
                b.duration_seconds < requestedVideo.minduration ||
                b.duration_seconds > requestedVideo.maxduration ||
                !requestedVideo.protocols.includes(13)
      ) {
        continue;
      }
    } else if (
      (b.media_type && b.media_type !== "banner") ||
            !original.media_types?.banner?.sizes?.some((s) => s[0] === b.width && s[1] === b.height)
    ) {
      continue;
    }
    const target = video ? b.vast_url : b.ad_url;
    if (typeof target !== "string") {
      continue;
    }
    try {
      const u = new URL(target);
      if (
        u.origin !== new URL(request.url).origin ||
                u.username ||
                u.password ||
                !u.pathname.startsWith("/v1/prebid/") ||
                (video && u.pathname !== "/v1/prebid/vast")
      ) {
        continue;
      }
    } catch {
      continue;
    }
    const result = {
      requestId: b.bid_id,
      cpm: b.cpm_micros / 1e6,
      currency: "USD",
      netRevenue: false,
      width: b.width,
      height: b.height,
      creativeId: b.creative_id,
      ttl: b.ttl,
      mediaType: video ? "video" : "banner",
      meta: { advertiserDomains: b.advertiser_domains }
    };
    if (video) {
      result.vastUrl = target;
      result.video = { context: "instream", durationSeconds: b.duration_seconds };
    } else {
      result.ad = `<iframe src="${escapeAttribute(target)}" width="${b.width}" height="${b.height}" frameborder="0" scrolling="no" marginwidth="0" marginheight="0" style="border:0;display:block" title="Advertisement"></iframe>`;
    }
    out.push(result);
  }
  return out;
}
