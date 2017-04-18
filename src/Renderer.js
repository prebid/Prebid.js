import { loadScript } from 'src/adloader';
import * as utils from 'src/utils';

export function Renderer(options) {
  const { url, config, id, callback } = options;
  this.url = url;
  this.config = config;
  this.callback = callback;
  this.handlers = {};
  this.id = id;

  // we expect to load a renderer url once only so cache the request to load script
  loadScript(url, callback, true);
}

Renderer.install = function({ url, config, id, callback }) {
  return new Renderer({ url, config, id, callback });
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
