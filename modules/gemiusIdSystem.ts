import { logInfo, logError, isStr, getWindowTop, canAccessWindowTop, getWindowSelf } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { AllConsentData } from "../src/consentHandler.ts";

import type { IdProviderSpec } from './userId/spec.ts';

const MODULE_NAME = 'gemiusId' as const;
const GVLID = 328;
const REQUIRED_PURPOSES = [1, 2, 3, 4, 7, 8, 9, 10];
const LOG_PREFIX = 'Gemius User ID: ';

const WAIT_FOR_PRIMARY_SCRIPT_MAX_TRIES = 8;
const WAIT_FOR_PRIMARY_SCRIPT_INITIAL_WAIT_MS = 50;
const GEMIUS_CMD_TIMEOUT = 8000;

type SerializableId = string | Record<string, unknown>;
type PrimaryScriptWindow = Window & {
  gemius_cmd: (action: string, callback: (ruid: string, desc: { status: string }) => void) => void;
};

declare module './userId/spec' {
  interface UserId {
    gemiusId: string;
  }
  interface ProvidersToId {
    gemiusId: 'gemiusId';
  }
}

function getTopAccessibleWindow(): Window {
  if (canAccessWindowTop()) {
    return getWindowTop();
  }

  return getWindowSelf();
}

function retrieveId(primaryScriptWindow: PrimaryScriptWindow, callback: (id: SerializableId) => void): void {
  let resultResolved = false;
  let timeoutId: number | null = null;
  const setResult = function (id?: SerializableId): void {
    if (resultResolved) {
      return;
    }

    resultResolved = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    callback(id);
  }

  timeoutId = setTimeout(() => {
    logError(LOG_PREFIX + 'failed to get id, timeout');
    timeoutId = null;
    setResult();
  }, GEMIUS_CMD_TIMEOUT);

  try {
    primaryScriptWindow.gemius_cmd('get_ruid', function (ruid, desc) {
      if (desc.status === 'ok') {
        setResult({id: ruid});
      } else if (desc.status === 'no-consent') {
        logInfo(LOG_PREFIX + 'failed to get id, no consent');
        setResult({id: null});
      } else {
        logError(LOG_PREFIX + 'failed to get id, response: ' + desc.status);
        setResult();
      }
    });
  } catch (e) {
    logError(LOG_PREFIX + 'failed to get id, error: ' + e);
    setResult();
  }
}

export const gemiusIdSubmodule: IdProviderSpec<typeof MODULE_NAME> = {
  name: MODULE_NAME,
  gvlid: GVLID,
  decode(value) {
    if (isStr(value?.['id'])) {
      return {[MODULE_NAME]: value['id']};
    }
    return undefined;
  },
  getId(_, {gdpr: consentData}: Partial<AllConsentData> = {}) {
    if (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) {
      if (REQUIRED_PURPOSES.some(purposeId => !(consentData.vendorData?.purpose as any)?.consents?.[purposeId])) {
        logInfo(LOG_PREFIX + 'getId, no consent');
        return {id: {id: null}};
      }
    }

    logInfo(LOG_PREFIX + 'getId');
    return {
      callback: function (callback) {
        const win = getTopAccessibleWindow();

        (function waitForPrimaryScript(tryCount = 1, nextWaitTime = WAIT_FOR_PRIMARY_SCRIPT_INITIAL_WAIT_MS) {
          if (typeof win['gemius_cmd'] !== 'undefined') {
            retrieveId(win as PrimaryScriptWindow, callback);
            return;
          }

          if (tryCount < WAIT_FOR_PRIMARY_SCRIPT_MAX_TRIES) {
            setTimeout(() => waitForPrimaryScript(tryCount + 1, nextWaitTime * 2), nextWaitTime);
          } else {
            callback(undefined);
          }
        })();
      }
    };
  },
  eids: {
    [MODULE_NAME]: {
      source: 'gemius.com',
      atype: '1',
    },
  }
};

submodule('userId', gemiusIdSubmodule);
