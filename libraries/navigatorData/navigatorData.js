import { getWindowTopOf } from '../../src/utils.js';
export function getHLen(win = window) {
  let hLen;
  try {
    hLen = getWindowTopOf(win).history.length;
  } catch (error) {
    hLen = undefined;
  }
  return hLen;
}
