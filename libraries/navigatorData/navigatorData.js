export function getHLen(win = window) {
  let hLen;
  try {
    hLen = win.top.history.length;
  } catch (error) {
    hLen = undefined;
  }
  return hLen;
}

export function getHC(win = window) {
  let hc;
  try {
    hc = win.top.navigator.hardwareConcurrency;
  } catch (error) {
    hc = undefined;
  }
  return hc;
}

export function getDM(win = window) {
  let dm;
  try {
    dm = win.top.navigator.deviceMemory;
  } catch (error) {
    dm = undefined;
  }
  return dm;
}

export { getDNT } from './dnt.js';
