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
