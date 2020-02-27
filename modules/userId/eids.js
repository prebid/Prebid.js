import * as utils from '../../src/utils.js';

// Each user-id sub-module is expected to mention respective config here
const USER_IDS_CONFIG = {

  // key-name : {config}

  // pubCommonId
  'pubcid': {
    source: 'pubcid.org',
    atype: 1
  },

  // unifiedId
  'tdid': {
    source: 'adserver.org',
    atype: 1,
    ext: function() {
      return {
        rtiPartner: 'TDID'
      };
    }
  },

  // id5Id
  'id5id': {
    source: 'id5-sync.com',
    atype: 1
  },

  // parrableId
  'parrableid': {
    source: 'parrable.com',
    atype: 1
  },

  // identityLink
  'idl_env': {
    source: 'liveramp.com',
    atype: 1
  },

  // liveIntentId
  'lipb': {
    getValue: function(data) {
      return data.lipbid;
    },
    source: 'liveintent.com',
    atype: 1,
    ext: function(data) {
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
    atype: 1
  },

  // DigiTrust
  'digitrustid': {
    getValue: function(data) {
      return data.data.id;
    },
    source: 'digitru.st',
    atype: 1
  },

  // criteo
  'criteoId': {
    source: 'criteo.com',
    atype: 1
  }
};

// this function will create an eid object for the given UserId sub-module
function createEidObject(userIdData, subModuleKey) {
  const conf = USER_IDS_CONFIG[subModuleKey];
  if (conf && userIdData) {
    const value = utils.isFn(conf['getValue']) ? conf['getValue'](userIdData) : userIdData;
    if (value) {
      const uid = { id: value, atype: conf['atype'] };
      if (utils.isFn(conf['ext'])) {
        uid.ext = conf['ext'](userIdData);
      }
      return { source: conf['source'], uids: [uid] };
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
      const eid = createEidObject(bidRequestUserId[subModuleKey], subModuleKey);
      if (eid) {
        eids.push(eid);
      }
    }
  }
  // console.log('eids: ', eids);
  return eids;
}
