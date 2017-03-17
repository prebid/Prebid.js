/**
 * @module sizeMapping
 */
import * as utils from './utils';
let _win;

function getResponsiveAdUnits(adUnits) {
  return adUnits.map(adUnit => {
    if(!isSizeMappingValid(adUnit.sizeMapping)){
      return adUnit;
    }
    let sizeMap = getActiveSizeMap(adUnit);
    return Object.assign({}, adUnit, {
            bids: sizeMap.bids ? sizeMap.bids : adUnit.bids,
            sizes: sizeMap.sizes ? sizeMap.sizes : adUnit.sizes
          });
  });
}

function getActiveSizeMap(adUnit) {
  const width = getScreenWidth();
  if(!width) {
    //size not detected - get largest value set for desktop
    const sizeMap = adUnit.sizeMapping.reduce((prev, curr) => {
      return prev.minWidth < curr.minWidth ? curr : prev;
    });
    if(sizeMap) {
      return sizeMap;
    }
  }
  const sizeMap = adUnit.sizeMapping.find(sizeMapping =>{
    return width >= sizeMapping.minWidth;
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
