/**
 * This module adds the Akamai DAP RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch real-time data from DAP
 * @module modules/akamaiDapRtdProvider
 * @requires module:modules/realTimeData
*/
import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import sha256 from 'crypto-js/sha256';
import {isPlainObject, mergeDeep, logMessage, logInfo, logError} from '../src/utils.js';

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'dap';

export const DAP_TOKEN = 'async_dap_token';
export const DAP_MEMBERSHIP = 'async_dap_membership';
export const DAP_ENCRYPTED_MEMBERSHIP = 'encrypted_dap_membership';
export const DAP_SS_ID = 'dap_ss_id';
export const DAP_DEFAULT_TOKEN_TTL = 3600; // in seconds
export const DAP_MAX_RETRY_TOKENIZE = 1;
export const DAP_CLIENT_ENTROPY = 'dap_client_entropy'
export const DAP_AUDIO_FP = 'dap_e17'
export const ENTROPY_EXPIRY = 3600; // in seconds

export const storage = getStorageManager({gvlid: null, moduleName: SUBMODULE_NAME});
let dapRetryTokenize = 0;

/**
 * Lazy merge objects.
 * @param {String} target
 * @param {String} source
*/
function mergeLazy(target, source) {
  if (!isPlainObject(target)) {
    target = {};
  }
  if (!isPlainObject(source)) {
    source = {};
  }
  return mergeDeep(target, source);
}

/**
 * Add real-time data & merge segments.
 * @param {Object} bidConfig
 * @param {Object} rtd
 * @param {Object} rtdConfig
 */
export function addRealTimeData(rtd) {
  logInfo('DEBUG(addRealTimeData) - ENTER');
  if (isPlainObject(rtd.ortb2)) {
    let ortb2 = config.getConfig('ortb2') || {};
    logMessage('DEBUG(addRealTimeData): merging original: ', ortb2);
    logMessage('DEBUG(addRealTimeData): merging in: ', rtd.ortb2);
    config.setConfig({ortb2: mergeLazy(ortb2, rtd.ortb2)});
  }
  logInfo('DEBUG(addRealTimeData) - EXIT');
}

/**
 * Real-time data retrieval from Audigent
 * @param {Object} reqBidsConfigObj
 * @param {function} onDone
 * @param {Object} rtdConfig
 * @param {Object} userConsent
 */
export function getRealTimeData(bidConfig, onDone, rtdConfig, userConsent) {
  let entropyDict = JSON.parse(localStorage.getItem(DAP_CLIENT_ENTROPY));
  if (entropyDict && entropyDict.expires_at > Math.round(Date.now() / 1000.0)) {
    logMessage('Using cached entropy');
  } else {
    dapUtils.dapCalculateEntropy();
  }
  logInfo('DEBUG(getRealTimeData) - ENTER');
  logMessage('  - apiHostname: ' + rtdConfig.params.apiHostname);
  logMessage('  - apiVersion:  ' + rtdConfig.params.apiVersion);
  dapRetryTokenize = 0;
  var jsonData = null;
  if (rtdConfig && isPlainObject(rtdConfig.params)) {
    if (rtdConfig.params.segtax == 504) {
      let encMembership = dapUtils.dapGetEncryptedMembershipFromLocalStorage();
      if (encMembership) {
        jsonData = dapUtils.dapGetEncryptedRtdObj(encMembership, rtdConfig.params.segtax)
      }
    } else {
      let membership = dapUtils.dapGetMembershipFromLocalStorage();
      if (membership) {
        jsonData = dapUtils.dapGetRtdObj(membership, rtdConfig.params.segtax)
      }
    }
  }
  if (jsonData) {
    if (jsonData.rtd) {
      addRealTimeData(jsonData.rtd);
      onDone();
      logInfo('DEBUG(getRealTimeData) - 1');
      // Don't return - ensure the data is always fresh.
    }
  }
  // Calling setTimeout to release the main thread so that the bid request could be sent.
  setTimeout(callDapAPIs, 0, bidConfig, onDone, rtdConfig, userConsent);
}

function callDapAPIs(bidConfig, onDone, rtdConfig, userConsent) {
  if (rtdConfig && isPlainObject(rtdConfig.params)) {
    let config = {
      api_hostname: rtdConfig.params.apiHostname,
      api_version: rtdConfig.params.apiVersion,
      domain: rtdConfig.params.domain,
      segtax: rtdConfig.params.segtax,
      identity: {type: rtdConfig.params.identityType}
    };
    let refreshMembership = true;
    let token = dapUtils.dapGetTokenFromLocalStorage();
    logMessage('token is: ', token);
    if (token !== null) { // If token is not null then check the membership in storage and add the RTD object
      if (config.segtax == 504) { // Follow the encrypted membership path
        dapUtils.dapRefreshEncryptedMembership(config, token, onDone) // Get the encrypted membership from server
        refreshMembership = false;
      } else {
        dapUtils.dapRefreshMembership(config, token, onDone) // Get the membership from server
        refreshMembership = false;
      }
    }
    dapUtils.dapRefreshToken(config, refreshMembership, onDone) // Refresh Token and membership in all the cases
  }
}

