import { config } from "../config.ts";
import type { AdUnit, AdUnitDefinition } from "../adUnits.ts";
import type { BidderCode } from "../types/common";
import { hook } from "../hook.ts";
import type { MediaType } from "../mediaTypes.ts";
import type { Bid } from "../bidfactory.ts";
import { logWarn } from "../utils.js";

export const RENDERER_TYPES = [
  'renderer',
  'safeRenderer',
] as const;
export type RendererType = typeof RENDERER_TYPES[number];

export const isRendererAllowed = hook('sync', (type: RendererType, bidder: BidderCode, mediaType: MediaType, adUnit: AdUnit, bidResponse?: Partial<Bid>) => {
  if (type === 'renderer' && !(config.runWithBidder(bidder, () => config.getConfig('allowTopWindowRenderers')) ?? true)) {
    if (bidResponse?.renderer != null) {
      logWarn(`Ignoring bidder-provided renderer: \`allowTopWindowRenderers\` is false for bidder "${bidder}"`, { bidResponse });
    }
    return false;
  }
  return true;
});

const VALIDATE = {
  'renderer': (candidate) => candidate?.render,
  'safeRenderer': (candidate) => candidate?.url
};

type HasRendererConfig<T extends RendererType> = { [K in T]?: AdUnitDefinition[T] };

/**
 * Returns the publisher-defined renderer configuration to use for the given renderer type
 * (the first of mediaType, bidRequest, adUnit that defines one matching `includeBackupOnly`).
 */
export function getRendererDef<T extends RendererType>(type: T, includeBackupOnly: boolean, bidRequest: HasRendererConfig<T>, mediaType: HasRendererConfig<T>, adUnit: HasRendererConfig<T>) {
  return [mediaType?.[type], bidRequest?.[type], adUnit?.[type]]
    .find(candidate => VALIDATE[type](candidate) && (includeBackupOnly || !candidate.backupOnly));
}
