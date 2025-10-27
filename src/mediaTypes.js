/**
 * This file contains the valid Media Types in Prebid.
 *
 * All adapters are assumed to support banner ads. Other media types are specified by Adapters when they
 * register themselves with prebid-core.
 */

/**
 * @typedef {('native'|'video'|'banner')} MediaType
 * @typedef {('adpod')} VideoContext
 */

/** @type {MediaType} */
export const NATIVE = 'native';
/** @type {MediaType} */
export const VIDEO = 'video';
/** @type {MediaType} */
export const BANNER = 'banner';
/** @type {VideoContext} */
export const ADPOD = 'adpod';

export const ALL_MEDIATYPES = [NATIVE, VIDEO, BANNER];
