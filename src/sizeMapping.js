/**
 * @module sizeMapping
 */
import { isArray, logError, logMsg } from './utils';

exports.mapSizes = function(adUnit) {
  if(!adUnit.sizeMapping){
    return adUnit.sizes;
  }
  if(!isSizeMappingValid){
    return adUnit.sizes;
  }
  const width = getScreenWidth();
  if(width) {
    adUnit.sizes = adUnit.sizeMapping.find(sizeMapping =>{
      return width > sizeMapping.minWidth;
    }).sizes;
    logMsg(`AdUnit : ${adUnit.code} resized based on device widith to : ${adUnit.sizes}`);
  }
};

function isSizeMappingValid(sizeMapping) {
  if(!isArray(sizeMapping)){
    logError('sizeMapping needs at least one screen size defined');
    return false;
  }
  return true;
}

function getScreenWidth() {
  const w = window;
  const docElem = document.documentElement;
  const  body = document.getElementsByTagName('body')[0];
  return w.innerWidth || docElem.clientWidth || body.clientWidth;
}
