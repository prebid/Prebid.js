import {getWinDimensions, getWindowTop} from '../../src/utils.js';

export function getViewportCoordinates() {
  try {
    const win = getWindowTop();
    let { scrollY: top, scrollX: left } = win;
    const { height: innerHeight, width: innerWidth } = getViewportSize();
    return { top, right: left + innerWidth, bottom: top + innerHeight, left };
  } catch (e) {
    return {};
  }
}

export function getViewportSize() {
  try {
    const innerHeight = getWinDimensions('innerHeight') || getWinDimensions('document.documentElement.clientHeight') || getWinDimensions('document.body.clientHeight') || 0;
    const innerWidth = getWinDimensions('innerWidth') || getWinDimensions('document.documentElement.clientWidth') || getWinDimensions('document.body.clientWidth') || 0;
    return { width: innerWidth, height: innerHeight };
  } catch (e) {
    return {};
  }
}
