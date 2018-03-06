const bidmanager = require('src/bidmanager');
const bidfactory = require('src/bidfactory');
const utils = require('src/utils');
const ajax = require('src/ajax').ajax;
const url = require('src/url');
const adaptermanager = require('src/adaptermanager');

const externalCrypter = new Crypter("c2xzRWh5NXhpZmxndTRxYWZjY2NqZGNhTW1uZGZya3Y=", "eWRpdkFoa2tub3p5b2dscGttamIySGhkZ21jcmg0Znk=");
const internalCrypter = new Crypter("wjhss9DVoBfGEBNpfQ0CTxRHwVx9Ig1aEdM7S0piaVc=", "vCXHs3GIOUgygSWkhsWXSV2kSsRD5NjcFrWLe1E3R74=");

const StroeerCoreAdapter = function (win = window) {
  const defaultHost = 'dsh.adscale.de';
  const defaultPath = '/dsh';
  const defaultPort = '';
  const bidderCode = 'stroeerCore';

  const validBidRequest = bid => bid.params && utils.isStr(bid.params.sid);

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

  function find(arr, fn) {
    // not all browsers support Array.find
    let res;
    for (let i = 0; i < arr.length; i++) {
      if (fn(arr[i])) {
        res = arr[i];
        break;
      }
    }
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
    const anyBidWithSlotId = find(bids, validBidRequest);
    const anyBidWithConnectJsUrl = find(bids, b => b.params && b.params.connectjsurl);

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
        const bidObject = Object.assign(bidfactory.createBid(1, bidRequest), {
          bidderCode,
          cpm: bidResponse.cpm,
          width: bidResponse.width,
          height: bidResponse.height,
          ad: bidResponse.ad,
          cpm2: bidResponse.cpm2,
          floor: bidResponse.floor,
          exchangerate: bidResponse.exchangerate,
          nurl: bidResponse.nurl,
          ssat: bidResponse.ssat
        });

        bidObject.generateAd = function({auctionPrice}) {

          let sspAuctionPrice = auctionPrice;

          if (this.exchangerate && this.exchangerate !== 1) {
            auctionPrice = (parseFloat(auctionPrice) * this.exchangerate).toFixed(4);
          }

          // ===========================================================
          // Commented out for now as price.indexOf() is not a function.
          // ===========================================================

          //const notInExponentialForm = price => price.indexOf('e') === -1;
          //assert(notInExponentialForm(auctionPrice), `auction price is in exp form`);
          //assert(notInExponentialForm(sspAuctionPrice), `ssp auction price is in exp form`);

          auctionPrice = tunePrice(auctionPrice);
          sspAuctionPrice = tunePrice(sspAuctionPrice);

          let creative = this.ad;
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

  function assert(truthy, errorMsg) {
    if (!truthy) {
      throw new Error(errorMsg)
    }
  }

  function tunePrice(price) {
    const str = String(price);
    if (str.length > 8) {
      const sides = str.split(".");
      if (sides.length === 2) {

        let integerPart = sides[0];

        let bytesRemaining  = 8 - integerPart.length;

        let fractionalPart = sides[1];

        if (bytesRemaining >= 3) {
          fractionalPart = fractionalPart.substring(0, bytesRemaining - 1);
        }
        else if (bytesRemaining === 2 && fractionalPart[1] === '0') {
          fractionalPart = fractionalPart[0];
        }
        else if (bytesRemaining === 1 && fractionalPart[0] === '0') {
          fractionalPart = '';
        }
        else if (bytesRemaining === 0 && fractionalPart[0] === '0') {
          fractionalPart = '';
        }
        else {
          throw new Error(`unable to truncate ${price} to fit into 8 bytes`);
        }
        const newPrice = integerPart + (fractionalPart.length > 0 ? "." + fractionalPart : "");
        utils.logWarn(`truncated price ${price} to ${newPrice} to fit into 8 bytes`);
        return newPrice;
      }
      else {
        throw new Error(`unable to truncate ${price} to fit into 8 bytes`);
      }
    }
    else {
      return price;
    }
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

  return {
    callBids: function (params) {
      const allBids = params.bids;
      const validBidRequestById = {};

      const requestBody = {
        id: params.bidderRequestId,
        bids: [],
        ref: getPageReferer(),
        ssl: isSecureWindow(),
        mpa: isMainPageAccessible(),
        timeout: params.timeout - (Date.now() - params.auctionStart)
      };

      // Check to see if atleast one bid has a SSAT value
      // If so, we must isolate those that don't instead of defaulting to 2
      let ssatIsPresentInAtleastOne = false;
      let bidsWithSsat = [];
      for (let i = 0; i < allBids.length; i++) {
        let bidSsat = allBids[i].params.ssat;
        if (bidSsat !== undefined) {
          ssatIsPresentInAtleastOne = true;
          bidsWithSsat.push(i);
        }
      };

      for (let i = 0; i < allBids.length; i++) {
        let bidRequest = allBids[i];
        let bidSsat = bidRequest.params.ssat;
        if (ssatIsPresentInAtleastOne === false) {
          bidSsat = 2;
          bidsWithSsat.push(i);
        }

        if (validBidRequest(bidRequest)) {
          if ((bidsWithSsat.indexOf(i) !== -1) && ([1, 2].indexOf(bidSsat) !== -1)) {

            requestBody.bids.push({
              bid: bidRequest.bidId,
              sid: bidRequest.params.sid,
              siz: bidRequest.sizes,
              viz: elementInView(bidRequest.placementCode),
              ssat: bidSsat
            });

            validBidRequestById[bidRequest.bidId] = bidRequest;

          } else {
            bidmanager.addBidResponse(bidRequest.placementCode, Object.assign(bidfactory.createBid(2, bidRequest), {bidderCode}))
            utils.logError(`${bidSsat} is not a valid auction type`, 'ERROR');
          }
        } else {
          bidmanager.addBidResponse(bidRequest.placementCode, Object.assign(bidfactory.createBid(2, bidRequest), {bidderCode}));
          utils.logError(`Invalid bid request`, 'ERROR');
        }
      }

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
              insertUserConnect(allBids);
            }
          },
          error: function () {
            insertUserConnect(allBids);
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
        insertUserConnect(allBids);
      }
    }
  };
};

adaptermanager.registerBidAdapter(new StroeerCoreAdapter(), 'stroeerCore');

module.exports = StroeerCoreAdapter;


function Crypter(encKey, intKey) {
  this.encKey = atob(encKey);   // pad key
  this.intKey = atob(intKey);   // signature key
}


Crypter.prototype.encrypt = function (anyRandomString, data) {
  const CIPHERTEXT_SIZE = 8;
  const SIGNATURE_SIZE = 4;

  let paddedImpressionId = anyRandomString.padEnd(16, '0').substring(0, 16);

  if (data.length > CIPHERTEXT_SIZE) {
    throw new Error("data to encrypt is too long");
  }

  let encryptionPad = str_hmac_sha1(this.encKey, paddedImpressionId);

  let encryptedPrice = "";

  for (let i = 0; i < CIPHERTEXT_SIZE; i++) {
    let priceCharCode = (i >= data.length) ? '\x00' : data.charCodeAt(i);
    encryptedPrice = encryptedPrice + String.fromCharCode(0xff & (priceCharCode ^ convertSignedByte(encryptionPad.charCodeAt(i))));
  }

  // Integrity

  const dataArray = new ArrayOfCharCodes(data, CIPHERTEXT_SIZE, 0);

  dataArray.addString(paddedImpressionId);

  const signature = str_hmac_sha1(this.intKey, dataArray).substring(0, SIGNATURE_SIZE);

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
  }
  else {
    return value;
  }
}


