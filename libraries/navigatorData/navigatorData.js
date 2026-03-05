export function getHLen(win = window) {
  let hLen;
  try {
    hLen = win.top.history.length;
  } catch (error) {
    hLen = undefined;
  }
  return hLen;
}
