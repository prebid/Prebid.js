import { ajax } from './ajax';

export class Renderer {
  // constructor receives ad object
  constructor(adObject) {
    Renderer.renderers = adObject.rendererUrl;
  }

  static get renderers() {
    return Renderer.renderers;
  }

  static set renderers(url) {
    return Renderer.renderers.push(url);
  }

  // static method load
  static load() {
    // ajax(url, callback, data, options)
    ajax(...arguments);
  }
}