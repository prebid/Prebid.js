import { ajax } from '../src/ajax';
import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import * as utils from '../src/utils';
import { parse as parseURL } from '../src/url';

const CONSTANTS = require('../src/constants.json');

const ANALYTICS_TYPE = 'endpoint';
const FINTEZA_HOST = 'https://content.mql5.com/tr';
const BID_REQUEST_TRACK = 'Bid Request %BIDDER%';
const BID_RESPONSE_PRICE_TRACK = 'Bid Response Price %BIDDER%';
const BID_RESPONSE_TIME_TRACK = 'Bid Response Time %BIDDER%';
const BID_TIMEOUT_TRACK = 'Bid Timeout %BIDDER%';
const BID_WON_TRACK = 'Bid Won %BIDDER%';

const FIRST_VISIT_DATE = '_fz_fvdt';
const SESSION_ID = '_fz_ssn';
const SESSION_DURATION = 30 * 60 * 1000;
const SESSION_RAND_PART = 9;
const TRACK_TIME_KEY = '_fz_tr';
const UNIQ_ID_KEY = '_fz_uniq';

function getPageInfo() {
  const pageInfo = {
    domain: window.location.hostname,
  }

  if (document.referrer) {
    pageInfo.referrerDomain = parseURL(document.referrer).hostname;
  }

  return pageInfo;
}

function getUniqId() {
  let cookies;

  try {
    cookies = parseCookies(document.cookie);
  } catch (a) {
    cookies = {};
  }

  let isUniqFromLS;
  let uniq = cookies[ UNIQ_ID_KEY ];
  if (!uniq) {
    try {
      if (window.localStorage) {
        uniq = window.localStorage.getItem(UNIQ_ID_KEY) || '';
        isUniqFromLS = true;
      }
    } catch (b) {}
  }

  if (uniq && isNaN(uniq)) {
    uniq = null;
  }

  if (uniq && isUniqFromLS) {
    let expires = new Date();
    expires.setFullYear(expires.getFullYear() + 10);

    try {
      document.cookie = UNIQ_ID_KEY + '=' + uniq + '; path=/; expires=' + expires.toUTCString();
    } catch (e) {}
  }

  return uniq;
}

function initFirstVisit() {
  let now;
  let visitDate;
  let cookies;

  try {
    cookies = parseCookies(document.cookie);
  } catch (a) {
    cookies = {};
  }

  visitDate = cookies[ FIRST_VISIT_DATE ];

  if (!visitDate) {
    now = new Date();

    visitDate = parseInt(now.getTime() / 1000, 10);

    now.setFullYear(now.getFullYear() + 20);

    try {
      document.cookie = FIRST_VISIT_DATE + '=' + visitDate + '; path=/; expires=' + now.toUTCString();
    } catch (e) {}
  }

  return visitDate;
}

function trim(string) {
  if (string.trim) {
    return string.trim();
  }
  return string.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
}

function parseCookies(cookie) {
  let values = {};
  let arr, item;
  let param, value;
  let i, j;

  if (!cookie) {
    return {};
  }

  arr = cookie.split(';');

  for (i = 0, j = arr.length; i < j; i++) {
    item = arr[ i ];
    if (!item) {
      continue;
    }

    param = item.split('=');
    if (param.length <= 1) {
      continue;
    }

    value = decodeURIComponent(param[0]);
    value = trim(value);

    values[value] = decodeURIComponent(param[1]);
  }

  return values;
}

function getRandAsStr(digits) {
  let str = '';
  let rand = 0;
  let i;

  digits = digits || 4;

  for (i = 0; i < digits; i++) {
    rand = (Math.random() * 10) >>> 0;
    str += '' + rand;
  }

  return str;
}

function getSessionBegin(session) {
  if (!session || (typeof session !== 'string')) {
    return 0;
  }

  const len = session.length;
  if (len && len <= SESSION_RAND_PART) {
    return 0;
  }

  const timestamp = session.substring(0, len - SESSION_RAND_PART);

  return parseInt(timestamp, 10);
}

