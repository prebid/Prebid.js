const bidmanager = require('src/bidmanager');
const bidfactory = require('src/bidfactory');
const utils = require('src/utils');
const ajax = require('src/ajax').ajax;
const url = require('src/url');
const adaptermanager = require('src/adaptermanager');
const config = require('src/config').config;

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
          nurl: bidResponse.nurl
        });

        bidObject.generateAd = function({auctionPrice}) {

          const sspAuctionPrice = auctionPrice;

          if (this.exchangerate && this.exchangerate !== 1) {
            auctionPrice = (parseFloat(auctionPrice) * this.exchangerate).toFixed(4);
          }

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

      let ssat = config.getConfig('ssat');
      if (ssat === undefined) {
        ssat = 2;
      }

      if ([1, 2].indexOf(ssat) === -1) {
        allBids.forEach(bid => bidmanager.addBidResponse(bid.placementCode, Object.assign(bidfactory.createBid(2, bid), {bidderCode})));
        utils.logError(`${ssat} is not a valid auction type`, 'ERROR');

        return;
      }

      const requestBody = {
        id: params.bidderRequestId,
        bids: [],
        ref: getPageReferer(),
        ssl: isSecureWindow(),
        mpa: isMainPageAccessible(),
        timeout: params.timeout - (Date.now() - params.auctionStart),
        ssat: ssat
      };

      const validBidRequestById = {};

      allBids.forEach(bidRequest => {
        if (validBidRequest(bidRequest)) {
          requestBody.bids.push({
            bid: bidRequest.bidId,

            sid: bidRequest.params.sid,
            siz: bidRequest.sizes,
            viz: elementInView(bidRequest.placementCode)
          });
          validBidRequestById[bidRequest.bidId] = bidRequest;
        } else {
          bidmanager.addBidResponse(bidRequest.placementCode, Object.assign(bidfactory.createBid(2, bidRequest), {bidderCode}));
        }
      });

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

  console.log("BEGIN PAD");
  for (let i = 0; i < encryptionPad.length; i++) {
    console.log(encryptionPad.charCodeAt(i));
  }
  console.log("END PAD");

  let encryptedPrice = "";

  console.log("BEGIN XOR");
  for (let i = 0; i < CIPHERTEXT_SIZE; i++) {
    let priceCharCode = (i >= data.length) ? '\x00' : data.charCodeAt(i);

    console.log(`${priceCharCode} ^ ${encryptionPad.charCodeAt(i)} = ${priceCharCode ^ convertSignedByte(encryptionPad.charCodeAt(i))}`);
    encryptedPrice = encryptedPrice + String.fromCharCode(0xff & (priceCharCode ^ convertSignedByte(encryptionPad.charCodeAt(i))));
  }
  console.log("END XOR");


  console.log("BEGIN ENCRYPTED PRICE");
  for (let i = 0; i < encryptedPrice.length; i++) {
    console.log(encryptedPrice.charCodeAt(i));
  }
  console.log("END ENCRYPTED PRICE");


  // Integrity

  const dataArray = new ArrayOfCharCodes(data, CIPHERTEXT_SIZE, 0);
  dataArray.addString(paddedImpressionId);

  const signature = str_hmac_sha1(this.intKey, dataArray).substring(0, SIGNATURE_SIZE);

  console.log("BEGIN SIGNATURE");
  for (let i = 0; i < signature.length; i++) {
    console.log(signature.charCodeAt(i));
  }
  console.log("END SIGNATURE");

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
    console.log("pushing " + str.charCodeAt(i));
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


// http://pajhome.org.uk/crypt/md5/sha1.js
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = ""; /* base-64 pad character. "=" for strict RFC compliance   */
var chrsz   = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode      */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_sha1(s){return binb2hex(core_sha1(str2binb(s),s.length * chrsz));}
function b64_sha1(s){return binb2b64(core_sha1(str2binb(s),s.length * chrsz));}
function str_sha1(s){return binb2str(core_sha1(str2binb(s),s.length * chrsz));}
function hex_hmac_sha1(key, data){ return binb2hex(core_hmac_sha1(key, data));}
function b64_hmac_sha1(key, data){ return binb2b64(core_hmac_sha1(key, data));}
function str_hmac_sha1(key, data){ return binb2str(core_hmac_sha1(key, data));}

/*
 * Perform a simple self-test to see if the VM is working
 */
function sha1_vm_test()
{
  return hex_sha1("abc") == "a9993e364706816aba3e25717850c26c9cd0d89d";
}

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    var olde = e;

    for(var j = 0; j < 80; j++)
    {
      if(j < 16) w[j] = x[i + j];
      else w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
      var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
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
  var bkey = str2binb(key);
  if(bkey.length > 16) bkey = core_sha1(bkey, key.length * chrsz);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
  return core_sha1(opad.concat(hash), 512 + 160);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
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
  var bin = Array();
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < str.length * chrsz; i += chrsz)
    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i%32);
  return bin;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2str(bin)
{
  var str = "";
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < bin.length * 32; i += chrsz)
    str += String.fromCharCode((bin[i>>5] >>> (32 - chrsz - i%32)) & mask);
  return str;
}

/*
 * Convert an array of big-endian words to a hex string.
 */
function binb2hex(binarray)
{
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i++)
  {
    str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
      hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
  }
  return str;
}

/*
 * Convert an array of big-endian words to a base-64 string
 */
function binb2b64(binarray)
{
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i += 3)
  {
    var triplet = (((binarray[i   >> 2] >> 8 * (3 -  i   %4)) & 0xFF) << 16)
      | (((binarray[i+1 >> 2] >> 8 * (3 - (i+1)%4)) & 0xFF) << 8 )
      |  ((binarray[i+2 >> 2] >> 8 * (3 - (i+2)%4)) & 0xFF);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > binarray.length * 32) str += b64pad;
      else str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
    }
  }
  return str;
}
