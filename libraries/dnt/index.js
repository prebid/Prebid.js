function _getDNT(win) {
  return win.navigator.doNotTrack === '1' || win.doNotTrack === '1' || win.navigator.msDoNotTrack === '1' || win.navigator.doNotTrack?.toLowerCase?.() === 'yes';
}

export function getDNT(win = window) {
  try {
    return _getDNT(win) || (win !== win.top && _getDNT(win.top));
  } catch (e) {
    return false;
  }
}
