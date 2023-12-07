import {ACTION_CLICK, ACTION_IMP, ACTION_RESIZE, MESSAGE_NATIVE, ORTB_ASSETS} from './constants.js';

export function getReplacements(adId, {assets = [], ortb, nativeKeys = {}}) {
  const assetValues = Object.fromEntries((assets).map(({key, value}) => [key, value]));
  const repl = Object.fromEntries(
    Object.entries(nativeKeys).flatMap(([name, key]) => {
      const value = assetValues.hasOwnProperty(name) ? assetValues[name] : undefined;
      return [
        [`##${key}##`, value],
        [`${key}:${adId}`, value]
      ]
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
  return repl;
}

export function replace(template, replacements) {
  return Object.entries(replacements)
    .concat([[/##hb_native_asset_(link_)?id_\d+##/g]])
    .reduce((text, [pattern, value]) => text.replaceAll(pattern, value || ''), template);
}

function loadScript(url, win) {
  return new Promise((resolve, reject) => {
    const script = win.document.createElement('script');
    script.onload = resolve;
    script.onerror = reject;
    script.src = url;
    win.document.head.appendChild(script);
  })
}

export function getAdMarkup(adId, nativeData, win, load = loadScript) {
  const {rendererUrl, assets, ortb, adTemplate} = nativeData;
  if (rendererUrl) {
    return load(rendererUrl, win).then(() => {
      if (typeof win.renderAd !== 'function') {
        throw new Error(`Renderer from '${rendererUrl}' does not define renderAd()`)
      }
      const payload = assets || [];
      payload.ortb = ortb;
      return win.renderAd(payload);
    });
  } else {
    return Promise.resolve(replace(adTemplate ?? win.document.body.innerHTML, getReplacements(adId, nativeData)))
  }
}

export function render({adId, native}, {sendMessage}, win, getMarkup = getAdMarkup) {
  const resize = () => sendMessage(MESSAGE_NATIVE, {
    action: ACTION_RESIZE,
    height: win.document.body.offsetHeight,
    width: win.document.body.offsetWidth
  });
  return getMarkup(adId, native, win).then(markup => {
    win.document.body.innerHTML = markup;
    if (typeof win.postRenderAd === 'function') {
      win.postRenderAd({adId, ...native});
    }
    win.document.querySelectorAll('.pb-click').forEach(el => {
      const assetId = el.getAttribute('hb_native_asset_id');
      el.addEventListener('click', () => sendMessage(MESSAGE_NATIVE, {action: ACTION_CLICK, assetId}));
    })
    sendMessage(MESSAGE_NATIVE, {action: ACTION_IMP});
    win.document.readyState === 'complete' ? resize() : win.onload = resize;
  });
}

window.render = render;
