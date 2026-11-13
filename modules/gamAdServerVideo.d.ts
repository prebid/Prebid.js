import type { AdUnitDefinition } from '../src/adUnits.ts';
import type { Bid } from '../src/bidfactory.ts';
import type { RequireAtLeastOne } from '../src/types/objects';

/**
 * This method extends the behavior of `buildVideoUrl` by not only constructing the Google Ad Manager video ad tag URL,
 * but also fetching and processing the resulting VAST wrapper returned by GAM.
 *
 * If the `cache.useLocal` flag is set to `true`,
 * the function scans the received GAM VAST wrapper for the bid’s cached asset URL that corresponds to a locally stored blob in Prebid.js.
 * When such a match is found, it replaces the contents of the GAM wrapper with the contents of the locally cached VAST XML blob, effectively inlining the ad markup instead of referencing it remotely.
 */
export function getVastXml(
  options: RequireAtLeastOne<GamVideoOptions, 'params' | 'url'>,
  localCacheMap?: Map<string, string>
): Promise<string>;

/**
 * Options passed to {@link buildGamVideoUrl} and {@link getVastXml}.
 */
export interface GamVideoOptions {
  /**
   * The Prebid ad unit to which the returned URL will map.
   */
  adUnit: AdUnitDefinition;
  /**
   * The Prebid bid for which targeting will be set.
   * If this is not defined, Prebid will use the bid with the highest CPM for the adUnit.
   */
  bid?: Bid;
  /**
   * Querystring parameters that will be used to construct the Google Ad Manager video ad tag URL.
   * Publisher-supplied values will override values set by Prebid.js.
   *
   * For more information on any of these params, see the Google Ad Manager video tag documentation (https://support.google.com/admanager/answer/10678356?visit_id=639161810631357890-3885088664&rd=2)
   *
   * In the event of collisions, querystring values passed via `params` take precedence over those passed via `url`.
   */
  params?: GamVideoParams;
  /**
   * The video ad server URL.
   * When given alongside params, the parsed URL will be overwritten with any matching components of params.
   */
  url?: string;
}

export type GamVideoCustParams = {
  [key: string]: string | string[] | number | boolean | undefined;
};
export interface GamVideoParams {
  /**
   * Google Ad Manager ad unit ID.
   */
  iu: string;
  /**
   * Describes the video.
   * Required for Ad Exchange.
   * Prebid.js will build this for you unless you pass it explicitly.
   */
  description_url?: string;
  /**
   * Key-value pairs merged with Prebid’s targeting values and sent to Google Ad Manager on the video ad tag URL.
   */
  cust_params?: GamVideoCustParams;
  /**
   * Additional VAST Ad Tag parameters
   *
   * @see {@link https://support.google.com/admanager/answer/10678356?hl=en}
   */
  [key: string]: string | number | boolean | GamVideoCustParams | undefined;
}

/**
 * This method combines publisher-provided parameters with Prebid.js targeting parameters to build a Google Ad Manager video ad tag URL that can be used by a video player.
 *
 * @returns A URL string, or `undefined` when neither `params` nor `url` is provided.
 */
export function buildGamVideoUrl(options: RequireAtLeastOne<GamVideoOptions, 'params' | 'url'>): string | undefined;

declare module '../src/prebidGlobal' {
  interface PrebidJS {
    adServers?: {
      gam?: {
        buildVideoUrl: typeof buildGamVideoUrl;
        getVastXml: typeof getVastXml;
      };
    };
  }
}

export {};
