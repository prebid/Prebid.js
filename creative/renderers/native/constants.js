// eslint-disable-next-line prebid/validate-imports
import CONSTANTS from '../../../src/constants.json';

export const MESSAGE_NATIVE = CONSTANTS.MESSAGES.NATIVE;
export const MESSAGE_EVENT = CONSTANTS.MESSAGES.EVENT;
export const EVENT_AD_RENDER_SUCCEEDED = CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED;
export const EVENT_AD_RENDER_FAILED = CONSTANTS.EVENTS.AD_RENDER_FAILED;
export const FAILURE_REASON_EXCEPTION = CONSTANTS.AD_RENDER_FAILED_REASON.EXCEPTION;
export const ACTION_RESIZE = 'resizeNativeHeight';
export const ACTION_CLICK = 'click';
export const ACTION_IMP = 'fireNativeImpressionTrackers';

export const ORTB_ASSETS = {
  title: 'text',
  data: 'value',
  img: 'url',
  video: 'vasttag'
}
