/**
 * This file contains the valid Media Types in Prebid.
 *
 * All adapters are assumed to support banner ads. Other media types are specified by Adapters when they
 * register themselves with prebid-core.
 */
import type { BannerMediaType } from "./banner.ts";
import type { RendererConfig, SafeRendererConfig } from "./adUnits.ts";
import type { VideoMediaType } from "./video.ts";
import type { NativeMediaType } from "./native.ts";
import { AudioMediaType } from "./audio.ts";

export type MediaType = typeof NATIVE | typeof VIDEO | typeof BANNER | typeof AUDIO;

export interface BaseMediaType {
  /**
   * Custom renderer. Takes precedence over adUnit.renderer, but applies only to this media type.
   */
  renderer?: RendererConfig;
  /**
   * Safe iframe renderer for this media type (overrides ad unit-level when set).
   */
  safeRenderer?: SafeRendererConfig;
}

export interface MediaTypes {
  /**
   * Defines properties of a banner ad.
   */
  banner?: BannerMediaType;
  /**
   * Defines properties of a video ad.
   */
  video?: VideoMediaType;
  /**
   * Defines properties of a native ad.
   */
  native?: NativeMediaType;
  /**
   * Defines properties of a audio ad.
   */
  audio?: AudioMediaType;
}

export const NATIVE = 'native';
export const VIDEO = 'video';
export const BANNER = 'banner';
export const AUDIO = 'audio';

export const ALL_MEDIATYPES: MediaType[] = [NATIVE, VIDEO, BANNER, AUDIO];
