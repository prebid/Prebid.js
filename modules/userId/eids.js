import {deepClone, isFn, isStr} from '../../src/utils.js';

/**
 * @typedef {import('./index.js').SubmodulePriorityMap} SubmodulePriorityMap
 */

export const EID_CONFIG = new Map();

// this function will create an eid object for the given UserId sub-module
function createEidObject(userIdData, subModuleKey, eidConf) {
  if (eidConf && userIdData) {
    let eid = {};
    eid.source = isFn(eidConf['getSource']) ? eidConf['getSource'](userIdData) : eidConf['source'];
    const value = isFn(eidConf['getValue']) ? eidConf['getValue'](userIdData) : userIdData;
    if (isStr(value)) {
      const uid = { id: value, atype: eidConf['atype'] };
      // getUidExt
      if (isFn(eidConf['getUidExt'])) {
        const uidExt = eidConf['getUidExt'](userIdData);
        if (uidExt) {
          uid.ext = uidExt;
        }
      }
      eid.uids = [uid];
      // getEidExt
      if (isFn(eidConf['getEidExt'])) {
        const eidExt = eidConf['getEidExt'](userIdData);
        if (eidExt) {
          eid.ext = eidExt;
        }
      }
      return eid;
    }
  }
  return null;
}

export function createEidsArray(bidRequestUserId, eidConfigs = EID_CONFIG) {
  const allEids = {};
  function collect(eid) {
    const key = JSON.stringify([eid.source?.toLowerCase(), eid.ext]);
    if (allEids.hasOwnProperty(key)) {
      allEids[key].uids.push(...eid.uids);
    } else {
      allEids[key] = eid;
    }
  }

  Object.entries(bidRequestUserId).forEach(([name, values]) => {
    values = Array.isArray(values) ? values : [values];
    const eids = name === 'pubProvidedId' ? deepClone(values) : values.map(value => createEidObject(value, name, eidConfigs.get(name)));
    eids.filter(eid => eid != null).forEach(collect);
  })
  return Object.values(allEids);
}

/**
 * @param {SubmodulePriorityMap} priorityMap
 */
export function getEids(priorityMap) {
  const eidConfigs = new Map();
  const idValues = {};
  Object.entries(priorityMap).forEach(([key, submodules]) => {
    const submodule = submodules.find(mod => mod.idObj?.[key] != null);
    if (submodule) {
      idValues[key] = submodule.idObj[key];
      eidConfigs.set(key, submodule.submodule.eids?.[key])
    }
  })
  return createEidsArray(idValues, eidConfigs);
}
