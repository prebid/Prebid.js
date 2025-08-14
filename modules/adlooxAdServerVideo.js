/**
 * This module adds [Adloox]{@link https://www.adloox.com/} Ad Server support for Video to Prebid
 * @module modules/adlooxAdServerVideo
 * @requires module:modules/adlooxAnalyticsAdapter
 */

/* eslint prebid/validate-imports: "off" */

import { registerVideoSupport } from '../src/adServerManager.js';
import { command as analyticsCommand, COMMAND } from './adlooxAnalyticsAdapter.js';
import { ajax } from '../src/ajax.js';
import { EVENTS } from '../src/constants.js';
import { targeting } from '../src/targeting.js';
import { logInfo, isFn, logError, isPlainObject, isStr, isBoolean, deepSetValue, deepClone, timestamp, logWarn } from '../src/utils.js';

const MODULE = 'adlooxAdserverVideo';

const URL_VAST = 'https://j.adlooxtracking.com/ads/vast/tag.php';

export function buildVideoUrl(options, callback) {
  logInfo(MODULE, 'buildVideoUrl', options);

  if (!isFn(callback)) {
    logError(MODULE, 'invalid callback');
    return false;
  }
  if (!isPlainObject(options)) {
    logError(MODULE, 'missing options');
    return false;
  }
  if (!(options.url_vast === undefined || isStr(options.url_vast))) {
    logError(MODULE, 'invalid url_vast options value');
    return false;
  }
  if (!(isPlainObject(options.adUnit) || isPlainObject(options.bid))) {
    logError(MODULE, "requires either 'adUnit' or 'bid' options value");
    return false;
  }
  if (!isStr(options.url)) {
    logError(MODULE, 'invalid url options value');
    return false;
  }
  if (!(options.wrap === undefined || isBoolean(options.wrap))) {
    logError(MODULE, 'invalid wrap options value');
    return false;
  }
  if (!(options.blob === undefined || isBoolean(options.blob))) {
    logError(MODULE, 'invalid blob options value');
    return false;
  }

  // same logic used in modules/dfpAdServerVideo.js
  options.bid = options.bid || targeting.getWinningBids(options.adUnit.code)[0];

  deepSetValue(options.bid, 'ext.adloox.video.adserver', true);

  if (options.wrap !== false) {
    VASTWrapper(options, callback);
  } else {
    track(options, callback);
  }

  return true;
}

registerVideoSupport('adloox', {
  buildVideoUrl: buildVideoUrl
});

function track(options, callback) {
  callback(options.url);

  const bid = deepClone(options.bid);
  bid.ext.adloox.video.adserver = false;

  analyticsCommand(COMMAND.TRACK, {
    eventType: EVENTS.BID_WON,
    args: bid
  });
}

function VASTWrapper(options, callback) {
  const chain = [];

  function process(result) {
    function getAd(xml) {
      if (!xml || xml.documentElement.tagName != 'VAST') {
        logError(MODULE, 'not a VAST tag, using non-wrapped tracking');
        return;
      }

      const ads = xml.querySelectorAll('Ad');
      if (!ads.length) {
        logError(MODULE, 'no VAST ads, using non-wrapped tracking');
        return;
      }

      // get first Ad (VAST may be an Ad Pod so sort on sequence and pick lowest sequence number)
      const ad = Array.prototype.slice.call(ads).sort(function(a, b) {
        return parseInt(a.getAttribute('sequence'), 10) - parseInt(b.getAttribute('sequence'), 10);
      }).shift();

      return ad;
    }

    function getWrapper(ad) {
      return ad.querySelector('VASTAdTagURI');
    }

    function durationToSeconds(duration) {
      return Date.parse('1970-01-01 ' + duration + 'Z') / 1000;
    }

    function blobify() {
      if (!(chain.length > 0 && options.blob !== false)) return;

      const urls = [];

      function toBlob(r) {
        const text = new XMLSerializer().serializeToString(r.xml);
        const url = URL.createObjectURL(new Blob([text], { type: r.type }));
        urls.push(url);
        return url;
      }

      let n = chain.length - 1; // do not process the linear
      while (n-- > 0) {
        const ad = getAd(chain[n].xml);
        const wrapper = getWrapper(ad);
        wrapper.textContent = toBlob(chain[n + 1]);
      }

      options.url = toBlob(chain[0]);

      const epoch = timestamp() - new Date().getTimezoneOffset() * 60 * 1000;
      const expires0 = options.bid.ttl * 1000 - (epoch - options.bid.responseTimestamp);
      const expires = Math.max(30 * 1000, expires0);
      setTimeout(function() { urls.forEach(u => URL.revokeObjectURL(u)) }, expires);
    }

    if (!result) {
      blobify();
      return track(options, callback);
    }

    const ad = getAd(result.xml);
    if (!ad) {
      blobify();
      return track(options, callback);
    }

    chain.push(result);

    const wrapper = getWrapper(ad);
    if (wrapper) {
      if (chain.length > 5) {
        logWarn(MODULE, `got wrapped tag at depth ${chain.length}, not continuing`);
        blobify();
        return track(options, callback);
      }
      return fetch(wrapper.textContent.trim());
    }

    blobify();

    const version = chain[0].xml.documentElement.getAttribute('version');

    const vpaid = ad.querySelector("MediaFiles > MediaFile[apiFramework='VPAID'][type='application/javascript']");

    const duration = durationToSeconds(ad.querySelector('Duration').textContent.trim());

    let skip;
    const skipd = ad.querySelector('Linear').getAttribute('skipoffset');
    if (skipd) skip = durationToSeconds(skipd.trim());

    const args = [
      [ 'client', '%%client%%' ],
      [ 'platform_id', '%%platformid%%' ],
      [ 'scriptname', 'adl_%%clientid%%' ],
      [ 'tag_id', '%%tagid%%' ],
      [ 'fwtype', 4 ],
      [ 'vast', options.url ],
      [ 'id11', 'video' ],
      [ 'id12', '$ADLOOX_WEBSITE' ],
      [ 'id18', (!skip || skip >= duration) ? 'fd' : 'od' ],
      [ 'id19', 'na' ],
      [ 'id20', 'na' ]
    ];
    if (version && version != 3) args.push([ 'version', version ]);
    if (vpaid) args.push([ 'vpaid', 1 ]);
    if (duration != 15) args.push([ 'duration', duration ]);
    if (skip) args.push([ 'skip', skip ]);

    logInfo(MODULE, `processed VAST tag chain of depth ${chain.depth}, running callback`);

    analyticsCommand(COMMAND.URL, {
      url: (options.url_vast || URL_VAST) + '?',
      args: args,
      bid: options.bid,
      ids: true
    }, callback);
  }

  function fetch(url, withoutcredentials) {
    logInfo(MODULE, `fetching VAST ${url}`);

    ajax(url, {
      success: function(responseText, q) {
        process({ type: q.getResponseHeader('content-type'), xml: q.responseXML });
      },
      error: function(statusText, q) {
        if (!withoutcredentials) {
          logWarn(MODULE, `unable to download (${statusText}), suspected CORS withCredentials problem, retrying without`);
          return fetch(url, true);
        }
        logError(MODULE, `failed to fetch (${statusText}), using non-wrapped tracking`);
        process();
      }
    }, undefined, { withCredentials: !withoutcredentials });
  }

  fetch(options.url);
}
