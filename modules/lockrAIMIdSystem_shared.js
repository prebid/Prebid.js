import { ajax } from "../src/ajax.js";

export const lockrAIMCodeVersion = "1.0";

export class LockrAIMApiClient {
  static expiryDateKeys = localStorage.getItem("lockr_expiry_keys")
    ? JSON.parse(localStorage.getItem("lockr_expiry_keys"))
    : [];
  static canRefreshToken = false;

  constructor(opts, logInfo, logWarn) {
    this._baseUrl = opts.baseUrl;
    this._appID = opts.appID;
    this._email = opts.email;
    this._logInfo = logInfo;
    this._logWarn = logWarn;
    this.initializeRefresher();
  }

  async generateToken() {
    const url =
      this._baseUrl + "/publisher/app/v1/identityLockr/generate-tokens";
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
      rejectPromise = reject;
    });
    const requestBody = {
      appID: this._appID,
      data: {
        type: "email",
        value: this._email,
      },
    };
    this._logInfo("Sending the token generation request");
    ajax(
      url,
      {
        success: (responseText) => {
          try {
            const response = JSON.parse(responseText);
            LockrAIMApiClient.canRefreshToken = false;
            response.data.forEach((cookieitem) => {
              const settings = cookieitem?.settings;
              localStorage.setItem("identity_lockr_raw_email", this._email);
              localStorage.setItem(
                `${cookieitem.key_name}_expiry`,
                cookieitem.identity_expires
              );
              if (
                !LockrAIMApiClient.expiryDateKeys.includes(
                  `${cookieitem.key_name}_expiry`
                )
              ) {
                LockrAIMApiClient.expiryDateKeys.push(
                  `${cookieitem.key_name}_expiry`
                );
              }
              localStorage.setItem(
                "lockr_expiry_keys",
                JSON.stringify(LockrAIMApiClient.expiryDateKeys)
              );
              if (!settings?.dropLocalStorage) {
                localStorage.setItem(
                  cookieitem.key_name,
                  cookieitem.advertising_token
                );
              }
              if (!settings?.dropCookie) {
                document.cookie = `${cookieitem.key_name}=${cookieitem.advertising_token};`;
              }
            });
            LockrAIMApiClient.canRefreshToken = true;
            return;
          } catch (_err) {
            this._logWarn(_err);
            rejectPromise(responseText);
            LockrAIMApiClient.canRefreshToken = true;
          }
        },
      },
      JSON.stringify(requestBody),
      { method: "POST", contentType: "application/json;charset=UTF-8" }
    );
    return promise;
  }

  async initializeRefresher() {
    setInterval(() => {
      LockrAIMApiClient.expiryDateKeys.forEach((expiryItem) => {
        const currentMillis = new Date().getTime();
        const dateMillis = localStorage.getItem(expiryItem);
        if (
          currentMillis > dateMillis &&
          localStorage.getItem("identity_lockr_raw_email") &&
          LockrAIMApiClient.canRefreshToken
        ) {
          this.generateToken();
        }
      });
    }, 1000);
  }
}

export async function lockrAIMGetIds(config, _logInfo, _logWarn) {
  if (!config.appID || !config.email) {
    return undefined;
  }
  const tokenGenerator = new LockrAIMApiClient(config, _logInfo, _logWarn);
  return tokenGenerator.generateToken();
}
