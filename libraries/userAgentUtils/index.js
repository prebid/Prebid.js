import { deviceTypes, browserTypes, osTypes } from './userAgentTypes.enums.js';

/**
 * Get the approximate device type enum from the user agent
 * @returns {number}
 */
export const getDeviceType = () => {
  if (
    /ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(
      navigator.userAgent.toLowerCase()
    )
  ) return deviceTypes.TABLET;
  if (
    /iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(
      navigator.userAgent.toLowerCase()
    )
  ) return deviceTypes.MOBILE;
  return deviceTypes.DESKTOP;
};

/**
 * Get the approximate browser type enum from the user agent (or vendor
 * if available)
 * @returns {number}
 */
export const getBrowser = () => {
  if (/Edg/.test(navigator.userAgent)) return browserTypes.EDGE;
  else if (
    /Chrome/.test(navigator.userAgent) &&
    /Google Inc/.test(navigator.vendor)
  ) return browserTypes.CHROME;
  else if (navigator.userAgent.match('CriOS')) return browserTypes.CHROME;
  else if (/Firefox/.test(navigator.userAgent)) return browserTypes.FIREFOX;
  else if (
    /Safari/.test(navigator.userAgent) &&
    /Apple Computer/.test(navigator.vendor)
  ) return browserTypes.SAFARI;
  else if (
    /Trident/.test(navigator.userAgent) ||
    /MSIE/.test(navigator.userAgent)
  ) return browserTypes.INTERNET_EXPLORER;
  else return browserTypes.OTHER;
};

/**
 * Get the approximate OS enum from the user agent (or app version,
 * if available)
 * @returns {number}
 */
export const getOS = () => {
  if (navigator.userAgent.indexOf('Android') !== -1) return osTypes.ANDROID;
  if (navigator.userAgent.indexOf('like Mac') !== -1) return osTypes.IOS;
  if (navigator.userAgent.indexOf('Win') !== -1) return osTypes.WINDOWS;
  if (navigator.userAgent.indexOf('Mac') !== -1) return osTypes.MAC;
  if (navigator.userAgent.indexOf('Linux') !== -1) return osTypes.LINUX;
  if (navigator.appVersion.indexOf('X11') !== -1) return osTypes.UNIX;
  return osTypes.OTHER;
};
