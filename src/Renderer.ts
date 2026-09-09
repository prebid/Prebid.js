import { loadExternalScript } from './adloader.js';
import {
  logError, logWarn, logMessage
} from './utils.js';
import { getGlobal } from './prebidGlobal.js';
import { MODULE_TYPE_PREBID } from './activities/modules.js';
import type { AdUnitCode, Identifier } from './types/common.d.ts';

const pbjsInstance = getGlobal();
const moduleCode = 'outstream';

export interface RendererConfig {
  /**
   * Returns the document the bid should be rendered into, given the bid, the document the bid was
   * requested from, and the document rendering was requested in.
   */
  documentResolver?: (bid: any, sourceDocument: Document, renderDocument: Document) => Document;
  [key: string]: unknown;
}

export interface RendererOptions {
  /**
   * URL of the external script that provides the render function.
   */
  url?: string;
  /**
   * Renderer configuration, passed through to the external script.
   */
  config?: RendererConfig;
  id?: Identifier;
  /**
   * Called once the external script is loaded; defaults to processing the command queue.
   */
  callback?: () => void;
  /**
   * True if the external script is already available, in which case commands run immediately.
   */
  loaded?: boolean;
  adUnitCode?: AdUnitCode;
  /**
   * True to render without waiting for the external script.
   */
  renderNow?: boolean;
}

type RenderFn = (...args: any[]) => void;

/**
 * A Renderer stores some functions which are used to render a particular Bid.
 * These are used in Outstream Video Bids, returned on the Bid by the adapter, and will
 * be used to render that bid unless the Publisher overrides them.
 */
export class Renderer {
  url: RendererOptions['url'];
  config: RendererOptions['config'];
  handlers: { [eventName: string]: () => void };
  id: RendererOptions['id'];
  renderNow: RendererOptions['renderNow'];
  adUnitCode: RendererOptions['adUnitCode'];
  loaded: RendererOptions['loaded'];
  cmd: (() => void)[];
  push: (func: () => void) => void;
  callback: () => void;
  render: RenderFn;
  /**
   * Set by `executeRenderer`; not available before rendering is requested.
   */
  documentContext: Document | undefined;
  /**
   * Set by `setRender`; renderers that were installed without a render function do not have one.
   */
  _render: RenderFn | undefined;

  constructor(options: RendererOptions) {
    const { url, config, id, callback, loaded, adUnitCode, renderNow } = options;
    this.url = url;
    this.config = config;
    this.handlers = {};
    this.id = id;
    this.renderNow = renderNow;
    this.adUnitCode = adUnitCode;

    // a renderer may push to the command queue to delay rendering until the
    // render function is loaded by loadExternalScript, at which point the the command
    // queue will be processed
    this.loaded = loaded;
    this.cmd = [];
    this.push = func => {
      if (typeof func !== 'function') {
        logError('Commands given to Renderer.push must be wrapped in a function');
        return;
      }
      this.loaded ? func() : this.cmd.push(func);
    };

    // bidders may override this with the `callback` property given to `install`
    this.callback = callback || (() => {
      this.loaded = true;
      this.process();
    });

    this.render = (...renderArgs) => {
      const runRender = () => {
        if (this._render) {
          this._render(...renderArgs);
        } else {
          logWarn(`No render function was provided, please use .setRender on the renderer`);
        }
      };

      if (isRendererPreferredFromAdUnit(adUnitCode)) {
        logWarn(`External Js not loaded by Renderer since renderer url and callback is already defined on adUnit ${adUnitCode}`);
        runRender();
      } else if (renderNow) {
        runRender();
      } else {
        // we expect to load a renderer url once only so cache the request to load script
        this.cmd.unshift(runRender); // should render run first ?
        loadExternalScript(url, MODULE_TYPE_PREBID, moduleCode, this.callback, this.documentContext);
      }
    };
  }

  static install(options: RendererOptions): Renderer {
    const { url, config, id, callback, loaded, adUnitCode, renderNow } = options;
    return new Renderer({ url, config, id, callback, loaded, adUnitCode, renderNow });
  }

  getConfig(): RendererConfig | undefined {
    return this.config;
  }

  setRender(fn: RenderFn) {
    this._render = fn;
  }

  setEventHandlers(handlers: Renderer['handlers']) {
    this.handlers = handlers;
  }

  handleVideoEvent({ id, eventName }: { id?: Identifier, eventName: string }) {
    if (typeof this.handlers[eventName] === 'function') {
      this.handlers[eventName]();
    }

    logMessage(`Prebid Renderer event for id ${id} type ${eventName}`);
  }

  /*
   * Calls functions that were pushed to the command queue before the
   * renderer was loaded by `loadExternalScript`
   */
  process() {
    while (this.cmd.length > 0) {
      try {
        this.cmd.shift()();
      } catch (error) {
        logError(`Error processing Renderer command on ad unit '${this.adUnitCode}':`, error);
      }
    }
  }
}

/**
 * Checks whether creative rendering should be done by Renderer or not.
 */
export function isRendererRequired(renderer: Pick<Renderer, 'url' | 'renderNow'>) {
  return !!(renderer && (renderer.url || renderer.renderNow));
}

/**
 * Render the bid returned by the adapter
 * @param renderer Renderer object installed by adapter
 * @param bid Bid response
 * @param doc context document of bid
 */
export function executeRenderer(renderer: Renderer, bid: any, doc?: Document) {
  let docContext = null;
  if (renderer.config && renderer.config.documentResolver) {
    docContext = renderer.config.documentResolver(bid, document, doc);// a user provided callback, which should return a Document, and expect the parameters; bid, sourceDocument, renderDocument
  }
  if (!docContext) {
    docContext = document;
  }
  renderer.documentContext = docContext;
  renderer.render(bid, renderer.documentContext);
}

function isRendererPreferredFromAdUnit(adUnitCode: AdUnitCode) {
  const adUnits = pbjsInstance.adUnits;
  const adUnit = adUnits.find(adUnit => {
    return adUnit.code === adUnitCode;
  });

  if (!adUnit) {
    return false;
  }

  // renderer defined at adUnit level
  const adUnitRenderer = adUnit?.renderer;
  const hasValidAdUnitRenderer = !!(adUnitRenderer && adUnitRenderer.url && adUnitRenderer.render);

  // renderer defined at adUnit.mediaTypes level
  const mediaTypeRenderer = adUnit?.mediaTypes?.video?.renderer;
  const hasValidMediaTypeRenderer = !!(mediaTypeRenderer && mediaTypeRenderer.url && mediaTypeRenderer.render);

  return !!(
    (hasValidAdUnitRenderer && !(adUnitRenderer.backupOnly === true)) ||
    (hasValidMediaTypeRenderer && !(mediaTypeRenderer.backupOnly === true))
  );
}
