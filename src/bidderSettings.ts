import {deepAccess, mergeDeep} from './utils.js';
import {getGlobal} from './prebidGlobal.js';
import { JSON_MAPPING } from './constants.js';
import type {BidderCode} from "./types/common";
import type {BidRequest} from "./adapterManager.ts";
import type {Bid} from "./bidfactory.ts";
import type {StorageType} from "./storageManager.ts";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface BidderSettings<B extends BidderCode> {
    /**
     * If true, allow bids with CPM 0to be accepted by Prebid.js and sent to the ad server.
     */
    allowZeroCpmBids?: boolean;
    /**
     * Optionally allow alternate bidder codes to use an adapter’s bidCpmAdjustment function by default instead of
     * the standard bidCpmAdjustment function if present (note: if a bidCpmAdjustment function exists for the alternate
     * bidder code within bidderSettings, then this will be used instead of falling back to the adapter’s bidCpmAdjustment function).
     */
    adjustAlternateBids?: boolean;
    /**
     * If adapter-specific targeting is specified, can be used to suppress the standard targeting for that adapter.
     */
    sendStandardTargeting?: boolean;
    /**
     * If custom adserverTargeting functions are specified that may generate empty keys, this can be used to suppress them.
     */
    suppressEmptyKeys?: boolean;
    /**
     * Allow use of cookies and/or local storage.
     */
    storageAllowed?: boolean | StorageType[];
    /**
     * Allow adapters to bid with alternate bidder codes.
     */
    allowAlternateBidderCodes?: boolean;
    /**
     * Array of bidder codes for which an adapter can bid.
     * undefined or ['*'] will allow adapter to bid with any bidder code.
     */
    allowedAlternateBidderCodes?: ['*'] | BidderCode[];
    /**
     * If true (the default), allow the `Sec-Browsing-Topics` header in requests to their exchange.
     */
    topicsHeader?: boolean;
}

export interface BidderScopedSettings<B extends BidderCode> extends BidderSettings<B> {
    /**
     * Custom CPM adjustment function. Could, for example, adjust a bidder’s gross-price bid to net price.
     */
    bidCpmAdjustment?: (cpm: number, bid: Bid, bidRequest: BidRequest<B>) => number;
    /**
     * Define which key/value pairs are sent to the ad server.
     */
    adserverTargeting?: ({
        key: string;
        val(bid: Bid, bidRequest: BidRequest<B>): string;
    })[];
}

export class ScopedSettings<SETTINGS extends Record<string, any>, SCOPED extends SETTINGS> {
  getSettings;
  defaultScope;
  constructor(getSettings, defaultScope) {
    this.getSettings = getSettings;
    this.defaultScope = defaultScope;
  }

  /**
   * Get setting value at `path` under the given scope, falling back to the default scope if needed.
   * If `scope` is `null`, get the setting's default value.
   */
  get<P extends keyof SETTINGS>(scope, path: P): SETTINGS[P] {
    let value = this.getOwn(scope, path);
    if (typeof value === 'undefined') {
      value = this.getOwn(null, path);
    }
    return value;
  }

  /**
   * Get the setting value at `path` *without* falling back to the default value.
   */
  getOwn<P extends keyof SCOPED>(scope, path: P): SCOPED[P] {
    scope = this.#resolveScope(scope);
    return deepAccess(this.getSettings(), `${scope}.${path as any}`)
  }

  /**
   * @returns all existing scopes except the default one.
   */
  getScopes(): string[] {
    return Object.keys(this.getSettings()).filter((scope) => scope !== this.defaultScope);
  }

  /**
   * @returns all settings in the given scope, merged with the settings for the default scope.
   */
  settingsFor(scope): SETTINGS {
    return mergeDeep({}, this.ownSettingsFor(null), this.ownSettingsFor(scope));
  }

  /**
   * @returns all settings in the given scope, *without* any of the default settings.
   */
  ownSettingsFor(scope): SCOPED {
    scope = this.#resolveScope(scope);
    return this.getSettings()[scope] || {};
  }

  #resolveScope(scope) {
    if (scope == null) {
      return this.defaultScope;
    } else {
      return scope;
    }
  }
}

export const bidderSettings = new ScopedSettings<BidderSettings<BidderCode>, BidderScopedSettings<BidderCode>>(() => getGlobal().bidderSettings || {}, JSON_MAPPING.BD_SETTING_STANDARD);
