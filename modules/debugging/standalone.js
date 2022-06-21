import {install} from './debugging.js';

window._pbjsGlobals.forEach((name) => {
  if (window[name] && window[name]._installDebugging === true) {
    window[name]._installDebugging = install;
  }
})
