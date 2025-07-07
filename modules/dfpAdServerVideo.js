/* eslint prebid/validate-imports: "off" */
import {registerVideoSupport} from '../src/adServerManager.js';
import {buildGamVideoUrl, getVastXml, notifyTranslationModule, dep, VAST_TAG_URI_TAGNAME, getBase64BlobContent} from './gamAdServerVideo.js';

export const buildDfpVideoUrl = buildGamVideoUrl;
export { getVastXml, notifyTranslationModule, dep, VAST_TAG_URI_TAGNAME, getBase64BlobContent };

registerVideoSupport('dfp', {
  buildVideoUrl: buildDfpVideoUrl,
  getVastXml
});
