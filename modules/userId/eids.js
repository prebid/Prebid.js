import {deepAccess, deepClone, isFn, isPlainObject, isStr} from '../../src/utils.js';

export const EID_CONFIG = new Map();

// this function will create an eid object for the given UserId sub-module
function createEidObject(userIdData, subModuleKey) {
  const conf = EID_CONFIG.get(subModuleKey);
  if (conf && userIdData) {
    let eid = {};
    eid.source = isFn(conf['getSource']) ? conf['getSource'](userIdData) : conf['source'];
    const value = isFn(conf['getValue']) ? conf['getValue'](userIdData) : userIdData;
    if (isStr(value)) {
      const uid = { id: value, atype: conf['atype'] };
      // getUidExt
      if (isFn(conf['getUidExt'])) {
        const uidExt = conf['getUidExt'](userIdData);
        if (uidExt) {
          uid.ext = uidExt;
        }
      }
      eid.uids = [uid];
      // getEidExt
      if (isFn(conf['getEidExt'])) {
        const eidExt = conf['getEidExt'](userIdData);
        if (eidExt) {
          eid.ext = eidExt;
        }
      }
      return eid;
    }
  }
  return null;
}

export function createEidsArray(bidRequestUserId) {
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
    const eids = name === 'pubProvidedId' ? deepClone(values) : values.map(value => createEidObject(value, name));
    eids.filter(eid => eid != null).forEach(collect);
  })
  return Object.values(allEids);
}

/**
 * @param {SubmoduleContainer[]} submodules
 */
export function buildEidPermissions(submodules) {
  let eidPermissions = [];
  submodules.filter(i => isPlainObject(i.idObj) && Object.keys(i.idObj).length)
    .forEach(i => {
      Object.keys(i.idObj).forEach(key => {
        const eidConf = EID_CONFIG.get(key) || {};
        if (deepAccess(i, 'config.bidders') && Array.isArray(i.config.bidders) &&
          eidConf.source) {
          eidPermissions.push(
            {
              source: eidConf.source,
              bidders: i.config.bidders
            }
          );
        }
      });
    });
  return eidPermissions;
}
