import { ajax } from '../src/ajax.js';

export const lockrAIMCodeVersion = '1.0';

export class LockrAIMApiClient {
  static expiryDateKeys = [];
  static canRefreshToken = false;

  constructor(opts, logInfo, logWarn, prebidStorageManager) {
    this._baseUrl = opts.baseUrl;
    this._appID = opts.appID;
    this._email = opts.email;
    this._logInfo = logInfo;
    this._logWarn = logWarn;
    this.prebidStorageManager = prebidStorageManager;
    LockrAIMApiClient.expiryDateKeys = this.prebidStorageManager.getDataFromLocalStorage('lockr_expiry_keys') ? JSON.parse(this.prebidStorageManager.getDataFromLocalStorage('lockr_expiry_keys')) : []
    this.initializeRefresher();
  }

  async generateToken(type = 'email', value) {
    const url = this._baseUrl + '/publisher/app/v1/identityLockr/generate-tokens';
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
      rejectPromise = reject;
    });
    const requestBody = {
      appID: this._appID,
      data: {
        type: type,
        value: value ?? this._email,
      }
    }
    this._logInfo('Sending the token generation request')
    ajax(url, {
      success: (responseText) => {
        try {
          const response = JSON.parse(responseText);
          LockrAIMApiClient.canRefreshToken = false;
          const token = response.lockrMappingToken;
          this.prebidStorageManager.setDataInLocalStorage('ilui', token);
          response.data.forEach(cookieitem => {
            const settings = cookieitem?.settings;
            this.prebidStorageManager.setDataInLocalStorage(`${cookieitem.key_name}_expiry`, cookieitem.identity_expires);
            if (!LockrAIMApiClient.expiryDateKeys.includes(`${cookieitem.key_name}_expiry`)) {
              LockrAIMApiClient.expiryDateKeys.push(`${cookieitem.key_name}_expiry`);
            }
            this.prebidStorageManager.setDataInLocalStorage('lockr_expiry_keys', JSON.stringify(LockrAIMApiClient.expiryDateKeys));
            if (!settings?.dropLocalStorage) {
              this.prebidStorageManager.setDataInLocalStorage(cookieitem.key_name, cookieitem.advertising_token);
            }
            if (!settings?.dropCookie) {
              this.prebidStorageManager.setCookie(cookieitem.key_name, cookieitem.advertising_token);
            }
          });
          LockrAIMApiClient.canRefreshToken = true;
          return;
        } catch (_err) {
          this._logWarn(_err);
          rejectPromise(responseText);
          LockrAIMApiClient.canRefreshToken = true;
        }
      }
    }, JSON.stringify(requestBody), { method: 'POST', contentType: 'application/json;charset=UTF-8' });
    return promise;
  }

  async initializeRefresher() {
    setInterval(() => {
      LockrAIMApiClient.expiryDateKeys.forEach(expiryItem => {
        const currentMillis = new Date().getTime();
        const dateMillis = this.prebidStorageManager.getDataFromLocalStorage(expiryItem);
        if (currentMillis > dateMillis && dateMillis !== null && this.prebidStorageManager.getDataFromLocalStorage('ilui') && LockrAIMApiClient.canRefreshToken) {
          this.generateToken('refresh', this.prebidStorageManager.getDataFromLocalStorage('ilui'));
        }
      })
    }, 1000);
  }
}

export async function lockrAIMGetIds(config, _logInfo, _logWarn, prebidStorageManager) {
  if (!config.appID || !config.email) {
    return undefined;
  }
  const tokenGenerator = new LockrAIMApiClient(config, _logInfo, _logWarn, prebidStorageManager);
  return tokenGenerator.generateToken();
}
