export function isCHSupported(nav) {
  const n = nav ?? (typeof navigator !== 'undefined' ? navigator : undefined);
  return typeof n?.userAgentData?.getHighEntropyValues === 'function';
};
