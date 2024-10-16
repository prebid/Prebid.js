import { logInfo, logError, logWarn, isEmpty, isNumber, isStr, isEmptyStr } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getStorageManager, STORAGE_TYPE_COOKIES, STORAGE_TYPE_LOCALSTORAGE } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { uspDataHandler, coppaDataHandler, gppDataHandler } from '../src/adapterManager.js';

const MODULE_NAME = 'pubmaticId';
const GVLID = 76;
export const STORAGE_NAME = 'pubmaticId';
const STORAGE_EXPIRES = 30; // days
const STORAGE_REFRESH_IN_SECONDS = 24 * 3600; // 24 Hours
const LOG_PREFIX = 'PubMatic User ID: ';
const VERSION = '1';
const API_URL = 'https://image6.pubmatic.com/AdServer/UCookieSetPug?oid=5&p=';

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

function generateEncodedId(responseObj) {
    let jsonData = { 'pmid': responseObj.id };
    return (VERSION + '||' + btoa(JSON.stringify(jsonData)));
}

function generateQueryStringParams(config, consentData) {
    const uspString = uspDataHandler.getConsentData();
    const coppaValue = coppaDataHandler.getCoppa();
    const gppConsent = gppDataHandler.getConsentData();

    const params = {
        publisherId: config.params.publisherId,
        gdpr: (consentData && consentData.gdpr && consentData.gdpr.gdprApplies) ? 1 : 0,
        src: MODULE_NAME,
        ver: VERSION,
        coppa: Number(coppaValue)
    };

    if (consentData?.gdpr?.consentString) {
        params.gdpr_consent = encodeURIComponent(consentData.gdpr.consentString);
    }

    if (uspString) {
        params.us_privacy = encodeURIComponent(uspString);
    }

    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
        params.gpp = encodeURIComponent(gppConsent.gppString);
        params.gpp_sid = encodeURIComponent(gppConsent.applicableSections.join(','));
    }

    return params;
}

function buildUrl(config, consentData) {
    let baseUrl = `${API_URL}${config.params.publisherId}`;
    const params = generateQueryStringParams(config, consentData);

    Object.keys(params).forEach((key) => {
        baseUrl += `&${key}=${params[key]}`;
    });

    return baseUrl;
}

function getSuccessAndErrorHandler(callback) {
    return {
        success: (response) => {
            let responseObj;
            try {
                responseObj = JSON.parse(response);
                logInfo(LOG_PREFIX + 'response received from the server', responseObj);
                if (isStr(responseObj.id) && !isEmptyStr(responseObj.id)) {
                    callback(generateEncodedId(responseObj));
                } else {
                    callback();
                }
            } catch (error) {
                logError(LOG_PREFIX + 'ID reading error:', error);
                callback();
            }
        },
        error: (error) => {
            logError(LOG_PREFIX + 'getId fetch encountered an error', error);
            callback();
        }
    };
}

function hasRequiredConfig(config) {
    if (!config || !config.storage || !config.params) {
        logError(LOG_PREFIX + 'config.storage and config.params should be passed.');
        return false;
    }

    if (!isNumber(config.params.publisherId)) {
        logError(LOG_PREFIX + 'config.params.publisherId (int) should be provided.');
        return false;
    }

    if (config.storage.name !== STORAGE_NAME) {
        logError(LOG_PREFIX + `config.storage.name should be '${STORAGE_NAME}'.`);
        return false;
    }

    if (config.storage.expires !== STORAGE_EXPIRES) {
        logError(LOG_PREFIX + `config.storage.expires should be ${STORAGE_EXPIRES}.`);
        return false;
    }

    if (config.storage.refreshInSeconds !== STORAGE_REFRESH_IN_SECONDS) {
        logError(LOG_PREFIX + `config.storage.refreshInSeconds should be ${STORAGE_REFRESH_IN_SECONDS}.`);
        return false;
    }

    return true;
}

export const pubmaticIdSubmodule = {
    name: MODULE_NAME,
    gvlid: GVLID,
    decode(value) {
        if (isStr(value) && !isEmptyStr(value)) {
            return { pubmaticId: value };
        }
        return undefined;
    },
    getId(config, consentData) {
        if (!hasRequiredConfig(config)) {
            return undefined;
        }

        const resp = (callback) => {
            logInfo(LOG_PREFIX + 'requesting an ID from the server');
            const url = buildUrl(config, consentData);
            ajax(url, getSuccessAndErrorHandler(callback), null, {
                method: 'GET',
                withCredentials: true
            });
        };

        return { callback: resp };
    }
};

submodule('userId', pubmaticIdSubmodule);