function ArrayOfCharCodes(str, length, charCodePadding) {
  let remainder = length - str.length;
  this.charCodes = [];
  for (let i = 0; i < str.length; i++) {
    this.charCodes.push(str.charCodeAt(i));
  }
  for (let i = 0; i < remainder; i++) {
    this.charCodes.push(charCodePadding);
  }

  this.length = this.charCodes.length;
}

ArrayOfCharCodes.prototype.charCodeAt = function(index) {
  const charCode = this.charCodes[index];

  if (charCode === undefined) {
    // Same behaviour as real string charCodeAt
    return NaN;
  }
  return charCode;
};

ArrayOfCharCodes.prototype.addString = function(str) {
  for (let i=0; i < str.length; i++) {
    this.charCodes.push(str.charCodeAt(i));
  }

  this.length += str.length;
};


// Code taken from http://pajhome.org.uk/crypt/md5/sha1.js
/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
const chrsz   = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode      */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function str_hmac_sha1(key, data){ return binb2str(core_hmac_sha1(key, data));}

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  let w = Array(80);
  let a =  1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d =  271733878;
  let e = -1009589776;

  for(let i = 0; i < x.length; i += 16)
  {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;
    const olde = e;

    for(let j = 0; j < 80; j++)
    {
      if(j < 16) w[j] = x[i + j];
      else w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
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
  return Array(a, b, c, d, e);

}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
  if(t < 20) return (b & c) | ((~b) & d);
  if(t < 40) return b ^ c ^ d;
  if(t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
    (t < 60) ? -1894007588 : -899497514;
}

/*
 * Calculate the HMAC-SHA1 of a key and some data
 */
function core_hmac_sha1(key, data)
{
  let bkey = str2binb(key);
  if(bkey.length > 16) bkey = core_sha1(bkey, key.length * chrsz);

  const ipad = Array(16), opad = Array(16);
  for(let i = 0; i < 16; i++)
  {
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
function safe_add(x, y)
{
  const lsw = (x & 0xFFFF) + (y & 0xFFFF);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert an 8-bit or 16-bit string to an array of big-endian words
 * In 8-bit function, characters >255 have their hi-byte silently ignored.
 */
function str2binb(str)
{
  const bin = Array();
  const mask = (1 << chrsz) - 1;
  for(let i = 0; i < str.length * chrsz; i += chrsz)
    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i%32);
  return bin;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2str(bin)
{
  let str = "";
  const mask = (1 << chrsz) - 1;
  for(let i = 0; i < bin.length * 32; i += chrsz)
    str += String.fromCharCode((bin[i>>5] >>> (32 - chrsz - i%32)) & mask);
  return str;
}
