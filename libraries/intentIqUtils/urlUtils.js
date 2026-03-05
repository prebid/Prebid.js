export function appendSPData (url, partnerData) {
  const spdParam = partnerData?.spd ? encodeURIComponent(typeof partnerData.spd === 'object' ? JSON.stringify(partnerData.spd) : partnerData.spd) : '';
  if (!spdParam) {
    return url;
  }
  return `${url}&spd=${spdParam}`;
};
