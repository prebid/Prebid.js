import { pick, isFn, isStr, isPlainObject, deepAccess } from '../../src/utils.js';

// Each user-id sub-module is expected to mention respective config here
export const USER_IDS_CONFIG = {};

// this function will create an eid object for the given UserId sub-module
function createEidObject(userIdData, subModuleKey) {
  const conf = USER_IDS_CONFIG[subModuleKey];
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

// this function will generate eids array for all available IDs in bidRequest.userId
// this function will be called by userId module
// if any adapter does not want any particular userId to be passed then adapter can use Array.filter(e => e.source != 'tdid')
export function createEidsArray(bidRequestUserId) {
  let eids = [];

  for (const subModuleKey in bidRequestUserId) {
    if (bidRequestUserId.hasOwnProperty(subModuleKey)) {
      if (subModuleKey === 'pubProvidedId') {
        eids = eids.concat(bidRequestUserId['pubProvidedId']);
      } else if (Array.isArray(bidRequestUserId[subModuleKey])) {
        bidRequestUserId[subModuleKey].forEach((config, index, arr) => {
          const eid = createEidObject(config, subModuleKey);

          if (eid) {
            eids.push(eid);
          }
        })
      } else {
        const eid = createEidObject(bidRequestUserId[subModuleKey], subModuleKey);
        if (eid) {
          eids.push(eid);
        }
      }
    }
  }

  return eids;
}

/**
 * @param {SubmoduleContainer[]} submodules
 */
export function buildEidPermissions(submodules) {
  let eidPermissions = [];
  submodules.filter(i => isPlainObject(i.idObj) && Object.keys(i.idObj).length)
    .forEach(i => {
      Object.keys(i.idObj).forEach(key => {
        if (deepAccess(i, 'config.bidders') && Array.isArray(i.config.bidders) &&
          deepAccess(USER_IDS_CONFIG, key + '.source')) {
          eidPermissions.push(
            {
              source: USER_IDS_CONFIG[key].source,
              bidders: i.config.bidders
            }
          );
        }
      });
    });
  return eidPermissions;
}
