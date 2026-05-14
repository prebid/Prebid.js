import { getWindowTop } from '../../src/utils.js';
import { percentInView } from '../percentInView/percentInView.js';
import { getMinSize } from '../sizeUtils/sizeUtils.js';
import { isIframe } from './index.js';

export function getRoundedViewability(adUnitCode, processedSizes) {
  const element = document.getElementById(adUnitCode);
  const minSize = getMinSize(processedSizes);
  const viewabilityAmount = isViewabilityMeasurable(element) ? getViewability(element, minSize) : 'na';
  return isNaN(viewabilityAmount) ? viewabilityAmount : Math.round(viewabilityAmount);
}

function isViewabilityMeasurable(element) {
  return !isIframe() && element !== null;
}

function getViewability(element, { w, h } = {}) {
  return getWindowTop().document.visibilityState === 'visible' ? percentInView(element, { w, h }) : 0;
}
