import {logError, deepClone, isFn, isStr} from '../../src/utils.js';

export const EID_CONFIG = new Map();

// this function will create an eid object for the given UserId sub-module
function createEidObject(userIdData, subModuleKey, eidConf) {
  if (eidConf && userIdData) {
    const eid = {};
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
      if (eidConf['inserter'] || isFn(eidConf['getInserter'])) {
        const inserter = isFn(eidConf['getInserter']) ? eidConf['getInserter'](userIdData) : eidConf['inserter'];
        if (inserter != null) {
          eid.inserter = inserter;
        }
      }
      if (eidConf['matcher'] || isFn(eidConf['getMatcher'])) {
        const matcher = isFn(eidConf['getMatcher']) ? eidConf['getMatcher'](userIdData) : eidConf['matcher'];
        if (matcher != null) {
          eid.matcher = matcher;
        }
      }
      if (eidConf['mm'] != null) {
        eid.mm = eidConf['mm'];
      }
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
    const key = JSON.stringify([
      eid.source?.toLowerCase(),
      ...Object.keys(eid).filter(k => !['uids', 'source'].includes(k)).sort().map(k => eid[k])
    ]);
    if (allEids.hasOwnProperty(key)) {
      allEids[key].uids.push(...eid.uids);
    } else {
      allEids[key] = eid;
    }
  }

  Object.entries(bidRequestUserId).forEach(([name, values]) => {
    values = Array.isArray(values) ? values : [values];
    const eidConf = eidConfigs.get(name);
    let eids;
    if (name === 'pubProvidedId') {
      eids = deepClone(values);
    } else if (typeof eidConf === 'function') {
      try {
        eids = deepClone(eidConf(values));
        if (!Array.isArray(eids)) {
          eids = [eids];
        }
        eids.forEach(eid => {
          eid.uids = eid.uids.filter(({id}) => isStr(id))
        })
        eids = eids.filter(({uids}) => uids?.length > 0);
      } catch (e) {
        logError(`Could not generate EID for "${name}"`, e);
      }
    } else {
      eids = values.map(value => createEidObject(value, name, eidConf));
    }
    if (Array.isArray(eids)) {
      eids.filter(eid => eid != null).forEach(collect);
    }
  })
  return Object.values(allEids);
}

export function getEids(priorityMap) {
  const eidConfigs = new Map();
  const idValues = {};
  Object.entries(priorityMap).forEach(([key, getActiveModule]) => {
    const submodule = getActiveModule();
    if (submodule) {
      idValues[key] = submodule.idObj[key];
      let eidConf = submodule.submodule.eids?.[key];
      if (typeof eidConf === 'function') {
        // if eid config is given as a function, append the active module configuration to its args
        eidConf = ((orig) => (...args) => orig(...args, submodule.config))(eidConf);
      }
      eidConfigs.set(key, eidConf);
    }
  })
  return createEidsArray(idValues, eidConfigs);
}
