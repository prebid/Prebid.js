import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';

import { BANNER, VIDEO } from '../src/mediaTypes.js';

const VERSION = '3.6';
const BAD_WORD_STEP = 0.1;
const BAD_WORD_MIN = 0.2;
const ADHASH_BIDDER_CODE = 'adhash';
const storage = getStorageManager({ bidderCode: ADHASH_BIDDER_CODE });

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
  const delimiter = '~';

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
   * @param {number} points points that this word costs
   * @param {number} occurrences number of occurrences
   * @returns {number} final score
   */
  const scoreCalculator = (points, occurrences) => {
    let positive = true;
    if (points < 0) {
      points *= -1;
      positive = false;
    }
    let result = 0;
    for (let i = 0; i < occurrences; i++) {
      result += Math.max(points - i * BAD_WORD_STEP, BAD_WORD_MIN);
    }
    return positive ? result : -result;
  };

  /**
   * Checks what rule will match in the given array with words
   * @param {string} rule rule type (full, partial, starts, ends, regexp)
   * @param {string} decodedWord decoded word
   * @param {string} wordsToMatch list of all words on the page separated by delimiters
   * @returns {object|boolean} matched rule and occurrences. If nothing is matched returns false
   */
  const wordsMatchedWithRule = function (rule, decodedWord, wordsToMatch) {
    if (!wordsToMatch) {
      return false;
    }

    let occurrences;
    let adjustedWordToMatch;
    decodedWord = decodedWord.split(' ').join(`${delimiter}${delimiter}`);
    switch (rule) {
      case 'full':
        adjustedWordToMatch = `${delimiter}${decodedWord}${delimiter}`;
        break;
      case 'partial':
        adjustedWordToMatch = decodedWord;
        break;
      case 'starts':
        adjustedWordToMatch = `${delimiter}${decodedWord}`;
        break;
      case 'ends':
        adjustedWordToMatch = `${decodedWord}${delimiter}`;
        break;
      case 'combo':
        const allOccurrences = [];
        const paddedWordsToMatch = `${delimiter}${wordsToMatch}${delimiter}`;
        const decodedWordsSplit = decodedWord.split(`${delimiter}${delimiter}`);
        for (const decodedWordPart of decodedWordsSplit) {
          adjustedWordToMatch = `${delimiter}${decodedWordPart}${delimiter}`;
          allOccurrences.push(paddedWordsToMatch.split(adjustedWordToMatch).length - 1);
        }
        occurrences = Math.min(...allOccurrences);
        return occurrences > 0 ? { rule, occurrences } : false;
      case 'regexp':
        occurrences = [...wordsToMatch.matchAll(new RegExp(decodedWord, 'gi'))].length;
        return occurrences > 0 ? { rule, occurrences } : false;
      default:
        return false;
    }

    const paddedWordsToMatch = `${delimiter}${wordsToMatch}${delimiter}`;
    occurrences = paddedWordsToMatch.split(adjustedWordToMatch).length - 1;
    return occurrences > 0 ? { rule, occurrences } : false;
  };

  // Default parameters if the bidder is unable to send some of them
  badWords = badWords || [];
  maxScore = parseInt(maxScore) || 10;

  try {
    let score = 0;
    const decodedUrl = decodeURI(window.top.location.href.substring(window.top.location.origin.length));
    const wordsAndNumbersInUrl = decodedUrl
      .replaceAll(/[-,._/?=&#%]/g, ' ')
      .replaceAll(/\s\s+/g, ' ')
      .toLowerCase()
      .trim();
    const content = window.top.document.body.textContent.toLowerCase();
    // \p{L} matches a single unicode code point in the category 'letter'. Matches any kind of letter from any language.
    const regexp = new RegExp('[\\p{L}]+', 'gu');
    const wordsMatched = content.match(regexp);
    const words = wordsMatched.join(`${delimiter}${delimiter}`);
    const wordsInUrl = wordsAndNumbersInUrl.match(regexp).join(`${delimiter}${delimiter}`);

    for (const [word, rule, points] of badWords) {
      const decodedWord = rot13(word.toLowerCase());

      // Checks the words in the url of the page only for negative words. Don't serve any ad when at least one match is found
      if (points > 0) {
        const matchedRuleInUrl = wordsMatchedWithRule(rule, decodedWord, wordsInUrl);
        if (matchedRuleInUrl.rule) {
          return false;
        }
      }

      // Check if site content's words match any of our brand safety rules
      const matchedRule = wordsMatchedWithRule(rule, decodedWord, words);
      if (matchedRule !== false) {
        score += scoreCalculator(points, matchedRule.occurrences);
      }
    }
    return score < (maxScore * wordsMatched.length) / 1000;
  } catch (e) {
    return true;
  }
}

export const spec = {
  code: ADHASH_BIDDER_CODE,
  supportedMediaTypes: [ BANNER, VIDEO ],

  isBidRequestValid: (bid) => {
    try {
      const { publisherId, platformURL, bidderURL } = bid.params;
      return (
        (Object.keys(bid.mediaTypes).includes(BANNER) || Object.keys(bid.mediaTypes).includes(VIDEO)) &&
        typeof publisherId === 'string' &&
        publisherId.length === 42 &&
        typeof platformURL === 'string' &&
        platformURL.length >= 13 &&
        (!bidderURL || bidderURL.indexOf('https://') === 0)
      );
    } catch (error) {
      return false;
    }
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    const { gdprConsent } = bidderRequest;
    const bidRequests = [];
    const body = document.body;
    const html = document.documentElement;
    const pageHeight = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    );
    const pageWidth = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);

    for (let i = 0; i < validBidRequests.length; i++) {
      const bidderURL = validBidRequests[i].params.bidderURL || 'https://bidder.adhash.com';
      const url = `${bidderURL}/rtb?version=${VERSION}&prebid=true`;
      const index = Math.floor(Math.random() * validBidRequests[i].sizes.length);
      const size = validBidRequests[i].sizes[index].join('x');
      const creativeData = Object.keys(validBidRequests[i].mediaTypes).includes(VIDEO) ? {
        size: 'preroll',
        position: validBidRequests[i].adUnitCode,
        playerSize: size
      } : {
        size: size,
        position: validBidRequests[i].adUnitCode
      };
      let recentAds = [];
      let recentAdsPrebid = [];
      if (storage.localStorageIsEnabled()) {
        const prefix = validBidRequests[i].params.prefix || 'adHash';
        recentAds = JSON.parse(storage.getDataFromLocalStorage(prefix + 'recentAds') || '[]');
        recentAdsPrebid = JSON.parse(storage.getDataFromLocalStorage(prefix + 'recentAdsPrebid') || '[]');
      }

      // Needed for the ad density calculation
      const adHeight = validBidRequests[i].sizes[index][1];
      const adWidth = validBidRequests[i].sizes[index][0];
      if (!window.adsCount) {
        window.adsCount = 0;
      }
      if (!window.adsTotalSurface) {
        window.adsTotalSurface = 0;
      }
      window.adsTotalSurface += adHeight * adWidth;
      window.adsCount++;

      bidRequests.push({
        method: 'POST',
        url: url + '&publisher=' + validBidRequests[i].params.publisherId,
        bidRequest: validBidRequests[i],
        data: {
          timezone: new Date().getTimezoneOffset() / 60,
          location: bidderRequest.refererInfo ? bidderRequest.refererInfo.topmostLocation : '',
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
          creatives: [creativeData],
          blockedCreatives: [],
          currentTimestamp: (new Date().getTime() / 1000) | 0,
          recentAds: recentAds,
          recentAdsPrebid: recentAdsPrebid,
          GDPRApplies: gdprConsent ? gdprConsent.gdprApplies : null,
          GDPR: gdprConsent ? gdprConsent.consentString : null,
          servedAdsCount: window.adsCount,
          adsTotalSurface: window.adsTotalSurface,
          pageHeight: pageHeight,
          pageWidth: pageWidth
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

    if (storage.localStorageIsEnabled()) {
      const prefix = request.bidRequest.params.prefix || 'adHash';
      const recentAdsPrebid = JSON.parse(storage.getDataFromLocalStorage(prefix + 'recentAdsPrebid') || '[]');
      recentAdsPrebid.push([
        (new Date().getTime() / 1000) | 0,
        responseBody.creatives[0].advertiserId,
        responseBody.creatives[0].budgetId,
        responseBody.creatives[0].expectedHashes.length ? responseBody.creatives[0].expectedHashes[0] : '',
      ]);
      const recentAdsPrebidFinal = JSON.stringify(recentAdsPrebid.slice(-100));
      storage.setDataInLocalStorage(prefix + 'recentAdsPrebid', recentAdsPrebidFinal);
    }

    const publisherURL = JSON.stringify(request.bidRequest.params.platformURL);
    const bidderURL = request.bidRequest.params.bidderURL || 'https://bidder.adhash.com';
    const oneTimeId = request.bidRequest.adUnitCode + Math.random().toFixed(16).replace('0.', '.');
    const bidderResponse = JSON.stringify({ responseText: JSON.stringify(responseBody) });
    const requestData = JSON.stringify(request.data);

    let response = {
      requestId: request.bidRequest.bidId,
      cpm: responseBody.creatives[0].costEUR,
      width: request.bidRequest.sizes[0][0],
      height: request.bidRequest.sizes[0][1],
      creativeId: request.bidRequest.adUnitCode,
      netRevenue: true,
      currency: 'EUR',
      ttl: 60,
      meta: {
        advertiserDomains: responseBody.advertiserDomains ? [responseBody.advertiserDomains] : []
      }
    };
    if (typeof request === 'object' && typeof request.bidRequest === 'object' && typeof request.bidRequest.mediaTypes === 'object' && Object.keys(request.bidRequest.mediaTypes).includes(BANNER)) {
      response = Object.assign({
        ad:
        `<div id="${oneTimeId}"></div>
        <script src="${bidderURL}/static/scripts/creative.min.js"></script>
        <script>callAdvertiser(${bidderResponse},['${oneTimeId}'],${requestData},${publisherURL})</script>`
      }, response);
    } else if (Object.keys(request.bidRequest.mediaTypes).includes(VIDEO)) {
      response = Object.assign({
        vastUrl: responseBody.creatives[0].vastURL,
        mediaType: VIDEO
      }, response);
    }
    return [response];
  }
};

registerBidder(spec);
