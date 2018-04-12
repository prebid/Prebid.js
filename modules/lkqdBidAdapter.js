import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { VIDEO } from 'src/mediaTypes';

const BIDDER_CODE = 'lkqd';
const BID_TTL_DEFAULT = 300;
const ENDPOINT = 'https://ssp.lkqd.net/ad?pid=[PLACEMENT_ID]&sid=[SITE_ID]&output=[OUTPUT]&execution=[EXECUTION]&placement=[PLACEMENT]&playinit=[PLAY_INIT]&volume=[VOLUME]&timeout=[TIMEOUT]&width=[WIDTH]‌&height=[HEIGHT]&pbt=[PREBID_TOKEN]‌&dnt=[DO_NOT_TRACK]‌&pageurl=[PAGEURL]‌&contentid=[CONTENT_ID]‌&contenttitle=[CONTENT_TITLE]‌&contentlength=[CONTENT_LENGTH]‌&contenturl=[CONTENT_URL]&prebid=true';

const PID_KEY = '[PLACEMENT_ID]';
const SID_KEY = '[SITE_ID]';
const OUTPUT_KEY = '[OUTPUT]';
const EXECUTION_KEY = '[EXECUTION]';
const PLACEMENT_KEY = '[PLACEMENT]';
const PLAYINIT_KEY = '[PLAY_INIT]';
const VOLUME_KEY = '[VOLUME]';
const TIMEOUT_KEY = '[TIMEOUT]';
const WIDTH_KEY = '[WIDTH]';
const HEIGHT_KEY = '[HEIGHT]';
const DNT_KEY = '[DO_NOT_TRACK]';
const PAGEURL_KEY = '[PAGEURL]';
const CONTENTID_KEY = '[CONTENT_ID]';
const CONTENTTITLE_KEY = '[CONTENT_TITLE]';
const CONTENTLENGTH_KEY = '[CONTENT_LENGTH]';
const CONTENTURL_KEY = '[CONTENT_URL]';

const PID_DEFAULT = null;
const SID_DEFAULT = null;
const OUTPUT_DEFAULT = 'vast';
const EXECUTION_DEFAULT = 'any';
const PLACEMENT_DEFAULT = '';
const PLAYINIT_DEFAULT = 'auto';
const VOLUME_DEFAULT = '100';
const TIMEOUT_DEFAULT = '';
const WIDTH_DEFAULT = null;
const HEIGHT_DEFAULT = null;
const DNT_DEFAULT = null;
const PAGEURL_DEFAULT = null;
const CONTENTID_DEFAULT = null;
const CONTENTTITLE_DEFAULT = null;
const CONTENTLENGTH_DEFAULT = null;
const CONTENTURL_DEFAULT = null;

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

function _replaceMacro(key, paramValue, defaultValue, url) {
  if (url && typeof url === 'string' && url !== '' && url.indexOf(key) > 0) {
    if (paramValue) {
      url = url.replace(key, paramValue);
    } else if (defaultValue || defaultValue == '') {
      url = url.replace(key, defaultValue);
    }
  }

  return url;
}

function buildRequests(validBidRequests) {
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

      // required parameters
      sspUrl = _replaceMacro(PID_KEY, bidRequest.params.placementId, PID_DEFAULT, sspUrl);
      sspUrl = _replaceMacro(SID_KEY, bidRequest.params.siteId, SID_DEFAULT, sspUrl);
      // optional parameters
      sspUrl = _replaceMacro(OUTPUT_KEY, bidRequest.params.output, OUTPUT_DEFAULT, sspUrl);
      sspUrl = _replaceMacro(EXECUTION_KEY, bidRequest.params.execution, EXECUTION_DEFAULT, sspUrl);
      sspUrl = _replaceMacro(PLACEMENT_KEY, bidRequest.params.placement, PLACEMENT_DEFAULT, sspUrl);
      sspUrl = _replaceMacro(PLAYINIT_KEY, bidRequest.params.playinit, PLAYINIT_DEFAULT, sspUrl);
      sspUrl = _replaceMacro(VOLUME_KEY, bidRequest.params.volume, VOLUME_DEFAULT, sspUrl);
      sspUrl = _replaceMacro(TIMEOUT_KEY, bidRequest.params.timeout, TIMEOUT_DEFAULT, sspUrl);
      sspUrl = _replaceMacro(WIDTH_KEY, playerWidth, WIDTH_DEFAULT, sspUrl);
      sspUrl = _replaceMacro(HEIGHT_KEY, playerHeight, HEIGHT_DEFAULT, sspUrl);
      sspUrl = _replaceMacro(DNT_KEY, bidRequest.params.dnt, DNT_DEFAULT, sspUrl);
      sspUrl = _replaceMacro(PAGEURL_KEY, bidRequest.params.pageurl, PAGEURL_DEFAULT, sspUrl);
      sspUrl = _replaceMacro(CONTENTID_KEY, bidRequest.params.contentId, CONTENTID_DEFAULT, sspUrl);
      sspUrl = _replaceMacro(CONTENTTITLE_KEY, bidRequest.params.contentTitle, CONTENTTITLE_DEFAULT, sspUrl);
      sspUrl = _replaceMacro(CONTENTLENGTH_KEY, bidRequest.params.contentLength, CONTENTLENGTH_DEFAULT, sspUrl);
      sspUrl = _replaceMacro(CONTENTURL_KEY, bidRequest.params.contentUrl, CONTENTURL_DEFAULT, sspUrl);
      // random number to prevent caching
      sspUrl = sspUrl + '‌&rnd=' + Math.floor(Math.random() * 999999999);

      let sspData = {};
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
          let sspXml = new window.DOMParser().parseFromString(serverResponse.body, 'text/xml');
          if (sspXml && sspXml.getElementsByTagName('parsererror').length == 0) {
            let sspUrl = bidRequest.url.concat();
            let prebidToken;
            let extensions = sspXml.getElementsByTagName('Extension');

            if (extensions && extensions.length) {
              for (let i = 0; i < extensions.length; i++) {
                if (extensions[i].getAttribute('id') === 'prebidToken') {
                  prebidToken = extensions[i]
                }
              }
              if (prebidToken) {
                sspUrl = sspUrl + '&pbt' + prebidToken;
              } else {
                utils.logWarn('Warning: Could not determine token, cannot guarantee same ad will be received after auctionEnd');
              }
            } else {
              utils.logWarn('Warning: Response did not contain a token, cannot guarantee same ad will be received after auctionEnd');
            }

            bidResponse.requestId = bidRequest.data.bidId;
            bidResponse.bidderCode = BIDDER_CODE;
            bidResponse.ad = '';
            bidResponse.cpm = parseFloat(sspXml.getElementsByTagName('Pricing')[0].innerHTML);
            bidResponse.width = bidRequest.data.bidWidth;
            bidResponse.height = bidRequest.data.bidHeight;
            bidResponse.ttl = BID_TTL_DEFAULT;
            bidResponse.creativeId = sspXml.getElementsByTagName('Ad')[0].getAttribute('id');
            bidResponse.currency = sspXml.getElementsByTagName('Pricing')[0].getAttribute('currency');
            bidResponse.netRevenue = true;
            bidResponse.vastUrl = sspUrl;
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
