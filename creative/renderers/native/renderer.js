import { registerReportingObserver } from '../../reporting.js';
import { BROWSER_INTERVENTION, MESSAGE_EVENT } from '../../constants.js';
import {ACTION_CLICK, ACTION_IMP, ACTION_RESIZE, MESSAGE_NATIVE, ORTB_ASSETS} from './constants.js';

export function getReplacer(adId, {assets = [], ortb, nativeKeys = {}}) {
  const assetValues = Object.fromEntries((assets).map(({key, value}) => [key, value]));
  let repl = Object.fromEntries(
    Object.entries(nativeKeys).flatMap(([name, key]) => {
      const value = assetValues.hasOwnProperty(name) ? assetValues[name] : undefined;
      return [
        [`##${key}##`, value],
        [`${key}:${adId}`, value]
      ];
    })
  );
  if (ortb) {
    Object.assign(repl,
      {
        '##hb_native_linkurl##': ortb.link?.url,
        '##hb_native_privacy##': ortb.privacy
      },
      Object.fromEntries(
        (ortb.assets || []).flatMap(asset => {
          const type = Object.keys(ORTB_ASSETS).find(type => asset[type]);
          return [
            type && [`##hb_native_asset_id_${asset.id}##`, asset[type][ORTB_ASSETS[type]]],
            asset.link?.url && [`##hb_native_asset_link_id_${asset.id}##`, asset.link.url]
          ].filter(e => e);
        })
      )
    );
  }
  repl = Object.entries(repl).concat([[/##hb_native_asset_(link_)?id_\d+##/g]]);

  return function (template) {
    return repl.reduce((text, [pattern, value]) => text.replaceAll(pattern, value || ''), template);
  };
}

function loadScript(url, doc) {
  return new Promise((resolve, reject) => {
    const script = doc.createElement('script');
    script.onload = resolve;
    script.onerror = reject;
    script.src = url;
    doc.body.appendChild(script);
  });
}

function getRenderFrames(node) {
  return Array.from(node.querySelectorAll('iframe[srcdoc*="render"]'))
}

function getInnerHTML(node) {
  const clone = node.cloneNode(true);
  getRenderFrames(clone).forEach(node => node.parentNode.removeChild(node));
  return clone.innerHTML;
}

export function getAdMarkup(adId, nativeData, replacer, win, load = loadScript) {
  const {rendererUrl, assets, ortb, adTemplate} = nativeData;
  const doc = win.document;
  if (rendererUrl) {
    return load(rendererUrl, doc).then(() => {
      if (typeof win.renderAd !== 'function') {
        throw new Error(`Renderer from '${rendererUrl}' does not define renderAd()`);
      }
      const payload = assets || [];
      payload.ortb = ortb;
      return win.renderAd(payload);
    });
  } else {
    return Promise.resolve(replacer(adTemplate ?? getInnerHTML(doc.body)));
  }
}

export function render({adId, native}, {sendMessage}, win, getMarkup = getAdMarkup) {
  registerReportingObserver((report) => {
    sendMessage(MESSAGE_EVENT, {
      event: BROWSER_INTERVENTION,
      intervention: report
    });
  }, ['intervention']);
  const {head, body} = win.document;
  const resize = () => {
    // force redraw - for some reason this is needed to get the right dimensions
    body.style.display = 'none';
    body.style.display = 'block';
    sendMessage(MESSAGE_NATIVE, {
      action: ACTION_RESIZE,
      height: body.offsetHeight || win.document.documentElement.scrollHeight,
      width: body.offsetWidth
    });
  }
  function replaceMarkup(target, markup) {
    // do not remove the rendering logic if it's embedded in this window; things will break otherwise
    const renderFrames = getRenderFrames(target);
    Array.from(target.childNodes).filter(node => !renderFrames.includes(node)).forEach(node => target.removeChild(node));
    target.insertAdjacentHTML('afterbegin', markup);
  }
  const replacer = getReplacer(adId, native);
  replaceMarkup(head, replacer(getInnerHTML(head)));
  return getMarkup(adId, native, replacer, win).then(markup => {
    replaceMarkup(body, markup);
    if (typeof win.postRenderAd === 'function') {
      win.postRenderAd({adId, ...native});
    }
    win.document.querySelectorAll('.pb-click').forEach(el => {
      const assetId = el.getAttribute('hb_native_asset_id');
      el.addEventListener('click', () => sendMessage(MESSAGE_NATIVE, {action: ACTION_CLICK, assetId}));
    });
    sendMessage(MESSAGE_NATIVE, {action: ACTION_IMP});
    win.document.readyState === 'complete' ? resize() : win.onload = resize;
  });
}

window.render = render;
