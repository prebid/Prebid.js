import adapterManager from '../adapterManager.js';
import {activityParamsBuilder} from './params.js';

/**
 * Utility function for building common activity parameters - broken out to its own
 * file to avoid circular imports.
 */
export const activityParams = activityParamsBuilder((alias) => adapterManager.resolveAlias(alias));
