import { logError, logMessage } from './utils';

// This module serves to manage analytics adapters which are present in the build.
// Each Analytics Adapter module should register itself here, by importing the global
// `analyticsRegistry` and calling `registerInjectableAnalyticsAdapter`.
//
// See modules/appnexusAnalyticsAdapter.js for an example.

// newAnalyticsRegistry exists so that we can make side-effect-free unit tests.
export function newAnalyticsRegistry() {
  const _analyticsRegistry = {};

  function registerAnalyticsAdapter({adapter, code}) {
    registerInjectableAnalyticsAdapter({
      factory: function() { return adapter },
      code: code
    });
  }

  function registerInjectableAnalyticsAdapter({factory, code}) {
    if (factory && code) {
      _analyticsRegistry[code] = factory;
    } else {
      logError('Prebid Error: analyticsAdapterFactory or analyticsCode not specified');
    }
  }

  function newAnalyticsAdapter(code, dependencies = {}) {
    if (_analyticsRegistry[code]) {
      const analyticsAdapter = _analyticsRegistry[code](dependencies)
      if (typeof analyticsAdapter.enableAnalytics === 'function') {
        analyticsAdapter.code = code;
        return analyticsAdapter;
      } else {
        logError(`Analytics adaptor for "${code}" must implement an enableAnalytics() function`);
      }
    } else {
      logError(`Missing analytics adapter for "${code}". No bids will be fetched.`);
    }

    // In case of errors, return a "no-op" object so that the rest of the code works sensibly.
    // TODO: Make sure this actually handles the full API.
    return {
      code: code,
      enableAnalytics: function() { }
    }
  }

  return {
    registerAnalyticsAdapter: registerAnalyticsAdapter,
    registerInjectableAnalyticsAdapter: registerInjectableAnalyticsAdapter,
    newAnalyticsAdapter: newAnalyticsAdapter,
  };
}

// Global instance should be used throughout the prod code.
export const analyticsRegistry = newAnalyticsRegistry();
