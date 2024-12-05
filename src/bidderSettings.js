import {deepAccess, mergeDeep} from './utils.js';
import {getGlobal} from './prebidGlobal.js';
import { JSON_MAPPING } from './constants.js';

export class ScopedSettings {
  constructor(getSettings, defaultScope) {
    this.getSettings = getSettings;
    this.defaultScope = defaultScope;
  }

  /**
   * Get setting value at `path` under the given scope, falling back to the default scope if needed.
   * If `scope` is `null`, get the setting's default value.
   * @param scope {String|null}
   * @param path {String}
   * @returns {*}
   */
  get(scope, path) {
    let value = this.getOwn(scope, path);
    if (typeof value === 'undefined') {
      value = this.getOwn(null, path);
    }
    return value;
  }

  /**
   * Get the setting value at `path` *without* falling back to the default value.
   * @param scope {String}
   * @param path {String}
   * @returns {*}
   */
  getOwn(scope, path) {
    scope = this.#resolveScope(scope);
    return deepAccess(this.getSettings(), `${scope}.${path}`)
  }

  /**
   * @returns {string[]} all existing scopes except the default one.
   */
  getScopes() {
    return Object.keys(this.getSettings()).filter((scope) => scope !== this.defaultScope);
  }

  /**
   * @returns all settings in the given scope, merged with the settings for the default scope.
   */
  settingsFor(scope) {
    return mergeDeep({}, this.ownSettingsFor(null), this.ownSettingsFor(scope));
  }

  /**
   * @returns all settings in the given scope, *without* any of the default settings.
   */
  ownSettingsFor(scope) {
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

export const bidderSettings = new ScopedSettings(() => getGlobal().bidderSettings || {}, JSON_MAPPING.BD_SETTING_STANDARD);
