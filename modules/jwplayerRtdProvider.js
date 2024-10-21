/**
 * This module adds the jwplayer provider to the Real Time Data module (rtdModule)
 * The {@link module:modules/realTimeData} module is required
 * The module will allow Ad Bidders to obtain JW Player's Video Ad Targeting information
 * The module will fetch segments for the media ids present in the prebid config when the module loads. If any bid
 * requests are made while the segments are being fetched, they will be blocked until all requests complete, or the
 * timeout expires.
 * @module modules/jwplayerRtdProvider
 * @requires module:modules/realTimeData
 */

import {submodule} from '../src/hook.js';
import {config} from '../src/config.js';
import {ajaxBuilder} from '../src/ajax.js';
import {deepAccess, logError} from '../src/utils.js';
import {find} from '../src/polyfill.js';
import {getGlobal} from '../src/prebidGlobal.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 * @typedef {import('../modules/rtdModule/index.js').adUnit} adUnit
 */

const SUBMODULE_NAME = 'jwplayer';
const JWPLAYER_DOMAIN = SUBMODULE_NAME + '.com';
const ENRICH_ALWAYS = 'always';
const ENRICH_WHEN_EMPTY = 'whenEmpty';
const ENRICH_NEVER = 'never';
const overrideValidationRegex = /^(always|never|whenEmpty)$/;
const playlistItemCache = {};
const pendingRequests = {};
let activeRequestCount = 0;
let resumeBidRequest;
// defaults to 'always' for backwards compatibility
// TODO: Prebid 9 - replace with ENRICH_WHEN_EMPTY
let overrideContentId = ENRICH_ALWAYS;
let overrideContentUrl = ENRICH_WHEN_EMPTY;
let overrideContentTitle = ENRICH_WHEN_EMPTY;
let overrideContentDescription = ENRICH_WHEN_EMPTY;

/** @type {RtdSubmodule} */
export const jwplayerSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: SUBMODULE_NAME,
  /**
   * add targeting data to bids and signal completion to realTimeData module
   * @function
   * @param {object} bidReqConfig
   * @param {function} onDone
   */
  getBidRequestData: enrichBidRequest,
  init
};

config.getConfig('realTimeData', ({realTimeData}) => {
  const providers = realTimeData.dataProviders;
  const jwplayerProvider = providers && find(providers, pr => pr.name && pr.name.toLowerCase() === SUBMODULE_NAME);
  const params = jwplayerProvider && jwplayerProvider.params;
  if (!params) {
    return;
  }
  fetchTargetingInformation(params);
  setOverrides(params);
});

submodule('realTimeData', jwplayerSubmodule);

function init(provider, userConsent) {
  return true;
}

export function fetchTargetingInformation(jwTargeting) {
  const mediaIDs = jwTargeting.mediaIDs;
  if (!mediaIDs) {
    return;
  }
  mediaIDs.forEach(mediaID => {
    fetchTargetingForMediaId(mediaID);
  });
}

export function setOverrides(params) {
  // For backwards compatibility, default to always unless overridden by Publisher.
  // TODO: Prebid 9 - replace with ENRICH_WHEN_EMPTY
  overrideContentId = sanitizeOverrideParam(params.overrideContentId, ENRICH_ALWAYS);
  overrideContentUrl = sanitizeOverrideParam(params.overrideContentUrl, ENRICH_WHEN_EMPTY);
  overrideContentTitle = sanitizeOverrideParam(params.overrideContentTitle, ENRICH_WHEN_EMPTY);
  overrideContentDescription = sanitizeOverrideParam(params.overrideContentDescription, ENRICH_WHEN_EMPTY);
}

function sanitizeOverrideParam(overrideParam, defaultValue) {
  if (overrideValidationRegex.test(overrideParam)) {
    return overrideParam;
  }

  return defaultValue;
}

export function fetchTargetingForMediaId(mediaId) {
  const ajax = ajaxBuilder();
  // TODO: Avoid checking undefined vs null by setting a callback to pendingRequests.
  pendingRequests[mediaId] = null;
  ajax(`https://cdn.${JWPLAYER_DOMAIN}/v2/media/${mediaId}`, {
    success: function (response) {
      const item = parsePlaylistItem(response);
      cachePlaylistItem(item, mediaId);
      onRequestCompleted(mediaId, !!item);
    },
    error: function () {
      logError('failed to retrieve targeting information');
      onRequestCompleted(mediaId, false);
    }
  });
}

