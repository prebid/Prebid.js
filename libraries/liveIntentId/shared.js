import {UID1_EIDS} from '../uid1Eids/uid1Eids.js';
import {UID2_EIDS} from '../uid2Eids/uid2Eids.js';
import { getRefererInfo } from '../../src/refererDetection.js';
import { coppaDataHandler } from '../../src/adapterManager.js';

export const PRIMARY_IDS = ['libp'];
export const GVLID = 148;
export const DEFAULT_AJAX_TIMEOUT = 5000;
export const DEFAULT_DELAY = 500;
export const MODULE_NAME = 'liveIntentId';
export const LI_PROVIDER_DOMAIN = 'liveintent.com';
export const DEFAULT_REQUESTED_ATTRIBUTES = { 'nonId': true };

export function parseRequestedAttributes(overrides) {
  function renameAttribute(attribute) {
    if (attribute === 'fpid') {
      return 'idCookie';
    } else {
      return attribute;
    };
  }
  function createParameterArray(config) {
    return Object.entries(config).flatMap(([k, v]) => (typeof v === 'boolean' && v) ? [renameAttribute(k)] : []);
  }
  if (typeof overrides === 'object') {
    return createParameterArray({...DEFAULT_REQUESTED_ATTRIBUTES, ...overrides});
  } else {
    return createParameterArray(DEFAULT_REQUESTED_ATTRIBUTES);
  }
}

export function makeSourceEventToSend(configParams) {
  const sourceEvent = {}
  let nonEmpty = false
  if (typeof configParams.emailHash === 'string') {
    nonEmpty = true
    sourceEvent.emailHash = configParams.emailHash
  }
  if (typeof configParams.ipv4 === 'string') {
    nonEmpty = true
    sourceEvent.ipv4 = configParams.ipv4
  }
  if (typeof configParams.ipv6 === 'string') {
    nonEmpty = true
    sourceEvent.ipv6 = configParams.ipv6
  }
  if (typeof configParams.userAgent === 'string') {
    nonEmpty = true
    sourceEvent.userAgent = configParams.userAgent
  }

  if (nonEmpty) {
    return sourceEvent
  }
}

export function composeIdObject(value) {
  const result = {};

  // old versions stored lipbid in unifiedId. Ensure that we can still read the data.
  const lipbid = value.nonId || value.unifiedId
  if (lipbid) {
    const lipb = { ...value, lipbid };
    delete lipb.unifiedId;
    result.lipb = lipb;
  }

  // Lift usage of uid2 by exposing uid2 if we were asked to resolve it.
  // As adapters are applied in lexicographical order, we will always
  // be overwritten by the 'proper' uid2 module if it is present.
  if (value.uid2) {
    result.uid2 = { 'id': value.uid2, ext: { provider: LI_PROVIDER_DOMAIN } }
  }

  if (value.bidswitch) {
    result.bidswitch = { 'id': value.bidswitch, ext: { provider: LI_PROVIDER_DOMAIN } }
  }

  if (value.medianet) {
    result.medianet = { 'id': value.medianet, ext: { provider: LI_PROVIDER_DOMAIN } }
  }

  if (value.magnite) {
    result.magnite = { 'id': value.magnite, ext: { provider: LI_PROVIDER_DOMAIN } }
  }

  if (value.index) {
    result.index = { 'id': value.index, ext: { provider: LI_PROVIDER_DOMAIN } }
  }

  if (value.openx) {
    result.openx = { 'id': value.openx, ext: { provider: LI_PROVIDER_DOMAIN } }
  }

  if (value.pubmatic) {
    result.pubmatic = { 'id': value.pubmatic, ext: { provider: LI_PROVIDER_DOMAIN } }
  }

  if (value.sovrn) {
    result.sovrn = { 'id': value.sovrn, ext: { provider: LI_PROVIDER_DOMAIN } }
  }

  if (value.idCookie) {
    if (!coppaDataHandler.getCoppa()) {
      result.lipb = { ...result.lipb, fpid: value.idCookie };
      result.fpid = { 'id': value.idCookie };
    }
    delete result.lipb.idCookie;
  }

  if (value.thetradedesk) {
    result.lipb = {...result.lipb, tdid: value.thetradedesk}
    result.tdid = { 'id': value.thetradedesk, ext: { rtiPartner: 'TDID', provider: getRefererInfo().domain || LI_PROVIDER_DOMAIN } }
    delete result.lipb.thetradedesk
  }

  if (value.sharethrough) {
    result.sharethrough = { 'id': value.sharethrough, ext: { provider: LI_PROVIDER_DOMAIN } }
  }

  if (value.sonobi) {
    result.sonobi = { 'id': value.sonobi, ext: { provider: LI_PROVIDER_DOMAIN } }
  }

  if (value.vidazoo) {
    result.vidazoo = { 'id': value.vidazoo, ext: { provider: LI_PROVIDER_DOMAIN } }
  }

  return result
}

export const eids = {
  ...UID1_EIDS,
  ...UID2_EIDS,
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
  'bidswitch': {
    source: 'bidswitch.net',
    atype: 3,
    getValue: function(data) {
      return data.id;
    },
    getUidExt: function(data) {
      if (data.ext) {
        return data.ext;
      }
    }
  },
  'medianet': {
    source: 'media.net',
    atype: 3,
    getValue: function(data) {
      return data.id;
    },
    getUidExt: function(data) {
      if (data.ext) {
        return data.ext;
      }
    }
  },
  'magnite': {
    source: 'rubiconproject.com',
    atype: 3,
    getValue: function(data) {
      return data.id;
    },
    getUidExt: function(data) {
      if (data.ext) {
        return data.ext;
      }
    }
  },
  'index': {
    source: 'liveintent.indexexchange.com',
    atype: 3,
    getValue: function(data) {
      return data.id;
    },
    getUidExt: function(data) {
      if (data.ext) {
        return data.ext;
      }
    }
  },
  'openx': {
    source: 'openx.net',
    atype: 3,
    getValue: function(data) {
      return data.id;
    },
    getUidExt: function(data) {
      if (data.ext) {
        return data.ext;
      }
    }
  },
  'pubmatic': {
    source: 'pubmatic.com',
    atype: 3,
    getValue: function(data) {
      return data.id;
    },
    getUidExt: function(data) {
      if (data.ext) {
        return data.ext;
      }
    }
  },
  'sovrn': {
    source: 'liveintent.sovrn.com',
    atype: 3,
    getValue: function(data) {
      return data.id;
    },
    getUidExt: function(data) {
      if (data.ext) {
        return data.ext;
      }
    }
  },
  'fpid': {
    source: 'fpid.liveintent.com',
    atype: 1,
    getValue: function(data) {
      return data.id;
    }
  },
  'sharethrough': {
    source: 'sharethrough.com',
    atype: 3,
    getValue: function(data) {
      return data.id;
    },
    getUidExt: function(data) {
      if (data.ext) {
        return data.ext;
      }
    }
  },
  'sonobi': {
    source: 'liveintent.sonobi.com',
    atype: 3,
    getValue: function(data) {
      return data.id;
    },
    getUidExt: function(data) {
      if (data.ext) {
        return data.ext;
      }
    }
  },
  'vidazoo': {
    source: 'liveintent.vidazoo.com',
    atype: 3,
    getValue: function(data) {
      return data.id;
    },
    getUidExt: function(data) {
      if (data.ext) {
        return data.ext;
      }
    }
  }
}
