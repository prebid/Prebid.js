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
