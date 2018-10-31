/**
 * @file AudienceNetwork adapter.
 */
import { registerBidder } from 'src/adapters/bidderFactory';
import { formatQS } from 'src/url';
import { generateUUID, getTopWindowUrl, convertTypes } from 'src/utils';
import findIndex from 'core-js/library/fn/array/find-index';
import includes from 'core-js/library/fn/array/includes';

const code = 'audienceNetwork';
const currency = 'USD';
const method = 'GET';
const url = 'https://an.facebook.com/v2/placementbid.json';
const supportedMediaTypes = ['banner', 'video'];
const netRevenue = true;
const hbBidder = 'fan';
const ttl = 600;
const videoTtl = 3600;
const platver = '$prebid.version$';
const platform = '241394079772386';
const adapterver = '1.1.0';

/**
 * Does this bid request contain valid parameters?
 * @param {Object} bid
 * @returns {Boolean}
 */
const isBidRequestValid = bid =>
  typeof bid.params === 'object' &&
  typeof bid.params.placementId === 'string' &&
  bid.params.placementId.length > 0 &&
  Array.isArray(bid.sizes) && bid.sizes.length > 0 &&
  (isFullWidth(bid.params.format) ? bid.sizes.map(flattenSize).some(size => size === '300x250') : true) &&
  (isValidNonSizedFormat(bid.params.format) || bid.sizes.map(flattenSize).some(isValidSize));

/**
 * Flattens a 2-element [W, H] array as a 'WxH' string,
 * otherwise passes value through.
 * @param {Array|String} size
 * @returns {String}
 */
const flattenSize = size =>
  (Array.isArray(size) && size.length === 2) ? `${size[0]}x${size[1]}` : size;

/**
 * Expands a 'WxH' string as a 2-element [W, H] array
 * @param {String} size
 * @returns {Array}
 */
const expandSize = size => size.split('x').map(Number);

/**
 * Is this a valid slot size?
 * @param {String} size
 * @returns {Boolean}
 */
const isValidSize = size => includes(['300x250', '320x50'], size);

/**
 * Is this a valid, non-sized format?
 * @param {String} size
 * @returns {Boolean}
 */
const isValidNonSizedFormat = format => includes(['video', 'native'], format);

/**
 * Is this a valid size and format?
 * @param {String} size
 * @returns {Boolean}
 */
const isValidSizeAndFormat = (size, format) =>
  (isFullWidth(format) && flattenSize(size) === '300x250') ||
  isValidNonSizedFormat(format) ||
  isValidSize(flattenSize(size));

/**
 * Find a preferred entry, if any, from an array of valid sizes.
 * @param {Array<String>} acc
 * @param {String} cur
 */
const sortByPreferredSize = (acc, cur) =>
  (cur === '300x250') ? [cur, ...acc] : [...acc, cur];

/**
 * Map any deprecated size/formats to new values.
 * @param {String} size
 * @param {String} format
 */
const mapDeprecatedSizeAndFormat = (size, format) =>
  isFullWidth(format) ? ['300x250', null] : [size, format];

/**
 * Is this a video format?
 * @param {String} format
 * @returns {Boolean}
 */
const isVideo = format => format === 'video';

/**
 * Is this a fullwidth format?
 * @param {String} format
 * @returns {Boolean}
 */
const isFullWidth = format => format === 'fullwidth';

/**
 * Which SDK version should be used for this format?
 * @param {String} format
 * @returns {String}
 */
const sdkVersion = format => isVideo(format) ? '' : '5.5.web';

/**
 * Which platform identifier should be used?
 * @param {Array<String>} platforms Possible platform identifiers
 * @returns {String} First valid platform found, or default if none found
 */
const findPlatform = platforms => [...platforms.filter(Boolean), platform][0];

/**
 * Does the search part of the URL contain "anhb_testmode"
 * and therefore indicate testmode should be used?
 * @returns {String} "true" or "false"
 */
