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
  const windowDimensions = getWinDimensions();
  try {
    const innerHeight = windowDimensions.innerHeight || windowDimensions.document.documentElement.clientHeight || windowDimensions.document.body.clientHeight || 0;
    const innerWidth = windowDimensions.innerWidth || windowDimensions.document.documentElement.clientWidth || windowDimensions.document.body.clientWidth || 0;
    return { width: innerWidth, height: innerHeight };
  } catch (e) {
    return {};
  }
}
