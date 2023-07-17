/* eslint-disable no-console */
export const Uid2CodeVersion = '1.1';

function isValidIdentity(identity) {
  return !!(typeof identity === 'object' && identity !== null && identity.advertising_token && identity.identity_expires && identity.refresh_from && identity.refresh_token && identity.refresh_expires);
}

// This is extracted from an in-progress API client. Once it's available via NPM, this class should be replaced with the NPM package.
export class Uid2ApiClient {
  constructor(opts, clientId, logInfo, logWarn) {
    // this._baseUrl = opts.baseUrl;
    this._baseUrl = opts;
    console.log('CSTG Generating token...123', this._baseUrl);
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
    } else { return `Response didn't contain a valid status`; }
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
    this._logInfo('Sending refresh request', refreshDetails);
    req.send(refreshDetails.refresh_token);
    return promise;
  }

  callCstgApi(cstgDetails) {
    const url = this._baseUrl + '/v2/token/client-generate';
    const req = new XMLHttpRequest();
    req.overrideMimeType('text/plain');
    req.open('POST', url, true);
    req.setRequestHeader('X-UID2-Client-Version', this._clientVersion);

    this._logInfo('CSTG request url', url, cstgDetails);

    let resolvePromise;
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    req.onreadystatechange = () => {
      if (req.readyState !== req.DONE) {
        return;
      }
      try {
        if (req.status !== 200) {
          // if (!cstgDetails.refresh_response_key || req.status !== 200) {
          rejectPromise(new Error('CSTG endpoint status: ' + req.status));
        } else {
          resolvePromise(req.responseText);
        }
      } catch (err) {
        rejectPromise(err);
      }
    };
    this._logInfo('CSTG Sending request', cstgDetails);
    req.send(cstgDetails);
    return promise;
  }
}
export class Uid2StorageManager {
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
        this._logInfo(`${preferredStorageLabel} was empty, but found a fallback value.`)
        if (typeof fallbackValue === 'object') {
          this._logInfo(`Copying the fallback value to ${preferredStorageLabel}.`);
          preferredStorageSet(fallbackValue);
        }
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

function refreshTokenAndStore(baseUrl, token, clientId, storageManager, _logInfo, _logWarn) {
  _logInfo('UID2 base url provided: ', baseUrl);
  const client = new Uid2ApiClient({baseUrl}, clientId, _logInfo, _logWarn);
  return client.callRefreshApi(token).then((response) => {
    _logInfo('Refresh endpoint responded with:', response);
    const tokens = {
      originalToken: token,
      latestToken: response.identity,
    };
    storageManager.storeValue(tokens);
    return tokens;
  });
}

// ----------------------------------------------------- CSTG START -----------------------------------------------------

// ------
// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey#subjectpublickeyinfo
// from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// https://stackoverflow.com/a/9458996/
function _arrayBufferToBase64(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[ i ]);
  }
  return window.btoa(binary);
}

function generateClientKeyPair() {
  return window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    ['deriveKey']
  );
}

function deriveSecretKey(privateKey, publicKey) {
  return window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

function exportPublicKey(clientKeyPair) {
  return window.crypto.subtle.exportKey('spki', clientKeyPair.publicKey);
}

function importPublicKey(pem) {
  // base64 decode the string to get the binary data
  const binaryDerString = window.atob(pem);
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString);
  return window.crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    // https://stackoverflow.com/questions/54179887/how-to-import-ecdh-public-key-cannot-create-a-key-using-the-specified-key-usage
    []);
}

function encryptEmail(data, sharedKey, iv, additionalData) {
  return window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv, additionalData: additionalData },
    sharedKey,
    data);
}

function generateRequestPayload(email) {
  // TODO: email normalization.
  const encoder = new TextEncoder();
  return window.crypto.subtle.digest('SHA-256', encoder.encode(email));
}

const decrypt = (data, key, iv) => {
  return window.crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv: iv,
  }, key, data);
};

const base64ToBytes = (base64) => {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.codePointAt(0));
};
const bytesToBase64 = (bytes) => {
  const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join('');
  return btoa(binString);
};

