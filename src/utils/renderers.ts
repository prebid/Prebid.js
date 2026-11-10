import { config } from "../config.ts";
import type { AdUnitDefinition } from "../adUnits.ts";
import type { BidderCode } from "../types/common";

export const RENDERER_TYPES = [
  'renderer',
  'safeRenderer',
] as const;
export type RendererType = typeof RENDERER_TYPES[number];

export function isRendererAllowed(bidder: BidderCode, type: RendererType) {
  return !(type === 'renderer' && !(config.runWithBidder(bidder, () => config.getConfig('allowTopWindowRenderers')) ?? true));
}

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
