import * as utils from '../../src/utils.js';

// Each user-id sub-module is expected to mention respective config here
const USER_IDS_CONFIG = {

  // key-name : {config}

  // intentIqId
  'intentIqId': {
    source: 'intentiq.com',
    atype: 1
  },

  // pubCommonId
  'pubcid': {
    source: 'pubcid.org',
    atype: 1
  },

  // unifiedId
  'tdid': {
    source: 'adserver.org',
    atype: 1,
    getUidExt: function() {
      return {
        rtiPartner: 'TDID'
      };
    }
  },

  // id5Id
  'id5id': {
    getValue: function(data) {
      return data.uid
    },
    source: 'id5-sync.com',
    atype: 1,
    getUidExt: function(data) {
      if (data.ext) {
        return data.ext;
      }
    }
  },

  // parrableId
  'parrableId': {
    source: 'parrable.com',
    atype: 1,
    getValue: function(parrableId) {
      if (parrableId.eid) {
        return parrableId.eid;
      }
      if (parrableId.ccpaOptout) {
        // If the EID was suppressed due to a non consenting ccpa optout then
        // we still wish to provide this as a reason to the adapters
        return '';
      }
      return null;
    },
    getUidExt: function(parrableId) {
      const extendedData = utils.pick(parrableId, [
        'ibaOptout',
        'ccpaOptout'
      ]);
      if (Object.keys(extendedData).length) {
        return extendedData;
      }
    }
  },

  // identityLink
  'idl_env': {
    source: 'liveramp.com',
    atype: 3
  },

  // liveIntentId
  'lipb': {
    getValue: function(data) {
      return data.lipbid;
    },
    source: 'liveintent.com',
    atype: 3,
    getEidExt: function(data) {
      if (Array.isArray(data.segments) && data.segments.length) {
        return {
          segments: data.segments
        };
      }
    }
  },

  // britepoolId
  'britepoolid': {
    source: 'britepool.com',
    atype: 3
  },

  // lotamePanoramaId
  lotamePanoramaId: {
    source: 'crwdcntrl.net',
    atype: 1,
  },

  // criteo
  'criteoId': {
    source: 'criteo.com',
    atype: 1
  },

  // merkleId
  'merkleId': {
    source: 'merkleinc.com',
    atype: 3,
    getValue: function(data) {
      return data.id;
    },
    getUidExt: function(data) {
      return (data && data.keyID) ? {
        keyID: data.keyID
      } : undefined;
    }
  },

  // NetId
  'netId': {
    source: 'netid.de',
    atype: 1
  },

  // sharedid
  'sharedid': {
    source: 'sharedid.org',
    atype: 1,
    getValue: function(data) {
      return data.id;
    },
    getUidExt: function(data) {
      return (data && data.third) ? {
        third: data.third
      } : undefined;
    }
  },

  // zeotapIdPlus
  'IDP': {
    source: 'zeotap.com',
    atype: 1
  },

  // haloId
  'haloId': {
    source: 'audigent.com',
    atype: 1
  },

  // quantcastId
  'quantcastId': {
    source: 'quantcast.com',
    atype: 1
  },

  // nextroll
  'nextrollId': {
    source: 'nextroll.com',
    atype: 1
  },

  // IDx
  'idx': {
    source: 'idx.lat',
    atype: 1
  },

  // Verizon Media ConnectID
  'connectid': {
    source: 'verizonmedia.com',
    atype: 3
  },

  // Neustar Fabrick
  'fabrickId': {
    source: 'neustar.biz',
    atype: 1
  },
  // MediaWallah OpenLink
  'mwOpenLinkId': {
    source: 'mediawallahscript.com',
    atype: 1
  },
  'tapadId': {
    source: 'tapad.com',
    atype: 1
  },
  // Novatiq Snowflake
  'novatiq': {
    getValue: function(data) {
      return data.snowflake
    },
    source: 'novatiq.com',
    atype: 1
  },
  'uid2': {
    source: 'uidapi.com',
    atype: 3,
    getValue: function(data) {
      return data.id;
    }
  },

  // Admixer Id
  'admixerId': {
    source: 'admixer.net',
    atype: 3
  }
};

// this function will create an eid object for the given UserId sub-module
function createEidObject(userIdData, subModuleKey) {
  const conf = USER_IDS_CONFIG[subModuleKey];
  if (conf && userIdData) {
    let eid = {};
    eid.source = conf['source'];
    const value = utils.isFn(conf['getValue']) ? conf['getValue'](userIdData) : userIdData;
    if (utils.isStr(value)) {
      const uid = { id: value, atype: conf['atype'] };
      // getUidExt
      if (utils.isFn(conf['getUidExt'])) {
        const uidExt = conf['getUidExt'](userIdData);
        if (uidExt) {
          uid.ext = uidExt;
        }
      }
      eid.uids = [uid];
      // getEidExt
      if (utils.isFn(conf['getEidExt'])) {
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
  submodules.filter(i => utils.isPlainObject(i.idObj) && Object.keys(i.idObj).length)
    .forEach(i => {
      Object.keys(i.idObj).forEach(key => {
        if (utils.deepAccess(i, 'config.bidders') && Array.isArray(i.config.bidders) &&
          utils.deepAccess(USER_IDS_CONFIG, key + '.source')) {
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
