import { logError } from "../../../src/utils.js";

// pluginManager.js
const plugins = new Map();
export const CONSTANTS = Object.freeze({
  LOG_PRE_FIX: 'PubMatic-Plugin-Manager: '
});

/**
 * Initialize the plugin manager with constants
 * @returns {Object} - Plugin manager functions
 */
export function PluginManager() {
  return {
    register,
    initialize,
    executeHook
  };
}

/**
 * Register a plugin with the plugin manager
 * @param {string} name - Plugin name
 * @param {Object} plugin - Plugin object
 * @returns {Object} - Plugin manager functions
 */
function register(name, plugin) {
  if (plugins.has(name)) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Plugin ${name} already registered`);
    return;
  }
  plugins.set(name, plugin);
  return { register, initialize, executeHook };
}

/**
 * Initialize all registered plugins with their specific config
 * @param {Object} config - Configuration object
 * @returns {Promise} - Promise resolving when all plugins are initialized
 */
async function initialize(result) {
  const initPromises = [];
  
  // Initialize each plugin with its specific config
  for (const [name, plugin] of plugins.entries()) {
    if (result.config.plugins && result.config.plugins[name] && plugin.init) {
      initPromises.push(plugin.init(result.config.plugins[name]));
    }
  }
  
  return Promise.all(initPromises);
}

/**
 * Execute a hook on all registered plugins
 * @param {string} hookName - Name of the hook to execute
 * @param {...any} args - Arguments to pass to the hook
 * @returns {Promise<Object>} - Promise resolving to an object of results
 */
async function executeHook(hookName, ...args) {
  const results = {};
  
  for (const [name, plugin] of plugins.entries()) {
    if (typeof plugin[hookName] === 'function') {
      results[name] = await plugin[hookName](...args);
    }
  }
  
  return results;
}
