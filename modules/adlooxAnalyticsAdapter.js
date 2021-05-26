/**
 * This module provides [Adloox]{@link https://www.adloox.com/} Analytics
 * The module will inject Adloox's verification JS tag alongside slot at bidWin
 * @module modules/adlooxAnalyticsAdapter
 */

import adapterManager from '../src/adapterManager.js';
import adapter from '../src/AnalyticsAdapter.js';
import { loadExternalScript } from '../src/adloader.js';
import { auctionManager } from '../src/auctionManager.js';
import { AUCTION_COMPLETED } from '../src/auction.js';
import { EVENTS } from '../src/constants.json';
import find from 'core-js-pure/features/array/find.js';
import * as utils from '../src/utils.js';

const MODULE = 'adlooxAnalyticsAdapter';

const URL_JS = 'https://j.adlooxtracking.com/ads/js/tfav_adl_%%clientid%%.js';

const ADLOOX_VENDOR_ID = 93;

const ADLOOX_MEDIATYPE = {
  DISPLAY: 2,
  VIDEO: 6
};

const MACRO = {};
MACRO['client'] = function(b, c) {
  return c.client;
};
MACRO['clientid'] = function(b, c) {
  return c.clientid;
};
MACRO['tagid'] = function(b, c) {
  return c.tagid;
};
MACRO['platformid'] = function(b, c) {
  return c.platformid;
};
MACRO['targetelt'] = function(b, c) {
  return c.toselector(b);
};
MACRO['creatype'] = function(b, c) {
  return b.mediaType == 'video' ? ADLOOX_MEDIATYPE.VIDEO : ADLOOX_MEDIATYPE.DISPLAY;
};
MACRO['pbAdSlot'] = function(b, c) {
  const adUnit = find(auctionManager.getAdUnits(), a => b.adUnitCode === a.code);
  return utils.deepAccess(adUnit, 'fpd.context.pbAdSlot') || utils.getGptSlotInfoForAdUnitCode(b.adUnitCode).gptSlot || b.adUnitCode;
};

const PARAMS_DEFAULT = {
  'id1': function(b) { return b.adUnitCode },
  'id2': '%%pbAdSlot%%',
  'id3': function(b) { return b.bidder },
  'id4': function(b) { return b.adId },
  'id5': function(b) { return b.dealId },
  'id6': function(b) { return b.creativeId },
  'id7': function(b) { return b.size },
  'id11': '$ADLOOX_WEBSITE'
};

const NOOP = function() {};

let analyticsAdapter = Object.assign(adapter({ analyticsType: 'endpoint' }), {
  track({ eventType, args }) {
    if (!analyticsAdapter[`handle_${eventType}`]) return;

    utils.logInfo(MODULE, 'track', eventType, args);

    analyticsAdapter[`handle_${eventType}`](args);
  }
});

analyticsAdapter.context = null;

analyticsAdapter.originEnableAnalytics = analyticsAdapter.enableAnalytics;
analyticsAdapter.enableAnalytics = function(config) {
  analyticsAdapter.context = null;

  utils.logInfo(MODULE, 'config', config);

  if (!utils.isPlainObject(config.options)) {
    utils.logError(MODULE, 'missing options');
    return;
  }
  if (!(config.options.js === undefined || utils.isStr(config.options.js))) {
    utils.logError(MODULE, 'invalid js options value');
    return;
  }
  if (!(config.options.toselector === undefined || utils.isFn(config.options.toselector))) {
    utils.logError(MODULE, 'invalid toselector options value');
    return;
  }
  if (!utils.isStr(config.options.client)) {
    utils.logError(MODULE, 'invalid client options value');
    return;
  }
  if (!utils.isNumber(config.options.clientid)) {
    utils.logError(MODULE, 'invalid clientid options value');
    return;
  }
  if (!utils.isNumber(config.options.tagid)) {
    utils.logError(MODULE, 'invalid tagid options value');
    return;
  }
  if (!utils.isNumber(config.options.platformid)) {
    utils.logError(MODULE, 'invalid platformid options value');
    return;
  }
  if (!(config.options.params === undefined || utils.isPlainObject(config.options.params))) {
    utils.logError(MODULE, 'invalid params options value');
    return;
  }

  analyticsAdapter.context = {
    js: config.options.js || URL_JS,
    toselector: config.options.toselector || function(bid) {
      let code = utils.getGptSlotInfoForAdUnitCode(bid.adUnitCode).divId || bid.adUnitCode;
      // https://mathiasbynens.be/notes/css-escapes
      code = code.replace(/^\d/, '\\3$& ');
      return `#${code}`
    },
    client: config.options.client,
    clientid: config.options.clientid,
    tagid: config.options.tagid,
    platformid: config.options.platformid,
    params: []
  };

  config.options.params = utils.mergeDeep({}, PARAMS_DEFAULT, config.options.params || {});
  Object
    .keys(config.options.params)
    .forEach(k => {
      if (!Array.isArray(config.options.params[k])) {
        config.options.params[k] = [ config.options.params[k] ];
      }
      config.options.params[k].forEach(v => analyticsAdapter.context.params.push([ k, v ]));
    });

  Object.keys(COMMAND_QUEUE).forEach(commandProcess);

  analyticsAdapter.originEnableAnalytics(config);
}

