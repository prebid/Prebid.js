export function scrubIPv4(ip) {
  if (!ip) {
    return null;
  }

  const ones = 24;

  let ipParts = ip.split('.').map(Number)

  if (ipParts.length != 4) {
    return null;
  }

  let mask = [];
  for (let i = 0; i < 4; i++) {
    let n = Math.max(0, Math.min(8, ones - (i * 8)));
    mask.push((0xff << (8 - n)) & 0xff);
  }

  let maskedIP = ipParts.map((part, i) => part & mask[i]);

  return maskedIP.join('.');
}

export function scrubIPv6(ip) {
  if (!ip) {
    return null;
  }

  const ones = 64;

  let ipParts = ip.split(':').map(part => parseInt(part, 16));

  ipParts = ipParts.map(part => isNaN(part) ? 0 : part);
  while (ipParts.length < 8) {
    ipParts.push(0);
  }

  if (ipParts.length != 8) {
    return null;
  }

  let mask = [];
  for (let i = 0; i < 8; i++) {
    let n = Math.max(0, Math.min(16, ones - (i * 16)));
    mask.push((0xffff << (16 - n)) & 0xffff);
  }

  let maskedIP = ipParts.map((part, i) => part & mask[i]);

  return maskedIP.map(part => part.toString(16)).join(':');
}
