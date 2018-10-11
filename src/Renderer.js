import { loadScript } from './adloader';
import * as utils from './utils';

/**
 * @typedef {object} Renderer
 *
 * A Renderer stores some functions which are used to render a particular Bid.
 * These are used in Outstream Video Bids, returned on the Bid by the adapter, and will
 * be used to render that bid unless the Publisher overrides them.
 */

export function Renderer(options) {
  const { url, config, id, callback, loaded } = options;
  this.url = url;
  this.config = config;
  this.handlers = {};
  this.id = id;

  // a renderer may push to the command queue to delay rendering until the
  // render function is loaded by loadScript, at which point the the command
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

  // we expect to load a renderer url once only so cache the request to load script
  loadScript(url, this.callback, true);
}

Renderer.install = function({ url, config, id, callback, loaded }) {
  return new Renderer({ url, config, id, callback, loaded });
};

Renderer.prototype.getConfig = function() {
  return this.config;
};

Renderer.prototype.setRender = function(fn) {
  this.render = fn;
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
 * renderer was loaded by `loadScript`
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
