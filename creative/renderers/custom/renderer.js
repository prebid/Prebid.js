import { ERROR_NO_AD } from './constants.js';

/**
 * Self-contained renderer for injection as a string (postMessage → iframe srcdoc, see creative/crossDomain.js).
 * Avoid a literal SCRIPT_END token (less-than, slash, s-c-r-i-p-t, greater-than) — it closes the outer HTML script tag.
 *
 * Custom renderer URL contract (runs inside the ad iframe, after bootstrap):
 *   window.pbRegisterCustomRender(function (ctx) { ... });
 * ctx: { ad, adUrl, width, height, instl, adId, customRendererUrl, vastXml, adUnitCode } — full payload; no HTML
 * from `ad` is written into the iframe document. The remote module decides what to render.
 * The function must be registered synchronously while the remote script loads (no defer-only registration).
 */
;(function () {
  'use strict';

  function serializeForInlineScript(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
  }

  /** Closing script tag for HTML inside srcdoc (built from pieces so this source stays embeddable). */
  function scriptClose() {
    return '</scr' + 'ipt>';
  }

  /**
   * Minimal iframe document: only bootstrap, remote customRendererUrl, runner. Empty body — no ad markup.
   * `ctx` must be the normalized object from render() (stable shape for custom renderers).
   */
  function buildCustomRendererSrcdoc(customRendererUrl, ctx) {
    var sc = scriptClose();
    var bootstrap =
      '<script>' +
      'window.pbCustomRenderContext=' + serializeForInlineScript(ctx) + ';' +
      'window.pbRegisterCustomRender=function(impl){window.pbCustomRenderImpl=impl;};' +
      sc;
    var remote = '<script src="' + customRendererUrl + '">' + sc;
    var runner =
      '<script>' +
      '(function(){' +
      'function run(){' +
      'var fn=window.pbCustomRenderImpl;' +
      'if(typeof fn!=="function"){' +
      'throw new Error("Prebid custom renderer: call pbRegisterCustomRender(function(ctx){...}) from customRendererUrl");' +
      '}' +
      'fn(window.pbCustomRenderContext);' +
      '}' +
      'if(document.readyState==="loading"){' +
      'document.addEventListener("DOMContentLoaded",run);' +
      '}else{' +
      'run();' +
      '}' +
      '})();' +
      sc;
    var scripts = bootstrap + remote + runner;
    return scripts;
  }

  function render(data, deps, win) {
    var ad = data.ad;
    var adUrl = data.adUrl;
    var width = data.width;
    var height = data.height;
    var instl = data.instl;
    var customRendererUrl = data.customRendererUrl;
    var adId = data.adId;
    var vastXml = data.vastXml;
    var adUnitCode = data.adUnitCode;

    if (!ad && !adUrl && !customRendererUrl) {
      var err = new Error('Missing ad markup, ad URL, or customRendererUrl');
      err.reason = ERROR_NO_AD;
      throw err;
    }

    if (height == null) {
      var body = win.document && win.document.body;
      var parent = body && body.parentElement;
      if (body && body.style) body.style.height = '100%';
      if (parent && parent.style) parent.style.height = '100%';
    }

    var doc = win.document;
    var attrs = {
      width: width != null ? width : '100%',
      height: height != null ? height : '100%'
    };
    var ctx = {
      ad: ad ?? null,
      adUrl: adUrl ?? null,
      width: width ?? null,
      height: height ?? null,
      instl: !!instl,
      adId: adId ?? null,
      customRendererUrl: customRendererUrl ?? null,
      vastXml: vastXml ?? null,
      adUnitCode: adUnitCode ?? null
    };
    if (customRendererUrl) {
      attrs.srcdoc = buildCustomRendererSrcdoc(customRendererUrl, ctx);
    } else if (adUrl && !ad) {
      attrs.src = adUrl;
    } else {
      attrs.srcdoc = ad;
    }
    doc.body.appendChild(deps.mkFrame(doc, attrs));
    if (instl && win.frameElement) {
      var style = win.frameElement.style;
      style.width = width ? String(width) + 'px' : '100vw';
      style.height = height ? String(height) + 'px' : '100vh';
    }
  }

  window.render = render;
})();
