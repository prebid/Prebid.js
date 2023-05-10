function isValidIdentity(identity) {
  return !!(typeof identity === 'object' && identity !== null && identity.advertising_token && identity.identity_expires && identity.refresh_from && identity.refresh_token && identity.refresh_expires);
}

// This is extracted from an in-progress API client. Once it's available via NPM, this class should be replaced with the NPM package.
export class Uid2ApiClient {
  constructor(opts, clientId, logInfo, logWarn) {
    this._baseUrl = opts.baseUrl;
    this._clientVersion = clientId;
    this._logInfo = logInfo;
    this._logWarn = logWarn;
  }
  createArrayBuffer(text) {
    const arrayBuffer = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      arrayBuffer[i] = text.charCodeAt(i);
    }
    return arrayBuffer;
  }
  hasStatusResponse(response) {
    return typeof (response) === 'object' && response && response.status;
  }
  isValidRefreshResponse(response) {
    return this.hasStatusResponse(response) && (
      response.status === 'optout' || response.status === 'expired_token' || (response.status === 'success' && response.body && isValidIdentity(response.body))
    );
  }
  ResponseToRefreshResult(response) {
    if (this.isValidRefreshResponse(response)) {
      if (response.status === 'success') { return { status: response.status, identity: response.body }; }
      return response;
    } else { return "Response didn't contain a valid status"; }
  }
  callRefreshApi(refreshDetails) {
    const url = this._baseUrl + '/v2/token/refresh';
    const req = new XMLHttpRequest();
    req.overrideMimeType('text/plain');
    req.open('POST', url, true);
    req.setRequestHeader('X-UID2-Client-Version', this._clientVersion);
    let resolvePromise;
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    req.onreadystatechange = () => {
      if (req.readyState !== req.DONE) { return; }
      try {
        if (!refreshDetails.refresh_response_key || req.status !== 200) {
          this._logInfo('Error status OR no response decryption key available, assuming unencrypted JSON');
          const response = JSON.parse(req.responseText);
          const result = this.ResponseToRefreshResult(response);
          if (typeof result === 'string') { rejectPromise(result); } else { resolvePromise(result); }
        } else {
          this._logInfo('Decrypting refresh API response');
          const encodeResp = this.createArrayBuffer(atob(req.responseText));
          window.crypto.subtle.importKey('raw', this.createArrayBuffer(atob(refreshDetails.refresh_response_key)), { name: 'AES-GCM' }, false, ['decrypt']).then((key) => {
            this._logInfo('Imported decryption key')
            // returns the symmetric key
            window.crypto.subtle.decrypt({
              name: 'AES-GCM',
              iv: encodeResp.slice(0, 12),
              tagLength: 128, // The tagLength you used to encrypt (if any)
            }, key, encodeResp.slice(12)).then((decrypted) => {
              const decryptedResponse = String.fromCharCode(...new Uint8Array(decrypted));
              this._logInfo('Decrypted to:', decryptedResponse);
              const response = JSON.parse(decryptedResponse);
              const result = this.ResponseToRefreshResult(response);
              if (typeof result === 'string') { rejectPromise(result); } else { resolvePromise(result); }
            }, (reason) => this._logWarn(`Call to UID2 API failed`, reason));
          }, (reason) => this._logWarn(`Call to UID2 API failed`, reason));
        }
      } catch (err) {
        rejectPromise(err);
      }
    };
    this._logInfo('Sending refresh request', req);
    req.send(refreshDetails.refresh_token);
    return promise;
  }
}
export class UidStorageManager {
  constructor(storage, preferLocalStorage, storageName, logInfo) {
    this._storage = storage;
    this._preferLocalStorage = preferLocalStorage;
    this._storageName = storageName;
    this._logInfo = logInfo;
  }
  readCookie(cookieName) {
    return this._storage.cookiesAreEnabled() ? this._storage.getCookie(cookieName) : null;
  }
  readLocalStorage(key) {
    return this._storage.localStorageIsEnabled() ? this._storage.getDataFromLocalStorage(key) : null;
  }
  readModuleCookie() {
    return this.parseIfContainsBraces(this.readCookie(this._storageName));
  }
  writeModuleCookie(value) {
    this._storage.setCookie(this._storageName, JSON.stringify(value), Date.now() + 60 * 60 * 24 * 1000);
  }
  readModuleStorage() {
    return this.parseIfContainsBraces(this.readLocalStorage(this._storageName));
  }
  writeModuleStorage(value) {
    this._storage.setDataInLocalStorage(this._storageName, JSON.stringify(value));
  }
  readProvidedCookie(cookieName) {
    return JSON.parse(this.readCookie(cookieName));
  }
  parseIfContainsBraces(value) {
    return (value?.includes('{')) ? JSON.parse(value) : value;
  }
  storeValue(value) {
    if (this._preferLocalStorage) {
      this.writeModuleStorage(value);
    } else {
      this.writeModuleCookie(value);
    }
  }
  getStoredValueWithFallback() {
    const preferredStorageLabel = this._preferLocalStorage ? 'local storage' : 'cookie';
    const preferredStorageGet = (this._preferLocalStorage ? this.readModuleStorage : this.readModuleCookie).bind(this);
    const preferredStorageSet = (this._preferLocalStorage ? this.writeModuleStorage : this.writeModuleCookie).bind(this);
    const fallbackStorageGet = (this._preferLocalStorage ? this.readModuleCookie : this.readModuleStorage).bind(this);

    const storedValue = preferredStorageGet();

    if (!storedValue) {
      const fallbackValue = fallbackStorageGet();
      if (fallbackValue) {
        this._logInfo(`${preferredStorageLabel} was empty, but found a fallback value. Copying the fallback value to ${preferredStorageLabel}.`);
        preferredStorageSet(fallbackValue);
        return fallbackValue;
      }
    } else if (typeof storedValue === 'string') {
      const fallbackValue = fallbackStorageGet();
      if (fallbackValue && typeof fallbackValue === 'object') {
        this._logInfo(`${preferredStorageLabel} contained a basic token, but found a refreshable token fallback. Copying the fallback value to ${preferredStorageLabel}.`);
        preferredStorageSet(fallbackValue);
        return fallbackValue;
      }
    }
    return storedValue;
  }
}
