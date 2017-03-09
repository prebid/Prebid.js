/**
 * @module sizeMapping
 */
import * as utils from './utils';
let _win;

function getResponsiveAdUnits(adUnits) {
  adUnits.forEach(function (adUnit) {
    if(!isSizeMappingValid(adUnit.sizeMapping)){
      return adUnit;
    }
    let sizeMap = getActiveSizeMap(adUnit);
    adUnit.bids = sizeMap.bids;
    adUnit.sizes = sizeMap.sizes;
  });
  return adUnits;
}

function getActiveSizeMap(adUnit) {
  const width = getScreenWidth();
  if(!width) {
    //size not detected - get largest value set for desktop
    const mapping = adUnit.sizeMapping.reduce((prev, curr) => {
      return prev.minWidth < curr.minWidth ? curr : prev;
    });
    if(mapping.sizes) {
      return mapping.sizes;
    }
    return adUnit.sizes;
  }
  const sizeMap = adUnit.sizeMapping.find(sizeMapping =>{
    return width > sizeMapping.minWidth;
  });
  if (sizeMap) {
    utils.logMessage(`AdUnit : ${adUnit.code} using sizeMapping for minWidth : ${sizeMap.minWidth}`);
  } else {
    utils.logMessage(`AdUnit : ${adUnit.code} not mapped to any sizes for device width. Using default sizes and bids for adUnit. This request will be suppressed.`);
  }
  return sizeMap;
}

function isSizeMappingValid(sizeMapping) {
  if(utils.isArray(sizeMapping) && sizeMapping.length > 0){
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

export { getResponsiveAdUnits, getActiveSizeMap, getScreenWidth, setWindow };