function initSession() {
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DURATION);
  const timestamp = Math.floor(now.getTime() / 1000);
  let begin = 0;
  let cookies;
  let sessionId;
  let sessionDuration;
  let isNew = false;

  try {
    cookies = parseCookies(document.cookie);
  } catch (a) {
    cookies = {};
  }

  sessionId = cookies[ SESSION_ID ];

  if (!sessionId ||
      !checkSessionByExpires() ||
      !checkSessionByReferer() ||
      !checkSessionByDay()) {
    sessionId = '' + timestamp + getRandAsStr(SESSION_RAND_PART);
    begin = timestamp;

    isNew = true;
  } else {
    begin = getSessionBegin(sessionId);
  }

  if (begin > 0) {
    sessionDuration = Math.floor(timestamp - begin);
  } else {
    sessionDuration = -1;
  }

  try {
    document.cookie = SESSION_ID + '=' + sessionId + '; path=/; expires=' + expires.toUTCString();
  } catch (e) {}

  return {
    isNew: isNew,
    id: sessionId,
    duration: sessionDuration
  };
}

function checkSessionByExpires() {
  const timestamp = getTrackRequestLastTime();
  const now = new Date().getTime();

  if (now > timestamp + SESSION_DURATION) {
    return false;
  }
  return true;
}

function checkSessionByReferer() {
  const referrer = fntzAnalyticsAdapter.context.pageInfo.referrerDomain;
  const domain = fntzAnalyticsAdapter.context.pageInfo.domain;

  return referrer === '' || domain === referrer;
}

function checkSessionByDay() {
  let last = getTrackRequestLastTime();
  if (last) {
    last = new Date(last);
    const now = new Date();

    return last.getUTCDate() === now.getUTCDate() &&
      last.getUTCMonth() === now.getUTCMonth() &&
      last.getUTCFullYear() === now.getUTCFullYear();
  }

  return false;
}

function saveTrackRequestTime() {
  const now = new Date().getTime();
  const expires = new Date(now + SESSION_DURATION);

  try {
    if (window.localStorage) {
      window.localStorage.setItem(TRACK_TIME_KEY, now.toString());
    } else {
      document.cookie = TRACK_TIME_KEY + '=' + now + '; path=/; expires=' + expires.toUTCString();
    }
  } catch (a) {}
}

function getTrackRequestLastTime() {
  let cookie;

  try {
    if (window.localStorage) {
      return parseInt(
        window.localStorage.getItem(TRACK_TIME_KEY) || 0,
        10,
      );
    }

    cookie = parseCookies(document.cookie);
    cookie = cookie[ TRACK_TIME_KEY ];
    if (cookie) {
      return parseInt(cookie, 10);
    }
  } catch (e) {}

  return 0;
}

function getAntiCacheParam() {
  const date = new Date();
  const rand = (Math.random() * 99999 + 1) >>> 0;

  return ([ date.getTime(), rand ].join(''));
}

function replaceBidder(str, bidder) {
  let _str = str;
  _str = _str.replace(/\%bidder\%/, bidder.toLowerCase());
  _str = _str.replace(/\%BIDDER\%/, bidder.toUpperCase());
  _str = _str.replace(/\%Bidder\%/, bidder.charAt(0).toUpperCase() + bidder.slice(1).toLowerCase());

  return _str;
}

function prepareBidRequestedParams(args) {
  return [{
    event: encodeURIComponent(replaceBidder(fntzAnalyticsAdapter.context.bidRequestTrack, args.bidderCode)),
    ref: encodeURIComponent(window.location.href),
  }];
}

function prepareBidResponseParams(args) {
  return [{
    event: encodeURIComponent(replaceBidder(fntzAnalyticsAdapter.context.bidResponsePriceTrack, args.bidderCode)),
    value: args.cpm,
    unit: 'usd'
  }, {
    event: encodeURIComponent(replaceBidder(fntzAnalyticsAdapter.context.bidResponseTimeTrack, args.bidderCode)),
    value: args.timeToRespond,
    unit: 'ms'
  }];
}