// call cstg endpoint and store the generated tokens into the local storage for the last few lines of Uid2GetId function to retrieve
function cstgAndStore(config, prebidStorageManager, _logInfo, _logWarn) {
  // using the public key in operator cstg branch
  // https://github.com/IABTechLab/uid2-operator/blob/cstg/conf/local-config.json#L32
  const serverPublicKey = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEsziOqRXZ7II0uJusaMxxCxlxgj8el/MUYLFMtWfB71Q3G1juyrAnzyqruNiPPnIuTETfFOridglP9UQNlwzNQg==';
  const testEmail = 'prebid_test@example.com';
  const testOperatorUrl = 'http://localhost:8080';
  // if you are running operator branch locally and can connect to localhost:8080 operator endpoint
  // otherwise it will just generate cstg request body and ends there
  const connectToLocalOperatorCstgEndpoint = true;

  const preferLocalStorage = (config.storage !== 'cookie');
  const storageManager = new Uid2StorageManager(prebidStorageManager, preferLocalStorage, config.internalStorage, _logInfo);

  _logInfo('CSTG Generating client key pair...');

  const getPublicKey = importPublicKey(serverPublicKey);
  const getClientKeyPair = generateClientKeyPair();
  //
  const getSharedKey = Promise.all([getClientKeyPair, getPublicKey]).then(([clientKeyPair, publicKey]) => {
    _logInfo('CSTG Deriving secret key... ', clientKeyPair, publicKey);
    return deriveSecretKey(clientKeyPair.privateKey, publicKey);
  }).catch((err) => {
    console.log('CSTG Errorrrrrrrrrrrrrrr1 ', err);
  });
  const getExportedPublicKey = getClientKeyPair.then((clientKeyPair) => {
    _logInfo('CSTG Exporting public key...', clientKeyPair);
    return exportPublicKey(clientKeyPair);
  });

  const getRequestPayload = generateRequestPayload(testEmail).then((emailHash) => {
    _logInfo('CSTG Generated EMail Hash:', emailHash);
    _logInfo('CSTG Forming request payload... ');
    // atlassian.thetradedesk.com/confluence/display/UID2/Proposal%3A+New+Operator+API+Endpoint
    const encoder = new TextEncoder();
    const payload = {
      email_hash: bytesToBase64(new Uint8Array(emailHash))
    };
    return encoder.encode(JSON.stringify(payload));
  });

  let iv = window.crypto.getRandomValues(new Uint8Array(12));
  const now = Date.now();
  var getEncryptedEmail = Promise.all([getSharedKey, getRequestPayload]).then(([sharedKey, data]) => {
    _logInfo('CSTG Encrypting email...', data, sharedKey, iv);
    return encryptEmail(data, sharedKey, iv, new TextEncoder().encode(JSON.stringify([now])));
  });
  const makeCstgApiCall = Promise.all([getEncryptedEmail, getExportedPublicKey]).then(([encryptedEmail, exportedPublicKey]) => {
    _logInfo('CSTG Forming CSTG Body...', encryptedEmail, exportedPublicKey);
    const cstgBody = {
      payload: _arrayBufferToBase64(encryptedEmail),
      iv: _arrayBufferToBase64(iv),
      public_key: _arrayBufferToBase64(exportedPublicKey),
      timestamp: now,
      subscription_id: 'abcdefg'
    };
    _logInfo('CSTG cstgBody: ', cstgBody);

    if (connectToLocalOperatorCstgEndpoint) {
      const client = new Uid2ApiClient(testOperatorUrl, config.clientId, _logInfo, _logWarn);
      return client.callCstgApi(JSON.stringify(cstgBody));
    }
  });

  if (connectToLocalOperatorCstgEndpoint) {
    // TODO when we are ready to make actual cstg call then uncomment these lines!
    const decryptCstgApiResponse = Promise.all([getSharedKey, makeCstgApiCall]).then(([sharedKey, base64ResponseBody]) => {
      _logInfo('Decrypting CSTG endpoint response:', base64ResponseBody);

      const resultBytes = base64ToBytes(base64ResponseBody);
      return decrypt(resultBytes.slice(12), sharedKey, resultBytes.slice(0, 12));
    }).catch((err) => {
      console.log('CSTG Errorrrrrrrrrrrrrrr2 ', err);
    });

    const getCstgTokenResponse = decryptCstgApiResponse.then((decryptedResponseBody) => {
      const decryptedResponseBodyText = new TextDecoder().decode(decryptedResponseBody);
      _logInfo('CSTG response:', decryptedResponseBodyText);
      const result = JSON.parse(decryptedResponseBodyText);
      _logInfo('CSTG JSON Token Response:', result);

      // store the token response at the end
      // const tokens = {
      //   originalToken: 'TODO XXXXXXX',
      //   latestToken: result.identity,
      // };
      // storageManager.storeValue(tokens);
    }).catch((error) => {
      _logWarn('CSTG cstgAndStore Caught Error:', error);
    });
    return getCstgTokenResponse;
  } else {
    return makeCstgApiCall;
  }
}