function parsePlaylistItem(response) {
  let item;
  try {
    const data = JSON.parse(response);
    if (!data) {
      throw ('Empty response');
    }

    const playlist = data.playlist;
    if (!playlist || !playlist.length) {
      throw ('Empty playlist');
    }

    item = playlist[0];
  } catch (err) {
    logError(err);
  }
  return item;
}

function cachePlaylistItem(playlistItem, mediaId) {
  if (playlistItem && mediaId) {
    playlistItemCache[mediaId] = playlistItem;
  }
}

function onRequestCompleted(mediaID, success) {
  const callback = pendingRequests[mediaID];
  if (callback) {
    callback(success ? getVatFromCache(mediaID) : { mediaID });
    activeRequestCount--;
  }
  delete pendingRequests[mediaID];

  if (activeRequestCount > 0) {
    return;
  }

  if (resumeBidRequest) {
    resumeBidRequest();
    resumeBidRequest = null;
  }
}

function enrichBidRequest(bidReqConfig, onDone) {
  activeRequestCount = 0;
  const adUnits = bidReqConfig.adUnits || getGlobal().adUnits;
  enrichAdUnits(adUnits, bidReqConfig.ortb2Fragments);
  if (activeRequestCount <= 0) {
    onDone();
  } else {
    resumeBidRequest = onDone;
  }
}

/**
 * get targeting data and write to bids
 * @function
 * @param {adUnit[]} adUnits
 * @param ortb2Fragments
 */
export function enrichAdUnits(adUnits, ortb2Fragments = {}) {
  const fpdFallback = deepAccess(ortb2Fragments.global, 'site.ext.data.jwTargeting');
  adUnits.forEach(adUnit => {
    const jwTargeting = extractPublisherParams(adUnit, fpdFallback);
    if (!jwTargeting || !Object.keys(jwTargeting).length) {
      return;
    }

    const onVatResponse = function (vat) {
      if (!vat) {
        return;
      }
      const mediaId = vat.mediaID;
      const contentId = getContentId(mediaId);
      const contentSegments = getContentSegments(vat.segments);
      const contentData = getContentData(mediaId, contentSegments);
      const targeting = formatTargetingResponse(vat);
      enrichBids(adUnit.bids, targeting, contentId, contentData);
      addOrtbSiteContent(ortb2Fragments.global, contentId, contentData, vat.title, vat.description, vat.mediaUrl);
    };
    loadVat(jwTargeting, onVatResponse);
  });
}

function supportsInstreamVideo(mediaTypes) {
  const video = mediaTypes && mediaTypes.video;
  return video && video.context === 'instream';
}

export function extractPublisherParams(adUnit, fallback) {
  let adUnitTargeting;
  try {
    adUnitTargeting = adUnit.ortb2Imp.ext.data.jwTargeting;
  } catch (e) {}

  if (!adUnitTargeting && !supportsInstreamVideo(adUnit.mediaTypes)) {
    return;
  }

  return Object.assign({}, fallback, adUnitTargeting);
}

function loadVat(params, onCompletion) {
  let { playerID, playerDivId, mediaID } = params;
  if (!playerDivId) {
    playerDivId = playerID;
  }

  if (pendingRequests[mediaID] !== undefined) {
    loadVatForPendingRequest(playerDivId, mediaID, onCompletion);
    return;
  }

  const vat = getVatFromCache(mediaID) || getVatFromPlayer(playerDivId, mediaID) || { mediaID };
  onCompletion(vat);
}

function loadVatForPendingRequest(playerDivId, mediaID, callback) {
  const vat = getVatFromPlayer(playerDivId, mediaID);
  if (vat) {
    callback(vat);
  } else {
    activeRequestCount++;
    pendingRequests[mediaID] = callback;
  }
}

export function getVatFromCache(mediaID) {
  const item = playlistItemCache[mediaID];

  if (!item) {
    return null;
  }

  const mediaUrl = item.file ?? getFileFromSources(item);

  return {
    segments: item.jwpseg,
    title: item.title,
    description: item.description,
    mediaUrl,
    mediaID
  };
}

