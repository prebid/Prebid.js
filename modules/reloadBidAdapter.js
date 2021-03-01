import {
  registerBidder
}
  from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();

const BIDDER_CODE = 'reload';
const VERSION_ADAPTER = '1.10';
export const spec = {
  code: BIDDER_CODE,
  png: {},
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.plcmID && bid.params.partID && 'opdomID' in bid.params &&
      'bsrvID' in bid.params && bid.params.bsrvID >= 0 && bid.params.bsrvID <= 99);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    let vRequests = [];
    let bidReq = {
      id: Math.random().toString(10).substring(2),
      imp: []
    };
    let vgdprConsent = null;
    if (utils.deepAccess(bidderRequest, 'gdprConsent')) {
      vgdprConsent = bidderRequest.gdprConsent;
    }
    let vPrxClientTool = null;
    let vSrvUrl = null;
    for (let vIdx = 0; vIdx < validBidRequests.length; vIdx++) {
      let bidRequest = validBidRequests[vIdx];
      vPrxClientTool = new ReloadClientTool({
        prxVer: VERSION_ADAPTER,
        prxType: 'bd',
        plcmID: bidRequest.params.plcmID,
        partID: bidRequest.params.partID,
        opdomID: bidRequest.params.opdomID,
        bsrvID: bidRequest.params.bsrvID,
        gdprObj: vgdprConsent,
        mediaObj: bidRequest.mediaTypes,
        wnd: utils.getWindowTop(),
        rtop: utils.deepAccess(bidderRequest, 'refererInfo.reachedTop') || false
      });
      if (vSrvUrl === null) vSrvUrl = vPrxClientTool.getSrvUrl();
      let vImpression = {
        id: bidRequest.bidId,
        bidId: bidRequest.bidId,
        adUnitCode: bidRequest.adUnitCode,
        transactionId: bidRequest.transactionId,
        bidderRequestId: bidRequest.bidderRequestId,
        auctionId: bidRequest.auctionId,
        banner: {
          ext: {
            type: bidRequest.params.type || 'pcm',
            pcmdata: vPrxClientTool.getPCMObj()
          }
        }
      };
      bidReq.imp.push(vImpression);
    }
    if (bidReq.imp.length > 0) {
      const payloadString = JSON.stringify(bidReq);
      vRequests.push({
        method: 'POST',
        url: vSrvUrl,
        data: payloadString
      });
    }
    return vRequests;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const serverBody = serverResponse.body;
    const bidResponses = [];
    for (let vIdx = 0; vIdx < serverBody.seatbid.length; vIdx++) {
      let vSeatBid = serverBody.seatbid[vIdx];
      for (let vIdxBid = 0; vIdxBid < vSeatBid.bid.length; vIdxBid++) {
        let vBid = vSeatBid.bid[vIdxBid];
        let vPrxClientTool = new ReloadClientTool({
          plcmID: vBid.ext.plcmID,
          partID: vBid.ext.partID,
          opdomID: vBid.ext.opdomID,
          bsrvID: vBid.ext.bsrvID
        });
        vPrxClientTool.setPCMObj(vBid.ext.pcmdata);
        if (vPrxClientTool.getBP() > 0) {
          let bidResponse = {
            requestId: vBid.impid,
            ad: vPrxClientTool.getAM(),
            cpm: vPrxClientTool.getBP() / 100,
            width: vPrxClientTool.getW(),
            height: vPrxClientTool.getH(),
            creativeId: vBid.id,
            currency: vPrxClientTool.getBC(),
            ttl: 300,
            netRevenue: true
          };
          bidResponses.push(bidResponse);
          this.png[vBid.ext.adUnitCode] = vPrxClientTool.getPingUrl('bidwon');
        }
      }
    }
    return bidResponses;
  },
  /**
     * Register bidder specific code, which will execute if a bid from this bidder won the auction
     * @param {Bid} The bid that won the auction
     */
  onBidWon: function (bid) {
    if (typeof this.png[bid.adUnitCode] !== 'string' || this.png[bid.adUnitCode] === '') return;
    (new Image()).src = this.png[bid.adUnitCode];
  }
};

