/* eslint prebid/validate-imports: "off" */
import {registerVideoSupport} from '../src/adServerManager.js';
import {buildAdpodVideoUrl, adpodUtils} from './gamAdpod.js';

export { buildAdpodVideoUrl, adpodUtils };

registerVideoSupport('dfp', {
  buildAdpodVideoUrl,
  getAdpodTargeting: (args) => adpodUtils.getTargeting(args)
});