// ------------------------------------------------------ CSTG END ------------------------------------------------------

// This is the entry point how prebid.js gets the UID2 token
export function Uid2GetId(config, prebidStorageManager, _logInfo, _logWarn) {
  let suppliedToken = null;
  const preferLocalStorage = (config.storage !== 'cookie');
  const storageManager = new Uid2StorageManager(prebidStorageManager, preferLocalStorage, config.internalStorage, _logInfo);
  _logInfo(`Module is using ${preferLocalStorage ? 'local storage' : 'cookies'} for internal storage.`);

  // Just call CSTG calls for testing purposes!!!!!

  if (config.paramToken) {
    suppliedToken = config.paramToken;
    _logInfo('Read token from params', suppliedToken);
  } else if (config.serverCookieName) {
    suppliedToken = storageManager.readProvidedCookie(config.serverCookieName);
    _logInfo('Read token from server-supplied cookie', suppliedToken);
  }
  let storedTokens = storageManager.getStoredValueWithFallback();
  _logInfo('Loaded module-stored tokens:', storedTokens);

  // if (storedTokens && typeof storedTokens === 'string') {
  //   // Stored value is a plain token - if no token is supplied, just use the stored value.
  //
  //   if (!suppliedToken) {
  //     _logInfo('Returning legacy cookie value.');
  //     return { id: storedTokens };
  //   }
  //   // Otherwise, ignore the legacy value - it should get over-written later anyway.
  //   _logInfo('Discarding superseded legacy cookie.');
  //   storedTokens = null;
  // }
  //
  // if (suppliedToken && storedTokens) {
  //   if (storedTokens.originalToken?.advertising_token !== suppliedToken.advertising_token) {
  //     _logInfo('Server supplied new token - ignoring stored value.', storedTokens.originalToken?.advertising_token, suppliedToken.advertising_token);
  //     // Stored token wasn't originally sourced from the provided token - ignore the stored value. A new user has logged in?
  //     storedTokens = null;
  //   }
  // }
  // // At this point, any legacy values or superseded stored tokens have been nulled out.
  // const useSuppliedToken = !(storedTokens?.latestToken) || (suppliedToken && suppliedToken.identity_expires > storedTokens.latestToken.identity_expires);
  // const newestAvailableToken = useSuppliedToken ? suppliedToken : storedTokens.latestToken;
  // _logInfo('UID2 module selected latest token', useSuppliedToken, newestAvailableToken);
  // if (!newestAvailableToken || Date.now() > newestAvailableToken.refresh_expires) {
  //   _logInfo('Newest available token is expired and not refreshable.');
  //   return { id: null };
  // }
  // if (Date.now() > newestAvailableToken.identity_expires) {
  //   const promise = refreshTokenAndStore(config.apiBaseUrl, newestAvailableToken, config.clientId, storageManager, _logInfo, _logWarn);
  //   _logInfo('Token is expired but can be refreshed, attempting refresh.');
  //   return { callback: (cb) => {
  //     promise.then((result) => {
  //       _logInfo('Refresh reponded, passing the updated token on.', result);
  //       cb(result);
  //     });
  //   } };
  // }
  // // If should refresh (but don't need to), refresh in the background.
  // if (Date.now() > newestAvailableToken.refresh_from) {
  //   _logInfo(`Refreshing token in background with low priority.`);
  //   refreshTokenAndStore(config.apiBaseUrl, newestAvailableToken, config.clientId, storageManager, _logInfo, _logWarn);
  // }

  // ----------------------------------------------------- CSTG START -------------------------------------------------
  const promise = cstgAndStore(config, storageManager, _logInfo, _logWarn);
  return { callback: (cb) => {
    promise.then((result) => {
      _logInfo('Refresh reponded, passing the updated token on.', result);
      cb(result);
    });
  } };

  // const newestAvailableToken = storedTokens.latestToken;
  // ----------------------------------------------------- CSTG END  --------------------------------------------------

  // const tokens = {
  //   originalToken: suppliedToken ?? storedTokens?.originalToken,
  //   latestToken: newestAvailableToken,
  // };
  // storageManager.storeValue(tokens);
  // return { id: tokens };
  // return { id: "abc" };
}
