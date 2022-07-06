import { pick, isFn, isStr, isPlainObject, deepAccess } from '../../src/utils.js';

// Each user-id sub-module is expected to mention respective config here
export const USER_IDS_CONFIG = {

  // key-name : {config}

  // trustpid
  'trustpid': {
    source: 'trustpid.com',
    atype: 1,
    getValue: function (data) {
      return data;
    },
  },

  // intentIqId
  'intentIqId': {
    source: 'intentiq.com',
    atype: 1
  },

  // naveggId
  'naveggId': {
    source: 'navegg.com',
    atype: 1
  },

  // justId
  'justId': {
    source: 'justtag.com',
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

  // ftrack
  'ftrackId': {
    source: 'flashtalking.com',
    atype: 1,
    getValue: function(data) {
      return data.uid
    },
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
      const extendedData = pick(parrableId, [
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

  // dmdId
  'dmdId': {
    source: 'hcn.health',
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
    atype: 3,
    getSource: function(data) {
      if (data?.ext?.ssp) {
        return `${data.ext.ssp}.merkleinc.com`
      }
      return 'merkleinc.com'
    },
    getValue: function(data) {
      return data.id;
    },
    getUidExt: function(data) {
      if (data.keyID) {
        return {
          keyID: data.keyID
        }
      }
      if (data.ext) {
        return data.ext;
      }
    }
  },

  // NetId
  'netId': {
    source: 'netid.de',
    atype: 1
  },

  // zeotapIdPlus
  'IDP': {
    source: 'zeotap.com',
    atype: 1
  },

  // hadronId
  'hadronId': {
    source: 'audigent.com',
    atype: 1
  },

  // quantcastId
  'quantcastId': {
    source: 'quantcast.com',
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

  'deepintentId': {
    source: 'deepintent.com',
    atype: 3
  },

  // Admixer Id
  'admixerId': {
    source: 'admixer.net',
    atype: 3
  },

  // Adtelligent Id
  'adtelligentId': {
    source: 'adtelligent.com',
    atype: 3
  },

  amxId: {
    source: 'amxrtb.com',
    atype: 1,
  },

  'publinkId': {
    source: 'epsilon.com',
    atype: 3
  },

  'kpuid': {
    source: 'kpuid.com',
    atype: 3
  },

  'imuid': {
    source: 'intimatemerger.com',
    atype: 1
  },

  // Yahoo ConnectID
  'connectId': {
    source: 'yahoo.com',
    atype: 3
  },

  // Adquery ID
  'qid': {
    source: 'adquery.io',
    atype: 1
  },

  // DAC ID
  'dacId': {
    source: 'impact-ad.jp',
    atype: 1
  },

  // 33across ID
  '33acrossId': {
    source: '33across.com',
    atype: 1,
    getValue: function(data) {
      return data.envelope;
    }
  },

  // tncId
  'tncid': {
    source: 'thenewco.it',
    atype: 3
  },

  // Gravito MP ID
  'gravitompId': {
    source: 'gravito.net',
    atype: 1
  },

  // cpexId
  'cpexId': {
    source: 'czechadid.cz',
    atype: 1
  }
};

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