function prepareBidWonParams(args) {
  return [{
    event: encodeURIComponent(replaceBidder(fntzAnalyticsAdapter.context.bidWonTrack, args.bidderCode)),
    value: args.cpm,
    unit: 'usd'
  }];
}

function prepareBidTimeoutParams(args) {
  return args.map(function(bid) {
    return {
      event: encodeURIComponent(replaceBidder(fntzAnalyticsAdapter.context.bidTimeoutTrack, bid.bidder)),
      value: bid.timeout,
      unit: 'ms'
    };
  })
}

function prepareTrackData(evtype, args) {
  let prepareParams = null;

  switch (evtype) {
    case CONSTANTS.EVENTS.BID_REQUESTED:
      prepareParams = prepareBidRequestedParams;
      break;
    case CONSTANTS.EVENTS.BID_RESPONSE:
      prepareParams = prepareBidResponseParams;
      break;
    case CONSTANTS.EVENTS.BID_WON:
      prepareParams = prepareBidWonParams;
      break;
    case CONSTANTS.EVENTS.BID_TIMEOUT:
      prepareParams = prepareBidTimeoutParams;
      break;
  }

  if (!prepareParams) { return null; }

  const data = prepareParams(args);

  if (!data) { return null; }

  const session = initSession();

  return data.map(d => {
    const trackData = Object.assign(d, {
      id: fntzAnalyticsAdapter.context.id,
      ref: encodeURIComponent(window.location.href),
      title: encodeURIComponent(document.title),
      scr_res: fntzAnalyticsAdapter.context.screenResolution,
      fv_date: fntzAnalyticsAdapter.context.firstVisit,
      ac: getAntiCacheParam(),
    })

    if (fntzAnalyticsAdapter.context.uniqId) {
      trackData.fz_uniq = fntzAnalyticsAdapter.context.uniqId;
    }

    if (session.id) {
      trackData.ssn = session.id;
    }
    if (session.isNew) {
      session.isNew = false;
      trackData.ssn_start = 1;
    }
    trackData.ssn_dr = session.duration;

    return trackData;
  });
}

function sendTrackRequest(trackData) {
  try {
    ajax(
      fntzAnalyticsAdapter.context.host,
      null,
      trackData,
      {
        method: 'GET',
        withCredentials: true,
        contentType: 'application/x-www-form-urlencoded'
      },
    );
    saveTrackRequestTime();
  } catch (err) {
    utils.logError('Error on send data: ', err);
  }
}

const fntzAnalyticsAdapter = Object.assign(
  adapter({
    FINTEZA_HOST,
    ANALYTICS_TYPE
  }),
  {
    track({ eventType, args }) {
      if (typeof args !== 'undefined') {
        const trackData = prepareTrackData(eventType, args);
        if (!trackData) { return; }

        trackData.forEach(sendTrackRequest);
      }
    }
  }
);

fntzAnalyticsAdapter.originEnableAnalytics = fntzAnalyticsAdapter.enableAnalytics;

fntzAnalyticsAdapter.enableAnalytics = function (config) {
  if (!config.options.id) {
    utils.logError('Client ID (id) option is not defined. Analytics won\'t work');
    return;
  }

  fntzAnalyticsAdapter.context = {
    host: config.options.host || FINTEZA_HOST,
    id: config.options.id,
    bidRequestTrack: config.options.bidRequestTrack || BID_REQUEST_TRACK,
    bidResponsePriceTrack: config.options.bidResponsePriceTrack || BID_RESPONSE_PRICE_TRACK,
    bidResponseTimeTrack: config.options.bidResponseTimeTrack || BID_RESPONSE_TIME_TRACK,
    bidTimeoutTrack: config.options.bidTimeoutTrack || BID_TIMEOUT_TRACK,
    bidWonTrack: config.options.bidWonTrack || BID_WON_TRACK,
    firstVisit: initFirstVisit(),
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    uniqId: getUniqId(),
    pageInfo: getPageInfo(),
  };

  fntzAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: fntzAnalyticsAdapter,
  code: 'finteza'
});

export default fntzAnalyticsAdapter;