/**
 * Module init
 * @param {Object} provider
 * @param {Object} userConsent
 * @return {boolean}
*/
function init(provider, userConsent) {
  return true;
}

/** @type {RtdSubmodule} */
export const akamaiDapRtdSubmodule = {
  name: SUBMODULE_NAME,
  getBidRequestData: getRealTimeData,
  init: init
};

submodule(MODULE_NAME, akamaiDapRtdSubmodule);

export const dapUtils = {

  dapCalculateEntropy: function() {
    dapUtils.dapGetAudioFp();
    let entropyDict = {}
    let entropy = {}
    // canvas fp
    entropy.e1 = dapUtils.dapGetCanvasFp();
    // fonts fp
    entropy.e2 = dapUtils.dapGetFontsFp();
    // webgl fp
    entropy.e3 = dapUtils.dapGetWebglFp();
    // misc fp
    entropy.e4 = window.screen.colorDepth ? JSON.stringify(window.screen.colorDepth) : 'NA';
    entropy.e5 = navigator.deviceMemory ? JSON.stringify(navigator.deviceMemory) : 'NA';
    entropy.e6 = navigator.cpuClass ? navigator.cpuClass : 'NA'
    entropy.e7 = navigator.language ? navigator.language : 'NA';
    entropy.e8 = navigator.cookieEnabled ? JSON.stringify(navigator.cookieEnabled) : 'NA';
    entropy.e9 = navigator.userAgent ? navigator.userAgent : 'NA';
    entropy.e10 = navigator.geoLocation ? navigator.geoLocation : 'NA';
    entropy.e11 = navigator.hardwareConcurrency ? JSON.stringify(navigator.hardwareConcurrency) : 'NA';
    entropy.e12 = window.indexedDB ? JSON.stringify(window.indexedDB) : 'NA';
    entropy.e13 = window.openDatabase ? JSON.stringify(window.openDatabase.length) : 'NA';
    entropy.e14 = navigator.ipAddress ? navigator.ipAddress : 'NA';
    entropy.e15 = navigator.platform ? navigator.platform : 'NA';
    var len = navigator.plugins.length;
    var plugins = []
    for (var i = 0; i < len; i++) {
      plugins.push(navigator.plugins[i].name);
    }
    entropy.e16 = sha256(JSON.stringify(plugins, Object.keys(plugins).sort())).toString() || 'NA';
    var pluginsSorted = plugins.sort()
    entropy.e18 = sha256(JSON.stringify(pluginsSorted, Object.keys(pluginsSorted).sort())).toString() || 'NA';

    // Add entropy values along with the expiry to entropyDict and store in localstorage.
    entropyDict.entropy = entropy
    entropyDict.expires_at = Math.round(Date.now() / 1000.0) + ENTROPY_EXPIRY;
    localStorage.setItem(DAP_CLIENT_ENTROPY, JSON.stringify(entropyDict));
  },

  dapGetCanvasFp: function() {
    var strOnError, canvas, strCText, strText, strOut;

    strOnError = 'Error_canvas';
    canvas = null;
    strCText = null;
    strText = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`~1!2@3#4$5%6^7&8*9(0)-_=+[{]}|;:',<.>/?";
    strOut = null;

    try {
      canvas = document.createElement('canvas');
      strCText = canvas.getContext('2d');
      strCText.textBaseline = 'top';
      strCText.font = "14px 'Arial'";
      strCText.textBaseline = 'alphabetic';
      strCText.fillStyle = '#f60';
      strCText.fillRect(125, 1, 62, 20);
      strCText.fillStyle = '#069';
      strCText.fillText(strText, 2, 15);
      strCText.fillStyle = 'rgba(102, 204, 0, 0.7)';
      strCText.fillText(strText, 4, 17);
      strOut = canvas.toDataURL();
      const hashCanvas = sha256(strOut);

      return hashCanvas.toString();
    } catch (err) {
      logMessage('Error while calculating dapGetCanvasFp() ', strOnError);
    }
  },

  dapGetFontsFp: function() {
    var strOnError, style, fonts, count, template, fragment, divs, i, font, div, body, result, e;

    strOnError = 'Error_fonts';
    style = null;
    fonts = null;
    font = null;
    count = 0;
    template = null;
    divs = null;
    e = null;
    div = null;
    body = null;
    i = 0;

    try {
      style = 'position: absolute; visibility: hidden; display: block !important';
      fonts = ['Abadi MT Condensed Light', 'Adobe Fangsong Std', 'Adobe Hebrew', 'Adobe Ming Std', 'Agency FB', 'Aharoni', 'Andalus', 'Angsana New', 'AngsanaUPC', 'Aparajita', 'Arab', 'Arabic Transparent', 'Arabic Typesetting', 'Arial Baltic', 'Arial Black', 'Arial CE', 'Arial CYR', 'Arial Greek', 'Arial TUR', 'Arial', 'Batang', 'BatangChe', 'Bauhaus 93', 'Bell MT', 'Bitstream Vera Serif', 'Bodoni MT', 'Bookman Old Style', 'Braggadocio', 'Broadway', 'Browallia New', 'BrowalliaUPC', 'Calibri Light', 'Calibri', 'Californian FB', 'Cambria Math', 'Cambria', 'Candara', 'Castellar', 'Casual', 'Centaur', 'Century Gothic', 'Chalkduster', 'Colonna MT', 'Comic Sans MS', 'Consolas', 'Constantia', 'Copperplate Gothic Light', 'Corbel', 'Cordia New', 'CordiaUPC', 'Courier New Baltic', 'Courier New CE', 'Courier New CYR', 'Courier New Greek', 'Courier New TUR', 'Courier New', 'DFKai-SB', 'DaunPenh', 'David', 'DejaVu LGC Sans Mono', 'Desdemona', 'DilleniaUPC', 'DokChampa', 'Dotum', 'DotumChe', 'Ebrima', 'Engravers MT', 'Eras Bold ITC', 'Estrangelo Edessa', 'EucrosiaUPC', 'Euphemia', 'Eurostile', 'FangSong', 'Forte', 'FrankRuehl', 'Franklin Gothic Heavy', 'Franklin Gothic Medium', 'FreesiaUPC', 'French Script MT', 'Gabriola', 'Gautami', 'Georgia', 'Gigi', 'Gisha', 'Goudy Old Style', 'Gulim', 'GulimChe', 'GungSeo', 'Gungsuh', 'GungsuhChe', 'Haettenschweiler', 'Harrington', 'Hei S', 'HeiT', 'Heisei Kaku Gothic', 'Hiragino Sans GB', 'Impact', 'Informal Roman', 'IrisUPC', 'Iskoola Pota', 'JasmineUPC', 'KacstOne', 'KaiTi', 'Kalinga', 'Kartika', 'Khmer UI', 'Kino MT', 'KodchiangUPC', 'Kokila', 'Kozuka Gothic Pr6N', 'Lao UI', 'Latha', 'Leelawadee', 'Levenim MT', 'LilyUPC', 'Lohit Gujarati', 'Loma', 'Lucida Bright', 'Lucida Console', 'Lucida Fax', 'Lucida Sans Unicode', 'MS Gothic', 'MS Mincho', 'MS PGothic', 'MS PMincho', 'MS Reference Sans Serif', 'MS UI Gothic', 'MV Boli', 'Magneto', 'Malgun Gothic', 'Mangal', 'Marlett', 'Matura MT Script Capitals', 'Meiryo UI', 'Meiryo', 'Menlo', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Sans Serif', 'Microsoft Tai Le', 'Microsoft Uighur', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU', 'MingLiU-ExtB', 'MingLiU_HKSCS', 'MingLiU_HKSCS-ExtB', 'Miriam Fixed', 'Miriam', 'Mongolian Baiti', 'MoolBoran', 'NSimSun', 'Narkisim', 'News Gothic MT', 'Niagara Solid', 'Nyala', 'PMingLiU', 'PMingLiU-ExtB', 'Palace Script MT', 'Palatino Linotype', 'Papyrus', 'Perpetua', 'Plantagenet Cherokee', 'Playbill', 'Prelude Bold', 'Prelude Condensed Bold', 'Prelude Condensed Medium', 'Prelude Medium', 'PreludeCompressedWGL Black', 'PreludeCompressedWGL Bold', 'PreludeCompressedWGL Light', 'PreludeCompressedWGL Medium', 'PreludeCondensedWGL Black', 'PreludeCondensedWGL Bold', 'PreludeCondensedWGL Light', 'PreludeCondensedWGL Medium', 'PreludeWGL Black', 'PreludeWGL Bold', 'PreludeWGL Light', 'PreludeWGL Medium', 'Raavi', 'Rachana', 'Rockwell', 'Rod', 'Sakkal Majalla', 'Sawasdee', 'Script MT Bold', 'Segoe Print', 'Segoe Script', 'Segoe UI Light', 'Segoe UI Semibold', 'Segoe UI Symbol', 'Segoe UI', 'Shonar Bangla', 'Showcard Gothic', 'Shruti', 'SimHei', 'SimSun', 'SimSun-ExtB', 'Simplified Arabic Fixed', 'Simplified Arabic', 'Snap ITC', 'Sylfaen', 'Symbol', 'Tahoma', 'Times New Roman Baltic', 'Times New Roman CE', 'Times New Roman CYR', 'Times New Roman Greek', 'Times New Roman TUR', 'Times New Roman', 'TlwgMono', 'Traditional Arabic', 'Trebuchet MS', 'Tunga', 'Tw Cen MT Condensed Extra Bold', 'Ubuntu', 'Umpush', 'Univers', 'Utopia', 'Utsaah', 'Vani', 'Verdana', 'Vijaya', 'Vladimir Script', 'Vrinda', 'Webdings', 'Wide Latin', 'Wingdings'];
      count = fonts.length;
      template = '<b style="display:inline !important; width:auto !important; font:normal 10px/1 \'X\',sans-serif !important">ww</b>' + '<b style="display:inline !important; width:auto !important; font:normal 10px/1 \'X\',monospace !important">ww</b>';
      fragment = document.createDocumentFragment();
      divs = [];
      for (i = 0; i < count; i = i + 1) {
        font = fonts[i];
        div = document.createElement('div');
        font = font.replace(/['"<>]/g, '');
        div.innerHTML = template.replace(/X/g, font);
        div.style.cssText = style;
        fragment.appendChild(div);
        divs.push(div);
      }
      body = document.body;
      body.insertBefore(fragment, body.firstChild);
      result = [];
      for (i = 0; i < count; i = i + 1) {
        e = divs[i].getElementsByTagName('b');
        if (e[0].offsetWidth === e[1].offsetWidth) {
          result.push(fonts[i]);
        }
      }
      // do not combine these two loops, remove child will cause reflow
      // and induce severe performance hit
      for (i = 0; i < count; i = i + 1) {
        body.removeChild(divs[i]);
      }
      const hashFonts = sha256(result.join('|'));
      return hashFonts.toString();
    } catch (err) {
      logMessage('Error while calcualting dapGetFontsFp() ' + strOnError);
    }
  },

  dapGetWebglFp: function() {
    var canvas, webglContext;
    var width = 48;
    var height = 27;
    var webglString = '';
    try {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      webglContext = canvas.getContext('webgl2') || canvas.getContext('experimental-webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl') || canvas.getContext('moz-webgl');
    } catch (e) {
      logMessage('Exeception occured: ', e);
      return;
    }

    try {
      if (webglContext) {
        var webglBuffer = webglContext.createBuffer();
        webglContext.bindBuffer(webglContext.ARRAY_BUFFER, webglBuffer);

        var size = new Float32Array([-0.2, -0.9, 0, 0.4, -0.26, 0, 0, 0.7321, 0]);
        webglContext.bufferData(webglContext.ARRAY_BUFFER, size, webglContext.STATIC_DRAW);
        webglBuffer.itemSize = 3;
        webglBuffer.numItems = 3;
        var webglProgram = webglContext.createProgram();
        var vertexShader = webglContext.createShader(webglContext.VERTEX_SHADER);
        var vertexShaderSource = 'attribute vec2 attrVertex;varying vec2 varyinTexCoordinate;uniform vec2 uniformOffset;void main(){varyinTexCoordinate=attrVertex+uniformOffset;gl_Position=vec4(attrVertex,0,1);}';
        webglContext.shaderSource(vertexShader, vertexShaderSource);
        webglContext.compileShader(vertexShader);

        var fragmentShader = webglContext.createShader(webglContext.FRAGMENT_SHADER);
        var fragmentShaderSource = 'precision mediump float;varying vec2 varyinTexCoordinate;void main() {gl_FragColor=vec4(varyinTexCoordinate,0,1);}';
        webglContext.shaderSource(fragmentShader, fragmentShaderSource);
        webglContext.compileShader(fragmentShader);
        webglContext.attachShader(webglProgram, vertexShader);
        webglContext.attachShader(webglProgram, fragmentShader);
        webglContext.linkProgram(webglProgram);
        webglContext.useProgram(webglProgram);
        webglProgram.vertexPosAttrib = webglContext.getAttribLocation(webglProgram, 'attrVertex');
        webglProgram.offsetUniform = webglContext.getUniformLocation(webglProgram, 'uniformOffset');
        webglContext.enableVertexAttribArray(webglProgram.vertexPosArray);
        webglContext.vertexAttribPointer(webglProgram.vertexPosAttrib, webglBuffer.itemSize, webglContext.FLOAT, !1, 0, 0);
        webglContext.uniform2f(webglProgram.offsetUniform, 1, 1);
        webglContext.drawArrays(webglContext.TRIANGLE_STRIP, 0, webglBuffer.numItems);
      }
    } catch (e) {
      logMessage('Exeception occured: ', e);
    }

    var pixels = new Uint8Array(width * height * 4);
    webglContext.readPixels(0, 0, width, height, webglContext.RGBA, webglContext.UNSIGNED_BYTE, pixels);
    webglString = JSON.stringify(pixels).replace(/,?"[0-9]+":/g, '');
    logMessage('webgl fp', webglString);
    const hashWebgl = sha256(webglString);
    return hashWebgl.toString();
  },

  dapGetAudioFp: function(entropy) {
    var context = null;
    var currentTime = null;
    var oscillator = null;
    var compressor = null;

    try {
      var AudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      context = new AudioContext(1, 44100, 44100);
      currentTime = context.currentTime;
      oscillator = context.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, currentTime);

      compressor = context.createDynamicsCompressor()
      compressor.threshold.value = -50
      compressor.knee.value = 40
      compressor.ratio.value = 12
      compressor.attack.value = 0
      compressor.release.value = 0.25

      oscillator.connect(compressor);
      compressor.connect(context.destination);

      oscillator.start(0);
      context.startRendering();

      context.oncomplete = dapUtils.dapOnCompleteCallback;
    } catch (e) {
      logMessage('error', e);
    }
  },

  dapOnCompleteCallback: function(event) {
    var output = null;
    for (var i = 4500; i < 5e3; i++) {
      var channelData = event.renderedBuffer.getChannelData(0)[i];
      output += Math.abs(channelData);
    }

    let fingerprint = output.toString();
    if (fingerprint) {
      localStorage.setItem(DAP_AUDIO_FP, JSON.stringify(fingerprint));
    } else {
      localStorage.setItem(DAP_AUDIO_FP, 'NC');
    }
  },

  dapGetTokenFromLocalStorage: function(ttl) {
    let now = Math.round(Date.now() / 1000.0); // in seconds
    let token = null;
    let item = JSON.parse(localStorage.getItem(DAP_TOKEN));
    if (item) {
      if (now < item.expires_at) {
        token = item.token;
      }
    }
    return token;
  },

  dapRefreshToken: function(config, refreshMembership, onDone) {
    dapUtils.dapLog('Token missing or expired, fetching a new one...');
    // Trigger a refresh
    let now = Math.round(Date.now() / 1000.0); // in seconds
    let item = {}
    let configAsync = {...config};
    dapUtils.dapTokenize(configAsync, config.identity, onDone,
      function(token, status, xhr, onDone) {
        item.expires_at = now + DAP_DEFAULT_TOKEN_TTL;
        let exp = dapUtils.dapExtractExpiryFromToken(token)
        if (typeof exp == 'number') {
          item.expires_at = exp - 10;
        }
        item.token = token;
        localStorage.setItem(DAP_TOKEN, JSON.stringify(item));
        dapUtils.dapLog('Successfully updated and stored token; expires at ' + item.expires_at);
        let dapSSID = xhr.getResponseHeader('Akamai-DAP-SS-ID');
        if (dapSSID) {
          localStorage.setItem(DAP_SS_ID, JSON.stringify(dapSSID));
        }
        let deviceId100 = xhr.getResponseHeader('Akamai-DAP-100');
        if (deviceId100 != null) {
          localStorage.setItem('dap_deviceId100', deviceId100);
          dapUtils.dapLog('Successfully stored DAP 100 Device ID: ' + deviceId100);
        }
        if (refreshMembership) {
          if (config.segtax == 504) {
            dapUtils.dapRefreshEncryptedMembership(config, token, onDone);
          } else {
            dapUtils.dapRefreshMembership(config, token, onDone);
          }
        }
      },
      function(xhr, status, error, onDone) {
        logError('ERROR(' + error + '): failed to retrieve token! ' + status);
        onDone()
      }
    );
  },

  dapGetMembershipFromLocalStorage: function() {
    let now = Math.round(Date.now() / 1000.0); // in seconds
    let membership = null;
    let item = JSON.parse(localStorage.getItem(DAP_MEMBERSHIP));
    if (item) {
      if (now < item.expires_at) {
        membership = {
          said: item.said,
          cohorts: item.cohorts,
          attributes: null
        };
      }
    }
    return membership;
  },

  dapRefreshMembership: function(config, token, onDone) {
    let now = Math.round(Date.now() / 1000.0); // in seconds
    let item = {}
    let configAsync = {...config};
    dapUtils.dapMembership(configAsync, token, onDone,
      function(membership, status, xhr, onDone) {
        item.expires_at = now + DAP_DEFAULT_TOKEN_TTL;
        let exp = dapUtils.dapExtractExpiryFromToken(membership.said)
        if (typeof exp == 'number') {
          item.expires_at = exp - 10;
        }
        item.said = membership.said;
        item.cohorts = membership.cohorts;
        localStorage.setItem(DAP_MEMBERSHIP, JSON.stringify(item));
        dapUtils.dapLog('Successfully updated and stored membership:');
        dapUtils.dapLog(item);

        let data = dapUtils.dapGetRtdObj(item, config.segtax)
        dapUtils.checkAndAddRealtimeData(data, config.segtax);
        onDone();
      },
      function(xhr, status, error, onDone) {
        logError('ERROR(' + error + '): failed to retrieve membership! ' + status);
        if (status == 403 && dapRetryTokenize < DAP_MAX_RETRY_TOKENIZE) {
          dapRetryTokenize++;
          dapUtils.dapRefreshToken(config, true, onDone);
        } else {
          onDone();
        }
      }
    );
  },

  dapGetEncryptedMembershipFromLocalStorage: function() {
    let now = Math.round(Date.now() / 1000.0); // in seconds
    let encMembership = null;
    let item = JSON.parse(localStorage.getItem(DAP_ENCRYPTED_MEMBERSHIP));
    if (item) {
      if (now < item.expires_at) {
        encMembership = {
          encryptedSegments: item.encryptedSegments
        };
      }
    }
    return encMembership;
  },

  dapRefreshEncryptedMembership: function(config, token, onDone) {
    let now = Math.round(Date.now() / 1000.0); // in seconds
    let item = {};
    let configAsync = {...config};
    dapUtils.dapEncryptedMembership(configAsync, token, onDone,
      function(encToken, status, xhr, onDone) {
        item.expires_at = now + DAP_DEFAULT_TOKEN_TTL;
        let exp = dapUtils.dapExtractExpiryFromToken(encToken)
        if (typeof exp == 'number') {
          item.expires_at = exp - 10;
        }
        item.encryptedSegments = encToken;
        localStorage.setItem(DAP_ENCRYPTED_MEMBERSHIP, JSON.stringify(item));
        dapUtils.dapLog('Successfully updated and stored encrypted membership:');
        dapUtils.dapLog(item);

        let encData = dapUtils.dapGetEncryptedRtdObj(item, config.segtax);
        dapUtils.checkAndAddRealtimeData(encData, config.segtax);
        onDone();
      },
      function(xhr, status, error, onDone) {
        logError('ERROR(' + error + '): failed to retrieve encrypted membership! ' + status);
        if (status == 403 && dapRetryTokenize < DAP_MAX_RETRY_TOKENIZE) {
          dapRetryTokenize++;
          dapUtils.dapRefreshToken(config, true, onDone);
        } else {
          onDone();
        }
      }
    );
  },

  /**
   * DESCRIPTION
   * Extract expiry value from a token
   */
  dapExtractExpiryFromToken: function(token) {
    let exp = null;
    if (token) {
      const tokenArray = token.split('..');
      if (tokenArray && tokenArray.length > 0) {
        let decode = atob(tokenArray[0])
        let header = JSON.parse(decode.replace(/&quot;/g, '"'));
        exp = header.exp;
      }
    }
    return exp
  },

  /**
   * DESCRIPTION
   *
   *  Convert a DAP membership response to an OpenRTB2 segment object suitable
   *  for insertion into user.data.segment or site.data.segment and add it to the rtd obj.
   */
  dapGetRtdObj: function(membership, segtax) {
    let segment = {
      name: 'dap.akamai.com',
      ext: {
        'segtax': segtax
      },
      segment: []
    };
    if (membership != null) {
      for (const i of membership.cohorts) {
        segment.segment.push({ id: i });
      }
    }
    let data = {
      rtd: {
        ortb2: {
          user: {
            data: [
              segment
            ]
          },
          site: {
            ext: {
              data: {
                dapSAID: membership.said
              }
            }
          }
        }
      }
    };
    return data;
  },

  /**
   * DESCRIPTION
   *
   *  Convert a DAP membership response to an OpenRTB2 segment object suitable
   *  for insertion into user.data.segment or site.data.segment and add it to the rtd obj.
   */
  dapGetEncryptedRtdObj: function(encToken, segtax) {
    let segment = {
      name: 'dap.akamai.com',
      ext: {
        'segtax': segtax
      },
      segment: []
    };
    if (encToken != null) {
      segment.segment.push({ id: encToken.encryptedSegments });
    }
    let encData = {
      rtd: {
        ortb2: {
          user: {
            data: [
              segment
            ]
          }
        }
      }
    };
    return encData;
  },

  checkAndAddRealtimeData: function(data, segtax) {
    if (data.rtd) {
      if (segtax == 504 && dapUtils.checkIfSegmentsAlreadyExist(data.rtd, 504)) {
        logMessage('DEBUG(handleInit): rtb Object already added');
      } else {
        addRealTimeData(data.rtd);
      }
      logInfo('DEBUG(getRealTimeData) - 1');
    }
  },

  checkIfSegmentsAlreadyExist: function(rtd, segtax) {
    let segmentsExist = false
    let ortb2 = config.getConfig('ortb2') || {};
    if (ortb2.user && ortb2.user.data && ortb2.user.data.length > 0) {
      for (let i = 0; i < ortb2.user.data.length; i++) {
        let element = ortb2.user.data[i]
        if (element.ext && element.ext.segtax == segtax) {
          segmentsExist = true
          logMessage('DEBUG(checkIfSegmentsAlreadyExist): rtb Object already added: ', ortb2.user.data);
          break;
        }
      }
    }
    return segmentsExist
  },

  dapLog: function(args) {
    let css = '';
    css += 'display: inline-block;';
    css += 'color: #fff;';
    css += 'background: #F28B20;';
    css += 'padding: 1px 4px;';
    css += 'border-radius: 3px';

    logInfo('%cDAP Client', css, args);
  },

  /*******************************************************************************
   *
   * V2 (And Beyond) API
   *
   ******************************************************************************/

  /**
   * SYNOPSIS
   *
   *  dapTokenize( config, identity );
   *
   * DESCRIPTION
   *
   *  Tokenize an identity into a secure, privacy safe pseudonymiziation.
   *
   * PARAMETERS
   *
   *  config: an array of system configuration parameters
   *
   *  identity: an array of identity parameters passed to the tokenizing system
   *
   * EXAMPLE
   *
   *  config = {
   *      api_hostname:   "prebid.dap.akadns.net", // required
   *      domain:         "prebid.org",            // required
   *      api_version:    "x1",             // optional, default "x1"
   *      };
   *
   *  token = null;
   *  identity_email = {
   *      type:           "email",
   *      identity:       "obiwan@jedi.com"
   *      attributes:     { cohorts: [ "100:1641013200", "101:1641013200", "102":3:1641013200" ] },
   *      };
   *  dap_x1_tokenize( config, identity_email,
   *      function( response, status, xhr ) { token = response; },
   *      function( xhr, status, error ) { ; } // handle error
   *
   *  token = null;
   *  identity_signature = { type: "signature:1.0.0" };
   *  dap_x1_tokenize( config, identity_signature,
   *      function( response, status, xhr } { token = response; },
   *      function( xhr, status, error ) { ; } // handle error
   */
  dapTokenize: function(config, identity, onDone, onSuccess = null, onError = null) {
    if (onError == null) {
      onError = function(xhr, status, error, onDone) {};
    }

    if (config == null || typeof (config) == typeof (undefined)) {
      onError(null, 'Invalid config object', 'ClientError', onDone);
      return;
    }

    if (typeof (config.domain) != 'string') {
      onError(null, 'Invalid config.domain: must be a string', 'ClientError', onDone);
      return;
    }

    if (config.domain.length <= 0) {
      onError(null, 'Invalid config.domain: must have non-zero length', 'ClientError', onDone);
      return;
    }

    if (!('api_version' in config) || (typeof (config.api_version) == 'string' && config.api_version.length == 0)) {
      config.api_version = 'x1';
    }

    if (typeof (config.api_version) != 'string') {
      onError(null, "Invalid api_version: must be a string like 'x1', etc.", 'ClientError', onDone);
      return;
    }

    if (!(('api_hostname') in config) || typeof (config.api_hostname) != 'string' || config.api_hostname.length == 0) {
      onError(null, 'Invalid api_hostname: must be a non-empty string', 'ClientError', onDone);
      return;
    }

    if (identity == null || typeof (identity) == typeof (undefined)) {
      onError(null, 'Invalid identity object', 'ClientError', onDone);
      return;
    }

    if (!('type' in identity) || typeof (identity.type) != 'string' || identity.type.length <= 0) {
      onError(null, "Identity must contain a valid 'type' field", 'ClientError', onDone);
      return;
    }

    let apiParams = {
      'type': identity.type,
    };

    if (typeof (identity.identity) != typeof (undefined)) {
      apiParams.identity = identity.identity;
    }
    if (typeof (identity.attributes) != typeof (undefined)) {
      apiParams.attributes = identity.attributes;
    }

    let entropyDict = JSON.parse(localStorage.getItem(DAP_CLIENT_ENTROPY));
    if (entropyDict.entropy) {
      let audioFp = JSON.parse(localStorage.getItem(DAP_AUDIO_FP));
      audioFp = audioFp || 'NA';
      entropyDict.entropy.e17 = audioFp;
      apiParams.entropy = entropyDict.entropy;
    } else {
      logMessage('Entropy not added to Tokenize apiParams.');
    }

    let method;
    let body;
    let path;
    switch (config.api_version) {
      case 'x1':
      case 'x1-dev':
        method = 'POST';
        path = '/data-activation/' + config.api_version + '/domain/' + config.domain + '/identity/tokenize';
        body = JSON.stringify(apiParams);
        break;
      default:
        onError(null, 'Invalid api_version: ' + config.api_version, 'ClientError', onDone);
        return;
    }

    let customHeaders = {'Content-Type': 'application/json'};
    let dapSSID = JSON.parse(localStorage.getItem(DAP_SS_ID));
    if (dapSSID) {
      customHeaders['Akamai-DAP-SS-ID'] = dapSSID;
    }

    let url = 'https://' + config.api_hostname + path;
    let cb = {
      success: (response, request) => {
        let token = null;
        switch (config.api_version) {
          case 'x1':
          case 'x1-dev':
            token = request.getResponseHeader('Akamai-DAP-Token');
            break;
        }
        onSuccess(token, request.status, request, onDone);
      },
      error: (request, error) => {
        onError(request, request.statusText, error, onDone);
      }
    };

    ajax(url, cb, body, {
      method: method,
      customHeaders: customHeaders
    });
  },

  /**
   * SYNOPSIS
   *
   *  dapMembership( config, token, onSuccess, onError );
   *
   * DESCRIPTION
   *
   *  Return the audience segment membership along with a new Secure Advertising
   *  ID for this token.
   *
   * PARAMETERS
   *
   *  config: an array of system configuration parameters
   *
   *  token: the token previously returned from the tokenize API
   *
   * EXAMPLE
   *
   *  config = {
   *      api_hostname: 'api.dap.akadns.net',
   *      };
   *
   *  // token from dap_tokenize
   *
   *  dapMembership( config, token,
   *      function( membership, status, xhr ) {
   *          // Run auction with membership.segments and membership.said
   *      },
   *      function( xhr, status, error ) {
   *          // error
   *      } );
   *
   */
  dapMembership: function(config, token, onDone, onSuccess = null, onError = null) {
    if (onError == null) {
      onError = function(xhr, status, error, onDone) {};
    }

    if (config == null || typeof (config) == typeof (undefined)) {
      onError(null, 'Invalid config object', 'ClientError', onDone);
      return;
    }

    if (!('api_version' in config) || (typeof (config.api_version) == 'string' && config.api_version.length == 0)) {
      config.api_version = 'x1';
    }

    if (typeof (config.api_version) != 'string') {
      onError(null, "Invalid api_version: must be a string like 'x1', etc.", 'ClientError', onDone);
      return;
    }

    if (!(('api_hostname') in config) || typeof (config.api_hostname) != 'string' || config.api_hostname.length == 0) {
      onError(null, 'Invalid api_hostname: must be a non-empty string', 'ClientError', onDone);
      return;
    }

    if (token == null || typeof (token) != 'string') {
      onError(null, 'Invalid token: must be a non-null string', 'ClientError', onDone);
      return;
    }
    let path = '/data-activation/' +
               config.api_version +
               '/token/' + token +
               '/membership';

    let url = 'https://' + config.api_hostname + path;

    let cb = {
      success: (response, request) => {
        onSuccess(JSON.parse(response), request.status, request, onDone);
      },
      error: (error, request) => {
        onError(request, request.status, error, onDone);
      }
    };

    ajax(url, cb, undefined, {
      method: 'GET',
      customHeaders: {}
    });
  },

  /**
   * SYNOPSIS
   *
   *  dapEncryptedMembership( config, token, onSuccess, onError );
   *
   * DESCRIPTION
   *
   *  Return the audience segment membership along with a new Secure Advertising
   *  ID for this token in encrypted format.
   *
   * PARAMETERS
   *
   *  config: an array of system configuration parameters
   *
   *  token: the token previously returned from the tokenize API
   *
   * EXAMPLE
   *
   *  config = {
   *      api_hostname: 'api.dap.akadns.net',
   *      };
   *
   *  // token from dap_tokenize
   *
   *  dapEncryptedMembership( config, token,
   *      function( membership, status, xhr ) {
   *          // Run auction with membership.segments and membership.said after decryption
   *      },
   *      function( xhr, status, error ) {
   *          // error
   *      } );
   *
   */
  dapEncryptedMembership: function(config, token, onDone, onSuccess = null, onError = null) {
    if (onError == null) {
      onError = function(xhr, status, error, onDone) {};
    }

    if (config == null || typeof (config) == typeof (undefined)) {
      onError(null, 'Invalid config object', 'ClientError', onDone);
      return;
    }

    if (!('api_version' in config) || (typeof (config.api_version) == 'string' && config.api_version.length == 0)) {
      config.api_version = 'x1';
    }

    if (typeof (config.api_version) != 'string') {
      onError(null, "Invalid api_version: must be a string like 'x1', etc.", 'ClientError', onDone);
      return;
    }

    if (!(('api_hostname') in config) || typeof (config.api_hostname) != 'string' || config.api_hostname.length == 0) {
      onError(null, 'Invalid api_hostname: must be a non-empty string', 'ClientError', onDone);
      return;
    }

    if (token == null || typeof (token) != 'string') {
      onError(null, 'Invalid token: must be a non-null string', 'ClientError', onDone);
      return;
    }
    let path = '/data-activation/' +
                  config.api_version +
                  '/token/' + token +
                  '/membership/encrypt';

    let url = 'https://' + config.api_hostname + path;

    let cb = {
      success: (response, request) => {
        let encToken = request.getResponseHeader('Akamai-DAP-Token');
        onSuccess(encToken, request.status, request, onDone);
      },
      error: (error, request) => {
        onError(request, request.status, error, onDone);
      }
    };
    ajax(url, cb, undefined, {
      method: 'GET',
      customHeaders: {
        'Content-Type': 'application/json',
        'Pragma': 'akamai-x-get-extracted-values'
      }
    });
  }
}
