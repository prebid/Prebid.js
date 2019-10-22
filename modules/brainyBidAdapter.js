import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';

const BIDDER_CODE = 'brainy';
const BASE_URL = 'https://proparm.jp/ssp/p/pbjs';

/**
 * Check if the browser supports flash
 * 0 is return if it dosen't support flash
 * @return      {int} Flash version
 */
/**
 * 接続元のブラウザがフラッシュに対応しているか判定
 * 対応していなければ0を返す
 * @return      {int} フラッシュのバージョン
 */
function _getFlash() {
  try {
    var _mac = (navigator.userAgent.indexOf('Mac') != -1);
    if (document.all) {
      if (_mac) {
        if (window['sample']) {
          return ((window['sample'].FlashVersion() & 0xffff0000) >> 16);
        }
      } else {
        var _axo = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
        return Math.floor(_axo.FlashVersion() / 0x10000);
      }
    } else {
      if (navigator.plugins && navigator.plugins['Shockwave Flash']) {
        var info = navigator.plugins['Shockwave Flash'].description.split(' ');
        var _v = parseInt(info[2]);
        if (!isNaN(_v)) {
          return _v;
        }
      }
    }
  } catch (e) {}
  return 0;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Check if the bid account ID and slotID is valid
   * @param {object} bid the brainy bid to validate
   * @return {boolean}
   */
  /**
   * adUnits.bidに値が入っているかを判断する
   * @param  {object} bid 検証する入札リクエスト
   * @return {boolean}
   */
  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.accountID && bid.params.slotID);
  },

  /**
   * Format the bid request object for our endpoint
   * @param  {BidRequest[]} bidRequests Array of brainy bidders
   * @return object of parameters for Prebid AJAX request
   */
  /**
   * 入札リクエストをbrainyに対応するように整形する
   * @param  {BidRequest[]} bidRequests 入札のための配列
   * @return Prebid AJAX用に整形したオブジェクト
   */
  buildRequests: function(validBidRequests) {
    var bidRequests = [];
    for (var i = 0, len = validBidRequests.length; i < len; i++) {
      var bid = validBidRequests[i];
      var accountID = utils.getBidIdParameter('accountID', bid.params);
      var slotID = utils.getBidIdParameter('slotID', bid.params);
      var url = utils.getTopWindowUrl();
      var flash = _getFlash();
      var nocache = new Date().getTime() + Math.floor(Math.random() * 100000000);
      var requestURL;

      requestURL = '_aid=' + accountID + '&';
      requestURL += '_slot=' + slotID + '&';
      requestURL += '_url=' + url + '&';
      requestURL += '_flash=' + flash + '&';
      requestURL += '_nocache=' + nocache;

      bidRequests.push({
        method: 'GET',
        url: BASE_URL,
        data: requestURL,
        bidRequest: bid
      })
    }
    return bidRequests;
  },

  /**
   * Format brainy responses as Prebid bid responses
   * @param  {String} brainyResponseObj A successful response from brainy.
   * @param  {object} request           Object received from web page
   * @return {object}                   An array of formatted bids.
   */
  /**
   * brainySSPからのレスポンスを解釈するメソッド
   * @param  {String} brainyResponseObj SSPから受け取った文字列
   * @param  {object} request           メディアから受け取ったオブジェクト
   * @return {object}                   分解、再格納したbidResponses
   */
  interpretResponse: function (brainyResponseObj, request) {
    var bidResponses = [];
    var bidRequest = request.bidRequest;
    var responseBody = brainyResponseObj ? brainyResponseObj.body : {};

    bidResponses.push({
      requestId: bidRequest.bidId,
      cpm: responseBody.cpm || 0,
      width: responseBody.width,
      height: responseBody.height,
      creativeId: responseBody.adID,
      currency: 'USD',
      netRevenue: true,
      ttl: 1000,
      mediaType: BANNER,
      ad: responseBody.src
    });

    return bidResponses;
  },

  /**
   * SyncURLがある場合にレスポンスを解析してURLを返す
   * @param  {object} syncOptions     Syncの設定
   * @param  {object} serverResponses SSPからのレスポンス
   * @return {object}                 表示タイプとURLが入ったオブジェクト
   */
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];
    if (syncOptions.pixelEnabled) {
      const brainyResponseObj = serverResponses[0].body;
      if (!brainyResponseObj) {
        return [];
      }
      if (brainyResponseObj.syncUrl && brainyResponseObj.syncUrl != 'null' && brainyResponseObj.syncUrl.length > 0) {
        syncs.push({
          type: 'image',
          url: brainyResponseObj.syncUrl
        });
      }
    }
    return syncs;
  }
};
registerBidder(spec);
