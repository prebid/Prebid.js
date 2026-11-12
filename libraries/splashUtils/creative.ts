// Rendering helpers shared by the Splash adapter's top-window renderers and its Safe Renderer.

export const SVG_NS = 'http://www.w3.org/2000/svg';

export function injectStyles(doc: Document, id: string, css: string) {
  if (doc.getElementById(id)) return;
  const style = doc.createElement('style');
  style.id = id;
  style.textContent = css;
  (doc.head || doc.documentElement).appendChild(style);
}

export function createCreativeFrame(doc: Document, className: string, title: string): HTMLIFrameElement {
  const iframe = doc.createElement('iframe');
  iframe.className = className;
  iframe.setAttribute('allowtransparency', 'true');
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('scrolling', 'no');
  iframe.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
  iframe.title = title;
  return iframe;
}

/**
 * Unwraps Splash creative containers so that the markup renders directly in the renderer's iframe:
 * an SSP iframe around Standard Display markup, or the inner content of legacy Parallax markup.
 */
export function unwrapCreativeHtml(html: string): string {
  if (!html) return '';
  try {
    if (html.indexOf('froc-standard-display') !== -1) {
      const body = new DOMParser().parseFromString(html, 'text/html').body;
      const child = body && body.children.length === 1 ? body.children[0] : null;
      const srcdoc = child && child.tagName === 'IFRAME' ? child.getAttribute('srcdoc') : null;
      return srcdoc && srcdoc.indexOf('froc-standard-display') !== -1 ? srcdoc : html;
    }
    if (html.indexOf('splitboard') === -1) return html;
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const inner = parsed.querySelector('.splitboard-content') || parsed.querySelector('.splitboard');
    if (!inner) return html;
    const nested = inner.querySelector('iframe[srcdoc]');
    const srcdoc = nested && nested.getAttribute('srcdoc');
    if (srcdoc) return srcdoc;
    return '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;height:100%}</style></head><body>' +
      inner.innerHTML + '</body></html>';
  } catch (e) {
    return html;
  }
}

export const INTERSTITIAL_STYLE_ID = 'splash-interstitial-style';
export const INTERSTITIAL_MAX_DURATION_MS = 5 * 60 * 1000;
const INTERSTITIAL_LOGO_URL = 'https://cdn.splashandroll.com/fractatemp/0/softpaywall-logo.svg';
export const INTERSTITIAL_CSS = `
.sp-interstitial-overlay[data-splash-renderer="interstitial"]{position:fixed;inset:0;z-index:2147483000;display:grid;grid-template-rows:auto minmax(0,1fr);width:100%;height:100%;margin:0;padding:0;background:transparent;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);overflow:hidden;box-sizing:border-box}
@supports (height: 100dvh) {
  .sp-interstitial-overlay[data-splash-renderer="interstitial"]{height:100dvh}
}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] *{box-sizing:border-box}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-toolbar{display:flex;flex-wrap:nowrap;align-items:center;justify-content:space-between;gap:12px;min-height:64px;padding:10px 14px;padding:calc(10px + env(safe-area-inset-top,0px)) max(14px,env(safe-area-inset-right,0px)) 10px max(14px,env(safe-area-inset-left,0px));background:#fff}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-logo{display:block;flex:0 1 132px;width:clamp(80px,25vw,132px);max-width:38%;min-width:0;height:40px;object-fit:contain;object-position:left center}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-actions{display:flex;flex:0 0 auto;flex-wrap:nowrap;align-items:center;gap:10px}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-creative{display:block;width:100%;height:100%;min-height:0;border:0;background:transparent}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-close{min-width:76px;min-height:44px;padding:8px 16px;border:1px solid #e0e2e6;border-radius:999px;background:#f3f4f6;color:#111827;font:600 13px Arial,sans-serif;cursor:pointer;transition:background-color 160ms ease}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-close:hover{background:#e5e7eb}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-close:focus-visible{outline:2px solid #111827;outline-offset:2px}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-timer{position:relative;display:grid;place-items:center;flex:0 0 40px;width:40px;height:40px;border-radius:50%;background:#f3f4f6;color:#111827;font:600 13px Arial,sans-serif;overflow:hidden}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-timer[hidden]{display:none}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-timer svg{position:absolute;inset:0;width:40px;height:40px;transform:rotate(-90deg)}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-timer circle{fill:none;stroke-width:3}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-timer-track{stroke:#d1d5db}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-timer-progress{stroke:#111827;stroke-linecap:round;transition:stroke-dashoffset 1s linear}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-timer-value{position:relative;z-index:1}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-timer-value--tick{animation:splashInterstitialCounterTick 200ms ease-out}
@keyframes splashInterstitialCounterTick{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-timer-progress,.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-close{transition:none}.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-timer-value--tick{animation:none}}
`;
const FRAME_STYLE_ID = 'splash-prebid-interstitial-frame-style';
const FRAME_BASE_STYLE = 'html,body{width:100%;height:100%;margin:0;padding:0;overflow:hidden;background:transparent}';
// With the host toolbar, the creative fills the remaining space and its own bar is hidden.
const FRAME_STYLE = FRAME_BASE_STYLE +
  '#creative-root.froc-standard-display--interstitial .froc-display-stage>iframe.froc-display-frame{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;display:block!important;background:transparent!important}' +
  '#creative-root.froc-standard-display--interstitial .froc-display-interstitial-bar{display:none!important}' +
  '#creative-root.froc-standard-display--interstitial{padding-top:clamp(20px,5vh,48px)!important}' +
  '@media(min-width:768px){#creative-root.froc-standard-display--interstitial{padding-top:clamp(40px,8vh,80px)!important}}';