function ReloadClientTool(args) {
  var that = this;
  var _pcmClientVersion = '120';
  var _pcmFilePref = 'prx_root_';
  var _resFilePref = 'prx_pnws_';
  var _pcmInputObjVers = '120';
  var _instObj = null;
  var _status = 'NA';
  var _message = '';
  var _log = '';
  var _memFile = _getMemFile();

  if (_memFile.status !== 'ok') {
    _log += 'WARNING: clnt-int mem file initialized\n';
  }

  that.getPCMObj = function () {
    return {
      thisVer: _pcmInputObjVers,
      statStr: _memFile.statStr,
      plcmData: _getPlcmData(),
      clntData: _getClientData(args.wnd, args.rtop),
      resultData: _getRD(),
      gdprObj: _getGdpr(),
      mediaObj: _getMediaObj(),
      proxetString: null,
      dboData: null,
      plcmSett: null,
    };
  };

  that.setPCMObj = function (obj) {
    if (obj.thisVer !== '100') {
      _status = 'error';
      _message = 'incomp_output_obj_version';
      _log += ' ERROR incomp_output_obj_version';
      return;
    }

    _status = obj.status;
    _message = obj.message;
    _log += ' ' + obj.log;

    if (obj.status !== 'ok') return;

    _saveMemFile(obj.statStr, obj.srvUrl);
    _instObj = obj.instr;
  };

  that.getSrvUrl = function () {
    var effSrvUrl = getBidServerUrl(0);

    if (isNaN(parseInt(args.bsrvID)) !== true) effSrvUrl = getBidServerUrl(parseInt(args.bsrvID));

    if (typeof _memFile.srvUrl === 'string' && _memFile.srvUrl !== '') effSrvUrl = _memFile.srvUrl;

    return 'https://' + effSrvUrl + '/bid';

    function getBidServerUrl (idx) {
      return 'bidsrv' + getTwoDigitString(idx) + '.reload.net';

      function getTwoDigitString (idx) {
        if (idx >= 10) return '' + idx;
        else return '0' + idx;
      }
    }
  };

  that.getMT = function () {
    return _checkInstProp('mtype', 'dsp');
  };

  that.getW = function () {
    return _checkInstProp('width', 0);
  };

  that.getH = function () {
    return _checkInstProp('height', 0);
  };

  that.getBP = function () {
    return _checkInstProp('prc', 0);
  };

  that.getBC = function () {
    return _checkInstProp('cur', 'USD');
  };

  that.getAM = function () {
    return _checkInstProp('am', null);
  };

  that.getPingUrl = function (pingName) {
    var pingData = _checkInstProp('pingdata', {});
    if (pingData[pingName] !== 'undefined') return pingData[pingName];
    return '';
  };

  that.setRD = function (data) {
    return _setRD(data);
  };

  that.getStat = function () {
    return _status;
  };

  that.getMsg = function () {
    return _message;
  };

  that.getLog = function () {
    return _log;
  };

  function _checkInstProp (key, def) {
    if (_instObj === null) return def;
    if (typeof _instObj === 'undefined') return def;
    if (_instObj.go !== true) return def;
    if (typeof _instObj[key] === 'undefined') return def;
    return _instObj[key];
  }

  function _getPlcmData () {
    return {
      prxVer: args.prxVer,
      prxType: args.prxType,
      plcmID: args.plcmID,
      partID: args.partID,
      opdomID: args.opdomID,
      bsrvID: args.bsrvID,
      dmod: args.dmod,
      lmod: args.lmod,
      lplcmID: args.lplcmID,
    };
  }

  function _getClientData (wnd, rtop) {
    return {
      version: 200,
      locTime: Date.now(),
      winInfo: _winInf(wnd),
      envInfo: getEnvInfo(),
      topw: rtop === true,
      prot: wnd.document.location.protocol,
      host: wnd.document.location.host,
      title: wnd.document.title,
    };

    function _winInf (wnd) {
      return {
        phs: {
          w: wnd.screen.width,
          h: wnd.screen.height
        },
        avl: {
          w: wnd.screen.availWidth,
          h: wnd.screen.availHeight
        },
        inr: {
          w: wnd.innerWidth,
          h: wnd.innerHeight
        },
        bdy: {
          w: wnd.document.body.clientWidth,
          h: wnd.document.body.clientHeight
        }
      };
    }

    function getEnvInfo() {
      return {
        userAgent: navigator.userAgent,
        appName: navigator.appName,
        appVersion: navigator.appVersion
      };
    }
  }

  function _getMemFile () {
    try {
      var memFileObj = _getItem(_getMemFileName());

      if (memFileObj === null) throw { s: 'init' };

      if (typeof memFileObj.statStr !== 'string') throw { s: 'error' };
      if (typeof memFileObj.srvUrl !== 'string') throw { s: 'error' };

      memFileObj.status = 'ok';

      return memFileObj;
    } catch (err) {
      var retObj = {
        statStr: null,
        srvUrl: null
      };
      retObj.status = err.s;

      return retObj;
    }
  }

  function _saveMemFile (statStr, srvUrl) {
    try {
      var fileData = {
        statStr: statStr,
        srvUrl: srvUrl,
      };
      _setItem(_getMemFileName(), fileData);
      return true;
    } catch (err) {
      return false;
    }
  }

  function _getMemFileName () {
    return _pcmFilePref + args.plcmID + '_' + args.partID;
  }

  function _getRD () {
    try {
      return _getItem(_getResltStatusFileName());
    } catch (err) {
      return null;
    }
  }

  function _setRD (fileData) {
    try {
      _setItem(_getResltStatusFileName(), fileData);
      return true;
    } catch (err) {
      return false;
    }
  }

  function _getGdpr() {
    return args.gdprObj;
  }

  function _getMediaObj() {
    return args.mediaObj;
  }

  function _getResltStatusFileName () {
    if (args.lmod === true) return _resFilePref + args.lplcmID + '_' + args.partID;
    else return _resFilePref + args.plcmID + '_' + args.partID;
  }

  function _setItem (name, data) {
    var stgFileObj = {
      ver: _pcmClientVersion,
      ts: Date.now(),
    };

    if (typeof data === 'string') {
      stgFileObj.objtype = false;
      stgFileObj.memdata = data;
    } else {
      stgFileObj.objtype = true;
      stgFileObj.memdata = JSON.stringify(data);
    }

    var stgFileStr = JSON.stringify(stgFileObj);

    storage.setDataInLocalStorage(name, stgFileStr);

    return true;
  }

  function _getItem (name) {
    try {
      var obStgFileStr = storage.getDataFromLocalStorage(name);
      if (obStgFileStr === null) return null;

      var stgFileObj = JSON.parse(obStgFileStr);

      if (stgFileObj.ver !== _pcmClientVersion) throw { message: 'version_error' };

      if (stgFileObj.objtype === true) return JSON.parse(stgFileObj.memdata);
      else return '' + stgFileObj.memdata;
    } catch (err) {
      return null;
    }
  }
};

registerBidder(spec);
