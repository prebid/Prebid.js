/**
 * @module sizeMapping
 */
import * as utils from './utils';
let _win;

function mapSizes(adUnit) {
  if (!isSizeMappingValid(adUnit.sizeMapping)) {
    return adUnit.sizes;
  }
  const width = getScreenWidth();
  if (!width) {
    // size not detected - get largest value set for desktop
    const mapping = adUnit.sizeMapping.reduce((prev, curr) => {
      return prev.minWidth < curr.minWidth ? curr : prev;
    });
    if (mapping.sizes && mapping.sizes.length) {
      return mapping.sizes;
    }
    return adUnit.sizes;
  }
  let sizes = '';
  const mapping = adUnit.sizeMapping.find(sizeMapping => {
    return width >= sizeMapping.minWidth;
  });
  if (mapping && mapping.sizes && mapping.sizes.length) {
    sizes = mapping.sizes;
    utils.logMessage(`AdUnit : ${adUnit.code} resized based on device width to : ${sizes}`);
  }
  else {
    utils.logMessage(`AdUnit : ${adUnit.code} not mapped to any sizes for device width. This request will be suppressed.`);
  }
  return sizes;
}

function isSizeMappingValid(sizeMapping) {
  if (utils.isArray(sizeMapping) && sizeMapping.length > 0) {
    return true;
  }
  utils.logInfo('No size mapping defined');
  return false;
}

function getScreenWidth(win) {
  var w = win || _win || window;
  var d = w.document;

  if (w.innerWidth) {
    return w.innerWidth;
  }
  else if (d.body.clientWidth) {
    return d.body.clientWidth;
  }
  else if (d.documentElement.clientWidth) {
    return d.documentElement.clientWidth;
  }
  return 0;
}

function setWindow(win) {
  _win = win;
}

export { mapSizes, getScreenWidth, setWindow };