// The opaque-origin creative communicates through its owned frame's WindowProxy, not shared DOM.
const FRAME_BRIDGE = '(function(){' +
  'if(window.__splashPrebidInterstitialBridge)return;' +
  'window.__splashPrebidInterstitialBridge=true;' +
  'function onEscape(event){if(event.key==="Escape"){event.preventDefault();window.parent.postMessage({source:"froc-display",type:"close"},"*");}}' +
  'document.addEventListener("keydown",onEscape);' +
  'function reportError(){window.parent.postMessage({source:"froc-display",type:"render-error"},"*");}' +
  'window.addEventListener("error",reportError);window.addEventListener("unhandledrejection",reportError);' +
  'function observeControls(){' +
    'var root=document.querySelector("#creative-root.froc-standard-display--interstitial");' +
    'if(!root)return;' +
    'var timer=root&&root.querySelector(".froc-display-interstitial-bar .froc-display-timer"),last="";' +
    'function report(){' +
      'var total=timer?Number(timer.getAttribute("data-seconds")):0;' +
      'var value=timer&&(timer.querySelector(".froc-display-timer-value")||timer);' +
      'var remaining=value?Number(value.textContent):0;' +
      'var pending=timer&&(timer.getAttribute("data-start")==="complete"||(!timer.hasAttribute("data-start")&&root.querySelector(".froc-display-interstitial-bar--embedded-story")))&&root.getAttribute("data-froc-interstitial-complete")!=="1";' +
      'var visible=!!timer&&!pending&&timer.getAttribute("aria-hidden")!=="true"&&!timer.classList.contains("froc-display-timer--pending");' +
      'if(!Number.isInteger(total)||total<0||total>300||!Number.isInteger(remaining)||remaining<0||remaining>total){total=0;remaining=0;visible=false;}' +
      'var signature=total+":"+remaining+":"+visible;if(signature===last)return;last=signature;' +
      'window.parent.postMessage({source:"froc-display",type:"interstitial-controls",timer:{totalSeconds:total,remainingSeconds:remaining,visible:visible}},"*");' +
    '}' +
    'report();' +
    'if(timer&&typeof MutationObserver==="function"){' +
      'var observer=new MutationObserver(report);' +
      'observer.observe(root,{attributes:true,attributeFilter:["data-froc-interstitial-complete"]});' +
      'observer.observe(timer,{attributes:true,attributeFilter:["class","aria-hidden","data-seconds","data-start"],childList:true,subtree:true,characterData:true});' +
    '}' +
  '}' +
  'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",observeControls,{once:true});else observeControls();' +
  'window.addEventListener("message",function(event){' +
    'var data=event&&event.data;' +
    'if(!data||data.source!=="froc-display")return;' +
    'var frames=document.querySelectorAll("iframe"),owned=false;' +
    'for(var i=0;i<frames.length;i++){if(event.source===frames[i].contentWindow){owned=true;break;}}' +
    'if(!owned)return;' +
    'if(data.type==="close"||data.type==="click"||data.type==="custom-event")window.parent.postMessage(data,"*");' +
  '});' +
'}());';

