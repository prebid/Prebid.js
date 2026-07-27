import { logInfo } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';

const analyticsType = 'bundle';
const MODULE_NAME = 'eightpod';
const MODULE = `${MODULE_NAME}AnalyticProvider`;

const tealiumnTrackTypes = {
  pod_impression: 'view',
  thumbstopper_view: 'view',
  thumbstopper_click: 'link',
  carousel_view: 'view',
  carousel_swipe: 'link',
  change_view: 'link',
  pod_enter: 'link',
  seconds_stay: 'link',
  story_view: 'view',
  pod_exit: 'link',
  see_more_stories_click: 'link',
  story_card_navigation_click: 'link',
  scroll_tracking: 'link',
  video_start: 'link',
  video_pause: 'link',
  video_play: 'link',
  video_progress: 'link',
  video_complete: 'link'
};

const eventsWithIabs = ['carousel_swipe', 'thumbstopper_click', 'pod_exit', 'story_view', 'see_more_stories_click', 'story_card_navigation_click', 'scroll_tracking'];

const {
  BID_WON
} = EVENTS;

let context = {};
const adFrameRegistry = new Map();
/**
 * Create eightPod Analytic adapter
 */
let eightPodAnalytics = Object.assign(adapter({ analyticsType }), {
  /**
   * Execute on bid won - setup basic settings, save context about EightPod's bid. We will send it with our events later
   */
  track({ eventType, args }) {
    switch (eventType) {
      case BID_WON:
        if (args.bidder === 'eightpod') {
          context[args.adUnitCode] = makeContext(args);
          registerAdFrames(args.adUnitCode);
          setTimeout(() => registerAdFrames(args.adUnitCode), 0);
          break;
        }
    }
  },

  /**
   * Subscribe on internal ad unit tracking events
   */
  eventSubscribe() {
    if (this._messageHandler) {
      window.removeEventListener('message', this._messageHandler);
    }
    this._messageHandler = async (event) => {
      const data = event.data;

      if (!data?.detail) {
        return;
      }

      const adFrame = resolveAdFrameFromEvent(event);
      if (!adFrame) {
        return;
      }

      const { adUnitCode, frameElement } = adFrame;
      const currentAdUnitContext = eightPodAnalytics.getContext()[adUnitCode];

      // send tealium events
      if (data?.detail?.name && tealiumnTrackTypes[data?.detail?.name?.trim()]) {
        let eventData = {
          tealium_event: data?.detail.name,
          ...data?.detail,
          ...data?.detail?.payload,
          rights_holder_id: currentAdUnitContext?.ext?.dataLayerLogistic?.organisationId ?? "",
          rights_holder_name: currentAdUnitContext?.ext?.dataLayerLogistic?.organisationName ?? "",
          sponsor_id: currentAdUnitContext?.ext?.dataLayerLogistic?.accountId ?? "",
          sponsor_name: currentAdUnitContext?.ext?.dataLayerLogistic?.accountName ?? "",
          variant_id: currentAdUnitContext?.ext?.variantId ?? "",
          publisher_id: currentAdUnitContext?.ext?.publisherId ?? "",
          publisher_name: currentAdUnitContext?.ext?.dataLayerLogistic?.publisherName ?? "",
          publisher_iab_category_list_name: currentAdUnitContext?.ext?.dataLayerLogistic?.publisherIabCategoryNames ?? [],
          publisher_iab_category_list_id: (currentAdUnitContext?.ext?.dataLayerLogistic?.publisherIabCategoryIds ?? []).map(String),
          publisher_iab_sub_category_list_name: currentAdUnitContext?.ext?.dataLayerLogistic?.publisherIabSubCategoryNames ?? [],
          publisher_iab_sub_category_list_id: (currentAdUnitContext?.ext?.dataLayerLogistic?.publisherIabSubCategoryIds ?? []).map(String),
          publisher_user_id: currentAdUnitContext?.ext?.dataLayerLogistic?.userId ?? "",
          user_email: getSafeUserIdentifier(currentAdUnitContext),
          user_age: currentAdUnitContext?.ext?.dataLayerLogistic?.userAge ? currentAdUnitContext.ext.dataLayerLogistic.userAge.toString() : "",
          user_gender: currentAdUnitContext?.ext?.dataLayerLogistic?.userGender ?? "",
          user_city: currentAdUnitContext?.ext?.dataLayerLogistic?.userCity ?? "",
          user_state: currentAdUnitContext?.ext?.dataLayerLogistic?.userState ?? "",
          user_country: currentAdUnitContext?.ext?.dataLayerLogistic?.userCountry ?? "",
          pod_id: currentAdUnitContext?.ext?.dataLayerLogistic?.podId ?? "",
          pod_title: currentAdUnitContext?.ext?.dataLayerLogistic?.podName ?? "",
          pod_language_code: currentAdUnitContext?.ext?.podLanguageCodes ?? [],
          pod_country_code: currentAdUnitContext?.ext?.dataLayerLogistic?.podCountryCode ?? "",
          campaign_id: currentAdUnitContext?.campaignId ?? "",
          placement_id: currentAdUnitContext?.placementId ?? "",
          bid_id: currentAdUnitContext?.bidId ?? ""
        };
        const isWithIab = eventsWithIabs.includes(data?.detail?.name);
        if (isWithIab) {
          const storyInfo = currentAdUnitContext?.ext?.dataLayerLogistic?.slideInfos?.find(slide => slide.storyId === data?.detail?.storyId);
          eventData = {
            ...eventData,
            Iab_category_name: storyInfo?.categoryNames,
            Iab_category_id: storyInfo?.categoryIds
          };
        }
        try {
          const trackType = tealiumnTrackTypes[data?.detail?.name?.trim()];
          frameElement?.contentWindow?.utag?.[trackType]?.(eventData);
        } catch (e) {
          // cross-origin frame access can throw SecurityError
        }
      }
    };

    window.addEventListener('message', this._messageHandler);
  },
  getContext() {
    return context;
  },
  resetContext() {
    context = {};
    resetAdFrameRegistry();
  },
});