function getFileFromSources(playlistItem) {
  return playlistItem.sources?.find?.(source => !!source.file)?.file;
}

export function getVatFromPlayer(playerDivId, mediaID) {
  const player = getPlayer(playerDivId);
  if (!player) {
    return null;
  }

  const item = mediaID ? find(player.getPlaylist(), item => item.mediaid === mediaID) : player.getPlaylistItem();
  if (!item) {
    return null;
  }

  mediaID = mediaID || item.mediaid;
  const title = item.title;
  const description = item.description;
  const mediaUrl = item.file;
  const segments = item.jwpseg;
  cachePlaylistItem(item, mediaID)

  return {
    segments,
    mediaID,
    title,
    mediaUrl,
    description
  };
}

/*
  deprecated
 */
export function formatTargetingResponse(vat) {
  const { segments, mediaID } = vat;
  const targeting = {};
  if (segments && segments.length) {
    targeting.segments = segments;
  }

  if (mediaID) {
    targeting.content = {
      id: getContentId(mediaID)
    }
  }
  return targeting;
}

export function getContentId(mediaID) {
  if (!mediaID) {
    return;
  }

  return 'jw_' + mediaID;
}

export function getContentSegments(segments) {
  if (!segments || !segments.length) {
    return;
  }

  const formattedSegments = segments.reduce((convertedSegments, rawSegment) => {
    convertedSegments.push({
      id: rawSegment
    });
    return convertedSegments;
  }, []);

  return formattedSegments;
}

export function getContentData(mediaId, segments) {
  if (!mediaId && !segments) {
    return;
  }

  const contentData = {
    name: JWPLAYER_DOMAIN,
    ext: {}
  };

  if (mediaId) {
    contentData.ext.cids = [mediaId];
  }

  if (segments) {
    contentData.segment = segments;
    contentData.ext.segtax = 502;
  }

  return contentData;
}

export function addOrtbSiteContent(ortb2, contentId, contentData, contentTitle, contentDescription, contentUrl) {
  if (ortb2 == null) {
    ortb2 = {};
  }

  let site = ortb2.site = ortb2.site || {};
  let content = site.content = site.content || {};

  if (shouldOverride(content.id, contentId, overrideContentId)) {
    content.id = contentId;
  }

  if (shouldOverride(content.url, contentUrl, overrideContentUrl)) {
    content.url = contentUrl;
  }

  if (shouldOverride(content.title, contentTitle, overrideContentTitle)) {
    content.title = contentTitle;
  }

  if (shouldOverride(content.ext && content.ext.description, contentDescription, overrideContentDescription)) {
    content.ext = content.ext || {};
    content.ext.description = contentDescription;
  }

  const currentData = content.data || [];
  // remove old jwplayer data
  const data = currentData.filter(datum => datum.name !== JWPLAYER_DOMAIN);

  if (contentData) {
    data.push(contentData);
  }

  if (data.length) {
    content.data = data;
  }

  return ortb2;
}

function shouldOverride(currentValue, newValue, configValue) {
  switch (configValue) {
    case ENRICH_ALWAYS:
      return !!newValue;
    case ENRICH_NEVER:
      return false;
    case ENRICH_WHEN_EMPTY:
      return !!newValue && currentValue === undefined;
    default:
      return false;
  }
}

function enrichBids(bids, targeting, contentId, contentData) {
  if (!bids) {
    return;
  }

  bids.forEach(bid => {
    addTargetingToBid(bid, targeting);
  });
}

/*
  deprecated
 */
export function addTargetingToBid(bid, targeting) {
  if (!targeting) {
    return;
  }

  const rtd = bid.rtd || {};
  const jwRtd = {};
  jwRtd[SUBMODULE_NAME] = Object.assign({}, rtd[SUBMODULE_NAME], { targeting });
  bid.rtd = Object.assign({}, rtd, jwRtd);
}

function getPlayer(playerDivId) {
  const jwplayer = window.jwplayer;
  if (!jwplayer) {
    logError(SUBMODULE_NAME + '.js was not found on page');
    return;
  }

  const player = jwplayer(playerDivId);
  if (!player || !player.getPlaylist) {
    logError('player ID did not match any players');
    return;
  }
  return player;
}
