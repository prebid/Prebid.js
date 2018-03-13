const bidmanager = require('src/bidmanager');
const bidfactory = require('src/bidfactory');
const utils = require('src/utils');
const ajax = require('src/ajax').ajax;
const url = require('src/url');
const adaptermanager = require('src/adaptermanager');

const externalCrypter = new Crypter('c2xzRWh5NXhpZmxndTRxYWZjY2NqZGNhTW1uZGZya3Y=', 'eWRpdkFoa2tub3p5b2dscGttamIySGhkZ21jcmg0Znk=');
const internalCrypter = new Crypter('1AE180CBC19A8CFEB7E1FCC000A10F5D892A887A2D9=', '0379698055BD41FD05AC543A3AAAD6589BC6E1B3626=');

const StroeerCoreAdapter = function (win = window) {
  const defaultHost = 'hb.adscale.de';
  const defaultPath = '/dsh';
  const defaultPort = '';
  const bidderCode = 'stroeerCore';

  const isMainPageAccessible = () => getMostAccessibleTopWindow() === win.top;

  const getPageReferer = () => getMostAccessibleTopWindow().document.referrer || undefined;

  const isSecureWindow = () => win.location.protocol === 'https:';

  function buildUrl({host: hostname = defaultHost, port = defaultPort, securePort, path: pathname = defaultPath}) {
    const secure = isSecureWindow();

    if (securePort && secure) {
      port = securePort;
    }

    return `${url.format({protocol: secure ? 'https' : 'http', hostname, port, pathname})}`;
  }

  function getMostAccessibleTopWindow() {
    let res = win;

    try {
      while (win.top !== res && res.parent.location.href.length) {
        res = res.parent;
      }
    } catch (ignore) {}

    return res;
  }

  function elementInView(elementId) {
    const visibleInWindow = (el, win) => {
      const rect = el.getBoundingClientRect();
      const inView = (rect.top + rect.height >= 0) && (rect.top <= win.innerHeight);

      if (win !== win.parent) {
        return inView && visibleInWindow(win.frameElement, win.parent);
      }

      return inView;
    };

    try {
      return visibleInWindow(win.document.getElementById(elementId), win);
    } catch (e) {
      // old browser, element not found, cross-origin etc.
    }
    return undefined;
  }

  function insertUserConnect(bids) {
    const scriptElement = win.document.createElement('script');
    const anyBidWithSlotId = bids[0];
    const anyBidWithConnectJsUrl = bids.find(b => b.params && b.params.connectjsurl);

    if (anyBidWithSlotId) {
      scriptElement.setAttribute('data-container-config', JSON.stringify({slotId: anyBidWithSlotId.params.sid}));
    }

    const userConnectUrl = anyBidWithConnectJsUrl && anyBidWithConnectJsUrl.params.connectjsurl;

    scriptElement.src = userConnectUrl || ((isSecureWindow() ? 'https:' : 'http:') + '//js.adscale.de/userconnect.js');

    utils.insertElement(scriptElement);
  }

  function handleBidResponse(response, validBidRequestById) {
    response.bids.forEach(bidResponse => {
      const bidRequest = validBidRequestById[bidResponse.bidId];

      if (bidRequest) {
        const cpm = bidResponse.cpm;

        const bidObject = Object.assign(bidfactory.createBid(1, bidRequest), {
          bidderCode,
          cpm: cpm,
          width: bidResponse.width,
          height: bidResponse.height,
          ad: bidResponse.ad,
          cpm2: bidResponse.cpm2 || 0,
          floor: bidResponse.floor || cpm,
          exchangerate: bidResponse.exchangerate,
          nurl: bidResponse.nurl,
          originalAd: bidResponse.ad
        });

        bidObject.generateAd = function({auctionPrice}) {
          let sspAuctionPrice = auctionPrice;

          if (this.exchangerate && this.exchangerate !== 1) {
            auctionPrice = (parseFloat(auctionPrice) * this.exchangerate).toFixed(4);
          }

          auctionPrice = tunePrice(auctionPrice);
          sspAuctionPrice = tunePrice(sspAuctionPrice);

          let creative = this.originalAd;
          return creative
            .replace(/\${AUCTION_PRICE:ENC}/g, externalCrypter.encrypt(this.adId, auctionPrice.toString()))
            .replace(/\${SSP_AUCTION_PRICE:ENC}/g, internalCrypter.encrypt(this.adId, sspAuctionPrice.toString()))
            .replace(/\${AUCTION_PRICE}/g, auctionPrice);
        };

        bidmanager.addBidResponse(bidRequest.placementCode, bidObject);
      }
    });

    const unfulfilledBidRequests = Object.keys(validBidRequestById)
      .filter(id => response.bids.find(bid => bid.bidId === id) === undefined)
      .map(id => validBidRequestById[id]);

    unfulfilledBidRequests.forEach(bidRequest => {
      bidmanager.addBidResponse(bidRequest.placementCode, Object.assign(bidfactory.createBid(2, bidRequest), {bidderCode}));
    });
  }

  function tunePrice(price) {
    const ENCRYPTION_SIZE_LIMIT = 8;
    const str = String(price);
    if (str.length <= ENCRYPTION_SIZE_LIMIT) {
      return price;
    }

    const throwError = () => {
      throw new Error(`unable to truncate ${price} to fit into 8 bytes`);
    };
    const sides = str.split('.');

    if (sides.length === 2) {
      const integerPart = sides[0].trim();
      let fractionalPart = sides[1].trim();

      const bytesRemaining = ENCRYPTION_SIZE_LIMIT - integerPart.length;

      // room '.' and at least two fraction digits
      if (bytesRemaining > 2) fractionalPart = fractionalPart.substring(0, bytesRemaining - 1);
      // room for '.' and first fraction digit. Can only accept if second fraction digit is zero.
      else if (bytesRemaining === 2 && (fractionalPart.charAt(1) === '0')) fractionalPart = fractionalPart.charAt(0);
      // no more room for '.' or fraction digit. Only accept if first and second fraction digits are zero.
      else if (bytesRemaining >= 0 && bytesRemaining < 2 && fractionalPart.charAt(0) === '0' && fractionalPart.charAt(1) === '0') fractionalPart = '';
      else throwError();

      const newPrice = integerPart + (fractionalPart.length > 0 ? '.' + fractionalPart : '');
      utils.logWarn(`truncated price ${price} to ${newPrice} to fit into 8 bytes`);
      return newPrice;
    }

    throwError();
  }

  function parseResponse(rawResponse) {
    let response = {};

    try {
      response = JSON.parse(rawResponse);
    } catch (e) {
      utils.logError('unable to parse bid response', 'ERROR', e);
    }

    return response;
  }

  function createValidationFilters(ssat) {
    const filters = [];

    const createFilter = (checkFn, errorMsgFn) => {
      return (bid) => {
        if (checkFn(bid)) return true;
        else {
          utils.logError(`invalid bid: ${errorMsgFn(bid)}`, 'ERROR');
          return false;
        }
      }
    };

    filters.push(createFilter((bid) => typeof bid.params === 'object', bid => `bid ${bid.bidId} does not have custom params`));
    filters.push(createFilter((bid) => utils.isStr(bid.params.sid), bid => `bid ${bid.bidId} does not have a sid string field`));
    filters.push(createFilter((bid) => ssat === null || (bid.params.ssat === ssat), bid => `bid ${bid.bidId} has auction type that is inconsistent with other bids (expected ${ssat})`));
    filters.push(createFilter((bid) => bid.params.ssat === undefined || [1, 2].includes(bid.params.ssat), bid => `bid ${bid.bidId} does not have a valid ssat value (must be 1 or 2)`));

    return filters;
  }

  return {
    callBids: function (params) {
      const allBids = params.bids;
      const validBidRequestById = {};

      const bidWithSsat = allBids.find(b => b.params && b.params.ssat);
      const ssat = bidWithSsat ? bidWithSsat.params.ssat : null;

      if (ssat != null) utils.logInfo(`using value ${ssat} for ssat`);

      const validationFilters = createValidationFilters(ssat);

      const validBids = allBids.filter(bid => validationFilters.every(fn => fn(bid)));
      const invalidBids = allBids.filter(bid => !validBids.includes(bid));

      const requestBody = {
        id: params.bidderRequestId,
        bids: [],
        ref: getPageReferer(),
        ssl: isSecureWindow(),
        mpa: isMainPageAccessible(),
        timeout: params.timeout - (Date.now() - params.auctionStart),
        ssat: ssat || 2
      };

      validBids.forEach(bidRequest => {
        requestBody.bids.push({
          bid: bidRequest.bidId,
          sid: bidRequest.params.sid,
          siz: bidRequest.sizes,
          viz: elementInView(bidRequest.placementCode)
        });
        validBidRequestById[bidRequest.bidId] = bidRequest;
      });

      invalidBids.forEach(bid => bidmanager.addBidResponse(bid.placementCode, Object.assign(bidfactory.createBid(2, bid), {bidderCode})));

      // Safeguard against the unexpected - an infinite request loop.
      let redirectCount = 0;

      function sendBidRequest(url) {
        const callback = {
          success: function (responseText /*, status code */) {
            const response = parseResponse(responseText);

            if (response.redirect && redirectCount === 0) {
              // Workaround for IE 10/11. These browsers don't send the body on the ajax post redirect.
              // Also as a workaround for Safari on iPad/iPhone. These browsers always do pre-flight CORS request when
              // it should do simple CORS request as Ajax content-type is text/plain. Therefore, like the Safari on
              // desktop when content type is json/application, they don't send the body on subsequent requests.
              redirectCount++;
              sendBidRequest(response.redirect);
            } else {
              if (response.bids) {
                handleBidResponse(response, validBidRequestById);
              } else {
                utils.logError('invalid response ' + JSON.stringify(response), 'ERROR');
                handleBidResponse({bids: []}, validBidRequestById);
              }
              insertUserConnect(validBids);
            }
          },
          error: function () {
            insertUserConnect(validBids);
          }
        };

        ajax(url, callback, JSON.stringify(requestBody), {
          withCredentials: true,
          contentType: 'text/plain'
        });
      }

      if (requestBody.bids.length > 0) {
        sendBidRequest(buildUrl(allBids[0].params));
      } else {
        insertUserConnect(validBids);
      }
    }
  };
};

