import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import {ajax} from 'src/ajax';
import {STATUS} from 'src/constants';
import adaptermanager from 'src/adaptermanager';

const BIDDER_CODE = 'aerserv';

const AerServAdapter = function AerServAdapter() {
  const ENVIRONMENTS = {
    local: '127.0.0.1:8080',
    dev: 'dev-ads.aerserv.com',
    stage: 'staging-ads.aerserv.com',
    prod: 'ads.aerserv.com'
  };

  const BANNER_PATH = '/as/json/pbjs/v1?';
  const VIDEO_PATH = '/as/json/pbjsvast/v1?';
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
        bid.mediaType = 'video';
      } else {
        bid.ad = response.adm;
      }
      bidmanager.addBidResponse(bidRequest.placementCode, bid);
    } else {
      bidmanager.addBidResponse(bidRequest.placementCode, bidfactory.createBid(STATUS.NO_BID, bidRequest));
    }
  }

  function _getFirstSize(sizes) {
    let sizeObj = {};
    if (utils.isArray(sizes) && sizes.length > 0 && utils.isArray(sizes[0]) && sizes[0].length === 2) {
      sizeObj['vpw'] = sizes[0][0];
      sizeObj['vph'] = sizes[0][1];
    }
    return sizeObj;
  }

  function _buildQueryParameters(bid, requestParams) {
    Object.keys(bid.params).filter(param => param !== 'video')
      .forEach(param => requestParams[param] = bid.params[param]);

    if (bid.mediaType === 'video') {
      let videoDimensions = _getFirstSize(bid.sizes);
      Object.keys(videoDimensions).forEach(param => requestParams[param] = videoDimensions[param]);
      Object.keys(bid.params.video || {}).forEach(param => requestParams[param] = bid.params.video[param]);
    }

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
    bids.forEach(bid => {
      if (utils.hasValidBidRequest(bid.params, REQUIRED_PARAMS, BIDDER_CODE)) {
        let env = ENVIRONMENTS[bid.params['env']] || ENVIRONMENTS['prod'];
        let requestPath = bid.mediaType === 'video' ? VIDEO_PATH : BANNER_PATH;
        let pageParameters = {url: currentUrl};
        let parameterStr = _buildQueryParameters(bid, pageParameters);

        let url = `//${env}${requestPath}${parameterStr}`;
        utils.logMessage('sending request to: ' + url);
        ajax(url, _handleResponse(bid), null, {withCredentials: true});
      } else {
        bidmanager.addBidResponse(bid.placementCode, bidfactory.createBid(STATUS.NO_BID, bid));
      }
    });
  }

  return {
    callBids: _callBids
  }
};

adaptermanager.registerBidAdapter(new AerServAdapter(), BIDDER_CODE, {supportedMediaTypes: ['video']});

module.exports = AerServAdapter;
