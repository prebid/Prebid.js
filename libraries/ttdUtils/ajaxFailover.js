import { logWarn, timestamp } from '../../src/utils.js';

export const DEFAULT_MAX_FAILURE_MS = 1000;

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

/**
 * Wraps the ajax function provided by Prebid so that a request which fails quickly with a network error
 * (status 0, not a timeout, e.g. a DNS resolution failure or a blocked domain) is retried once on another url.
 * HTTP error responses and timeouts are never retried. The retry reuses the original payload, options and
 * callbacks, so a second failure is reported as usual and is not retried again.
 *
 * @param {Function} ajax - the ajax function provided by Prebid
 * @param {Object} options
 * @param {function(string): (string|null)} options.getFailoverUrl - given the url that failed, returns the url to retry
 *   on, or null to not retry. Only called when the failure qualifies for a retry.
 * @param {number} [options.maxFailureMs] - failures slower than this are not retried
 * @param {string} [options.logPrefix] - prefix for the warning logged when a retry is made
 * @returns {Function} an ajax function with failover behavior
 */
export function withAjaxFailover(ajax, { getFailoverUrl, maxFailureMs = DEFAULT_MAX_FAILURE_MS, logPrefix = 'ajaxFailover' } = {}) {
  return function (url, callbacks, data, options) {
    if (typeof callbacks?.error !== 'function') {
      return ajax(url, callbacks, data, options);
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
 * withAjaxFailover for the common case of failing over to another domain: the request url is kept and only its
 * host is replaced, by the publisher configured domain if there is a valid one and by the default domain otherwise.
 *
 * @param {Function} ajax - the ajax function provided by Prebid
 * @param {Object} options
 * @param {boolean} [options.enabled] - the failover is disabled only when this is exactly false
 * @param {string} options.defaultDomain - see selectFailoverDomain
 * @param {*} [options.userConfiguredDomain] - see selectFailoverDomain
 * @param {string} [options.logPrefix] - see withAjaxFailover
 * @param {number} [options.maxFailureMs] - see withAjaxFailover
 * @returns {Function} an ajax function with failover behavior, or the given ajax function if the failover is disabled
 */
export function withDomainFailover(ajax, { enabled, defaultDomain, userConfiguredDomain, logPrefix, maxFailureMs } = {}) {
  if (enabled === false) {
    return ajax;
  }
  return withAjaxFailover(ajax, {
    getFailoverUrl: url => replaceHostname(url, selectFailoverDomain(defaultDomain, userConfiguredDomain, logPrefix)),
    logPrefix,
    maxFailureMs
  });
}
