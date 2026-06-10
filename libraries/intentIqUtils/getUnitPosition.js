export function getUnitPosition(pbjs, adUnitCode) {
  const adUnits = pbjs?.adUnits;
  if (!Array.isArray(adUnits) || !adUnitCode) return;

  for (let i = 0; i < adUnits.length; i++) {
    const adUnit = adUnits[i];
    if (adUnit?.code !== adUnitCode) continue;

    const mediaTypes = adUnit?.mediaTypes;
    if (!mediaTypes || typeof mediaTypes !== 'object') return;

    const firstKey = Object.keys(mediaTypes)[0];
    const pos = mediaTypes[firstKey]?.pos;

    return typeof pos === 'number' ? pos : undefined;
  }
}
