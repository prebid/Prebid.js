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

import { submodule } from '../src/hook.js';
import { config } from '../src/config.js';
import { ajaxBuilder } from '../src/ajax.js';
import { logError } from '../src/utils.js';
import find from 'core-js-pure/features/array/find.js';

const SUBMODULE_NAME = 'jwplayer';
let requestCount = 0;
let requestTimeout = 150;
const segCache = {};
let resumeBidRequest;

/** @type {RtdSubmodule} */
export const jwplayerSubmodule = {
  /**
     * used to link submodule with realTimeData
     * @type {string}
     */
  name: SUBMODULE_NAME,
  /**
     * get data and send back to realTimeData module
     * @function
     * @param {adUnit[]} adUnits
     * @param {function} onDone
     */
  getData: getSegments,
  init
};

config.getConfig('realTimeData', ({realTimeData}) => {
  const providers = realTimeData.dataProviders;
  const jwplayerProvider = providers && find(providers, pr => pr.name && pr.name.toLowerCase() === SUBMODULE_NAME);
  const params = jwplayerProvider && jwplayerProvider.params;
  if (!params) {
    return;
  }
  const rtdModuleTimeout = params.auctionDelay || params.timeout;
  requestTimeout = rtdModuleTimeout === undefined ? requestTimeout : Math.max(rtdModuleTimeout - 1, 0);
  fetchTargetingInformation(params);
});

submodule('realTimeData', jwplayerSubmodule);

function init(config, gdpr, usp) {
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
  const ajax = ajaxBuilder(requestTimeout);
  requestCount++;
  ajax(`https://cdn.jwplayer.com/v2/media/${mediaId}`, {
    success: function (response) {
      try {
        const data = JSON.parse(response);
        if (!data) {
          throw ('Empty response');
        }

        const playlist = data.playlist;
        if (!playlist || !playlist.length) {
          throw ('Empty playlist');
        }

        const jwpseg = playlist[0].jwpseg;
        if (jwpseg) {
          segCache[mediaId] = jwpseg;
        }
      } catch (err) {
        logError(err);
      }
      onRequestCompleted();
    },
    error: function () {
      logError('failed to retrieve targeting information');
      onRequestCompleted();
    }
  });
}

function onRequestCompleted() {
  requestCount--;
  if (requestCount > 0) {
    return;
  }

  if (resumeBidRequest) {
    resumeBidRequest();
    resumeBidRequest = null;
  }
}

function getSegments(adUnits, onDone) {
  executeAfterPrefetch(() => {
    const realTimeData = adUnits.reduce((data, adUnit) => {
      const code = adUnit.code;
      const vat = code && getTargetingForBid(adUnit);
      if (!vat) {
        return data;
      }

      const { segments, mediaID } = vat;
      const jwTargeting = {};
      if (segments && segments.length) {
        jwTargeting.segments = segments;
      }

      if (mediaID) {
        const id = 'jw_' + mediaID;
        jwTargeting.content = {
          id
        }
      }

      data[code] = {
        jwTargeting
      };
      return data;
    }, {});
    onDone(realTimeData);
  });
}

function executeAfterPrefetch(callback) {
  if (requestCount > 0) {
    resumeBidRequest = callback;
  } else {
    callback();
  }
}

/**
 * Retrieves the targeting information pertaining to a bid request.
 * @param bidRequest {object} - the bid which is passed to a prebid adapter for use in `buildRequests`. It must contain
 * a jwTargeting property.
 * @returns targetingInformation {object} nullable - contains the media ID as well as the jwpseg targeting segments
 * found for the given bidRequest information
 */
export function getTargetingForBid(bidRequest) {
  const jwTargeting = bidRequest.jwTargeting;
  if (!jwTargeting) {
    return null;
  }
  const playerID = jwTargeting.playerID;
  let mediaID = jwTargeting.mediaID;
  let segments = segCache[mediaID];
  if (segments) {
    return {
      segments,
      mediaID
    };
  }

  const player = getPlayer(playerID);
  if (!player) {
    return null;
  }

  const item = mediaID ? find(player.getPlaylist(), item => item.mediaid === mediaID) : player.getPlaylistItem();
  if (!item) {
    return null;
  }

  mediaID = mediaID || item.mediaid;
  segments = item.jwpseg;
  if (segments && mediaID) {
    segCache[mediaID] = segments;
  }

  return {
    segments,
    mediaID
  };
}

function getPlayer(playerID) {
  const jwplayer = window.jwplayer;
  if (!jwplayer) {
    logError('jwplayer.js was not found on page');
    return;
  }

  const player = jwplayer(playerID);
  if (!player || !player.getPlaylist) {
    logError('player ID did not match any players');
    return;
  }
  return player;
}
