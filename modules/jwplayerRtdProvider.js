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
import {logError} from '../src/utils.js';
import {find} from '../src/polyfill.js';
import {getGlobal} from '../src/prebidGlobal.js';

const SUBMODULE_NAME = 'jwplayer';
const JWPLAYER_DOMAIN = SUBMODULE_NAME + '.com';
const segCache = {};
const pendingRequests = {};
let activeRequestCount = 0;
let resumeBidRequest;

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
     * @param {Obj} bidReqConfig
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

export function fetchTargetingForMediaId(mediaId) {
  const ajax = ajaxBuilder();
  // TODO: Avoid checking undefined vs null by setting a callback to pendingRequests.
  pendingRequests[mediaId] = null;
  ajax(`https://cdn.${JWPLAYER_DOMAIN}/v2/media/${mediaId}`, {
    success: function (response) {
      const segment = parseSegment(response);
      cacheSegments(segment, mediaId);
      onRequestCompleted(mediaId, !!segment);
    },
    error: function () {
      logError('failed to retrieve targeting information');
      onRequestCompleted(mediaId, false);
    }
  });
}

function parseSegment(response) {
  let segment;
  try {
    const data = JSON.parse(response);
    if (!data) {
      throw ('Empty response');
    }

    const playlist = data.playlist;
    if (!playlist || !playlist.length) {
      throw ('Empty playlist');
    }

    segment = playlist[0].jwpseg;
  } catch (err) {
    logError(err);
  }
  return segment;
}

function cacheSegments(jwpseg, mediaId) {
  if (jwpseg && mediaId) {
    segCache[mediaId] = jwpseg;
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
  enrichAdUnits(adUnits);
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
 * @param {function} onDone
 */
export function enrichAdUnits(adUnits) {
  const fpdFallback = config.getConfig('ortb2.site.ext.data.jwTargeting');
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
      let ortb2 = config.getConfig('ortb2');
      ortb2 = getOrtbSiteContent(ortb2, contentId, contentData);
      if (ortb2) {
        config.setConfig({ ortb2 });
      }
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
  const { playerID, mediaID } = params;
  if (pendingRequests[mediaID] !== undefined) {
    loadVatForPendingRequest(playerID, mediaID, onCompletion);
    return;
  }

  const vat = getVatFromCache(mediaID) || getVatFromPlayer(playerID, mediaID) || { mediaID };
  onCompletion(vat);
}

function loadVatForPendingRequest(playerID, mediaID, callback) {
  const vat = getVatFromPlayer(playerID, mediaID);
  if (vat) {
    callback(vat);
  } else {
    activeRequestCount++;
    pendingRequests[mediaID] = callback;
  }
}

export function getVatFromCache(mediaID) {
  const segments = segCache[mediaID];

  if (!segments) {
    return null;
  }

  return {
    segments,
    mediaID
  };
}

export function getVatFromPlayer(playerID, mediaID) {
  const player = getPlayer(playerID);
  if (!player) {
    return null;
  }

  const item = mediaID ? find(player.getPlaylist(), item => item.mediaid === mediaID) : player.getPlaylistItem();
  if (!item) {
    return null;
  }

  mediaID = mediaID || item.mediaid;
  const segments = item.jwpseg;
  cacheSegments(segments, mediaID)

  return {
    segments,
    mediaID
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
      id: rawSegment,
      value: rawSegment
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

export function getOrtbSiteContent(ortb2, contentId, contentData) {
  if (!contentId && !contentData) {
    return;
  }

  if (!ortb2) {
    ortb2 = {};
  }

  let site = ortb2.site = ortb2.site || {};
  let content = site.content = site.content || {};

  if (contentId) {
    content.id = contentId;
  }

  const currentData = content.data = content.data || [];
  // remove old jwplayer data
  const data = currentData.filter(datum => datum.name !== JWPLAYER_DOMAIN);

  if (contentData) {
    data.push(contentData);
  }

  content.data = data;

  return ortb2;
}

function enrichBids(bids, targeting, contentId, contentData) {
  if (!bids) {
    return;
  }

  bids.forEach(bid => {
    addTargetingToBid(bid, targeting);
    const ortb2 = getOrtbSiteContent(bid.ortb2, contentId, contentData);
    if (ortb2) {
      bid.ortb2 = ortb2;
    }
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

function getPlayer(playerID) {
  const jwplayer = window.jwplayer;
  if (!jwplayer) {
    logError(SUBMODULE_NAME + '.js was not found on page');
    return;
  }

  const player = jwplayer(playerID);
  if (!player || !player.getPlaylist) {
    logError('player ID did not match any players');
    return;
  }
  return player;
}
