import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import {ajax} from 'src/ajax';
import {STATUS} from 'src/constants';

const AerServAdapter = function AerServAdapter() {
  const ENVIRONMENTS = {
    local: '127.0.0.1:8080',
    dev: 'dev-ads.aerserv.com',
    stage: 'staging-ads.aerserv.com',
    prod: 'ads.aerserv.com'
  };

  const BANNER_PATH = '/as/json/pbjs/v1?';
  const VIDEO_PATH = '/as/json/pbjsvast/v1?';
  const BIDDER_CODE = 'aerserv';
  const REQUIRED_PARAMS = ['plc'];

  function _isResponseValid(bidRequest, response) {
    return ((bidRequest.mediaType === 'video' && response.vastUrl) || (bidRequest.mediaType !== 'video' && response.adm)) &&
    response.cpm && response.cpm > 0;
  }

  function _createBid(bidRequest, response) {
    if (_isResponseValid(bidRequest, response)) {
      let bid = bidfactory.createBid(1, bidRequest);
      bid.bidderCode = BIDDER_CODE;
      bid.cpm = response.cpm;
      bid.width = response.w;
      bid.height = response.h;
      if (bidRequest.mediaType === 'video') {
        bid.vastUrl = response.vastUrl;
        bid.descriptionUrl = response.vastUrl;
      } else {
        bid.ad = response.adm;
      }
      bidmanager.addBidResponse(bidRequest.placementCode, bid);
    } else {
      bidmanager.addBidResponse(bidRequest.placementCode, bidfactory.createBid(STATUS.NO_BID, bidRequest));
    }
  }

  function _buildQueryParameters(bidRequest, requestParams) {
    Object.keys(bidRequest.params).forEach(param => requestParams[param] = bidRequest.params[param]);

    return utils.parseQueryStringParameters(requestParams);
  }

  function _handleResponse(bidRequest) {
    return response => {
      if (!response && response.length <= 0) {
        bidmanager.addBidResponse(bidRequest.placementCode, bidfactory.createBid(STATUS.NO_BID, bidRequest));
        utils.logError('Empty response');
        return;
      }

      try {
        response = JSON.parse(response);
      } catch (e) {
        bidmanager.addBidResponse(bidRequest.placementCode, bidfactory.createBid(STATUS.NO_BID, bidRequest));
        utils.logError('Invalid JSON in response');
        return;
      }

      _createBid(bidRequest, response);
    };
  }

  function _callBids(bidRequests) {
    let currentUrl = (window.parent !== window) ? document.referrer : window.location.href;
    currentUrl = currentUrl && encodeURIComponent(currentUrl);

    let bids = bidRequests.bids || [];
    bids.forEach(bidRequest => {
      if (utils.hasValidBidRequest(bidRequest.params, REQUIRED_PARAMS, BIDDER_CODE)) {
        let env = ENVIRONMENTS[bidRequest.params['env']] || ENVIRONMENTS['prod'];
        let requestPath = bidRequest.mediaType === 'video' ? VIDEO_PATH : BANNER_PATH;
        let pageParameters = {url: currentUrl};
        let parameterStr = _buildQueryParameters(bidRequest, pageParameters);

        let url = `//${env}${requestPath}${parameterStr}`;
        utils.logMessage('sending request to: ' + url);
        ajax(url, _handleResponse(bidRequest), null, {withCredentials: true});
      } else {
        bidmanager.addBidResponse(bidRequest.placementCode, bidfactory.createBid(STATUS.NO_BID, bidRequest));
      }
    });
  }

  return {
    callBids: _callBids
  }
};

module.exports = AerServAdapter;
