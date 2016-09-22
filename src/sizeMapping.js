/**
 * @module sizeMapping
 */
import * as utils from './utils';

exports.mapSizes = function(adUnit) {
  if(!isSizeMappingValid(adUnit.sizeMapping)){
    return adUnit.sizes;
  }
  const width = this.getScreenWidth();
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
  const sizes = adUnit.sizeMapping.find(sizeMapping =>{
    return width > sizeMapping.minWidth;
  }).sizes;
  utils.logMessage(`AdUnit : ${adUnit.code} resized based on device width to : ${adUnit.sizes}`);
  return sizes;

};

function isSizeMappingValid(sizeMapping) {
  if(utils.isArray(sizeMapping) && sizeMapping.length > 0){
    return true;
  }
  utils.logError('sizeMapping needs at least one screen size defined');
  return false;
}

exports.getScreenWidth = function(win) {
  const w = win || window;
  const docElem = w.document.documentElement;
  const body = w.document.getElementsByTagName('body')[0];
  if(w.innerWidth) {
    return w.innerWidth;
  }
  else if(docElem && docElem.clientWidth ) {
    return docElem.clientWidth;
  }
  else if(body && body.clientWidth){
    return body.clientWidth;
  }
  return 0;
};
