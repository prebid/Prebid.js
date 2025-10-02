import {canAccessWindowTop, internal as utilsInternals} from '../utils.js';

const CHECK_INTERVAL_MS = 20;

export function cachedGetter(getter) {
  let value, lastCheckTimestamp;
  return {
    get: function () {
      if (!value || !lastCheckTimestamp || (Date.now() - lastCheckTimestamp > CHECK_INTERVAL_MS)) {
        value = getter();
        lastCheckTimestamp = Date.now();
      }
      return value;
    },
    reset: function () {
      value = getter();
    }
  }
}

function fetchWinDimensions() {
  const top = canAccessWindowTop() ? utilsInternals.getWindowTop() : utilsInternals.getWindowSelf();

  return {
    screen: {
      width: top.screen?.width,
      height: top.screen?.height
    },
    innerHeight: top.innerHeight,
    innerWidth: top.innerWidth,
    visualViewport: {
      height: top.visualViewport?.height,
      width: top.visualViewport?.width,
    },
    document: {
      documentElement: {
        clientWidth: top.document?.documentElement?.clientWidth,
        clientHeight: top.document?.documentElement?.clientHeight,
        scrollTop: top.document?.documentElement?.scrollTop,
        scrollLeft: top.document?.documentElement?.scrollLeft,
      },
      body: {
        scrollTop: document.body?.scrollTop,
        scrollLeft: document.body?.scrollLeft,
        clientWidth: document.body?.clientWidth,
        clientHeight: document.body?.clientHeight,
      },
    }
  };
}
export const internal = {
  fetchWinDimensions,
  resetters: []
};

const winDimensions = cachedGetter(() => internal.fetchWinDimensions());

export const getWinDimensions = winDimensions.get;
internal.resetters.push(winDimensions.reset);

export function resetWinDimensions() {
  internal.resetters.forEach(fn => fn());
}

export function getScreenOrientation(win) {
  const fallbackWin = win ?? (canAccessWindowTop() ? utilsInternals.getWindowTop() : utilsInternals.getWindowSelf());
  const screenData = fallbackWin?.screen ?? utilsInternals.getWindowSelf()?.screen ?? window?.screen;
  const width = Number(screenData?.width);
  const height = Number(screenData?.height);

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return;
  }

  return height >= width ? 'portrait' : 'landscape';
}
