import { install } from './devtoolsMcp.ts';

window._pbjsGlobals.forEach((name) => {
  if (window[name] && window[name]._installDevtoolsMcp === true) {
    window[name]._installDevtoolsMcp = install;
  }
});
