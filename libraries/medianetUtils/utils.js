import { _map, deepAccess, isFn, isPlainObject, uniques } from '../../src/utils.js';
import {mnetGlobals} from './constants.js';
import {getViewportSize} from '../viewport/viewport.js';

export function findBidObj(list = [], key, value) {
  return list.find((bid) => {
    return bid[key] === value;
  });
}

export function filterBidsListByFilters(list = [], filters) {
  return list.filter((bid) => {
    return Object.entries(filters).every(([key, value]) => bid[key] === value);
  });
}

export function flattenObj(obj, parent, res = {}) {
  for (const key in obj) {
    if (Array.isArray(obj[key])) {
      continue;
    }
    const propName = parent ? parent + '.' + key : key;
    if (typeof obj[key] === 'object') {
      flattenObj(obj[key], propName, res);
    } else {
      res[propName] = String(obj[key]);
    }
  }
  return res;
}

export function formatQS(data) {
  return _map(data, (value, key) => {
    if (value === undefined) {
      return key + '=';
    }
    if (isPlainObject(value)) {
      value = JSON.stringify(value);
    }
    return key + '=' + encodeURIComponent(value);
  }).join('&');
}

export function getWindowSize() {
  const { width, height } = getViewportSize();
  const w = width || -1;
  const h = height || -1;
  return `${w}x${h}`;
}

export function getRequestedSizes({ mediaTypes, sizes }) {
  const banner = deepAccess(mediaTypes, 'banner.sizes') || sizes || [];
  const native = deepAccess(mediaTypes, 'native') ? [[1, 1]] : [];
  const playerSize = deepAccess(mediaTypes, 'video.playerSize') || [];
  let video = [];
  if (playerSize.length === 2) {
    video = [playerSize];
  }
  return [...banner, ...native, ...video].filter(uniques).map((size) => size.join('x'));
}

export function getBidResponseSize(width, height) {
  if (isNaN(width) || isNaN(height)) {
    return '';
  }
  return width + 'x' + height;
}

export function calculateRoundTripTime(metrics) {
  if (!metrics || !isFn(metrics.getMetrics)) {
    return -1;
  }
  const prebidMetrics = metrics.getMetrics();
  const ltime =
    prebidMetrics['adapter.client.total'] ||
    prebidMetrics['adapter.s2s.total']?.[0] ||
    prebidMetrics['adapter.s2s.total'] ||
    -1;
  return parseFloat(ltime.toFixed(2));
}

export function pick(context, properties, omitKeys = false) {
  if (typeof context !== 'object' || context === null) return {};
  const acc = {};
  properties.forEach((prop, index) => {
    if (typeof prop === 'function') {
      return;
    }

    let value, alias;
    let [key, aliasPart] = prop.split(/\sas\s/i);
    key = key.trim();
    alias = aliasPart?.trim() || key.split('.').pop();

    value = deepAccess(context, key);

    if (typeof properties[index + 1] === 'function') {
      value = properties[index + 1](value, acc, context);
    }

    if (value !== undefined || !omitKeys) {
      acc[alias] = value;
    }
  });

  return acc;
}

export const onHidden = (cb, once = true) => {
  const onHiddenOrPageHide = (event) => {
    if (document.visibilityState === 'hidden') {
      cb(event);
      if (once) {
        window.removeEventListener('visibilitychange', onHiddenOrPageHide, true);
        window.removeEventListener('pagehide', onHiddenOrPageHide, true);
      }
    }
  };
  window.addEventListener('visibilitychange', onHiddenOrPageHide, true);
  // Some browsers have buggy implementations of visibilitychange,
  // so we use pagehide in addition, just to be safe.
  window.addEventListener('pagehide', onHiddenOrPageHide, true);

  // if the document is already hidden
  onHiddenOrPageHide({});
};

export function getTopWindowReferrer(ref) {
  try {
    if (ref) return ref;
    return window.top.document.referrer;
  } catch (e) {
    return document.referrer;
  }
}

export function isSampledForLogging() {
  return Math.random() * 100 < parseFloat(mnetGlobals.configuration.loggingPercent);
}