adaptermanager.registerBidAdapter(new StroeerCoreAdapter(), 'stroeerCore');

module.exports = StroeerCoreAdapter;

function Crypter(encKey, intKey) {
  this.encKey = atob(encKey); // padEnd key
  this.intKey = atob(intKey); // signature key
}

Crypter.prototype.encrypt = function (anyRandomString, data) {
  const CIPHERTEXT_SIZE = 8;
  const SIGNATURE_SIZE = 4;

  let paddedImpressionId = padEnd(anyRandomString, 16, '0').substring(0, 16);

  if (data.length > CIPHERTEXT_SIZE) {
    throw new Error('data to encrypt is too long');
  }

  let encryptionPad = str_hmac_sha1(this.encKey, paddedImpressionId);

  let encryptedPrice = '';

  for (let i = 0; i < CIPHERTEXT_SIZE; i++) {
    let priceCharCode = (i >= data.length) ? '\x00' : data.charCodeAt(i);
    encryptedPrice = encryptedPrice + String.fromCharCode(0xff & (priceCharCode ^ convertSignedByte(encryptionPad.charCodeAt(i))));
  }

  // Integrity

  data = padEnd(data, CIPHERTEXT_SIZE, '\u0000');
  data += paddedImpressionId;

  const signature = str_hmac_sha1(this.intKey, data).substring(0, SIGNATURE_SIZE);

  return base64EncodeUrlFriendly(paddedImpressionId + encryptedPrice + signature);
};

