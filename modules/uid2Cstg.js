/* eslint-disable no-console */
/**
 * This module adds UID2 Client-side token generation support to UID2 ID System
 * The {@link module:modules/uid2IdSystem} module is required.
 * @module modules/uid2Cstg
 * @requires module:modules/uid2IdSystem
 */
import { cyrb53Hash } from '../src/utils.js';
import { ajax } from '../src/ajax.js';

// eslint-disable-next-line prebid/validate-imports
import { isValidIdentity } from './uid2IdSystem_shared.js';

export function getValidIdentity(opts, _logWarn) {
  if (!opts || isCSTGOptionsValid(opts, _logWarn)) return

  if (opts.emailHash) {
    if (!isBase64Hash(opts.emailHash)) {
      _logWarn('CSTG opts.emailHash is invalid');
      return;
    }
    return { email_hash: opts.emailHash };
  }

  if (opts.phoneHash) {
    if (!isBase64Hash(opts.phoneHash)) {
      _logWarn('CSTG opts.phoneHash is invalid');
      return;
    }
    return { phone_hash: opts.phoneHash };
  }

  if (opts.email) {
    const normalizedEmail = normalizeEmail(opts.email);
    if (normalizedEmail === undefined) {
      _logWarn('CSTG opts.email is invalid');
      return;
    }
    return { email: opts.email };
  }

  if (opts.phone) {
    if (!isNormalizedPhone(opts.phone)) {
      _logWarn('CSTG opts.phone is invalid');
      return;
    }
    return { phone: opts.phone };
  }
}

function isCSTGOptionsValid(maybeOpts, _logWarn) {
  if (typeof maybeOpts !== 'object' || maybeOpts === null) {
    _logWarn('CSTG opts must be an object');
    return false;
  }

  const opts = maybeOpts;
  if (typeof opts.serverPublicKey !== 'string') {
    _logWarn('CSTG opts.serverPublicKey must be a string');
    return false;
  }
  const serverPublicKeyPrefix = /^UID2-X-[A-Z]-.+/;
  if (!serverPublicKeyPrefix.test(opts.serverPublicKey)) {
    _logWarn(
      `CSTG opts.serverPublicKey must match the regular expression ${serverPublicKeyPrefix}`
    );
    return false;
  }
  // We don't do any further validation of the public key, as we will find out
  // later if it's valid by using importKey.

  if (typeof opts.subscriptionId !== 'string') {
    _logWarn('CSTG opts.subscriptionId must be a string');
    return false;
  }
  if (opts.subscriptionId.length === 0) {
    _logWarn('CSTG opts.subscriptionId is empty');
    return false;
  }
  return true;
}

function isBase64Hash(value) {
  if (!(value && value.length === 44)) {
    return false;
  }

  try {
    return btoa(atob(value)) === value;
  } catch (err) {
    return false;
  }
}

function isNormalizedPhone(phone) {
  return /^\+[0-9]{10,15}$/.test(phone);
}

const EMAIL_EXTENSION_SYMBOL = '+';
const EMAIL_DOT = '.';
const GMAIL_DOMAIN = 'gmail.com';

function normalizeEmail(email) {
  if (!email || !email.length) return;

  const parsedEmail = email.trim().toLowerCase();
  if (parsedEmail.indexOf(' ') > 0) return;

  const emailParts = splitEmailIntoAddressAndDomain(parsedEmail);
  if (!emailParts) return;

  const { address, domain } = emailParts;

  const emailIsGmail = isGmail(domain);
  const parsedAddress = normalizeAddressPart(
    address,
    emailIsGmail,
    emailIsGmail
  );
  return parsedAddress ? `${parsedAddress}@${domain}` : undefined;
}

function splitEmailIntoAddressAndDomain(email) {
  const parts = email.split('@');
  if (!parts.length || parts.length !== 2 || parts.some((part) => part === '')) return;

  return {
    address: parts[0],
    domain: parts[1],
  };
}

function isGmail(domain) {
  return domain === GMAIL_DOMAIN;
}

function dropExtension(
  address,
  extensionSymbol = EMAIL_EXTENSION_SYMBOL
) {
  return address.split(extensionSymbol)[0];
}

function normalizeAddressPart(
  address,
  shouldRemoveDot,
  shouldDropExtension
) {
  let parsedAddress = address;
  if (shouldRemoveDot) parsedAddress = parsedAddress.replaceAll(EMAIL_DOT, '');
  if (shouldDropExtension) parsedAddress = dropExtension(parsedAddress);
  return parsedAddress;
}

