import { isGptPubadsDefined, logError } from '../../src/utils.js';
import { setKeyValue as setGptKeyValue } from '../../libraries/gptUtils/gptUtils.js';
import { find } from '../../src/polyfill.js';

/** @type {string} */
const VIEWABILITY_KEYNAME = 'browsiViewability';
/** @type {string} */
const SCROLL_KEYNAME = 'browsiScroll';
/** @type {string} */
const REVENUE_KEYNAME = 'browsiRevenue';

export function isObjectDefined(obj) {
  return !!(obj && typeof obj === 'object' && Object.keys(obj).length);
}

export function generateRandomString() {
  const getRandomLetter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  return `_${getRandomLetter()}${getRandomLetter()}b${getRandomLetter()}${getRandomLetter()}`;
}

export function getUUID() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID() || undefined;
  }
  return undefined;
}

function getDaysDifference(firstDate, secondDate) {
  const diffInMilliseconds = Math.abs(firstDate - secondDate);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return diffInMilliseconds / millisecondsPerDay;
}

function isEngagingUser() {
  const pageYOffset = window.scrollY || (document.compatMode === 'CSS1Compat' ? document.documentElement?.scrollTop : document.body?.scrollTop);
  return pageYOffset > 0;
}

function getRevenueTargetingValue(p) {
  if (!p) {
    return undefined;
  } else if (p <= 0) {
    return 'no fill';
  } else if (p <= 0.3) {
    return 'low';
  } else if (p <= 0.7) {
    return 'medium';
  }
  return 'high';
}

function getTargetingValue(p) {
  return (!p || p < 0) ? undefined : (Math.floor(p * 10) / 10).toFixed(2);
}

export function getTargetingKeys(viewabilityKeyName) {
  return {
    viewabilityKey: (viewabilityKeyName || VIEWABILITY_KEYNAME).toString(),
    scrollKey: SCROLL_KEYNAME,
    revenueKey: REVENUE_KEYNAME,
  }
}

export function getTargetingValues(v) {
  return {
    viewabilityValue: getTargetingValue(v['viewability']),
    scrollValue: getTargetingValue(v['scrollDepth']),
    revenueValue: getRevenueTargetingValue(v['revenue'])
  }
}

export const setKeyValue = (key, random) => setGptKeyValue(key, random.toString());

/**
 * get all slots on page
 * @return {Object[]} slot GoogleTag slots
 */
export function getAllSlots() {
  return isGptPubadsDefined() && window.googletag.pubads().getSlots();
}

/**
 * get GPT slot by placement id
 * @param {string} code placement id
 * @return {?Object}
 */
export function getSlotByCode(code) {
  const slots = getAllSlots();
  if (!slots || !slots.length) {
    return null;
  }
  return find(slots, s => s.getSlotElementId() === code || s.getAdUnitPath() === code) || null;
}

function getLocalStorageData(storage) {
  let brtd = null;
  let bus = null;
  try {
    brtd = storage.getDataFromLocalStorage('__brtd');
  } catch (e) {
    logError('unable to parse __brtd');
  }
  try {
    bus = storage.getDataFromLocalStorage('__bus');
  } catch (e) {
    logError('unable to parse __bus');
  }
  return { brtd, bus };
}

function convertBusData(bus) {
  try {
    return JSON.parse(bus);
  } catch (e) {
    return undefined;
  }
}

export function getHbm(bus, timestamp) {
  try {
    if (!isObjectDefined(bus)) {
      return undefined;
    }
    const uahb = isObjectDefined(bus.uahb) ? bus.uahb : undefined;
    const rahb = getRahb(bus.rahb, timestamp);
    const lahb = getLahb(bus.lahb, timestamp);
    return {
      uahb: uahb?.avg && Number(uahb.avg?.toFixed(3)),
      rahb: rahb?.avg && Number(rahb.avg?.toFixed(3)),
      lahb: lahb?.avg && Number(lahb.avg?.toFixed(3)),
      lbsa: lahb?.age && Number(lahb?.age?.toFixed(3))
    }
  } catch (e) {
    return undefined;
  }
}

