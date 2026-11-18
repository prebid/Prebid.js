import type { Size } from '../src/types/common.d.ts';

/**
 * Minimum viewport size, as [width, height], for a size bucket to become active.
 * Of the buckets in a sizeConfig array, only the one with the largest minViewPort width that does not exceed the viewport width
 * is active - and only if the viewport is also at least as tall as its minViewPort height; otherwise no bucket is active.
 */
export type MinViewPort = [number, number];

export interface BannerSizeConfig {
  minViewPort: MinViewPort;
  /**
   * Banner sizes to request when this size bucket is active. An empty array disables banner for this bucket.
   */
  sizes: Size | Size[];
}

export interface VideoSizeConfig {
  minViewPort: MinViewPort;
  /**
   * Video player size to request when this size bucket is active. An empty array disables video for this bucket.
   */
  playerSize: Size | Size[];
}

export interface NativeSizeConfig {
  minViewPort: MinViewPort;
  /**
   * Whether native should be active for this size bucket.
   */
  active: boolean;
}

export type SizeMappingMediaType = 'banner' | 'video' | 'native';

export interface BidderSizeConfig {
  minViewPort: MinViewPort;
  /**
   * Media types this bidder bids on when this size bucket is active; `['none']` disables the bidder for this bucket.
   */
  relevantMediaTypes: SizeMappingMediaType[] | ['none'];
}

declare module '../src/banner' {
  interface BannerMediaType {
    /**
     * Advanced size mapping (sizeMappingV2 module): banner sizes by viewport size. Used instead of `sizes`.
     */
    sizeConfig?: BannerSizeConfig[];
  }
}

declare module '../src/video' {
  interface VideoMediaType {
    /**
     * Advanced size mapping (sizeMappingV2 module): video player size by viewport size. Used instead of `playerSize`.
     */
    sizeConfig?: VideoSizeConfig[];
  }
}

declare module '../src/native' {
  interface NativeMediaType {
    /**
     * Advanced size mapping (sizeMappingV2 module): whether native is active, by viewport size.
     */
    sizeConfig?: NativeSizeConfig[];
  }
}

declare module '../src/adUnits' {
  interface BaseAdUnitBidDefinition {
    /**
     * Advanced size mapping (sizeMappingV2 module): media types this bidder should bid on, by viewport size.
     */
    sizeConfig?: BidderSizeConfig[];
  }
}
