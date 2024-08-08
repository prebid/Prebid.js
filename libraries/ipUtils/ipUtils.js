export function scrubIP(ip) {
  if (!ip) {
    return '';
  }

  let isIPv4 = ip.indexOf(':') === -1;

  const ones = isIPv4 ? 24 : 64;

  let ipParts = isIPv4 ? ip.split('.').map(Number) : ip.split(':').map(part => parseInt(part, 16));

  if (!isIPv4) {
    ipParts = ipParts.map(part => isNaN(part) ? 0 : part);
    while (ipParts.length < 8) {
      ipParts.push(0);
    }
  }

  let mask = [];
  for (let i = 0; i < (isIPv4 ? 4 : 8); i++) {
    let n = Math.max(0, Math.min(isIPv4 ? 8 : 16, ones - (isIPv4 ? i * 8 : i * 16)));
    mask.push(isIPv4 ? (0xff << (8 - n)) & 0xff : (0xffff << (16 - n)) & 0xffff);
  }

  let maskedIP = ipParts.map((part, i) => part & mask[i]);

  return isIPv4
    ? maskedIP.join('.')
    : maskedIP.map(part => part.toString(16)).join(':');
}