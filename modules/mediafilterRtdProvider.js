/**
 * This module adds the Media Filter real-time ad monitoring and protection module.
 *
 * The {@link module:modules/realTimeData} module is required
 *
 * For more information, visit {@link https://www.themediatrust.com The Media Trust}.
 *
 * @author Mirnes Cajlakovic <mcajlakovic@themediatrust.com>
 * @module modules/mediafilterRtdProvider
 * @requires module:modules/realTimeData
 */

import { submodule } from '../src/hook.js';
import { logError, generateUUID } from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';

/** The event type for Media Filter. */
export const MEDIAFILTER_EVENT_TYPE = 'com.mediatrust.pbjs.';
/** The base URL for Media Filter scripts. */
export const MEDIAFILTER_BASE_URL = 'https://scripts.webcontentassessor.com/scripts/';

export const MediaFilter = {
  /**
   * Registers the Media Filter as a submodule of real-time data.
   */
  register: function() {
    submodule('realTimeData', {
      'name': 'mediafilter',
      'init': this.generateInitHandler()
    });
  },

  /**
   * Sets up the Media Filter by initializing event listeners and loading the external script.
   * @param {object} configuration - The configuration object.
   */
  setup: function(configuration) {
    this.setupEventListener(configuration.configurationHash);
    this.setupScript(configuration.configurationHash);
  },

  /**
   * Sets up an event listener for Media Filter messages.
   * @param {string} configurationHash - The configuration hash.
   */
  setupEventListener: function(configurationHash) {
    window.addEventListener('message', this.generateEventHandler(configurationHash));
  },

  /**
   * Loads the Media Filter script based on the provided configuration hash.
   * @param {string} configurationHash - The configuration hash.
   */
  setupScript: function(configurationHash) {
    loadExternalScript(MEDIAFILTER_BASE_URL.concat(configurationHash), 'mediafilter', () => {});
  },

  /**
   * Generates an event handler for Media Filter messages.
   * @param {string} configurationHash - The configuration hash.
   * @returns {function} The generated event handler.
   */
  generateEventHandler: function(configurationHash) {
    return (windowEvent) => {
      if (windowEvent.data.type === MEDIAFILTER_EVENT_TYPE.concat('.', configurationHash)) {
        events.emit(EVENTS.BILLABLE_EVENT, {
          'billingId': generateUUID(),
          'configurationHash': configurationHash,
          'type': 'impression',
          'vendor': 'mediafilter',
        });
      }
    };
  },

  /**
   * Generates an initialization handler for Media Filter.
   * @returns {function} The generated init handler.
   */
  generateInitHandler: function() {
    return (configuration) => {
      try {
        this.setup(configuration);
      } catch (error) {
        logError(`Error in initialization: ${error.message}`);
      }
    };
  }
};

// Register the module
MediaFilter.register();
