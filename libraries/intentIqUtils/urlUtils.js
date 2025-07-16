export function appendSPData (url, firstPartyData) {
  const spdParam = firstPartyData?.spd ? encodeURIComponent(typeof firstPartyData.spd === 'object' ? JSON.stringify(firstPartyData.spd) : firstPartyData.spd) : '';
  url += spdParam ? '&spd=' + spdParam : '';
  return url
};