export function getLahb(lahb, timestamp) {
  try {
    if (!isObjectDefined(lahb)) {
      return undefined;
    }
    return {
      avg: lahb.avg,
      age: getDaysDifference(timestamp, lahb.time)
    }
  } catch (e) {
    return undefined;
  }
}

export function getRahb(rahb, timestamp) {
  try {
    const rahbByTs = getRahbByTs(rahb, timestamp);
    if (!isObjectDefined(rahbByTs)) {
      return undefined;
    }

    const rs = Object.keys(rahbByTs).reduce((sum, curTimestamp) => {
      sum.sum += rahbByTs[curTimestamp].sum;
      sum.smp += rahbByTs[curTimestamp].smp;
      return sum;
    }, { sum: 0, smp: 0 });

    return {
      avg: rs.sum / rs.smp
    }
  } catch (e) {
    return undefined;
  }
}

export function getRahbByTs(rahb, timestamp) {
  try {
    if (!isObjectDefined(rahb)) {
      return undefined
    };
    const weekAgoTimestamp = timestamp - (7 * 24 * 60 * 60 * 1000);
    Object.keys(rahb).forEach((ts) => {
      if (parseInt(ts) < weekAgoTimestamp) {
        delete rahb[ts];
      }
    });
    return rahb;
  } catch (e) {
    return undefined;
  }
}

export function getPredictorData(storage, _moduleParams, timestamp, pvid) {
  const win = window.top;
  const doc = win.document;
  const { brtd, bus } = getLocalStorageData(storage);
  const convertedBus = convertBusData(bus);
  const { uahb, rahb, lahb, lbsa } = getHbm(convertedBus, timestamp) || {};
  return {
    ...{
      sk: _moduleParams.siteKey,
      pk: _moduleParams.pubKey,
      sw: (win.screen && win.screen.width) || -1,
      sh: (win.screen && win.screen.height) || -1,
      url: `${doc.location.protocol}//${doc.location.host}${doc.location.pathname}`,
      eu: isEngagingUser(),
      t: timestamp,
      pvid
    },
    ...(brtd ? { us: brtd } : { us: '{}' }),
    ...(document.referrer ? { r: document.referrer } : {}),
    ...(document.title ? { at: document.title } : {}),
    ...(uahb ? { uahb } : {}),
    ...(rahb ? { rahb } : {}),
    ...(lahb ? { lahb } : {}),
    ...(lbsa ? { lbsa } : {})
  };
}

/**
 * serialize object and return query params string
 * @param {Object} data
 * @return {string}
 */
export function toUrlParams(data) {
  return Object.keys(data)
    .map(key => key + '=' + encodeURIComponent(data[key]))
    .join('&');
}

/**
 * generate id according to macro script
 * @param {Object} macro replacement macro
 * @param {Object} slot google slot
 * @return {?Object}
 */
export function getMacroId(macro, slot) {
  if (macro) {
    try {
      const macroResult = evaluate(macro, slot.getSlotElementId(), slot.getAdUnitPath(), (match, p1) => {
        return (p1 && slot.getTargeting(p1).join('_')) || 'NA';
      });
      return macroResult;
    } catch (e) {
      logError(`failed to evaluate: ${macro}`);
    }
  }
  return slot.getSlotElementId();
}

function evaluate(macro, divId, adUnit, replacer) {
  let macroResult = macro.p
    .replace(/['"]+/g, '')
    .replace(/<DIV_ID>/g, divId);

  if (adUnit) {
    macroResult = macroResult.replace(/<AD_UNIT>/g, adUnit);
  }
  if (replacer) {
    macroResult = macroResult.replace(/<KEY_(\w+)>/g, replacer);
  }
  if (macro.s) {
    macroResult = macroResult.substring(macro.s.s, macro.s.e);
  }
  return macroResult;
}
