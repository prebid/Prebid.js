import {registerBidder} from '../src/adapters/bidderFactory.js';
import {includes} from '../src/polyfill.js';
import {BANNER} from '../src/mediaTypes.js';

const VERSION = '1.0';
const BAD_WORD_STEP = 0.1;
const BAD_WORD_MIN = 0.2;

/**
 * Function that checks the page where the ads are being served for brand safety.
 * If unsafe words are found the scoring of that page increases.
 * If it becomes greater than the maximum allowed score false is returned.
 * The rules may vary based on the website language or the publisher.
 * The AdHash bidder will not bid on unsafe pages (according to 4A's).
 * @param badWords list of scoring rules to chech against
 * @param maxScore maximum allowed score for that bidding
 * @returns boolean flag is the page safe
 */
function brandSafety(badWords, maxScore) {
  /**
   * Performs the ROT13 encoding on the string argument and returns the resulting string.
   * The Adhash bidder uses ROT13 so that the response is not blocked by:
   *  - ad blocking software
   *  - parental control software
   *  - corporate firewalls
   * due to the bad words contained in the response.
   * @param value The input string.
   * @returns string Returns the ROT13 version of the given string.
   */
  const rot13 = value => {
    const input = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const output = 'NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm';
    const index = x => input.indexOf(x);
    const translate = x => index(x) > -1 ? output[index(x)] : x;
    return value.split('').map(translate).join('');
  };

  /**
   * Calculates the scoring for each bad word with dimishing returns
   * @param {integer} points points that this word costs
   * @param {integer} occurances number of occurances
   * @returns {float} final score
   */
  const scoreCalculator = (points, occurances) => {
    let positive = true;
    if (points < 0) {
      points *= -1;
      positive = false;
    }
    let result = 0;
    for (let i = 0; i < occurances; i++) {
      result += Math.max(points - i * BAD_WORD_STEP, BAD_WORD_MIN);
    }
    return positive ? result : -result;
  };

  // Default parameters if the bidder is unable to send some of them
  badWords = badWords || [];
  maxScore = parseInt(maxScore) || 10;

  try {
    let score = 0;
    const content = window.top.document.body.innerText.toLowerCase();
    const words = content.trim().split(/\s+/).length;
    for (const [word, rule, points] of badWords) {
      if (rule === 'full' && new RegExp('\\b' + rot13(word) + '\\b', 'i').test(content)) {
        const occurances = content.match(new RegExp('\\b' + rot13(word) + '\\b', 'g')).length;
        score += scoreCalculator(points, occurances);
      } else if (rule === 'partial' && content.indexOf(rot13(word.toLowerCase())) > -1) {
        const occurances = content.match(new RegExp(rot13(word), 'g')).length;
        score += scoreCalculator(points, occurances);
      }
    }
    return score < maxScore * words / 500;
  } catch (e) {
    return true;
  }
}

export const spec = {
  code: 'adhash',
  url: 'https://bidder.adhash.com/rtb?version=' + VERSION + '&prebid=true',
  supportedMediaTypes: [ BANNER ],

  isBidRequestValid: (bid) => {
    try {
      const { publisherId, platformURL } = bid.params;
      return (
        includes(Object.keys(bid.mediaTypes), BANNER) &&
        typeof publisherId === 'string' &&
        publisherId.length === 42 &&
        typeof platformURL === 'string' &&
        platformURL.length >= 13
      );
    } catch (error) {
      return false;
    }
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    const { gdprConsent } = bidderRequest;
    const { url } = spec;
    const bidRequests = [];
    let referrer = '';
    if (bidderRequest && bidderRequest.refererInfo) {
      // TODO: is 'page' the right value here?
      referrer = bidderRequest.refererInfo.page;
    }
    for (var i = 0; i < validBidRequests.length; i++) {
      var index = Math.floor(Math.random() * validBidRequests[i].sizes.length);
      var size = validBidRequests[i].sizes[index].join('x');
      bidRequests.push({
        method: 'POST',
        url: url + '&publisher=' + validBidRequests[i].params.publisherId,
        bidRequest: validBidRequests[i],
        data: {
          timezone: new Date().getTimezoneOffset() / 60,
          location: referrer,
          publisherId: validBidRequests[i].params.publisherId,
          size: {
            screenWidth: window.screen.width,
            screenHeight: window.screen.height
          },
          navigator: {
            platform: window.navigator.platform,
            language: window.navigator.language,
            userAgent: window.navigator.userAgent
          },
          creatives: [{
            size: size,
            position: validBidRequests[i].adUnitCode
          }],
          blockedCreatives: [],
          currentTimestamp: new Date().getTime(),
          recentAds: [],
          GDPRApplies: gdprConsent ? gdprConsent.gdprApplies : null,
          GDPR: gdprConsent ? gdprConsent.consentString : null
        },
        options: {
          withCredentials: false,
          crossOrigin: true
        },
      });
    }
    return bidRequests;
  },

  interpretResponse: (serverResponse, request) => {
    const responseBody = serverResponse ? serverResponse.body : {};

    if (
      !responseBody.creatives ||
      responseBody.creatives.length === 0 ||
      !brandSafety(responseBody.badWords, responseBody.maxScore)
    ) {
      return [];
    }

    const publisherURL = JSON.stringify(request.bidRequest.params.platformURL);
    const oneTimeId = request.bidRequest.adUnitCode + Math.random().toFixed(16).replace('0.', '.');
    const bidderResponse = JSON.stringify({ responseText: JSON.stringify(responseBody) });
    const requestData = JSON.stringify(request.data);

    return [{
      requestId: request.bidRequest.bidId,
      cpm: responseBody.creatives[0].costEUR,
      ad:
        `<div id="${oneTimeId}"></div>
        <script src="https://bidder.adhash.com/static/scripts/creative.min.js"></script>
        <script>callAdvertiser(${bidderResponse},['${oneTimeId}'],${requestData},${publisherURL})</script>`,
      width: request.bidRequest.sizes[0][0],
      height: request.bidRequest.sizes[0][1],
      creativeId: request.bidRequest.adUnitCode,
      netRevenue: true,
      currency: 'EUR',
      ttl: 60,
      meta: {
        advertiserDomains: responseBody.advertiserDomains ? [responseBody.advertiserDomains] : []
      }
    }];
  }
};

registerBidder(spec);
