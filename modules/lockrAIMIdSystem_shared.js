import { ajax } from '../src/ajax.js';

export const lockrAIMCodeVersion = '1.0';

export class lockrAIMApiClient {
  constructor(opts, logInfo, logWarn) {
    this._baseUrl = opts.baseUrl;
    this._appID = opts.appID;
    this._email = opts.email;
    this._logInfo = logInfo;
    this._logWarn = logWarn;
  }

  async generateToken() {
    const url = this._baseUrl + '/publisher/app/v1/identityLockr/generate-tokens';
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
      rejectPromise = reject;
    });
    const requestBody = {
      appID: this._appID,
      data: {
        type: 'email',
        value: this._email,
      }
    }
    this._logInfo('Sending the token generation request')
    ajax(url, {
      success: (responseText) => {
        try {
          const response = JSON.parse(responseText);
          response.data.forEach(cookieitem => {
            const settings = cookieitem?.settings;
            if (!settings?.dropLocalStorage) {
              localStorage.setItem(cookieitem.key_name, cookieitem.advertising_token);
              localStorage.setItem('identity_lockr_raw_email', data.value);
              localStorage.setItem(`${cookieitem.key_name}_expiry`, cookieitem.identity_expires);
              if (!identityLockr.expiryDateKeys.includes(`${cookieitem.key_name}_expiry`)) {
                identityLockr.expiryDateKeys.push(`${cookieitem.key_name}_expiry`);
              }
              localStorage.setItem('lockr_expiry_keys', JSON.stringify(identityLockr.expiryDateKeys));
            }
            if (!settings?.dropCookie) {
              document.cookie = `${cookieitem.key_name}=${cookieitem.advertising_token};`;
            }
          });
          return;
        } catch (_err) {
          rejectPromise(responseText);
        }
      }
    }, JSON.stringify(requestBody), { method: 'POST' });
    return promise;
  }
}

export async function lockrAIMGetIds(config, _logInfo, _logWarn) {
  const tokenGenerator = new lockrAIMApiClient(config, _logInfo, _logWarn);
  return await tokenGenerator.generateToken();
}
