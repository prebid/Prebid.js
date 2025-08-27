import { logError, logInfo, logWarn, generateUUID, isEmpty, isArray, isPlainObject, isFn } from '../../src/utils.js';

const LOG_WARN_PREFIX = '[Nexverse warn]: ';
const LOG_ERROR_PREFIX = '[Nexverse error]: ';
const LOG_INFO_PREFIX = '[Nexverse info]: ';
const NEXVERSE_USER_COOKIE_KEY = 'user_nexverse';

export const NV_ORTB_NATIVE_TYPE_MAPPING = {
  img: {
    '3': 'image',
    '1': 'icon'
  },
  data: {
    '1': 'sponsoredBy',
    '2': 'body',
    '3': 'rating',
    '4': 'likes',
    '5': 'downloads',
    '6': 'price',
    '7': 'salePrice',
    '8': 'phone',
    '9': 'address',
    '10': 'body2',
    '11': 'displayUrl',
    '12': 'cta'
  }
}

/**
 * Determines the device model (if possible).
 * @returns {string} The device model or a fallback message if not identifiable.
 */
export function getDeviceModel() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) {
    return 'iPhone';
  } else if (/iPad/i.test(ua)) {
    return 'iPad';
  } else if (/Android/i.test(ua)) {
    const match = ua.match(/Android.*;\s([a-zA-Z0-9\s]+)\sBuild/);
    return match ? match[1].trim() : 'Unknown Android Device';
  } else if (/Windows Phone/i.test(ua)) {
    return 'Windows Phone';
  } else if (/Macintosh/i.test(ua)) {
    return 'Mac';
  } else if (/Linux/i.test(ua)) {
    return 'Linux';
  } else if (/Windows/i.test(ua)) {
    return 'Windows PC';
  }
  return '';
}

/**
 * Prepapre the endpoint URL based on passed bid request.
 * @param {string} bidderEndPoint - Bidder End Point.
 * @param {object} bid - Bid details.
 * @returns {string} The Endpoint URL with required parameters.
 */
export function buildEndpointUrl(bidderEndPoint, bid) {
  const { uid, pubId, pubEpid } = bid.params;
  const isDebug = bid.isDebug;
  let endPoint = `${bidderEndPoint}?uid=${encodeURIComponent(uid)}&pub_id=${encodeURIComponent(pubId)}&pub_epid=${encodeURIComponent(pubEpid)}`;
  if (isDebug) {
    endPoint = `${endPoint}&test=1`;
  }
  return endPoint;
}
/**
 * Validates the bid request to ensure all required parameters are present.
 * @param {Object} bid - The bid request object.
 * @returns {boolean} True if the bid request is valid, false otherwise.
 */
export function isBidRequestValid(bid) {
  const isValid = !!(
    bid.params &&
    bid.params.uid && bid.params.uid.trim() &&
    bid.params.pubId && bid.params.pubId.trim() &&
    bid.params.pubEpid && bid.params.pubEpid.trim()
  );
  if (!isValid) {
    logError(`${LOG_ERROR_PREFIX} Missing required bid parameters.`);
  }

  return isValid;
}

/**
 * Parses the native response from the server into Prebid's native format.
 *
 * @param {string} adm - The adm field from the bid response (JSON string).
 * @returns {Object} The parsed native response object.
 */
export function parseNativeResponse(adm) {
  try {
    const admObj = JSON.parse(adm);
    if (!admObj || !admObj.native) {
      return {};
    }
    const { assets, link, imptrackers, jstracker } = admObj.native;
    const result = {
      clickUrl: (link && link.url) ? link.url : '',
      clickTrackers: (link && link.clicktrackers && isArray(link.clicktrackers)) ? link.clicktrackers : [],
      impressionTrackers: (imptrackers && isArray(imptrackers)) ? imptrackers : [],
      javascriptTrackers: (jstracker && isArray(jstracker)) ? jstracker : [],
    };
    if (isArray(assets)) {
      assets.forEach(asset => {
        if (!isEmpty(asset.title) && !isEmpty(asset.title.text)) {
          result.title = asset.title.text
        } else if (!isEmpty(asset.img)) {
          result[NV_ORTB_NATIVE_TYPE_MAPPING.img[asset.img.type]] = {
            url: asset.img.url,
            height: asset.img.h,
            width: asset.img.w
          }
        } else if (!isEmpty(asset.data)) {
          result[NV_ORTB_NATIVE_TYPE_MAPPING.data[asset.data.type]] = asset.data.value
        }
      });
    }
    return result;
  } catch (e) {
    printLog('error', `Error parsing native response: `, e)
    logError(`${LOG_ERROR_PREFIX} Error parsing native response: `, e);
    return {};
  }
}

