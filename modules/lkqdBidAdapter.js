import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { VIDEO } from '../src/mediaTypes';

const BIDDER_CODE = 'lkqd';
const BID_TTL_DEFAULT = 300;
const ENDPOINT = 'https://v.lkqd.net/ad';

const PARAM_OUTPUT_DEFAULT = 'vast';
const PARAM_EXECUTION_DEFAULT = 'any';
const PARAM_SUPPORT_DEFAULT = 'html5';
const PARAM_PLAYINIT_DEFAULT = 'auto';
const PARAM_VOLUME_DEFAULT = '100';

function _validateId(id) {
  if (id && typeof id !== 'undefined' && parseInt(id) > 0) {
    return true;
  }

  return false;
}

function isBidRequestValid(bidRequest) {
  if (bidRequest.bidder === BIDDER_CODE && typeof bidRequest.params !== 'undefined') {
    if (_validateId(bidRequest.params.siteId) && _validateId(bidRequest.params.placementId)) {
      return true;
    }
  }

  return false;
}

function buildRequests(validBidRequests, bidderRequest) {
  let bidRequests = [];

  for (let i = 0; i < validBidRequests.length; i++) {
    let bidRequest = validBidRequests[i];

    // if width/height not provided to the ad unit for some reason then attempt request with default 640x480 size
    if (!bidRequest.sizes || !bidRequest.sizes.length) {
      utils.logWarn('Warning: Could not find valid width/height parameters on the provided adUnit');
      bidRequest.sizes = [[640, 480]];
    }

    // JWPlayer demo page uses sizes: [640,480] instead of sizes: [[640,480]] so need to handle single-layer array as well as nested arrays
    if (bidRequest.sizes.length === 2 && typeof bidRequest.sizes[0] === 'number' && typeof bidRequest.sizes[1] === 'number') {
      let adWidth = bidRequest.sizes[0];
      let adHeight = bidRequest.sizes[1];
      bidRequest.sizes = [[adWidth, adHeight]];
    }

    for (let j = 0; j < bidRequest.sizes.length; j++) {
      let size = bidRequest.sizes[j];
      let playerWidth;
      let playerHeight;
      if (size && size.length == 2) {
        playerWidth = size[0];
        playerHeight = size[1];
      } else {
        utils.logWarn('Warning: Could not determine width/height from the provided adUnit');
      }

      let sspUrl = ENDPOINT.concat();
      let sspData = {};

      // required parameters
      sspData.pid = bidRequest.params.placementId;
      sspData.sid = bidRequest.params.siteId;
      sspData.prebid = true;

      // optional parameters
      if (bidRequest.params.hasOwnProperty('output') && bidRequest.params.output != null) {
        sspData.output = bidRequest.params.output;
      } else {
        sspData.output = PARAM_OUTPUT_DEFAULT;
      }
      if (bidRequest.params.hasOwnProperty('execution') && bidRequest.params.execution != null) {
        sspData.execution = bidRequest.params.execution;
      } else {
        sspData.execution = PARAM_EXECUTION_DEFAULT;
      }
      if (bidRequest.params.hasOwnProperty('support') && bidRequest.params.support != null) {
        sspData.support = bidRequest.params.support;
      } else {
        sspData.support = PARAM_SUPPORT_DEFAULT;
      }
      if (bidRequest.params.hasOwnProperty('playinit') && bidRequest.params.playinit != null) {
        sspData.playinit = bidRequest.params.playinit;
      } else {
        sspData.playinit = PARAM_PLAYINIT_DEFAULT;
      }
      if (bidRequest.params.hasOwnProperty('volume') && bidRequest.params.volume != null) {
        sspData.volume = bidRequest.params.volume;
      } else {
        sspData.volume = PARAM_VOLUME_DEFAULT;
      }
      if (playerWidth) {
        sspData.width = playerWidth;
      }
      if (playerHeight) {
        sspData.height = playerHeight;
      }
      if (bidRequest.params.hasOwnProperty('vpaidmode') && bidRequest.params.vpaidmode != null) {
        sspData.vpaidmode = bidRequest.params.vpaidmode;
      }
      if (bidRequest.params.hasOwnProperty('appname') && bidRequest.params.appname != null) {
        sspData.appname = bidRequest.params.appname;
      }
      if (bidRequest.params.hasOwnProperty('bundleid') && bidRequest.params.bundleid != null) {
        sspData.bundleid = bidRequest.params.bundleid;
      }
      if (bidRequest.params.hasOwnProperty('aid') && bidRequest.params.aid != null) {
        sspData.aid = bidRequest.params.aid;
      }
      if (bidRequest.params.hasOwnProperty('idfa') && bidRequest.params.idfa != null) {
        sspData.idfa = bidRequest.params.idfa;
      }
      if (bidRequest.params.hasOwnProperty('gdpr') && bidRequest.params.gdpr != null) {
        sspData.gdpr = bidRequest.params.gdpr;
      }
      if (bidRequest.params.hasOwnProperty('gdprcs') && bidRequest.params.gdprcs != null) {
        sspData.gdprcs = bidRequest.params.gdprcs;
      }
      if (bidRequest.params.hasOwnProperty('flrd') && bidRequest.params.flrd != null) {
        sspData.flrd = bidRequest.params.flrd;
      }
      if (bidRequest.params.hasOwnProperty('flrmp') && bidRequest.params.flrmp != null) {
        sspData.flrmp = bidRequest.params.flrmp;
      }
      if (bidRequest.params.hasOwnProperty('placement') && bidRequest.params.placement != null) {
        sspData.placement = bidRequest.params.placement;
      }
      if (bidRequest.params.hasOwnProperty('timeout') && bidRequest.params.timeout != null) {
        sspData.timeout = bidRequest.params.timeout;
      }
      if (bidRequest.params.hasOwnProperty('dnt') && bidRequest.params.dnt != null) {
        sspData.dnt = bidRequest.params.dnt;
      }
      if (bidRequest.params.hasOwnProperty('pageurl') && bidRequest.params.pageurl != null) {
        sspData.pageurl = bidRequest.params.pageurl;
      } else if (bidderRequest && bidderRequest.refererInfo) {
        sspData.pageurl = encodeURIComponent(bidderRequest.refererInfo.referer);
      }
      if (bidRequest.params.hasOwnProperty('contentId') && bidRequest.params.contentId != null) {
        sspData.contentid = bidRequest.params.contentId;
      }
      if (bidRequest.params.hasOwnProperty('contentTitle') && bidRequest.params.contentTitle != null) {
        sspData.contenttitle = bidRequest.params.contentTitle;
      }
      if (bidRequest.params.hasOwnProperty('contentLength') && bidRequest.params.contentLength != null) {
        sspData.contentlength = bidRequest.params.contentLength;
      }
      if (bidRequest.params.hasOwnProperty('contentUrl') && bidRequest.params.contentUrl != null) {
        sspData.contenturl = bidRequest.params.contentUrl;
      }

      // random number to prevent caching
      sspData.rnd = Math.floor(Math.random() * 999999999);

      // Prebid.js required properties
      sspData.bidId = bidRequest.bidId;
      sspData.bidWidth = playerWidth;
      sspData.bidHeight = playerHeight;

      bidRequests.push({
        method: 'GET',
        url: sspUrl,
        data: sspData
      });
    }
  }

  return bidRequests;
}

