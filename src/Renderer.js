import { loadExternalScript } from './adloader.js';
import * as utils from './utils.js';
import find from 'core-js-pure/features/array/find.js';
const moduleCode = 'outstream';

/**
 * @typedef {object} Renderer
 *
 * A Renderer stores some functions which are used to render a particular Bid.
 * These are used in Outstream Video Bids, returned on the Bid by the adapter, and will
 * be used to render that bid unless the Publisher overrides them.
 */

export function Renderer(options) {
  const { url, config, id, callback, loaded, adUnitCode } = options;
  this.url = url;
  this.config = config;
  this.handlers = {};
  this.id = id;

  // a renderer may push to the command queue to delay rendering until the
  // render function is loaded by loadExternalScript, at which point the the command
  // queue will be processed
  this.loaded = loaded;
  this.cmd = [];
  this.push = func => {
    if (typeof func !== 'function') {
      utils.logError('Commands given to Renderer.push must be wrapped in a function');
      return;
    }
    this.loaded ? func.call() : this.cmd.push(func);
  };

  // bidders may override this with the `callback` property given to `install`
  this.callback = callback || (() => {
    this.loaded = true;
    this.process();
  });

  // use a function, not an arrow, in order to be able to pass "arguments" through
  this.render = function () {
    if (!isRendererDefinedOnAdUnit(adUnitCode)) {
      // we expect to load a renderer url once only so cache the request to load script
      loadExternalScript(url, moduleCode, this.callback);
    } else {
      utils.logWarn(`External Js not loaded by Renderer since renderer url and callback is already defined on adUnit ${adUnitCode}`);
    }

    if (this._render) {
      this._render.apply(this, arguments) // _render is expected to use push as appropriate
    } else {
      utils.logWarn(`No render function was provided, please use .setRender on the renderer`);
    }
  }.bind(this) // bind the function to this object to avoid 'this' errors
}

Renderer.install = function({ url, config, id, callback, loaded, adUnitCode }) {
  return new Renderer({ url, config, id, callback, loaded, adUnitCode });
};

Renderer.prototype.getConfig = function() {
  return this.config;
};

Renderer.prototype.setRender = function(fn) {
  this._render = fn;
};

Renderer.prototype.setEventHandlers = function(handlers) {
  this.handlers = handlers;
};

Renderer.prototype.handleVideoEvent = function({ id, eventName }) {
  if (typeof this.handlers[eventName] === 'function') {
    this.handlers[eventName]();
  }

  utils.logMessage(`Prebid Renderer event for id ${id} type ${eventName}`);
};

/*
 * Calls functions that were pushed to the command queue before the
 * renderer was loaded by `loadExternalScript`
 */
Renderer.prototype.process = function() {
  while (this.cmd.length > 0) {
    try {
      this.cmd.shift().call();
    } catch (error) {
      utils.logError('Error processing Renderer command: ', error);
    }
  }
};

/**
 * Checks whether creative rendering should be done by Renderer or not.
 * @param {Object} renderer Renderer object installed by adapter
 * @returns {Boolean}
 */
export function isRendererRequired(renderer) {
  return !!(renderer && renderer.url);
}

/**
 * Render the bid returned by the adapter
 * @param {Object} renderer Renderer object installed by adapter
 * @param {Object} bid Bid response
 */
export function executeRenderer(renderer, bid) {
  renderer.render(bid);
}

function isRendererDefinedOnAdUnit(adUnitCode) {
  const adUnits = $$PREBID_GLOBAL$$.adUnits;
  const adUnit = find(adUnits, adUnit => {
    return adUnit.code === adUnitCode;
  });
  return !!(adUnit && adUnit.renderer && adUnit.renderer.url && adUnit.renderer.render);
}