function base64EncodeUrlFriendly(str) {
  return btoa(str)
    .replace(/\+/g, '-') // Convert '+' to '-'
    .replace(/\//g, '_') // Convert '/' to '_'
    .replace(/=+$/, ''); // Remove ending '='
}

function convertSignedByte(value) {
  if (value >= 128) {
    return value - 256;
  } else {
    return value;
  }
}

function padEnd(str, targetLength, paddingChar) {
  const remainder = targetLength - str.length;
  for (let i = 0; i < remainder; i++) {
    str += paddingChar;
  }
  return str;
}

// Code taken from http://pajhome.org.uk/crypt/md5/sha1.js
/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
const chrsz = 8; // bits per input character. 8 - ASCII; 16 - Unicode

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function str_hmac_sha1(key, data) { return binb2str(core_hmac_sha1(key, data)); }

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len) {
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  let w = Array(80);
  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;
  let e = -1009589776;

  for (let i = 0; i < x.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;
    const olde = e;

    for (let j = 0; j < 80; j++) {
      if (j < 16) w[j] = x[i + j];
      else w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
      const t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
        safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return [a, b, c, d, e]; // Was Array(a, b, c, d, e)
}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d) {
  if (t < 20) return (b & c) | ((~b) & d);
  if (t < 40) return b ^ c ^ d;
  if (t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t) {
  return (t < 20) ? 1518500249 : (t < 40) ? 1859775393
    : (t < 60) ? -1894007588 : -899497514;
}

/*
 * Calculate the HMAC-SHA1 of a key and some data
 */
function core_hmac_sha1(key, data) {
  let bkey = str2binb(key);
  if (bkey.length > 16) bkey = core_sha1(bkey, key.length * chrsz);

  const ipad = Array(16);
  const opad = Array(16);
  for (let i = 0; i < 16; i++) {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  const hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
  return core_sha1(opad.concat(hash), 512 + 160);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y) {
  const lsw = (x & 0xFFFF) + (y & 0xFFFF);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt) {
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert an 8-bit or 16-bit string to an array of big-endian words
 * In 8-bit function, characters >255 have their hi-byte silently ignored.
 */
function str2binb(str) {
  const bin = []; // was Array()
  const mask = (1 << chrsz) - 1;
  for (let i = 0; i < str.length * chrsz; i += chrsz) {
    bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i % 32);
  }
  return bin;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2str(bin) {
  let str = '';
  const mask = (1 << chrsz) - 1;
  for (let i = 0; i < bin.length * 32; i += chrsz) {
    str += String.fromCharCode((bin[i >> 5] >>> (32 - chrsz - i % 32)) & mask);
  }
  return str;
}
