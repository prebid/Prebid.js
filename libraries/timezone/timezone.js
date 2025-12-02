export function getTimeZone() {
  try {
    const intl = (typeof Intl === 'object' && Intl) || (typeof window !== 'undefined' && window.Intl);
    return intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;
  } catch (e) {
    return undefined;
  }
}
