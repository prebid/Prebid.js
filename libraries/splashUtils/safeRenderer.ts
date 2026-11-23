import {
  buildInterstitialDocument,
  createCreativeFrame,
  createInterstitialView,
  injectStyles,
  INTERSTITIAL_CSS,
  INTERSTITIAL_MAX_DURATION_MS,
  INTERSTITIAL_STYLE_ID,
  unwrapCreativeHtml,
} from './creative.js';

/**
 * Splash's Safe Renderer, published as `pbRenderInFrame` at the URL the adapter sets in `bid.safeRenderer.url`.
 * Prebid's Safe Renderer calls it inside the ad's frame. It writes only into the document of the frame it runs in,
 * never into a parent or the top window, and runs the creative in a further sandboxed iframe with an opaque origin.
 */
export const SAFE_RENDERER_VERSION = '1.0.0';

export type SafeRenderPayload = {
  ad?: string;
  width?: number;
  height?: number;
  config?: { format?: string; creativeSize?: { width?: number; height?: number } };
};

const FRAME_STYLE_ID = 'splash-safe-renderer-style';
const FRAME_CSS = 'html,body{width:100%;height:100%;margin:0;padding:0;overflow:hidden;background:transparent}' +
  '.sp-safe-stage{position:relative;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden}' +
  '.sp-safe-creative{display:block;width:100%;height:100%;border:0;background:transparent}';
const renderers = new WeakMap<Document, () => void>();

export function renderInFrame(payload: SafeRenderPayload, win: typeof window) {
  const format = payload?.config?.format;
  const html = unwrapCreativeHtml(typeof payload?.ad === 'string' ? payload.ad : '');
  if (!html) throw new Error('Splash Safe Renderer: missing creative markup');
  if (format !== 'parallax' && format !== 'interstitial') throw new Error(`Splash Safe Renderer: unsupported format ${String(format)}`);
  const doc = win.document;
  renderers.get(doc)?.();
  injectStyles(doc, FRAME_STYLE_ID, FRAME_CSS);
  const size = payload.config?.creativeSize || payload;
  const destroy = format === 'parallax' ? renderParallax(doc, win, html, size) : renderInterstitial(doc, win, html, size);
  renderers.set(doc, destroy);
}

function creativeFrame(doc: Document, format: string) {
  const iframe = createCreativeFrame(doc, 'sp-safe-creative', `Splash ${format} creative`);
  iframe.setAttribute('data-splash-renderer', format);
  return iframe;
}

function fitCreative(win: typeof window, stage: HTMLElement, iframe: HTMLIFrameElement, size: SafeRenderPayload) {
  const { width, height } = size;
  if (!(typeof width === 'number' && Number.isFinite(width) && width > 0 && typeof height === 'number' && Number.isFinite(height) && height > 0) || typeof win.ResizeObserver !== 'function') {
    return () => {};
  }
  Object.assign(iframe.style, {
    position: 'absolute',
    width: `${width}px`,
    height: `${height}px`,
    transformOrigin: 'top left',
    visibility: 'hidden',
  });
  const observer = new win.ResizeObserver(entries => {
    const bounds = entries[0]?.contentRect;
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
    const scale = Math.min(1, bounds.width / width, bounds.height / height);
    Object.assign(iframe.style, {
      transform: `scale(${scale})`,
      left: `${Math.max(0, (bounds.width - width * scale) / 2)}px`,
      top: '0px',
      visibility: 'visible',
    });
  });
  try {
    observer.observe(stage);
  } catch (error) {
    observer.disconnect();
    throw error;
  }
  return () => observer.disconnect();
}

/** A reduced Parallax contained in its ad frame; its position on the publisher's page is unavailable here. */
function renderParallax(doc: Document, win: typeof window, html: string, size: SafeRenderPayload) {
  const iframe = creativeFrame(doc, 'parallax');
  const stage = doc.createElement('div');
  stage.className = 'sp-safe-stage';
  let disconnect = () => {};
  function close() {
    disconnect();
    stage.remove();
  }
  try {
    stage.appendChild(iframe);
    doc.body.appendChild(stage);
    disconnect = fitCreative(win, stage, iframe, size);
    iframe.srcdoc = html;
  } catch (error) {
    close();
    throw error;
  }
  return close;
}

/**
 * Trusted controls stay outside the opaque creative. Closing clears only this ad frame, not its publisher container.
 */
function renderInterstitial(doc: Document, win: typeof window, html: string, size: SafeRenderPayload) {
  injectStyles(doc, INTERSTITIAL_STYLE_ID, INTERSTITIAL_CSS);
  const { overlay, iframe, closeButton, onMessage } = createInterstitialView(doc, close);
  iframe.classList.add('sp-safe-creative');
  iframe.setAttribute('data-splash-renderer', 'interstitial');
  const stage = doc.createElement('div');
  stage.className = 'sp-safe-stage';
  overlay.replaceChild(stage, iframe);
  stage.appendChild(iframe);
  let disconnect = () => {};
  let watchdog;
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    win.removeEventListener('message', onMessage);
    doc.removeEventListener('keydown', onKeyDown);
    closeButton.removeEventListener('click', close);
    win.clearTimeout(watchdog);
    disconnect();
    overlay.remove();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close();
  }

  try {
    win.addEventListener('message', onMessage);
    doc.addEventListener('keydown', onKeyDown);
    closeButton.addEventListener('click', close);
    watchdog = win.setTimeout(close, INTERSTITIAL_MAX_DURATION_MS);
    doc.body.appendChild(overlay);
    disconnect = fitCreative(win, stage, iframe, size);
    iframe.srcdoc = buildInterstitialDocument(html);
  } catch (error) {
    close();
    throw error;
  }
  return close;
}

export function installSafeRenderer(win: typeof window) {
  (win as any).pbRenderInFrame = (payload: SafeRenderPayload) => renderInFrame(payload, win);
}