export function buildInterstitialDocument(html: string, onError?: (error: unknown) => void, hostToolbar = true): string {
  if (html.indexOf(FRAME_STYLE_ID) !== -1) return html;
  const frameStyle = hostToolbar ? FRAME_STYLE : FRAME_BASE_STYLE;
  if (/<(?:!doctype|html|head|body)[\s>]/i.test(html)) {
    try {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const style = parsed.createElement('style');
      style.id = FRAME_STYLE_ID;
      style.textContent = frameStyle;
      const script = parsed.createElement('script');
      script.text = FRAME_BRIDGE;
      parsed.head.appendChild(style);
      parsed.head.insertBefore(script, parsed.head.firstChild);
      return '<!doctype ' + (parsed.doctype ? parsed.doctype.name : 'html') + '>' + parsed.documentElement.outerHTML;
    } catch (e) {
      if (onError) onError(e);
    }
  }
  return '<!doctype html><html><head><meta charset="utf-8"><style id="' + FRAME_STYLE_ID + '">' + frameStyle +
    '</style><script>' + FRAME_BRIDGE + '</script></head><body>' + html + '</body></html>';
}

function createInterstitialTimer(doc: Document) {
  const element = doc.createElement('div');
  element.className = 'sp-interstitial-timer';
  element.hidden = true;
  element.setAttribute('role', 'timer');
  element.setAttribute('aria-live', 'off');
  element.setAttribute('aria-label', 'Pozostały czas reklamy');
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('aria-hidden', 'true');
  let progress: SVGCircleElement;
  ['track', 'progress'].forEach(part => {
    const circle = doc.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('class', 'sp-interstitial-timer-' + part);
    circle.setAttribute('cx', '20');
    circle.setAttribute('cy', '20');
    circle.setAttribute('r', '18');
    circle.setAttribute('pathLength', '100');
    if (part === 'progress') {
      circle.setAttribute('stroke-dasharray', '100');
      circle.setAttribute('stroke-dashoffset', '0');
      progress = circle;
    }
    svg.appendChild(circle);
  });
  const value = doc.createElement('span');
  value.className = 'sp-interstitial-timer-value';
  element.append(svg, value);
  let previous = -1;
  function update(state) {
    if (!state || typeof state.visible !== 'boolean' || !Number.isInteger(state.totalSeconds) ||
      state.totalSeconds < 0 || state.totalSeconds > INTERSTITIAL_MAX_DURATION_MS / 1000 ||
      !Number.isInteger(state.remainingSeconds) || state.remainingSeconds < 0 || state.remainingSeconds > state.totalSeconds) return;
    element.hidden = !state.visible || state.totalSeconds === 0;
    if (element.hidden) {
      previous = -1;
      return;
    }
    progress.setAttribute('stroke-dashoffset', String(100 * (1 - state.remainingSeconds / state.totalSeconds)));
    if (previous !== state.remainingSeconds) {
      value.textContent = String(state.remainingSeconds);
      value.classList.remove('sp-interstitial-timer-value--tick');
      void value.offsetWidth;
      value.classList.add('sp-interstitial-timer-value--tick');
      previous = state.remainingSeconds;
    }
  }
  return { element, update };
}

/** The message data when the message is a Splash creative message from the given frame. */
export function creativeMessage(event: MessageEvent, iframe: HTMLIFrameElement) {
  const data = event && event.data;
  return data && data.source === 'froc-display' && event.source === iframe.contentWindow ? data : null;
}

export function createInterstitialView(doc: Document, close: () => void) {
  const overlay = doc.createElement('div');
  overlay.className = 'sp-interstitial-overlay';
  overlay.setAttribute('data-splash-renderer', 'interstitial');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Advertisement');
  const iframe = createCreativeFrame(doc, 'sp-interstitial-creative', 'Splash interstitial creative');
  const closeButton = doc.createElement('button');
  closeButton.className = 'sp-interstitial-close';
  closeButton.type = 'button';
  closeButton.textContent = 'Pomiń';
  closeButton.setAttribute('aria-label', 'Pomiń reklamę');
  const toolbar = doc.createElement('div');
  toolbar.className = 'sp-interstitial-toolbar';
  const logo = doc.createElement('img');
  logo.className = 'sp-interstitial-logo';
  logo.alt = 'Softpaywall';
  logo.src = INTERSTITIAL_LOGO_URL;
  const timer = createInterstitialTimer(doc);
  const actions = doc.createElement('div');
  actions.className = 'sp-interstitial-actions';
  actions.append(timer.element, closeButton);
  toolbar.append(logo, actions);
  overlay.appendChild(toolbar);
  overlay.appendChild(iframe);

  function onMessage(event: MessageEvent) {
    const data = creativeMessage(event, iframe);
    if (!data) return;
    if (data.type === 'close') close();
    else if (data.type === 'interstitial-controls') timer.update(data.timer);
  }

  return { overlay, iframe, closeButton, onMessage };
}
