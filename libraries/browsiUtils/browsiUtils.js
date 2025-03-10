/** @type {string} */
const VIEWABILITY_KEYNAME = 'browsiViewability';
/** @type {string} */
const SCROLL_KEYNAME = 'browsiScroll';
/** @type {string} */
const REVENUE_KEYNAME = 'browsiRevenue';

export function getUUID() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID() || undefined;
  }
  return undefined;
}

export function getDaysDifference(firstDate, secondDate) {
  const diffInMilliseconds = Math.abs(firstDate - secondDate);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return diffInMilliseconds / millisecondsPerDay;
}

export function isEngagingUser() {
  const pageYOffset = window.scrollY || (document.compatMode === 'CSS1Compat' ? document.documentElement?.scrollTop : document.body?.scrollTop);
  return pageYOffset > 0;
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

export function getRevenueTargetingValue(p) {
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

export function getTargetingValue(p) {
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

export function isObjectDefined(obj) {
  return !!(obj && typeof obj === 'object' && Object.keys(obj).length);
}

export function generateRandomString() {
  const getRandomLetter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  return `_${getRandomLetter()}${getRandomLetter()}b${getRandomLetter()}${getRandomLetter()}`;
}
