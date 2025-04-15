/**
 * This file contains the valid Media Types in Prebid.
 *
 * All adapters are assumed to support banner ads. Other media types are specified by Adapters when they
 * register themselves with prebid-core.
 */
import type {BannerMediaType} from "./banner.ts";

export type MediaType = typeof NATIVE | typeof VIDEO | typeof BANNER;

export interface MediaTypes {
    banner?: BannerMediaType
}

export const NATIVE = 'native';
export const VIDEO = 'video';
export const BANNER = 'banner';
export const ADPOD = 'adpod';

export const ALL_MEDIATYPES: MediaType[] = [NATIVE, VIDEO, BANNER];