/**
 * Create context of event, who emits it
 */
function makeContext(args) {
  const params = args?.params;
  return {
    bidId: args?.seatBidId,
    variantId: args?.creativeId || '',
    campaignId: args?.cid || '',
    publisherId: params?.publisherId,
    placementId: params?.placementId,
    crid: params?.crid,
    ext: args?.ext,
    advertiserDomains: args?.meta?.advertiserDomains || [],
  };
}

function getSafeUserIdentifier(adUnitContext) {
  const eids = adUnitContext?.ext?.eids;
  if (!Array.isArray(eids)) {
    return "";
  }

  for (const eid of eids) {
    const uid = eid?.uids?.find(uid => uid?.id);
    if (uid) {
      return uid.id;
    }
  }

  return "";
}

function getAllowedOrigins(adUnitCode) {
  const origins = new Set([window.location.origin]);
  const adUnitContext = eightPodAnalytics.getContext()[adUnitCode];

  (adUnitContext?.advertiserDomains || []).forEach((domain) => {
    try {
      const url = domain.startsWith('http') ? domain : `https://${domain}`;
      origins.add(new URL(url).origin);
    } catch (e) {
      // ignore invalid advertiser domains
    }
  });

  return origins;
}

export function registerAdFrames(adUnitCode) {
  if (!adUnitCode || !eightPodAnalytics.getContext()[adUnitCode]) {
    return;
  }

  const container = document.getElementById(adUnitCode);
  if (!container) {
    return;
  }

  const allowedOrigins = getAllowedOrigins(adUnitCode);
  for (const [contentWindow, frame] of adFrameRegistry.entries()) {
    if (frame.adUnitCode === adUnitCode) {
      adFrameRegistry.delete(contentWindow);
    }
  }
  container.querySelectorAll('iframe').forEach((frameElement) => {
    const contentWindow = frameElement.contentWindow;
    if (contentWindow) {
      adFrameRegistry.set(contentWindow, { adUnitCode, frameElement, allowedOrigins });
    }
  });
}

function isAllowedOrigin(origin, frame) {
  return !!origin && frame.allowedOrigins.has(origin);
}

function resolveAdFrameFromEvent(event) {
  const registered = adFrameRegistry.get(event.source);
  if (registered) {
    return isAllowedOrigin(event.origin, registered) ? registered : null;
  }

  let frameElement;
  try {
    frameElement = event.source?.frameElement;
  } catch (e) {
    return null;
  }

  if (!frameElement) {
    return null;
  }

  const adUnitCode = frameElement.parentElement?.id;
  if (!adUnitCode || !eightPodAnalytics.getContext()[adUnitCode]) {
    return null;
  }

  const frame = {
    adUnitCode,
    frameElement,
    allowedOrigins: getAllowedOrigins(adUnitCode),
  };

  if (!isAllowedOrigin(event.origin, frame)) {
    return null;
  }

  adFrameRegistry.set(event.source, frame);
  return frame;
}

export function resetAdFrameRegistry() {
  adFrameRegistry.clear();
}

// save the base class function
eightPodAnalytics.originEnableAnalytics = eightPodAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
// Subscribe on events from adUnit
eightPodAnalytics.enableAnalytics = function (config) {
  eightPodAnalytics.originEnableAnalytics(config);
  logInfo(MODULE, 'init', config);
  eightPodAnalytics.eventSubscribe();
};

// override disableAnalytics to release the message listener
eightPodAnalytics.disableAnalytics = ((orig) => {
  return function () {
    if (eightPodAnalytics._messageHandler) {
      window.removeEventListener('message', eightPodAnalytics._messageHandler);
      eightPodAnalytics._messageHandler = null;
    }
    resetAdFrameRegistry();
    return orig.apply(this, arguments);
  };
})(eightPodAnalytics.disableAnalytics);

/**
 * Register Analytics Adapter
 */
adapterManager.registerAnalyticsAdapter({
  adapter: eightPodAnalytics,
  code: MODULE_NAME
});

export default eightPodAnalytics;
