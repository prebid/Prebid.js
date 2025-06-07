import { submodule } from '../src/hook.js';
import { logMessage, generateUUID } from '../src/utils.js';

const MODULE_NAME = 'freepassId';

const FREEPASS_EIDS = {
  'freepassId': {
    atype: 1,
    source: "freepass.jp",
    getValue: function(data) {
      return data.freepassId;
    },
    getUidExt: function(data) {
      const ext = {};
      if (data.ip) {
        ext.ip = data.ip;
      }
      if (data.userId && data.freepassId) {
        ext.userId = data.userId;
      }
      return Object.keys(ext).length > 0 ? ext : undefined;
    }
  }
};

export const freepassIdSubmodule = {
  name: MODULE_NAME,
  decode: function (value, _) {
    logMessage('Decoding FreePass ID: ', value);

    return { 'freepassId': value };
  },

  getId: function (config, _, storedId) {
    logMessage('Getting FreePass ID using config: ' + JSON.stringify(config));

    const freepassData = config.params !== undefined ? (config.params.freepassData || {}) : {}
    const idObject = {};

    // Use stored userId or generate new one
    idObject.userId = (storedId && storedId.userId) ? storedId.userId : generateUUID();

    // Get IP from config
    if (freepassData.userIp !== undefined) {
      idObject.ip = freepassData.userIp;
    }

    // Get freepassId from config
    if (freepassData.commonId !== undefined) {
      idObject.freepassId = freepassData.commonId;
    }

    return {id: idObject};
  },

  extendId: function (config, _, storedId) {
    const freepassData = config.params && config.params.freepassData;
    if (!freepassData) {
      logMessage('No Freepass Data. StoredId will not be extended: ' + JSON.stringify(storedId));
      return {
        id: storedId
      };
    }

    logMessage('Extending FreePass ID object: ' + JSON.stringify(storedId));
    logMessage('Extending FreePass ID using config: ' + JSON.stringify(config));

    const extendedId = {
      // Keep existing userId or generate new one
      userId: (storedId && storedId.userId) ? storedId.userId : generateUUID()
    };

    // Add IP if provided
    if (freepassData.userIp !== undefined) {
      extendedId.ip = freepassData.userIp;
    }

    // Add freepassId if provided
    if (freepassData.commonId !== undefined) {
      extendedId.freepassId = freepassData.commonId;
    }

    return {
      id: extendedId
    };
  },

  eids: FREEPASS_EIDS
};

submodule('userId', freepassIdSubmodule);
