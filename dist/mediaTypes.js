"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VIDEO = exports.NATIVE = exports.BANNER = exports.ADPOD = void 0;
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
const NATIVE = exports.NATIVE = 'native';
/** @type {MediaType} */
const VIDEO = exports.VIDEO = 'video';
/** @type {MediaType} */
const BANNER = exports.BANNER = 'banner';
/** @type {VideoContext} */
const ADPOD = exports.ADPOD = 'adpod';