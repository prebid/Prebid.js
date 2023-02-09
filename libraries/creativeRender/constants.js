import events from '../../src/constants.json';

export const PREBID_NATIVE = 'Prebid Native';
export const PREBID_REQUEST = 'Prebid Request';
export const PREBID_RESPONSE = 'Prebid Response';
export const PREBID_EVENT = 'Prebid Event';
export const AD_RENDER_SUCCEEDED = events.EVENTS.AD_RENDER_SUCCEEDED;
export const AD_RENDER_FAILED = events.EVENTS.AD_RENDER_FAILED;
export const NO_AD = events.AD_RENDER_FAILED_REASON.NO_AD;
export const EXCEPTION = events.AD_RENDER_FAILED_REASON.EXCEPTION;
