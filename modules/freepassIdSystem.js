import { submodule } from '../src/hook.js';
import {generateUUID, logMessage} from '../src/utils.js';

const MODULE_NAME = 'freepassId';

export const freepassIdSubmodule = {
  name: MODULE_NAME,
  decode: function (value, config) {
    logMessage('Decoding FreePass ID: ', value);

    return { [MODULE_NAME]: value };
  },

  getId: function (config, consent, cachedIdObject) {
    logMessage('Getting FreePass ID using config: ' + JSON.stringify(config));

    const freepassData = config.params !== undefined ? (config.params.freepassData || {}) : {}
    let idObject = {userId: generateUUID()};

    if (freepassData.commonId !== undefined) {
      idObject.commonId = config.params.freepassData.commonId;
    }

    if (freepassData.userIp !== undefined) {
      idObject.userIp = config.params.freepassData.userIp;
    }

    return {id: idObject};
  },

  extendId: function (config, consent, cachedIdObject) {
    let freepassData = config.params.freepassData;
    let hasFreepassData = freepassData !== undefined;
    if (!hasFreepassData) {
      logMessage('No Freepass Data. CachedIdObject will not be extended: ' + JSON.stringify(cachedIdObject));
      return {
        id: cachedIdObject
      };
    }

    if (freepassData.commonId === cachedIdObject.commonId && freepassData.userIp === cachedIdObject.userIp) {
      logMessage('FreePass ID is already up-to-date: ' + JSON.stringify(cachedIdObject));
      return {
        id: cachedIdObject
      };
    }

    logMessage('Extending FreePass ID object: ' + JSON.stringify(cachedIdObject));
    logMessage('Extending FreePass ID using config: ' + JSON.stringify(config));

    return {
      id: {
        commonId: freepassData.commonId,
        userIp: freepassData.userIp,
        userId: cachedIdObject.userId,
      },
    };
  }
};

submodule('userId', freepassIdSubmodule);