/**
 * Parses the native response from the server into Prebid's native format.
 * @param {type} type - Type of log. default is info
 * @param {args} args - Log data.
 */
export function printLog(type, ...args) {
  // Determine the prefix based on the log type
  const prefixes = {
    error: LOG_ERROR_PREFIX,
    warning: LOG_WARN_PREFIX, // Assuming warning uses the same prefix as error
    info: LOG_INFO_PREFIX
  };

  // Construct the log message by joining all arguments into a single string
  const logMessage = args
    .map(arg => (arg instanceof Error ? `${arg.name}: ${arg.message}` : arg))
    .join(' '); // Join all arguments into a single string with a space separator
  // Add prefix and punctuation (for info type)
  const formattedMessage = `${prefixes[type] || LOG_INFO_PREFIX} ${logMessage}${type === 'info' ? '.' : ''}`;
  // Map the log type to its corresponding log function
  const logFunctions = {
    error: logError,
    warning: logWarn,
    info: logInfo
  };

  // Call the appropriate log function (defaulting to logInfo)
  (logFunctions[type] || logInfo)(formattedMessage);
}
/**
 * Get or Create Uid for First Party Cookie
 */
export const getUid = (storage) => {
  let nexverseUid = storage.getCookie(NEXVERSE_USER_COOKIE_KEY);
  if (!nexverseUid) {
    nexverseUid = generateUUID();
  }
  try {
    const expirationInMs = 60 * 60 * 24 * 365 * 1000; // 1 year in milliseconds
    const expirationTime = new Date(Date.now() + expirationInMs); // Set expiration time
    // Set the cookie with the expiration date
    storage.setCookie(NEXVERSE_USER_COOKIE_KEY, nexverseUid, expirationTime.toUTCString());
  } catch (e) {
    printLog('error', `Failed to set UID cookie: ${e.message}`);
  }
  return nexverseUid;
};

export const getBidFloor = (bid, creative) => {
  let floorInfo = isFn(bid.getFloor) ? bid.getFloor({ currency: 'USD', mediaType: creative, size: '*' }) : {};
  if (isPlainObject(floorInfo) && !isNaN(floorInfo.floor)) {
    return floorInfo.floor
  }
  return (bid.params.bidFloor ? bid.params.bidFloor : 0.0);
}

/**
 * Detects the OS and version from the browser and formats them for ORTB 2.5.
 *
 * @returns {Object} An object with:
 *   - os:  {string}  OS name (e.g., "iOS", "Android")
 *   - osv: {string|undefined} OS version (e.g., "14.4.2") or undefined if not found
 */
export const getOsInfo = () => {
  const ua = navigator.userAgent;

  if (/windows phone/i.test(ua)) {
    return { os: "Windows Phone", osv: undefined };
  }

  if (/windows nt/i.test(ua)) {
    const match = ua.match(/Windows NT ([\d.]+)/);
    return { os: "Windows", osv: match?.[1] };
  }

  if (/android/i.test(ua)) {
    const match = ua.match(/Android ([\d.]+)/);
    return { os: "Android", osv: match?.[1] };
  }

  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
    const match = ua.match(/OS (\d+[_\d]*)/);
    const osv = match?.[1]?.replace(/_/g, '.');
    return { os: "iOS", osv };
  }

  if (/Mac OS X/.test(ua)) {
    const match = ua.match(/Mac OS X (\d+[_.]\d+[_.]?\d*)/);
    const osv = match?.[1]?.replace(/_/g, '.');
    return { os: "Mac OS", osv };
  }

  if (/Linux/.test(ua)) {
    return { os: "Linux", osv: undefined };
  }

  return { os: "Unknown", osv: undefined };
}
