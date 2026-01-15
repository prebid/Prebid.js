function isDntValue(value) {
  // codex bot: preserve numeric DNT signals.
  if (value === 1 || value === '1') {
    return true;
  }

  return typeof value === 'string' && value.toLowerCase() === 'yes';
}

function _getDNT(win) {
  return isDntValue(win.navigator.doNotTrack) ||
    isDntValue(win.doNotTrack) ||
    isDntValue(win.navigator.msDoNotTrack);
}

export function getDNT(win = window) {
  try {
    return _getDNT(win) || (win !== win.top && _getDNT(win.top));
  } catch (e) {
    return false;
  }
}
