import {canAccessWindowTop, getWinDimensions, internal as utilsInternals} from '../../src/utils.js';

function isValidNum(value) {
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

  if (isValidNum(ratio)) {
    return ratio;
  }
}

function deriveFromDimensions(winDimensions) {
  const innerWidth = Number(winDimensions?.innerWidth);
  const screenWidth = Number(winDimensions?.screen?.width);
  const widthRatio = screenWidth / innerWidth;
  if (isValidNum(widthRatio)) {
    return widthRatio;
  }

  const innerHeight = Number(winDimensions?.innerHeight);
  const screenHeight = Number(winDimensions?.screen?.height);

  const heightRatio = screenHeight / innerHeight;
  if (isValidNum(heightRatio)) {
    return heightRatio;
  }
}

export function getDevicePixelRatio(win) {
  try {
    const targetWindow = getFallbackWindow(win);
    const targetScreen = targetWindow?.screen;
    const derivedValue = deriveFromScreen(targetScreen) ?? deriveFromDimensions(getWinDimensions());

    if (isValidNum(derivedValue)) {
      return derivedValue;
    }
  } catch (e) {}

  return 1;
}
