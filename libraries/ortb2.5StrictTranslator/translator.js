import {BidRequest} from './spec.js';
import {logWarn} from '../../src/utils.js';
import {toOrtb25} from '../ortb2.5Translator/translator.js';

function deleteField(errno, path, obj, field, value) {
  logWarn(`${path} is not valid ORTB 2.5, field will be removed from request:`, value);
  Array.isArray(obj) ? obj.splice(field, 1) : delete obj[field];
}

/**
 * Translates an ortb request to 2.5, and removes from the result any field that is:
 *  - not defined in the 2.5 spec, or
 *  - defined as an enum, but has a value that is not listed in the 2.5 spec.
 *
 * `ortb2` is modified in place and returned.
 *
 * Note that using this utility will cause your adapter to pull in an additional ~3KB after minification.
 * If possible, consider making your endpoint tolerant to unrecognized or invalid fields instead.
 *
 *
 * @param ortb2 ORTB request
 * @param translator translation function. The default moves 2.x fields that have a known standard location in 2.5.
 *                   See the `ortb2.5Translator` library.
 * @param onError a function invoked once for each field that is not valid according to the 2.5 spec; it takes
 *        (errno, path, obj, field, value), where:
 *         - errno is an error code (defined in dsl.js)
 *         - path is the JSON path of the offending field, for example `regs.gdpr`
 *         - obj is the object containing the offending field, for example `ortb2.regs`
 *         - field is the field name, for example `'gdpr'`
 *         - value is `obj[field]`.
 *        The default logs a warning and deletes the offending field.
 */
export function toOrtb25Strict(ortb2, translator = toOrtb25, onError = deleteField) {
  ortb2 = translator(ortb2);
  BidRequest(null, null, null, ortb2, onError);
  return ortb2;
}