analyticsAdapter.originDisableAnalytics = analyticsAdapter.disableAnalytics;
analyticsAdapter.disableAnalytics = function() {
  analyticsAdapter.context = null;

  analyticsAdapter.originDisableAnalytics();
}

analyticsAdapter.url = function(url, args, bid) {
  // utils.formatQS outputs PHP encoded querystrings... (╯°□°)╯ ┻━┻
  function a2qs(a) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
    function fixedEncodeURIComponent(str) {
      return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
      });
    }

    const args = [];
    let n = a.length;
    while (n-- > 0) {
      if (!(a[n][1] === undefined || a[n][1] === null || a[n][1] === false)) {
        args.unshift(fixedEncodeURIComponent(a[n][0]) + (a[n][1] !== true ? ('=' + fixedEncodeURIComponent(a[n][1])) : ''));
      }
    }

    return args.join('&');
  }

  const macros = (str) => {
    return str.replace(/%%([a-z]+)%%/gi, (match, p1) => MACRO[p1] ? MACRO[p1](bid, analyticsAdapter.context) : match);
  };

  url = macros(url);
  args = args || [];

  let n = args.length;
  while (n-- > 0) {
    if (utils.isFn(args[n][1])) {
      try {
        args[n][1] = args[n][1](bid);
      } catch (_) {
        utils.logError(MODULE, 'macro', args[n][0], _.message);
        args[n][1] = `ERROR: ${_.message}`;
      }
    }
    if (utils.isStr(args[n][1])) {
      args[n][1] = macros(args[n][1]);
    }
  }

  return url + a2qs(args);
}

analyticsAdapter[`handle_${EVENTS.AUCTION_END}`] = function(auctionDetails) {
  if (!(auctionDetails.auctionStatus == AUCTION_COMPLETED && auctionDetails.bidsReceived.length > 0)) return;
  analyticsAdapter[`handle_${EVENTS.AUCTION_END}`] = NOOP;

  utils.logMessage(MODULE, 'preloading verification JS');

  const uri = utils.parseUrl(analyticsAdapter.url(`${analyticsAdapter.context.js}#`));

  const link = document.createElement('link');
  link.setAttribute('href', `${uri.protocol}://${uri.host}${uri.pathname}`);
  link.setAttribute('rel', 'preload');
  link.setAttribute('as', 'script');
  utils.insertElement(link);
}

analyticsAdapter[`handle_${EVENTS.BID_WON}`] = function(bid) {
  const sl = analyticsAdapter.context.toselector(bid);
  let el;
  try {
    el = document.querySelector(sl);
  } catch (_) { }
  if (!el) {
    utils.logWarn(MODULE, `unable to find ad unit code '${bid.adUnitCode}' slot using selector '${sl}' (use options.toselector to change), ignoring`);
    return;
  }

  utils.logMessage(MODULE, `measuring '${bid.mediaType}' unit at '${bid.adUnitCode}'`);

  const params = analyticsAdapter.context.params.concat([
    [ 'tagid', '%%tagid%%' ],
    [ 'platform', '%%platformid%%' ],
    [ 'fwtype', 4 ],
    [ 'targetelt', '%%targetelt%%' ],
    [ 'creatype', '%%creatype%%' ]
  ]);

  loadExternalScript(analyticsAdapter.url(`${analyticsAdapter.context.js}#`, params, bid), 'adloox');
}

adapterManager.registerAnalyticsAdapter({
  adapter: analyticsAdapter,
  code: 'adloox',
  gvlid: ADLOOX_VENDOR_ID
});

export default analyticsAdapter;

// src/events.js does not support custom events or handle races... (╯°□°)╯ ┻━┻
const COMMAND_QUEUE = {};
export const COMMAND = {
  CONFIG: 'config',
  URL: 'url',
  TRACK: 'track'
};
export function command(cmd, data, callback0) {
  const cid = utils.getUniqueIdentifierStr();
  const callback = function() {
    delete COMMAND_QUEUE[cid];
    if (callback0) callback0.apply(null, arguments);
  };
  COMMAND_QUEUE[cid] = { cmd, data, callback };
  if (analyticsAdapter.context) commandProcess(cid);
}
function commandProcess(cid) {
  const { cmd, data, callback } = COMMAND_QUEUE[cid];

  utils.logInfo(MODULE, 'command', cmd, data);

  switch (cmd) {
    case COMMAND.CONFIG:
      const response = {
        client: analyticsAdapter.context.client,
        clientid: analyticsAdapter.context.clientid,
        tagid: analyticsAdapter.context.tagid,
        platformid: analyticsAdapter.context.platformid
      };
      callback(response);
      break;
    case COMMAND.URL:
      if (data.ids) data.args = data.args.concat(analyticsAdapter.context.params.filter(p => /^id([1-9]|10)$/.test(p[0]))); // not >10
      callback(analyticsAdapter.url(data.url, data.args, data.bid));
      break;
    case COMMAND.TRACK:
      analyticsAdapter.track(data);
      callback(); // drain queue
      break;
    default:
      utils.logWarn(MODULE, 'command unknown', cmd);
      // do not callback as arguments are unknown and to aid debugging
  }
}