const isTestmode = () => Boolean(
  window && window.location &&
  typeof window.location.search === 'string' &&
  window.location.search.indexOf('anhb_testmode') !== -1
).toString();

/**
 * Generate ad HTML for injection into an iframe
 * @param {String} placementId
 * @param {String} format
 * @param {String} bidId
 * @returns {String} HTML
 */
const createAdHtml = (placementId, format, bidId) => {
  const nativeStyle = format === 'native' ? '<script>window.onload=function(){if(parent){var o=document.getElementsByTagName("head")[0];var s=parent.document.getElementsByTagName("style");for(var i=0;i<s.length;i++)o.appendChild(s[i].cloneNode(true));}}</script>' : '';
  const nativeContainer = format === 'native' ? '<div class="thirdPartyRoot"><a class="fbAdLink"><div class="fbAdMedia thirdPartyMediaClass"></div><div class="fbAdSubtitle thirdPartySubtitleClass"></div><div class="fbDefaultNativeAdWrapper"><div class="fbAdCallToAction thirdPartyCallToActionClass"></div><div class="fbAdTitle thirdPartyTitleClass"></div></div></a></div>' : '';
  return `<html><head>${nativeStyle}</head><body><div style="display:none;position:relative;">
<script type='text/javascript'>var data = {placementid:'${placementId}',format:'${format}',bidid:'${bidId}',onAdLoaded:function(e){console.log('Audience Network [${placementId}] ad loaded');e.style.display = 'block';},onAdError:function(c,m){console.log('Audience Network [${placementId}] error (' + c + ') ' + m);}};
(function(a,b,c){var d='https://www.facebook.com',e='https://connect.facebook.net/en_US/fbadnw55.js',f={iframeLoaded:true,xhrLoaded:true},g=a.data,h=function(){if(Date.now){return Date.now();}else return +new Date();},i=function(aa){var ba=d+'/audience_network/client_event',ca={cb:h(),event_name:'ADNW_ADERROR',ad_pivot_type:'audience_network_mobile_web',sdk_version:'5.5.web',app_id:g.placementid.split('_')[0],publisher_id:g.placementid.split('_')[1],error_message:aa},da=[];for(var ea in ca)da.push(encodeURIComponent(ea)+'='+encodeURIComponent(ca[ea]));var fa=ba+'?'+da.join('&'),ga=new XMLHttpRequest();ga.open('GET',fa,true);ga.send();if(g.onAdError)g.onAdError('1000','Internal error.');},j=function(){if(b.currentScript){return b.currentScript;}else{var aa=b.getElementsByTagName('script');return aa[aa.length-1];}},k=function(aa){try{return aa.document.referrer;}catch(ba){}return '';},l=function(){var aa=a,ba=[aa];try{while(aa!==aa.parent&&aa.parent.document)ba.push(aa=aa.parent);}catch(ca){}return ba.reverse();},m=function(){var aa=l();for(var ba=0;ba<aa.length;ba++){var ca=aa[ba],da=ca.ADNW||{};ca.ADNW=da;if(!ca.ADNW)continue;return da.v55=da.v55||{ads:[],window:ca};}throw new Error('no_writable_global');},n=function(aa){var ba=aa.indexOf('/',aa.indexOf('://')+3);if(ba===-1)return aa;return aa.substring(0,ba);},o=function(aa){return aa.location.href||k(aa);},p=function(aa){if(aa.sdkLoaded)return;var ba=aa.window.document,ca=ba.createElement('iframe');ca.name='fbadnw';ca.style.display='none';ba.body.appendChild(ca);var da=ca.contentDocument.createElement('script');da.src=e;da.async=true;ca.contentDocument.body.appendChild(da);aa.sdkLoaded=true;},q=function(aa){var ba=/^https?:\\/\\/www\\.google(\\.com?)?\\.\\w{2,3}$/;return !!aa.match(ba);},r=function(aa){return !!aa.match(/cdn\\.ampproject\\.org$/);},s=function(){var aa=c.ancestorOrigins||[],ba=aa[aa.length-1]||c.origin,ca=aa[aa.length-2]||c.origin;if(q(ba)&&r(ca)){return n(ca);}else return n(ba);},t=function(aa){try{return JSON.parse(aa);}catch(ba){i(ba.message);throw ba;}},u=function(aa,ba,ca){if(!aa.iframe){var da=ca.createElement('iframe');da.src=d+'/audiencenetwork/iframe/';da.style.display='none';ca.body.appendChild(da);aa.iframe=da;aa.iframeAppendedTime=h();aa.iframeData={};}ba.iframe=aa.iframe;ba.iframeData=aa.iframeData;ba.tagJsIframeAppendedTime=aa.iframeAppendedTime||0;},v=function(aa){var ba=d+'/audiencenetwork/xhr/?sdk=5.5.web';for(var ca in aa)if(typeof aa[ca]!=='function')ba+='&'+ca+'='+encodeURIComponent(aa[ca]);var da=new XMLHttpRequest();da.open('GET',ba,true);da.withCredentials=true;da.onreadystatechange=function(){if(da.readyState===4){var ea=t(da.response);aa.events.push({name:'xhrLoaded',source:aa.iframe.contentWindow,data:ea,postMessageTimestamp:h(),receivedTimestamp:h()});}};da.send();},w=function(aa,ba){var ca=d+'/audiencenetwork/xhriframe/?sdk=5.5.web';for(var da in ba)if(typeof ba[da]!=='function')ca+='&'+da+'='+encodeURIComponent(ba[da]);var ea=b.createElement('iframe');ea.src=ca;ea.style.display='none';b.body.appendChild(ea);ba.iframe=ea;ba.iframeData={};ba.tagJsIframeAppendedTime=h();},x=function(aa){var ba=function(event){try{var da=event.data;if(da.name in f)aa.events.push({name:da.name,source:event.source,data:da.data});}catch(ea){}},ca=aa.iframe.contentWindow.parent;ca.addEventListener('message',ba,false);},y=function(aa){if(aa.context&&aa.context.sourceUrl)return true;try{return !!JSON.parse(decodeURI(aa.name)).ampcontextVersion;}catch(ba){return false;}},z=function(aa){var ba=h(),ca=l()[0],da=j().parentElement,ea=ca!=a.top,fa=ca.$sf&&ca.$sf.ext,ga=o(ca),ha=m();p(ha);var ia={amp:y(ca),events:[],tagJsInitTime:ba,rootElement:da,iframe:null,tagJsIframeAppendedTime:ha.iframeAppendedTime||0,url:ga,domain:s(),channel:n(o(ca)),width:screen.width,height:screen.height,pixelratio:a.devicePixelRatio,placementindex:ha.ads.length,crossdomain:ea,safeframe:!!fa,placementid:g.placementid,format:g.format||'300x250',testmode:!!g.testmode,onAdLoaded:g.onAdLoaded,onAdError:g.onAdError};if(g.bidid)ia.bidid=g.bidid;if(ea){w(ha,ia);}else{u(ha,ia,ca.document);v(ia);}; x(ia);ia.rootElement.dataset.placementid=ia.placementid;ha.ads.push(ia);};try{z();}catch(aa){i(aa.message||aa);throw aa;}})(window,document,location);
</script>
${nativeContainer}</div></body></html>`;
};

