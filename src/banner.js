import { isArrayOfNums, isInteger, isStr } from './utils.js';

/**
 * List of OpenRTB 2.x banner object properties with simple validators.
 * Not included: `ext`
 * reference: https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
 */
export const ORTB_BANNER_PARAMS = new Map([
  [ 'format', value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'object') ],
  [ 'w', isInteger ],
  [ 'h', isInteger ],
  [ 'btype', isArrayOfNums ],
  [ 'battr', isArrayOfNums ],
  [ 'pos', isInteger ],
  [ 'mimes', value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string') ],
  [ 'topframe', value => [1, 0].includes(value) ],
  [ 'expdir', isArrayOfNums ],
  [ 'api', isArrayOfNums ],
  [ 'id', isStr ],
  [ 'vcm', value => [1, 0].includes(value) ]
]);
