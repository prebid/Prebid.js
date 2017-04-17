import { loadScript } from 'src/adloader';

const renderers = [];

export function Renderer(options) {
  const { url, config, callback } = options;
  this.url = url;
  this.config = config;
  this.callback = callback;
  this.loadRenderer(url);
  renderers.concat([this]);
}

Renderer.prototype.getRenderers = function() {
  return renderers;
};

Renderer.prototype.loadRenderer = function(url, callback) {
  loadScript(url, callback);
};

Renderer.prototype.initializeRenderer = function() {
  // pass config object
};

Renderer.prototype.invokeCallback = function() {
  // if a callback was provided call it now
  this.callback();
};

Renderer.prototype.setRender = function(fn) {
  this.render = fn;
};

Renderer.prototype.notRendererInstalled = function(url) {
  return typeof Renderer.prototype.getRenderers()
    .find(renderer => renderer.url === url) === 'undefined';
};
