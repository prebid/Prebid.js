import * as utils from "../src/utils.js";
import { detectWalletsPresence} from "../libraries/cryptoUtils/wallets.js";
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { BANNER, NATIVE } from "../src/mediaTypes.js";
import { config } from "../src/config.js";

const BIDDER_CODE = "sevio";
const GVLID = `1393`;
const ENDPOINT_URL = "https://req.adx.ws/prebid";
const ACTION_METHOD = "POST";

const detectJsonLdKeywords = () => {
  const scriptTags = document.querySelectorAll(
    'script[type="application/ld+json"]'
  );
  let keywords = [];

  for (let i = 0; i < scriptTags.length; i++) {
    const scriptTag = scriptTags[i];

    try {
      const jsonData = JSON.parse(scriptTag.textContent);
      const jsonObjects = Array.isArray(jsonData) ? jsonData : [jsonData];

      for (let j = 0; j < jsonObjects.length; j++) {
        const jsonObject = jsonObjects[j];

        if (
          jsonObject.keywords &&
          typeof jsonObject.keywords === 'string'
        ) {
          keywords.push(
            ...jsonObject.keywords
              .split(',')
              .map((keyword) => keyword.trim())
              .filter((keyword) => keyword.length > 0)
          );
        }
      }
    } catch (error) {
      // console.error('Error parsing JSON-LD:', error);
    }
  }

  return keywords;
};

const detectHeaderKeywords = () => {
  const metaTags = document.getElementsByTagName('meta');
  for (let i = 0; i < metaTags.length; i++) {
    const metaTag = metaTags[i];
    if (metaTag.getAttribute('name') === 'keywords') {
      const keywords = metaTag.getAttribute('content');
      return keywords
        ? keywords.split(',').map((keyword) => keyword.trim())
        : [];
    }
  }

  return [];
};

const detectTitleAndH1AndUrl = () => {
  const MAX_KEYWORDS = 12;
  const MIN_WORD_LEN = 2;

  try {
    const title = (document.querySelector('title')?.textContent || '').trim();
    const h1 = Array.from(document.querySelectorAll('h1'))
      .map(el => (el.textContent || '').trim())
      .filter(Boolean)
      .join(' ');
    const { hostname, pathname } = window.location;

    // URL normalization
    const path = decodeURIComponent(pathname || '');
    const urlWithSpaces = path.replace(/[-_]+/g, ' ');
    const urlNoBreak = path.replace(/[-_]/g, '');
    const hostWords = (hostname || '').replace(/\./g, ' ');

    const raw = [title, h1, urlWithSpaces, urlNoBreak, hostWords].join(' ');

    // ---- tiny RAKE-like candidate generation & scoring ----
    const STOP = new Set([
      'a', 'an', 'and', 'the', 'of', 'in', 'on', 'for', 'to', 'from', 'by', 'with', 'as', 'at', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'or', 'if', 'then', 'else', 'than', 'that', 'this', 'those', 'these', 'it', 'its', 'into',
      'about', 'over', 'under', 'between', 'within', 'without', 'across', 'up', 'down', 'out', 'off', 'per', 'via',
      'you', 'your', 'we', 'our', 'they', 'their', 'i', 'me', 'my', 'he', 'she', 'his', 'her', 'them', 'us', 'can', 'could',
      'should', 'would', 'may', 'might', 'will', 'just', 'not', 'no', 'yes', 'how', 'what', 'when', 'where', 'why', 'which'
    ]);

    const norm = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const tokens = norm(raw).split(' ');

    // Split into candidate phrases on stopwords; cap phrase length to 3
    const phrasesTok = [];
    let cur = [];
    for (const t of tokens) {
      if (!t || STOP.has(t)) {
        if (cur.length) { phrasesTok.push(cur.slice(0, 3)); cur = []; }
      } else {
        cur.push(t);
      }
    }
    if (cur.length) phrasesTok.push(cur.slice(0, 3));

    const phraseStrs = phrasesTok
      .filter(p => p.length && !p.every(tok => /^\d+$/.test(tok)))
      .map(p => p.join(' '));

    // Word stats: frequency & degree (RAKE-like)
    const freq = Object.create(null);
    const deg = Object.create(null);
    for (const p of phraseStrs) {
      const ws = p.split(' ');
      const d = ws.length - 1;
      for (const w of ws) { freq[w] = (freq[w] || 0) + 1; deg[w] = (deg[w] || 0) + d; }
    }
    for (const w in freq) deg[w] += freq[w];

    // Phrase scores
    const scores = new Map();
    for (const p of phraseStrs) {
      let s = 0; for (const w of p.split(' ')) s += (deg[w] || 0) / (freq[w] || 1);
      scores.set(p, s);
    }

    // Rank phrases, then explode to words (implicit behavior)
    const rankedPhrases = [...scores.entries()]
      .sort((a, b) => b[1] - a[1] || b[0].split(' ').length - a[0].split(' ').length)
      .map(([p]) => p);

    const seen = new Set();
    const out = [];
    for (const ph of rankedPhrases) {
      for (const w of ph.split(' ')) {
        if (w.length >= MIN_WORD_LEN && !STOP.has(w) && !seen.has(w)) {
          seen.add(w);
          out.push(w);
          if (out.length >= MAX_KEYWORDS) break;
        }
      }
      if (out.length >= MAX_KEYWORDS) break;
    }

    return out; // resulted keywords array
  } catch {
    return [];
  }
};

