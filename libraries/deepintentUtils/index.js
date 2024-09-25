import { isInteger } from '../../src/utils.js';

export const COMMON_ORTB_VIDEO_PARAMS = {
  'mimes': (value) => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string'),
  'minduration': (value) => isInteger(value),
  'maxduration': (value) => isInteger(value),
  'protocols': (value) => Array.isArray(value) && value.every(v => v >= 1 && v <= 10),
  'w': (value) => isInteger(value),
  'h': (value) => isInteger(value),
  'startdelay': (value) => isInteger(value),
  'linearity': (value) => [1, 2].indexOf(value) !== -1,
  'skip': (value) => [0, 1].indexOf(value) !== -1,
  'skipmin': (value) => isInteger(value),
  'skipafter': (value) => isInteger(value),
  'sequence': (value) => isInteger(value),
  'battr': (value) => Array.isArray(value) && value.every(v => v >= 1 && v <= 17),
  'maxextended': (value) => isInteger(value),
  'minbitrate': (value) => isInteger(value),
  'maxbitrate': (value) => isInteger(value),
  'boxingallowed': (value) => [0, 1].indexOf(value) !== -1,
  'playbackmethod': (value) => Array.isArray(value) && value.every(v => v >= 1 && v <= 6),
  'playbackend': (value) => [1, 2, 3].indexOf(value) !== -1,
  'api': (value) => Array.isArray(value) && value.every(v => v >= 1 && v <= 6)
};