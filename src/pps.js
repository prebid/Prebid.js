import { auctionManager } from './auctionManager.js';
import { TARGETING_KEYS } from './constants.js';
import { CLIENT_SECTIONS } from './fpd/oneClient.js';
import { deepAccess, uniques } from './utils.js';

export function getSegments(fpd, sections, segtax) {
  return sections
    .flatMap(section => deepAccess(fpd, section) || [])
    .filter(datum => datum.ext?.segtax === segtax)
    .flatMap(datum => datum.segment?.map(seg => seg.id))
    .filter(ob => ob)
    .filter(uniques)
}

export function getSignals(fpd) {
  const signals = Object.entries({
    IAB_AUDIENCE_1_1: getSegments(fpd, ['user.data'], 4),
    IAB_CONTENT_2_2: getSegments(fpd, CLIENT_SECTIONS.map(section => `${section}.content.data`), 6)
  }).map(([taxonomy, values]) => values.length ? {taxonomy, values} : null)
    .filter(ob => ob);

  return signals;
}

export function getSignalsArrayByAuctionsIds(auctionIds) {
  const signals = auctionIds
    .map(auctionId => auctionManager.index.getAuction({ auctionId })?.getFPD()?.global)
    .map(getSignals)
    .filter(fpd => fpd);

  return signals;
}

export function getSignalsIntersection(signals) {
  const taxonomies = ['IAB_AUDIENCE_1_1', 'IAB_CONTENT_2_2'];
  const result = {};
  taxonomies.forEach((taxonomy) => {
    const allValues = signals
      .flatMap(x => x)
      .filter(x => x.taxonomy === taxonomy)
      .map(x => x.values);
    result[taxonomy] = allValues.length ? (
      allValues.reduce((commonElements, subArray) => {
        return commonElements.filter(element => subArray.includes(element));
      })
    ) : []
    result[taxonomy] = { values: result[taxonomy] };
  })
  return result;
}

export function getAuctionsIdsFromTargeting(targeting) {
  return Object.values(targeting)
    .flatMap(x => Object.entries(x))
    .filter((entry) => (entry[0] || '').includes(TARGETING_KEYS.AD_ID))
    .flatMap(entry => entry[1])
    .filter(uniques);
}
