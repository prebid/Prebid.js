import {getWindowTop} from '../../src/utils.js';

export function getViewportCoordinates() {
  try {
    const win = getWindowTop();
    let { scrollY: top, scrollX: left, innerHeight, innerWidth } = win;
    innerHeight = innerHeight || win.document.documentElement.clientWidth || win.document.body.clientWidth;
    innerWidth = innerWidth || win.document.documentElement.clientHeight || win.document.body.clientHeight
    return { top, right: left + innerWidth, bottom: top + innerHeight, left };
  } catch (e) {
    return {};
  }
}