export async function isStoredTokenInvalid(cstgIdentity, storedTokens, _logInfo, _logWarn) {
  if (storedTokens) {
    const identity = Object.values(cstgIdentity)[0]
    if (!isStoredTokenFromSameIdentity(storedTokens, identity)) {
      _logInfo('CSTG supplied new identity - ignoring stored value.', storedTokens.originalIdentity, cstgIdentity);
      // Stored token wasn't originally sourced from the provided identity - ignore the stored value. A new user has logged in?
      return true;
    }
  }
  return false;
}

function isStoredTokenFromSameIdentity(storedTokens, identity) {
  if (!storedTokens.originalIdentity) return false;
  return (
    cyrb53Hash(identity, storedTokens.originalIdentity.salt) ===
    storedTokens.originalIdentity.identity
  );
}

export async function generateTokenAndStore(
  baseUrl,
  cstgOpts,
  cstgIdentity,
  storageManager,
  _logInfo,
  _logWarn
) {
  _logInfo('UID2 cstg opts provided: ', JSON.stringify(cstgOpts));
  const client = new UID2CstgApiClient(
    { baseUrl, cstg: cstgOpts },
    _logInfo,
    _logWarn
  );
  const response = await client.generateToken(cstgIdentity);
  _logInfo('CSTG endpoint responded with:', response);
  const tokens = {
    originalIdentity: encodeOriginalIdentity(cstgIdentity),
    latestToken: response.identity,
  };
  storageManager.storeValue(tokens);
  return tokens;
}

function encodeOriginalIdentity(identity) {
  const identityValue = Object.values(identity)[0];
  const salt = Math.floor(Math.random() * Math.pow(2, 32));
  return {
    identity: cyrb53Hash(identityValue, salt),
    salt,
  };
}

const SERVER_PUBLIC_KEY_PREFIX_LENGTH = 9;

function stripPublicKeyPrefix(serverPublicKey) {
  return serverPublicKey.substring(SERVER_PUBLIC_KEY_PREFIX_LENGTH);
}

export class UID2CstgApiClient {
  constructor(opts, logInfo, logWarn) {
    this._baseUrl = opts.baseUrl;
    this._serverPublicKey = opts.cstg.serverPublicKey;
    this._subscriptionId = opts.cstg.subscriptionId;
    this._logInfo = logInfo;
    this._logWarn = logWarn;
  }

  isCstgApiSuccessResponse(response) {
    return (
      this.hasStatusResponse(response) &&
      response.status === 'success' &&
      isValidIdentity(response.body)
    );
  }

  isCstgApiClientErrorResponse(response) {
    return (
      this.hasStatusResponse(response) &&
      response.status === 'client_error' &&
      typeof response.message === 'string'
    );
  }

  isCstgApiForbiddenResponse(response) {
    return (
      this.hasStatusResponse(response) &&
      response.status === 'invalid_http_origin' &&
      typeof response.message === 'string'
    );
  }

  async generateCstgRequest(cstgIdentity) {
    if ('email_hash' in cstgIdentity || 'phone_hash' in cstgIdentity) {
      return cstgIdentity;
    }
    if ('email' in cstgIdentity) {
      const emailHash = await UID2CstgCrypto.hash(cstgIdentity.email);
      return { email_hash: emailHash };
    }
    if ('phone' in cstgIdentity) {
      const phoneHash = await UID2CstgCrypto.hash(cstgIdentity.phone);
      return { phone_hash: phoneHash };
    }
  }

  async generateToken(cstgIdentity) {
    const request = await this.generateCstgRequest(cstgIdentity);
    this._logInfo('Building CSTG request for', request);
    const box = await UID2CstgBox.build(
      stripPublicKeyPrefix(this._serverPublicKey)
    );
    const encoder = new TextEncoder();
    const now = Date.now();
    const { iv, ciphertext } = await box.encrypt(
      encoder.encode(JSON.stringify(request)),
      encoder.encode(JSON.stringify([now]))
    );

    const exportedPublicKey = await UID2CstgCrypto.exportPublicKey(
      box.clientPublicKey
    );
    const requestBody = {
      payload: UID2CstgCrypto.bytesToBase64(new Uint8Array(ciphertext)),
      iv: UID2CstgCrypto.bytesToBase64(new Uint8Array(iv)),
      public_key: UID2CstgCrypto.bytesToBase64(
        new Uint8Array(exportedPublicKey)
      ),
      timestamp: now,
      subscription_id: this._subscriptionId,
    };
    return this.callCstgApi(requestBody, box);
  }

