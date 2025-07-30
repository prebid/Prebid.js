import {isArrayOfNums, isInteger, logError} from './utils.js';
import {config} from './config.js';
import {hook} from './hook.js';
import {auctionManager} from './auctionManager.js';
import type {AudioBid} from "./bidfactory.ts";
import {type BaseMediaType} from "./mediaTypes.ts";
import type {ORTBImp} from "./types/ortb/request";
import type {AdUnitDefinition} from "./adUnits.ts";
import {getGlobalVarName} from "./buildOptions.ts";

export const OUTSTREAM = 'outstream';
export const INSTREAM = 'instream';

const ORTB_PARAMS = [
  [ 'mimes', value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string') ],
  [ 'minduration', isInteger ],
  [ 'maxduration', isInteger ],
  [ 'startdelay', isInteger ],
  [ 'maxseq', isInteger ],
  [ 'poddur', isInteger ],
  [ 'protocols', isArrayOfNums ],
  [ 'battr', isArrayOfNums ],
  [ 'maxextended', isInteger ],
  [ 'minbitrate', isInteger ],
  [ 'maxbitrate', isInteger ],
  [ 'delivery', isArrayOfNums ],
  [ 'api', isArrayOfNums ],
  [ 'companiontype', isArrayOfNums ],
  [ 'feed', isInteger ],
  [ 'stitched', isInteger ],
  [ 'nvol', isInteger ],
] as const;

/**
 * List of OpenRTB 2.x audio object properties with simple validators.
 * Not included: `companionad`, `durfloors`, `ext`
 * reference: https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
 */
export const ORTB_AUDIO_PARAMS = new Map(ORTB_PARAMS);

export type AudioContext = typeof INSTREAM;

export interface AudioMediaType extends BaseMediaType, Pick<ORTBImp['audio'], (typeof ORTB_PARAMS)[number][0]> {
  context?: AudioContext;
}

export function fillAudioDefaults(adUnit: AdUnitDefinition) {}

/**
 * Validate that the assets required for audio context are present on the bid
 */
export function isValidAudioBid(bid: AudioBid, {index = auctionManager.index} = {}): boolean {
  const audioMediaType = index.getMediaTypes(bid)?.audio;
  const context = audioMediaType && audioMediaType?.context;
  const useCacheKey = audioMediaType && audioMediaType?.useCacheKey;
  const adUnit = index.getAdUnit(bid);

  // if context not defined assume default 'instream' for audio bids
  // instream bids require a vast url or vast xml content
  return checkAudioBidSetup(bid, adUnit, audioMediaType, context, useCacheKey);
}

declare module './bidfactory' {
  interface AudioBidResponseProperties {
    vastXml?: string;
    vastUrl?: string;
  }
}

declare module './hook' {
  interface NamedHooks {
    checkAudioBidSetup: typeof checkAudioBidSetup
  }
}

export const checkAudioBidSetup = hook('sync', function(bid: AudioBid, adUnit, audioMediaType, context, useCacheKey) {
  if (audioMediaType && (useCacheKey || context !== OUTSTREAM)) {
    // xml-only audio bids require a prebid cache url
    const { url, useLocal } = config.getConfig('cache') || {};
    if ((!url && !useLocal) && bid.vastXml && !bid.vastUrl) {
      logError(`
        This bid contains only vastXml and will not work when a prebid cache url is not specified.
        Try enabling either prebid cache with ${getGlobalVarName()}.setConfig({ cache: {url: "..."} });
        or local cache with ${getGlobalVarName()}.setConfig({ cache: { useLocal: true }});
      `);
      return false;
    }

    return !!(bid.vastUrl || bid.vastXml);
  }

  // outstream bids require a renderer on the bid or pub-defined on adunit
  if (context === OUTSTREAM && !useCacheKey) {
    return !!(bid.renderer || (adUnit && adUnit.renderer) || audioMediaType.renderer);
  }

  return true;
}, 'checkAudioBidSetup');