function interpretResponse(serverResponse, bidRequest) {
  let bidResponses = [];
  if (serverResponse && serverResponse.body) {
    if (serverResponse.error) {
      utils.logError('Error: ' + serverResponse.error);
      return bidResponses;
    } else {
      try {
        let bidResponse = {};
        if (bidRequest && bidRequest.data && bidRequest.data.bidId && bidRequest.data.bidId !== '') {
          let sspXmlString = serverResponse.body;
          let sspXml = new window.DOMParser().parseFromString(sspXmlString, 'text/xml');
          if (sspXml && sspXml.getElementsByTagName('parsererror').length == 0) {
            let sspUrl = bidRequest.url.concat();

            bidResponse.requestId = bidRequest.data.bidId;
            bidResponse.bidderCode = BIDDER_CODE;
            bidResponse.ad = '';
            bidResponse.cpm = parseFloat(sspXml.getElementsByTagName('Pricing')[0].textContent);
            bidResponse.width = bidRequest.data.bidWidth;
            bidResponse.height = bidRequest.data.bidHeight;
            bidResponse.ttl = BID_TTL_DEFAULT;
            bidResponse.creativeId = sspXml.getElementsByTagName('Ad')[0].getAttribute('id');
            bidResponse.currency = sspXml.getElementsByTagName('Pricing')[0].getAttribute('currency');
            bidResponse.netRevenue = true;
            bidResponse.vastUrl = sspUrl;
            bidResponse.vastXml = sspXmlString;
            bidResponse.mediaType = VIDEO;

            bidResponses.push(bidResponse);
          } else {
            utils.logError('Error: Server response contained invalid XML');
          }
        } else {
          utils.logError('Error: Could not associate bid request to server response');
        }
      } catch (e) {
        utils.logError('Error: Could not interpret server response');
      }
    }
  } else {
    utils.logError('Error: No server response or server response was empty for the requested URL');
  }

  return bidResponses;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse
}

registerBidder(spec);
