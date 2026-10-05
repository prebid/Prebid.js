import { logInfo, logWarn, timestamp } from '../../src/utils.js';

export const DEFAULT_MAX_FAILURE_MS = 100;

const HOSTNAME_REGEX = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;

/**
 * @param {*} value
 * @returns {boolean} true if value is a bare hostname (no scheme, port or path)
 */
export function isHostname(value) {
  return typeof value === 'string' && HOSTNAME_REGEX.test(value);
}

/**
 * Replaces the host of a url, keeping the path and query. Any port is dropped.
 *
 * @param {string} url
 * @param {string} hostname
 * @returns {string|null} the new url, or null if the url is invalid or already uses the hostname
 */
export function replaceHostname(url, hostname) {
  try {
    const replaced = new URL(url);
    if (replaced.hostname === hostname) {
      return null;
    }
    replaced.hostname = hostname;
    replaced.port = '';
    return replaced.href;
  } catch (e) {
    return null;
  }
}

// Whether the failover is active: a request had to be retried on its failover url, so later requests are sent there
// directly. Kept in memory only, so it lasts until the page is reloaded.
let failoverActive = false;

/**
 * Forgets that a failover has happened, so requests go to their original url again. Meant for tests, nothing
 * else clears it.
 */
export function resetFailoverState() {
  failoverActive = false;
}

/**
 * Wraps the ajax function provided by Prebid so that a request which fails quickly with a network error
 * (status 0, not a timeout, e.g. a DNS resolution failure or a blocked domain) is retried once on another url.
 * HTTP error responses and timeouts are never retried. The retry reuses the original payload, options and
 * callbacks, so a second failure is reported as usual and is not retried again.
 *
 * Once a request has been retried, every later request is sent straight to its failover url, without trying the
 * original one first. This is remembered in memory, so it lasts until the page is reloaded.
 *
 * @param {Function} ajax - the ajax function provided by Prebid
 * @param {Object} options
 * @param {function(string): (string|null)} options.getFailoverUrl - given the url that failed, returns the url to retry
 *   on, or null to not retry. Called when a failure qualifies for a retry, and for each request once a failover has
 *   happened.
 * @param {number} [options.maxFailureMs] - failures slower than this are not retried
 * @param {string} [options.logPrefix] - prefix for the messages logged when a failover is used
 * @returns {Function} an ajax function with failover behavior
 */
export function withAjaxFailover(ajax, { getFailoverUrl, maxFailureMs = DEFAULT_MAX_FAILURE_MS, logPrefix = 'ajaxFailover' } = {}) {
  return function (url, callbacks, data, options) {
    if (typeof callbacks?.error !== 'function') {
      return ajax(url, callbacks, data, options);
    }

    if (failoverActive) {
      const failoverUrl = getFailoverUrl(url);
      if (failoverUrl) {
        logInfo(`${logPrefix}: an earlier request failed with a network error, sending the request to ${new URL(failoverUrl).hostname}`);
        return ajax(failoverUrl, callbacks, data, options);
      }
    }

    const start = timestamp();
    return ajax(url, {
      success: callbacks.success,
      error: (message, xhr) => {
        const elapsed = timestamp() - start;
        const failoverUrl = xhr?.status === 0 && !xhr.timedOut && elapsed <= maxFailureMs
          ? getFailoverUrl(url)
          : null;
        if (!failoverUrl) {
          return callbacks.error(message, xhr);
        }
        failoverActive = true;
        logWarn(`${logPrefix}: request failed with a network error after ${elapsed}ms, retrying on ${new URL(failoverUrl).hostname}`);
        ajax(failoverUrl, callbacks, data, options);
      }
    }, data, options);
  };
}

/**
 * Picks the domain to fail over to.
 *
 * @param {string} defaultDomain - used when no domain is configured, or the configured one is not a valid hostname
 * @param {*} userConfiguredDomain - domain configured by the publisher, must be a bare hostname (no scheme, port or path)
 * @param {string} [logPrefix] - prefix for the warning logged when the configured domain is invalid
 * @returns {string}
 */
export function selectFailoverDomain(defaultDomain, userConfiguredDomain, logPrefix = 'ajaxFailover') {
  if (userConfiguredDomain === undefined || userConfiguredDomain === null) {
    return defaultDomain;
  }
  if (isHostname(userConfiguredDomain)) {
    return userConfiguredDomain;
  }
  logWarn(`${logPrefix}: failoverDomain must be a hostname without a scheme or path, using ${defaultDomain}`);
  return defaultDomain;
}

/**
 * Picks how long a failure may take and still be retried on the failover url.
 *
 * @param {*} userConfiguredMs - value configured by the publisher, must be a number of milliseconds greater than 0
 * @param {string} [logPrefix] - prefix for the warning logged when the configured value is invalid
 * @returns {number} the configured value, or DEFAULT_MAX_FAILURE_MS if none was configured or it is not valid
 */
export function selectMaxFailureMs(userConfiguredMs, logPrefix = 'ajaxFailover') {
  if (userConfiguredMs === undefined || userConfiguredMs === null) {
    return DEFAULT_MAX_FAILURE_MS;
  }
  if (Number.isFinite(userConfiguredMs) && userConfiguredMs > 0) {
    return userConfiguredMs;
  }
  logWarn(`${logPrefix}: failoverMaxFailureMs must be a number of milliseconds greater than 0, using ${DEFAULT_MAX_FAILURE_MS}`);
  return DEFAULT_MAX_FAILURE_MS;
}

/**
 * withAjaxFailover for the common case of failing over to another domain: the request url is kept and only its
 * host is replaced, by the publisher configured domain if there is a valid one and by the default domain otherwise.
 *
 * @param {Function} ajax - the ajax function provided by Prebid
 * @param {Object} options
 * @param {boolean} [options.enabled] - the failover is disabled only when this is exactly false
 * @param {string} options.defaultDomain - see selectFailoverDomain
 * @param {*} [options.userConfiguredDomain] - see selectFailoverDomain
 * @param {*} [options.userConfiguredMaxFailureMs] - see selectMaxFailureMs
 * @param {string} [options.logPrefix] - see withAjaxFailover
 * @returns {Function} an ajax function with failover behavior, or the given ajax function if the failover is disabled
 */
export function withDomainFailover(ajax, { enabled, defaultDomain, userConfiguredDomain, userConfiguredMaxFailureMs, logPrefix } = {}) {
  if (enabled === false) {
    return ajax;
  }
  return withAjaxFailover(ajax, {
    getFailoverUrl: url => replaceHostname(url, selectFailoverDomain(defaultDomain, userConfiguredDomain, logPrefix)),
    maxFailureMs: selectMaxFailureMs(userConfiguredMaxFailureMs, logPrefix),
    logPrefix
  });
}
