import { loadScript } from 'src/adloader';
import * as utils from 'src/utils';

export function Renderer(options) {
  const { url, config, id, callback, loaded } = options;
  this.url = url;
  this.config = config;
  this.handlers = {};
  this.id = id;

  // a renderer may use the following properties with Renderer.prototype.process
  // to delay rendering until the render function is loaded
  this.loaded = loaded;
  this.cmd = [];
  this.push = func => {
    if (typeof func !== 'function') {
      utils.logError('Commands given to Renderer.push must be wrapped in a function');
      return;
    }
    this.loaded ? func.call() : this.cmd.push(func);
  };

  // we expect to load a renderer url once only so cache the request to load script
  loadScript(url, callback, true);
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
 * If a Renderer is not loaded at the time renderer.render(bid) is called, add
 * the render function to the command queue with render.push(() => renderFunc)
 * then create a renderer callback that sets renderer.loaded to true and call
 * this function as renderer.process() to begin rendering
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
