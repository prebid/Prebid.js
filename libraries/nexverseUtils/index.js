import { logError, logInfo, logWarn } from '../../src/utils.js';

const LOG_WARN_PREFIX = '[Nexverse warn]: ';
const LOG_ERROR_PREFIX = '[Nexverse error]: ';
const LOG_INFO_PREFIX = '[Nexverse info]: ';

/**
 * Determines the os version (if possible).
 * @returns {string} The device model.
 */
export function getOsVersion() {
  const ua = navigator.userAgent;
  let osVersion = 'unknown';

  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s([0-9\.]+)/);
    if (match) {
      osVersion = match[1];
    }
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const match = ua.match(/OS\s([0-9_]+)/);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  }
  return osVersion;
}

/**
 * Determines the device model (if possible).
 * @returns {string} The device model.
 */
export function getDeviceModel() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) {
    return 'iPhone';
  } else if (/iPad/i.test(ua)) {
    return 'iPad';
  } else if (/Android/i.test(ua)) {
    const match = ua.match(/Android.*;\s([a-zA-Z0-9\s]+)\sBuild/);
    return match ? match[1].trim() : '';
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
 * Checks if the request is made over a secure connection (HTTPS).
 * @returns {boolean} True if the connection is secure (HTTPS), false otherwise.
 */
export function isSecureRequest() {
  return location.protocol === 'https:' ? 1 : 0;
}

/**
 * Validates the bid request to ensure all required parameters are present.
 * @param {Object} bid - The bid request object.
 * @returns {boolean} True if the bid request is valid, false otherwise.
 */
export function isBidRequestValid(bid) {
  const isValid = !!(bid.params && bid.params.uid && bid.params.pubId && bid.params.pubEpid);

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
    return admObj.native;
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
