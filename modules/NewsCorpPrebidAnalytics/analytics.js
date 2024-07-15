export const MOBILE_DEVICE = "phone";
export const TABLET_DEVICE = "tablet";
export const DESKTOP_DEVICE = "desktop";

const testUserAgent = (userAgent, expr) => {
  return expr.test(userAgent);
};

const isIpad = (userAgent) => {
  return testUserAgent(userAgent, /iPad/i);
};

const isIphone = (userAgent) => {
  return testUserAgent(userAgent, /iPhone/i);
};

const isIOS = (userAgent) => {
  return testUserAgent(userAgent, /iPad|iPhone|iPod/i);
};

const isAndroid = (userAgent) => {
  return testUserAgent(userAgent, /android/i);
};

const isMobileDevice = (userAgent) => {
  return testUserAgent(userAgent, /Mobile/i);
};

const isTabletDevice = (userAgent) => {
  return testUserAgent(userAgent, /Tablet|Silk/i);
};

export const detectDeviceType = (userAgent) => {
  let device = DESKTOP_DEVICE;
  if (isMobileDevice(userAgent) && !isIpad(userAgent)) {
    device = MOBILE_DEVICE;
  } else if (
    isIpad(userAgent) ||
    isAndroid(userAgent) ||
    isTabletDevice(userAgent)
  ) {
    device = TABLET_DEVICE;
  }
  return device;
};
