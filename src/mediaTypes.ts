/**
 * This file contains the valid Media Types in Prebid.
 *
 * All adapters are assumed to support banner ads. Other media types are specified by Adapters when they
 * register themselves with prebid-core.
 */
import type {BannerMediaType} from "./banner.ts";
import type {RendererConfig} from "./adUnits.ts";
import type {VideoMediaType} from "./video.ts";
import type {NativeMediaType} from "./native.ts";

export type MediaType = typeof NATIVE | typeof VIDEO | typeof BANNER;

export interface BaseMediaType {
    /**
     * Custom renderer. Takes precedence over adUnit.renderer, but applies only to this media type.
     */
    renderer?: RendererConfig;
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
}

export const NATIVE = 'native';
export const VIDEO = 'video';
export const BANNER = 'banner';
export const ADPOD = 'adpod';

export const ALL_MEDIATYPES: MediaType[] = [NATIVE, VIDEO, BANNER];