const detectKeywords = () => {
  let keywords = [];

  const jsonKeywords = detectJsonLdKeywords();
  if (jsonKeywords && jsonKeywords.length) {
    keywords.push(...jsonKeywords);
    return keywords;
  }

  const headerKeywords = detectHeaderKeywords();
  if (headerKeywords && headerKeywords.length) {
    keywords.push(...headerKeywords);
    return keywords;
  }

  const titleH1UrlKeywords = detectTitleAndH1AndUrl();
  if (titleH1UrlKeywords) {
    keywords.push(...titleH1UrlKeywords);
    return keywords;
  }

  return keywords;
}

const detectAdType = (bid) =>
  (
    ["native", "banner"].find((t) => bid.mediaTypes?.[t]) || "unknown"
  ).toUpperCase();

const parseNativeAd = function (bid) {
  try {
    const nativeAd = JSON.parse(bid.ad);
    const native = {};

    nativeAd.assets?.forEach(asset => {
      if (asset.title?.text) {
        native.title = asset.title.text;
      }
      if (asset.data) {
        const value = asset.data.value;
        switch (asset.data.type) {
          case 1: if (value) native.sponsoredBy = value; break;
          case 2: if (value) native.body = value; break;
          case 3: if (value) native.rating = value; break;
          case 4: if (value) native.likes = value; break;
          case 5: if (value) native.downloads = value; break;
          case 6: if (value) native.price = value; break;
          case 7: if (value) native.salePrice = value; break;
          case 8: if (value) native.phone = value; break;
          case 9: if (value) native.address = value; break;
          case 10: if (value) native.body2 = value; break;
          case 11: if (value) native.displayUrl = value; break;
          case 12: if (value) native.cta = value; break;
          default: break;
        }
      }
      if (asset.img) {
        const { url, w = 0, h = 0, type } = asset.img;

        if (type === 1 && url) {
          native.icon = url;
          native.icon_width = w;
          native.icon_height = h;
        } else if (type === 3 && url) {
          native.image = url;
          native.image_width = w;
          native.image_height = h;
        }
      }
    });

    if (nativeAd.link?.url) {
      native.clickUrl = nativeAd.link.url;
    }

    const eventTrackers = nativeAd.eventtrackers || [];

    const impressionTrackers = eventTrackers
      .filter(tracker => tracker.event === 1)
      .map(tracker => tracker.url)
      .filter(Boolean);

    const viewableTrackers = eventTrackers
      .filter(tracker => tracker.event === 2)
      .map(tracker => tracker.url)
      .filter(Boolean);

    if (impressionTrackers.length) {
      native.impressionTrackers = impressionTrackers;
    }

    if (viewableTrackers.length) {
      native.viewableTrackers = viewableTrackers; // custom field
    }

    if (Array.isArray(nativeAd.link?.clicktrackers) && nativeAd.link.clicktrackers.length > 0) {
      native.clickTrackers = nativeAd.link.clicktrackers;
    }

    if (nativeAd.privacy?.url) native.privacyLink = nativeAd.privacy.url;
    if (nativeAd.privacy?.icon) native.privacyIcon = nativeAd.privacy.icon;

    return native;
  } catch (e) {
    utils.logWarn('Invalid native JSON', e);
    return null;
  }
}
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  isBidRequestValid: function (bid) {
    if (!bid) {
      utils.logWarn(BIDDER_CODE, "Invalid bid", bid);

      return false;
    }

    if (!bid.params) {
      utils.logWarn(BIDDER_CODE, "bid.params is required");

      return false;
    }

    if (!bid.params.zone) {
      utils.logWarn(BIDDER_CODE, "bid.params.zone is required");

      return false;
    }

    return true;
  },

  buildRequests: function (bidRequests, bidderRequest) {
    const userSyncEnabled = config.getConfig("userSync.syncEnabled");

    if (bidRequests.length === 0) {
      return [];
    }
    const gdpr = bidderRequest.gdprConsent;
    const usp = bidderRequest.uspConsent;
    const gpp = bidderRequest.gppConsent;
    const hasWallet = detectWalletsPresence();

    return bidRequests.map((bidRequest) => {
      const isNative = detectAdType(bidRequest)?.toLowerCase() === 'native';
      const size = bidRequest.mediaTypes?.banner?.sizes[0] || bidRequest.mediaTypes?.native?.sizes[0] || [];
      const width = size[0];
      const height = size[1];
      const originalAssets = bidRequest.mediaTypes?.native?.ortb?.assets || [];
      // convert icon to img type 1
      const processedAssets = originalAssets.map(asset => {
        if (asset.icon) {
          return {
            id: asset.id,
            required: asset.required || 0,
            img: {
              type: 1,
              w: asset.icon.w,
              h: asset.icon.h,
            }
          };
        }
        return asset;
      });
      const providedKeywords = bidRequest.params?.keywords;
      const detectedKeywords = detectKeywords();
      const keywords = {
        tokens: (Array.isArray(providedKeywords) && providedKeywords.length > 0)
          ? providedKeywords
          : (Array.isArray(detectedKeywords) && detectedKeywords.length > 0 ? detectedKeywords : [])
      };
      const payload = {
        userLanguage: navigator.language,
        pageUrl: bidRequest?.refererInfo?.page,
        pageDomain: bidRequest?.refererInfo?.referer,
        userId: bidRequest.userId,
        eids: (bidRequest.userIdAsEids || []).map(eid => ({
          source: eid.source,
          id: eid.uids?.[0]?.id
        })).filter(eid => eid.source && eid.id),
        ads: [
          {
            maxSize: {
              width: width,
              height: height,
            },
            referenceId: bidRequest.params.referenceId,
            tagId: bidRequest.params.zone,
            type: detectAdType(bidRequest),
            ...(isNative && { nativeRequest: { ver: "1.2", assets: processedAssets || {}} })
          },
        ],
        keywords,
        privacy: {
          gpp: gpp?.consentString || "",
          tcfeu: gdpr?.consentString || "",
          usp: usp?.uspString || "",
        },
        xPageUrl: window.location.href,
        wdb: hasWallet,
        externalRef: bidRequest.bidId,
        userSyncOption: userSyncEnabled === false ? "OFF" : "BIDDERS",
      };

      const wrapperOn =
        typeof window !== "undefined" && window.sevio_wrapper === true;

      const url = wrapperOn
        ? `${ENDPOINT_URL}?wrapper=true`
        : ENDPOINT_URL;
      return {
        method: ACTION_METHOD,
        url,
        data: payload,
        bidRequest: bidRequests[0],
      };
    });
  },

  interpretResponse(serverResponse) {
    if (
      !serverResponse ||
      typeof serverResponse !== "object" ||
      !serverResponse.body ||
      typeof serverResponse.body !== "object" ||
      !Array.isArray(serverResponse.body.bids)
    ) {
      return [];
    }

    const bids = serverResponse.body.bids;

    bids.forEach((bid) => {
      if (bid && typeof bid === "object") {
        bid.bidder = BIDDER_CODE;
        if ((bid.mediaType || '').toLowerCase() === 'native') {
          const native = parseNativeAd(bid);
          if (native) {
            bid.native = native;
          }
        }
      }
    });

    return bids;
  },
  onBidWon: function (bid) {},
  onBidderError: function (bidderError) {},
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];

    if (syncOptions.pixelEnabled && serverResponses.length > 0) {
      serverResponses.forEach((response) => {
        if (response.body && response.body.userSyncs) {
          response.body.userSyncs.forEach((sync) => {
            if (sync.type === "image" && sync.url) {
              syncs.push({
                type: "image",
                url: sync.url,
              });
            } else if (sync.type === "iframe" && syncOptions.iframeEnabled) {
              syncs.push({
                type: "iframe",
                url: sync.url,
              });
            }
          });
        }
      });
    }

    return syncs;
  },
  onTimeout: function (timeoutData) {},
  supportedMediaTypes: [BANNER, NATIVE],
};

registerBidder(spec);
