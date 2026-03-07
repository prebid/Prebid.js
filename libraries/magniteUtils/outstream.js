import { Renderer } from '../../src/Renderer.js';
import { logWarn } from '../../src/utils.js';

export const DEFAULT_RENDERER_URL = 'https://video-outstream.rubiconproject.com/apex-2.3.7.js';

export function bidShouldUsePlayerWidthAndHeight(bidResponse) {
  const doesNotHaveDimensions = typeof bidResponse.width !== 'number' || typeof bidResponse.height !== 'number';
  const hasPlayerSize = typeof bidResponse.playerWidth === 'number' && typeof bidResponse.playerHeight === 'number';
  return doesNotHaveDimensions && hasPlayerSize;
}

export function hideGoogleAdsDiv(adUnit) {
  const el = adUnit.querySelector("div[id^='google_ads']");
  if (el) {
    el.style.setProperty('display', 'none');
  }
}

export function hideSmartAdServerIframe(adUnit) {
  const el = adUnit.querySelector("script[id^='sas_script']");
  const nextSibling = el && el.nextSibling;
  if (nextSibling && nextSibling.localName === 'iframe') {
    nextSibling.style.setProperty('display', 'none');
  }
}

export function renderBid(bid) {
  // hide existing ad units
  let adUnitElement = document.getElementById(bid.adUnitCode);
  if (!adUnitElement) {
    logWarn(`Magnite: unable to find ad unit element with id "${bid.adUnitCode}" for rendering.`);
    return;
  }

  // try to get child element of adunit
  const firstChild = adUnitElement.firstElementChild;
  if (firstChild?.tagName === 'DIV') {
    adUnitElement = firstChild;
  }

  hideGoogleAdsDiv(adUnitElement);
  hideSmartAdServerIframe(adUnitElement);

  // configure renderer
  const config = bid.renderer.getConfig();
  bid.renderer.push(() => {
    globalThis.MagniteApex.renderAd({
      width: bid.width,
      height: bid.height,
      vastUrl: bid.vastUrl,
      placement: {
        attachTo: adUnitElement,
        align: config.align || 'center',
        position: config.position || 'prepend'
      },
      closeButton: config.closeButton || false,
      label: config.label,
      replay: config.replay ?? true
    });
  });
}

export function outstreamRenderer(rtbBid, rendererUrl, rendererConfig) {
  const renderer = Renderer.install({
    id: rtbBid.adId,
    url: rendererUrl || DEFAULT_RENDERER_URL,
    config: rendererConfig || {},
    loaded: false,
    adUnitCode: rtbBid.adUnitCode
  });

  try {
    renderer.setRender(renderBid);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }

  return renderer;
}
