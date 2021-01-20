/**
 * This module adds DPES to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/deepintentDpesSubmodule
 * @requires module:modules/userId
 */


import * as utils from '../src/utils.js'
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';

/** @type {Submodule} */
export const deepintentDpesSubmodule = {

}

submodule('userId',deepintentDpesSubmodule);