  async callCstgApi(requestBody, box) {
    const url = this._baseUrl + '/v2/token/client-generate';
    let resolvePromise;
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    this._logInfo('Sending CSTG request', requestBody);
    ajax(
      url,
      {
        success: async (responseText, xhr) => {
          try {
            const encodedResp = UID2CstgCrypto.base64ToBytes(responseText);
            const decrypted = await box.decrypt(
              encodedResp.slice(0, 12),
              encodedResp.slice(12)
            );
            const decryptedResponse = new TextDecoder().decode(decrypted);
            const response = JSON.parse(decryptedResponse);
            if (this.isCstgApiSuccessResponse(response)) {
              resolvePromise({
                status: 'success',
                identity: response.body,
              });
            } else {
              // A 200 should always be a success response.
              // Something has gone wrong.
              rejectPromise(
                `API error: Response body was invalid for HTTP status 200: ${decryptedResponse}`
              );
            }
          } catch (err) {
            rejectPromise(err);
          }
        },
        error: (error, xhr) => {
          try {
            if (xhr.status === 400) {
              const response = JSON.parse(xhr.responseText);
              if (this.isCstgApiClientErrorResponse(response)) {
                rejectPromise(`Client error: ${response.message}`);
              } else {
                // A 400 should always be a client error.
                // Something has gone wrong.
                rejectPromise(
                  `API error: Response body was invalid for HTTP status 400: ${xhr.responseText}`
                );
              }
            } else if (xhr.status === 403) {
              const response = JSON.parse(xhr.responseText);
              if (this.isCstgApiForbiddenResponse(xhr)) {
                rejectPromise(`Forbidden: ${response.message}`);
              } else {
                // A 403 should always be a forbidden response.
                // Something has gone wrong.
                rejectPromise(
                  `API error: Response body was invalid for HTTP status 403: ${xhr.responseText}`
                );
              }
            } else {
              rejectPromise(
                `API error: Unexpected HTTP status ${xhr.status}: ${error}`
              );
            }
          } catch (_e) {
            rejectPromise(error);
          }
        },
      },
      JSON.stringify(requestBody),
      { method: 'POST' }
    );
    return promise;
  }
}

export class UID2CstgBox {
  static _namedCurve = 'P-256';
  constructor(clientPublicKey, sharedKey) {
    this._clientPublicKey = clientPublicKey;
    this._sharedKey = sharedKey;
  }

  static async build(serverPublicKey) {
    const clientKeyPair = await UID2CstgCrypto.generateKeyPair(
      UID2CstgBox._namedCurve
    );
    const importedServerPublicKey = await UID2CstgCrypto.importPublicKey(
      serverPublicKey,
      this._namedCurve
    );
    const sharedKey = await UID2CstgCrypto.deriveKey(
      importedServerPublicKey,
      clientKeyPair.privateKey
    );
    return new UID2CstgBox(clientKeyPair.publicKey, sharedKey);
  }

  async encrypt(plaintext, additionalData) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData,
      },
      this._sharedKey,
      plaintext
    );
    return { iv, ciphertext };
  }

  async decrypt(iv, ciphertext) {
    return window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      this._sharedKey,
      ciphertext
    );
  }

  get clientPublicKey() {
    return this._clientPublicKey;
  }
}

export class UID2CstgCrypto {
  static base64ToBytes(base64) {
    const binString = atob(base64);
    return Uint8Array.from(binString, (m) => m.codePointAt(0));
  }

  static bytesToBase64(bytes) {
    const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join(
      ''
    );
    return btoa(binString);
  }

  static async generateKeyPair(namedCurve) {
    const params = {
      name: 'ECDH',
      namedCurve: namedCurve,
    };
    return window.crypto.subtle.generateKey(params, false, ['deriveKey']);
  }

  static async importPublicKey(publicKey, namedCurve) {
    const params = {
      name: 'ECDH',
      namedCurve: namedCurve,
    };
    return window.crypto.subtle.importKey(
      'spki',
      this.base64ToBytes(publicKey),
      params,
      false,
      []
    );
  }

  static exportPublicKey(publicKey) {
    return window.crypto.subtle.exportKey('spki', publicKey);
  }

  static async deriveKey(serverPublicKey, clientPrivateKey) {
    return window.crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: serverPublicKey,
      },
      clientPrivateKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async hash(value) {
    const hash = await window.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(value)
    );
    return this.bytesToBase64(new Uint8Array(hash));
  }
}
