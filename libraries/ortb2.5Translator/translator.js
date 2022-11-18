import {BidRequest} from './spec.js';
import {logWarn} from '../../src/utils.js';
import {ERR_UNKNOWN_FIELD} from './dsl.js';

const RENAMES = {
  'regs.gdpr': 'regs.ext.gdpr'
};

export function toOrtb25(ortb2) {
  BidRequest('', null, null, ortb2, function (errno, path, obj, field, value) {
    logWarn(`${path} is not valid ORTB 2.5; field will be removed from request`);
    Array.isArray(obj) ? obj.splice(field, 1) : delete obj[field];
    if (errno === ERR_UNKNOWN_FIELD && RENAMES.hasOwnProperty(path)) {

    }
  });
  return ortb2;
}
