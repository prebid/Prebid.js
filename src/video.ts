import { isArrayOfNums, isInteger, isNumber, isStr, logError, logWarn } from './utils.js';
import { config } from './config.js';
import { hook } from './hook.js';
import { auctionManager } from './auctionManager.js';
import type { VideoBid } from "./bidfactory.ts";
import { type BaseMediaType, VIDEO } from "./mediaTypes.ts";
import type { ORTBImp } from "./types/ortb/request.d.ts";
import type { Size } from "./types/common.d.ts";
import type { AdUnit, AdUnitDefinition } from "./adUnits.ts";

import { getGlobalVarName } from "./buildOptions.ts";
import { getRendererDef, isRendererAllowed } from "./utils/renderers.ts";

export const OUTSTREAM = 'outstream';
export const INSTREAM = 'instream';

const ORTB_PARAMS = [
  ['mimes', value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string')],
  ['minduration', isInteger],
  ['maxduration', isInteger],
  ['startdelay', isInteger],
  ['maxseq', isInteger],
  ['poddur', isInteger],
  ['protocols', isArrayOfNums],
  ['w', isInteger],
  ['h', isInteger],
  ['podid', isStr],
  ['podseq', isInteger],
  ['rqddurs', isArrayOfNums],
  ['placement', isInteger], // deprecated, see plcmt
  ['plcmt', isInteger],
  ['linearity', isInteger],
  ['skip', value => [1, 0].includes(value)],
  ['skipmin', isInteger],
  ['skipafter', isInteger],
  ['sequence', isInteger], // deprecated
  ['slotinpod', isInteger],
  ['mincpmpersec', isNumber],
  ['battr', isArrayOfNums],
  ['maxextended', isInteger],
  ['minbitrate', isInteger],
  ['maxbitrate', isInteger],
  ['boxingallowed', isInteger],
  ['playbackmethod', isArrayOfNums],
  ['playbackend', isInteger],
  ['delivery', isArrayOfNums],
  ['pos', isInteger],
  ['api', isArrayOfNums],
  ['companiontype', isArrayOfNums],
  ['poddedupe', isArrayOfNums]
] as const;

/**
 * List of OpenRTB 2.x video object properties with simple validators.
 * Not included: `companionad`, `durfloors`, `ext`
 * reference: https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
 */
export const ORTB_VIDEO_PARAMS = new Map(ORTB_PARAMS);

export type VideoContext = typeof INSTREAM | typeof OUTSTREAM;

export interface VideoMediaType extends BaseMediaType, Partial<Pick<NonNullable<ORTBImp['video']>, (typeof ORTB_PARAMS)[number][0]>> {
  context?: VideoContext;
  playerSize?: Size | Size[];
  /**
   * Set to false to skip remote and local caching by Prebid.js for this ad unit's
   * video bids. Omitted or true uses the global configuration and existing outstream rules.
   * This does not control caching by Prebid Server or bidders, or remove supplied
   * VAST URLs and cache keys.
   */
  cache?: boolean;
  /**
   * If true, cache all video bids (using the globally configured `cache.url` or `cache.useLocal`).
   * If false, only instream bids are cached.
   *
   * Default is false. Setting `cache: false` overrides this option.
   */
  useCacheKey?: boolean;
}

export function fillVideoDefaults(adUnit: AdUnitDefinition) {
  const video = adUnit?.mediaTypes?.video;
  if (video != null) {
    if (video.plcmt == null) {
      if (video.context === OUTSTREAM || [2, 3, 4].includes(video.placement)) {
        video.plcmt = 4;
      } else if (video.playbackmethod?.some?.(method => [2, 6].includes(method))) {
        video.plcmt = 2;
      }
    }
    const playerSize = isArrayOfNums(video.playerSize, 2)
      ? video.playerSize
      : Array.isArray(video.playerSize) && isArrayOfNums(video.playerSize[0]) ? video.playerSize[0] : null;
    const size: [number, number] = isNumber(video.w) && isNumber(video.h) ? [video.w, video.h] : null;
    let conflict = false;
    if (playerSize == null) {
      if (size != null) {
        if (video.playerSize != null) {
          conflict = true;
        } else {
          video.playerSize = [size];
        }
      }
    } else {
      ['w', 'h'].forEach((prop, i) => {
        if (video[prop] != null && video[prop] !== playerSize[i]) {
          conflict = true;
        } else {
          video[prop] = playerSize[i];
        }
      });
    }
    if (conflict) {
      logWarn(`Ad unit "${adUnit.code}" has conflicting playerSize and w/h`, adUnit);
    }
  }
}

/**
 * Validate that the assets required for video context are present on the bid
 */
export function isValidVideoBid(bid: VideoBid, { index = auctionManager.index } = {}): boolean {
  const videoMediaType = index.getMediaTypes(bid)?.video;
  const context = videoMediaType && videoMediaType?.context;
  const useCacheKey = videoMediaType && videoMediaType?.useCacheKey;
  const adUnit = index.getAdUnit(bid);

  // if context not defined assume default 'instream' for video bids
  // instream bids require a vast url or vast xml content
  if (videoMediaType && (useCacheKey || context !== OUTSTREAM)) {
    // xml-only video bids require a prebid cache url
    const { url, useLocal, allowVastXmlOnly } = config.getConfig('cache') || {};
    if ((!url && !useLocal) && bid.vastXml && !bid.vastUrl && videoMediaType.cache !== false) {
      if (allowVastXmlOnly === true) {
        logWarn(`This bid contains only vastXml, and caching is disabled. Proceeding because cache.allowVastXmlOnly is enabled.`);
        return true;
      }
      logError(`
        This bid contains only vastXml and will not work when a prebid cache url is not specified.
        Try enabling either prebid cache with ${getGlobalVarName()}.setConfig({ cache: {url: "..."} });
        or local cache with ${getGlobalVarName()}.setConfig({ cache: { useLocal: true }});
      `);
      return false;
    }

    return !!(bid.vastUrl || bid.vastXml);
  }

  if (videoBidRequiresRenderer(videoMediaType, adUnit)) {
    // outstream bids, by default, require a renderer on the bid or pub-defined on adunit
    const bidRequest = index.getBidRequest(bid);
    return (
      isRendererAllowed('safeRenderer', bid.bidderCode, VIDEO, adUnit) && (
        bid.safeRenderer != null || getRendererDef('safeRenderer', true, bidRequest, videoMediaType, adUnit) != null
      )
    ) || (
      isRendererAllowed('renderer', bid.bidderCode, VIDEO, adUnit) && (
        bid.renderer != null || getRendererDef('renderer', true, bidRequest, videoMediaType, adUnit) != null
      )
    );
  }
  return true;
}

export const videoBidRequiresRenderer = hook('sync', (videoMediaType: VideoMediaType, adUnit: AdUnit) => {
  return videoMediaType?.context === OUTSTREAM && !videoMediaType?.useCacheKey;
});

declare module './bidfactory' {
  interface VideoBidResponseProperties {
    vastXml?: string;
    vastUrl?: string;
  }
}
