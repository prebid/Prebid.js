import { logInfo, logWarn, logError } from "../../../src/utils.js";

// pluginManager.js
export const plugins = new Map();
export const CONSTANTS = Object.freeze({
  LOG_PRE_FIX: 'PubMatic-Plugin-Manager: '
});

/**
 * Initialize the plugin manager with constants
 * @returns {Object} - Plugin manager functions
 */
export const PluginManager = () => ({
  register,
  initialize,
  executeHook
});

/**
 * Register a plugin with the plugin manager
 * @param {string} name - Plugin name
 * @param {Object} plugin - Plugin object
 * @returns {Object} - Plugin manager functions
 */
const register = (name, plugin) => {
  if (plugins.has(name)) {
    logWarn(`${CONSTANTS.LOG_PRE_FIX} Plugin ${name} already registered`);
    return;
  }
  plugins.set(name, plugin);
};

/**
 * Unregister a plugin from the plugin manager
 * @param {string} name - Plugin name
 * @returns {Object} - Plugin manager functions
 */
const unregister = (name) => {
  if (plugins.has(name)) {
    logInfo(`${CONSTANTS.LOG_PRE_FIX} Unregistering plugin ${name}`);
    plugins.delete(name);
  }
};

/**
 * Initialize all registered plugins with their specific config
 * @param {Object} configJsonManager - Configuration JSON manager object
 * @returns {Promise} - Promise resolving when all plugins are initialized
 */
const initialize = async (configJsonManager) => {
  const initPromises = [];

  // Initialize each plugin with its specific config
  for (const [name, plugin] of plugins.entries()) {
    if (plugin.init) {
      const initialized = await plugin.init(name, configJsonManager);
      if (!initialized) {
        unregister(name);
      }
      initPromises.push(initialized);
    }
  }

  return Promise.all(initPromises);
};

/**
 * Execute a hook on all registered plugins synchronously
 * @param {string} hookName - Name of the hook to execute
 * @param {...any} args - Arguments to pass to the hook
 * @returns {Object} - Object containing merged results from all plugins
 */
const executeHook = (hookName, ...args) => {
  // Cache results to avoid repeated processing
  const results = {};

  try {
    // Get all plugins that have the specified hook method
    const pluginsWithHook = Array.from(plugins.entries())
      .filter(([_, plugin]) => typeof plugin[hookName] === 'function');

    // Process each plugin synchronously
    for (const [name, plugin] of pluginsWithHook) {
      try {
        // Call the plugin's hook method synchronously
        const result = plugin[hookName](...args);

        // Skip null/undefined results
        if (result === null || result === undefined) {
          continue;
        }

        // If result is an object, merge it
        if (typeof result === 'object') {
          Object.assign(results, result);
        }
      } catch (error) {
        logError(`${CONSTANTS.LOG_PRE_FIX} Error executing hook ${hookName} in plugin ${name}: ${error.message}`);
      }
    }
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error in executeHookSync: ${error.message}`);
  }

  return results;
};
