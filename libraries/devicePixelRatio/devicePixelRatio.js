import {canAccessWindowTop, internal as utilsInternals} from '../../src/utils.js';

function isValidDpr(value) {
  return Number.isFinite(value) && value > 0;
}

function getFallbackWindow(win) {
  if (win) {
    return win;
  }

  return canAccessWindowTop() ? utilsInternals.getWindowTop() : utilsInternals.getWindowSelf();
}

function deriveFromScreen(screen) {
  const ratio = screen?.deviceXDPI && screen?.logicalXDPI ? screen.deviceXDPI / screen.logicalXDPI : undefined;

  if (isValidDpr(ratio)) {
    return ratio;
  }
}

function deriveFromDimensions(win, screen) {
  const innerWidth = Number(win?.innerWidth);
  const screenWidth = Number(screen?.width ?? screen?.availWidth);

  if (isValidDpr(innerWidth) && isValidDpr(screenWidth)) {
    const widthRatio = screenWidth / innerWidth;
    if (isValidDpr(widthRatio)) {
      return widthRatio;
    }
  }

  const innerHeight = Number(win?.innerHeight);
  const screenHeight = Number(screen?.height ?? screen?.availHeight);

  if (isValidDpr(innerHeight) && isValidDpr(screenHeight)) {
    const heightRatio = screenHeight / innerHeight;
    if (isValidDpr(heightRatio)) {
      return heightRatio;
    }
  }
}

export function getDevicePixelRatio(win) {
  const targetWindow = getFallbackWindow(win);
  const directValue = targetWindow?.devicePixelRatio;

  if (isValidDpr(directValue)) {
    return directValue;
  }

  const targetScreen = targetWindow?.screen ?? (win ? undefined : utilsInternals.getWindowSelf()?.screen ?? window?.screen);

  const derivedValue = deriveFromScreen(targetScreen) ?? deriveFromDimensions(targetWindow, targetScreen);

  if (isValidDpr(derivedValue)) {
    return derivedValue;
  }

  return 1;
}
