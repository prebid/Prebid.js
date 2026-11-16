import { getWindowTop } from '../../src/utils.js';
export function getHLen(win = window) {
  let hLen;
  try {
    hLen = getWindowTop(win).history.length;
  } catch (error) {
    hLen = undefined;
  }
  return hLen;
}
