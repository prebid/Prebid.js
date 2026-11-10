import { config } from "../config.ts";
import type { BidRequest } from "../adapterManager.ts";
import type { BidderCode } from "../types/common";
import type { BaseMediaType } from "../mediaTypes.ts";
import type { AdUnit } from "../adUnits.ts";

export const RENDERER_TYPES = [
  'renderer',
  'safeRenderer',
] as const;
export type RendererType = typeof RENDERER_TYPES[number];

export function isRendererAllowed(type: RendererType) {
  return !(type === 'renderer' && !(config.getConfig('allowTopWindowRenderers') ?? true));
}

export const getRendererDef = (() => {
  const VALIDATE = {
    'renderer': (candidate) => candidate?.render,
    'safeRenderer': (candidate) => candidate?.url
  };
  return <T extends RendererType>(type: T, includeBackupOnly: boolean, bidRequest: BidRequest<BidderCode>, mediaType: BaseMediaType, adUnit: AdUnit) => {
    return [mediaType?.[type], bidRequest?.[type], adUnit?.[type]]
      .find(candidate => VALIDATE[type](candidate) && (includeBackupOnly || !candidate.backupOnly));
  };
})();