/**
 * Get the current window location URL correctly encoded for use in a URL query string.
 * @returns {String} URI-encoded URL
 */
const getTopWindowUrlEncoded = () => encodeURIComponent(getTopWindowUrl());

/**
 * Convert each bid request to a single URL to fetch those bids.
 * @param {Array} bids - list of bids
 * @param {String} bids[].placementCode - Prebid placement identifier
 * @param {Object} bids[].params
 * @param {String} bids[].params.placementId - Audience Network placement identifier
 * @param {String} bids[].params.platform - Audience Network platform identifier (optional)
 * @param {String} bids[].params.format - Optional format, one of 'video' or 'native' if set
 * @param {Array} bids[].sizes - list of desired advert sizes
 * @param {Array} bids[].sizes[] - Size arrays [h,w]: should include one of [300, 250], [320, 50]
 * @returns {Array<Object>} List of URLs to fetch, plus formats and sizes for later use with interpretResponse
 */
const buildRequests = bids => {
  // Build lists of placementids, adformats, sizes and SDK versions
  const placementids = [];
  const adformats = [];
  const sizes = [];
  const sdk = [];
  const platforms = [];
  const requestIds = [];

  bids.forEach(bid => bid.sizes
    .map(flattenSize)
    .filter(size => isValidSizeAndFormat(size, bid.params.format))
    .reduce(sortByPreferredSize, [])
    .slice(0, 1)
    .forEach(preferredSize => {
      const [size, format] = mapDeprecatedSizeAndFormat(preferredSize, bid.params.format);
      placementids.push(bid.params.placementId);
      adformats.push(format || size);
      sizes.push(size);
      sdk.push(sdkVersion(format));
      platforms.push(bid.params.platform);
      requestIds.push(bid.bidId);
    })
  );

  // Build URL
  const testmode = isTestmode();
  const pageurl = getTopWindowUrlEncoded();
  const platform = findPlatform(platforms);
  const cb = generateUUID();
  const search = {
    placementids,
    adformats,
    testmode,
    pageurl,
    sdk,
    adapterver,
    platform,
    platver,
    cb
  };
  const video = findIndex(adformats, isVideo);
  if (video !== -1) {
    [search.playerwidth, search.playerheight] = expandSize(sizes[video]);
  }
  const data = formatQS(search);

  return [{ adformats, data, method, requestIds, sizes, url }];
};

