import { NATIVE_ASSETS, NATIVE_ASSETS_IDS } from './nativeAssets.js';

/**
 * Builds a native request object based on the bid request
 * @param {object} br - The bid request
 * @returns {object} The native request object
 */
export function createNativeRequest(br) {
  let impObject = {
    ver: '1.2',
    assets: []
  };

  Object.keys(br.mediaTypes.native).forEach((key) => {
    const props = NATIVE_ASSETS[key];
    if (props) {
      const asset = {
        required: br.mediaTypes.native[key].required ? 1 : 0,
        id: props.id,
        [props.name]: {}
      };

      if (props.type) asset[props.name]['type'] = props.type;
      if (br.mediaTypes.native[key].len) asset[props.name]['len'] = br.mediaTypes.native[key].len;
      if (br.mediaTypes.native[key].sizes && br.mediaTypes.native[key].sizes[0]) {
        asset[props.name]['w'] = br.mediaTypes.native[key].sizes[0];
        asset[props.name]['h'] = br.mediaTypes.native[key].sizes[1];
      }

      impObject.assets.push(asset);
    }
  });

  return impObject;
}

/**
 * Builds a banner request object based on the bid request
 * @param {object} br - The bid request
 * @returns {object} The banner request object
 */
export function createBannerRequest(br) {
  let size = br.mediaTypes.banner.sizes?.[0] || [300, 250];
  return { id: br.transactionId, w: size[0], h: size[1] };
}

/**
 * Builds a video request object based on the bid request
 * @param {object} br - The bid request
 * @returns {object} The video request object
 */
export function createVideoRequest(br) {
  let videoObj = { id: br.transactionId };
  const supportedParams = ['mimes', 'minduration', 'maxduration', 'protocols', 'startdelay', 'skip', 'minbitrate', 'maxbitrate', 'api', 'linearity'];

  supportedParams.forEach((param) => {
    if (br.mediaTypes.video[param] !== undefined) {
      videoObj[param] = br.mediaTypes.video[param];
    }
  });

  const playerSize = br.mediaTypes.video.playerSize;
  if (playerSize) {
    videoObj.w = Array.isArray(playerSize[0]) ? playerSize[0][0] : playerSize[0];
    videoObj.h = Array.isArray(playerSize[0]) ? playerSize[0][1] : playerSize[1];
  } else {
    videoObj.w = 640;
    videoObj.h = 480;
  }

  return videoObj;
}

/**
 * Parses the native ad response
 * @param {object} adm - The native ad response
 * @returns {object} Parsed native ad object
 */
export function parseNative(adm) {
  let bid = {
    clickUrl: adm.native.link?.url,
    impressionTrackers: adm.native.imptrackers || [],
    clickTrackers: adm.native.link?.clicktrackers || [],
    jstracker: adm.native.jstracker || []
  };
  adm.native.assets.forEach((asset) => {
    const kind = NATIVE_ASSETS_IDS[asset.id];
    const content = kind && asset[NATIVE_ASSETS[kind].name];
    if (content) {
      bid[kind] = content.text || content.value || { url: content.url, width: content.w, height: content.h };
    }
  });

  return bid;
}
