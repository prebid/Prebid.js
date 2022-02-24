import {install} from './debugging.js';
import { DEBUG_KEY } from '../../src/constants.json';

window[DEBUG_KEY] = function (options) {
  install(options);
}