/**
 * Convert a server response to a bid response.
 * @param {Object} response - object representing the response
 * @param {Object} response.body - response body, already converted from JSON
 * @param {Object} bidRequests - the original bid requests
 * @param {Array} bidRequest.adformats - list of formats for the original bid requests
 * @param {Array} bidRequest.sizes - list of sizes fot the original bid requests
 * @returns {Array<Object>} A list of bid response objects
 */
const interpretResponse = ({ body }, { adformats, requestIds, sizes }) => {
  const { bids = {} } = body;
  return Object.keys(bids)
    // extract Array of bid responses
    .map(placementId => bids[placementId])
    // flatten
    .reduce((a, b) => a.concat(b), [])
    // transform to bidResponse
    .map((bid, i) => {
      const {
        bid_id: fbBidid,
        placement_id: creativeId,
        bid_price_cents: cpm
      } = bid;

      const format = adformats[i];
      const [width, height] = expandSize(flattenSize(sizes[i]));
      const ad = createAdHtml(creativeId, format, fbBidid);
      const requestId = requestIds[i];

      const bidResponse = {
        // Prebid attributes
        requestId,
        cpm: cpm / 100,
        width,
        height,
        ad,
        ttl,
        creativeId,
        netRevenue,
        currency,
        // Audience Network attributes
        hb_bidder: hbBidder,
        fb_bidid: fbBidid,
        fb_format: format,
        fb_placementid: creativeId
      };
      // Video attributes
      if (isVideo(format)) {
        const pageurl = getTopWindowUrlEncoded();
        bidResponse.mediaType = 'video';
        bidResponse.vastUrl = `https://an.facebook.com/v1/instream/vast.xml?placementid=${creativeId}&pageurl=${pageurl}&playerwidth=${width}&playerheight=${height}&bidid=${fbBidid}`;
        bidResponse.ttl = videoTtl;
      }
      return bidResponse;
    });
};

/**
 * Covert bid param types for S2S
 * @param {Object} params bid params
 * @param {Boolean} isOpenRtb boolean to check openrtb2 protocol
 * @return {Object} params bid params
 */
const transformBidParams = (params, isOpenRtb) => {
  return convertTypes({
    'placementId': 'string'
  }, params);
}

export const spec = {
  code,
  supportedMediaTypes,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  transformBidParams
};

registerBidder(spec);
