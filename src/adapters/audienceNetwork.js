/**
 * @file AudienceNetwork adapter.
 */
import { ajax } from '../ajax';
import { createBid } from '../bidfactory';
import { addBidResponse } from '../bidmanager';
import { STATUS } from '../constants.json';
import { format } from '../url';
import { logError } from '../utils';
import { createNew } from './adapter';

const { setBidderCode, getBidderCode } = createNew('audienceNetwork');

/**
 * Does this bid request contain valid parameters?
 * @param {Object} bid
 * @returns {Boolean}
 */
const validateBidRequest = bid =>
  typeof bid.params === 'object' &&
  typeof bid.params.placementId === 'string' &&
  bid.params.placementId.length > 0 &&
  Array.isArray(bid.sizes) && bid.sizes.length > 0;

/**
 * Return a copy of a bid with slot sizes flattened and filtered
 * @param {Object} bid
 * @returns {Object} copy of bid
 */
const flattenBidRequestSizes = bid => {
  const sizes = Array.isArray(bid.sizes) && bid.sizes
    .map(flattenSize)
    .filter(isValidSize);
  return Object.assign({}, bid, { sizes });
};

/**
 * Flattens a 2-element [W, H] array as a 'WxH' string,
 * otherwise passes value through.
 * @params {Array|String} size
 * @returns {String}
 */
const flattenSize = size =>
  (Array.isArray(size) && size.length === 2) ? `${size[0]}x${size[1]}` : size;

/**
 * Is this a valid slot size?
 * @param {String} size
 * @returns  {Boolean}
 */
const isValidSize = size => ['native', 'fullwidth', '300x250', '320x50'].includes(size);

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
 * Parse JSON-as-string into an Object, default to empty.
 * @param {String} JSON-as-string
 * @returns {Object}
 */
const parseJson = jsonAsString => {
  let data = {};
  try {
    data = JSON.parse(jsonAsString);
  } catch (err) {}
  return data;
};

/**
 * Is this a native advert size?
 * @param {String} size
 * @returns {Boolean}
 */
const isNative = (size) => ['native', 'fullwidth'].includes(size);

/**
 * Generate ad HTML for injection into an iframe
 * @param {String} placementId
 * @param {String} size
 * @param {String} bidId
 * @returns {String} HTML
 */
const createAdHtml = (placementId, size, bidId) => {
  const nativeStyle = isNative(size) ? '<script>window.onload=function(){if(parent){var o=document.getElementsByTagName("head")[0];var s=parent.document.getElementsByTagName("style");for(var i=0;i<s.length;i++)o.appendChild(s[i].cloneNode(true));}}</script>' : '';
  const nativeContainer = isNative(size) ? '<div class="thirdPartyRoot"><a class="fbAdLink"><div class="fbAdMedia thirdPartyMediaClass"></div><div class="fbAdSubtitle thirdPartySubtitleClass"></div><div class="fbDefaultNativeAdWrapper"><div class="fbAdCallToAction thirdPartyCallToActionClass"></div><div class="fbAdTitle thirdPartyTitleClass"></div></div></a></div>' : '';
  return `<html><head>${nativeStyle}</head><body><div style="display:none;position:relative;">
<script>var data = {placementid:'${placementId}',format:'${size}',bidid:'${bidId}',onAdLoaded:function(e){e.style.display = 'block';},onAdError:function(c,m){console.log('Audience Network error (' + c + ') ' + m);}};
(function(a,b,c){var d='https://www.facebook.com',e='https://connect.facebook.net/en_US/fbadnw55.js',f={iframeLoaded:true,xhrLoaded:true},g=5,h=a.data,i=0,j=function(ea){if(ea==null)throw new Error();return ea;},k=function(ea){if(ea instanceof HTMLElement)return ea;throw new Error();},l=function(){if(Date.now){return Date.now();}else return +new Date();},m=function(ea){if(++i>g)return;var fa=d+'/audience_network/client_event',ga={cb:l(),event_name:'ADNW_ADERROR',ad_pivot_type:'audience_network_mobile_web',sdk_version:'5.5.web',app_id:h.placementid.split('_')[0],publisher_id:h.placementid.split('_')[1],error_message:ea},ha=[];for(var ia in ga)ha.push(encodeURIComponent(ia)+'='+encodeURIComponent(ga[ia]));var ja=fa+'?'+ha.join('&'),ka=new XMLHttpRequest();ka.open('GET',ja,true);ka.send();},n=function(){if(b.currentScript){return b.currentScript;}else{var ea=b.getElementsByTagName('script');return ea[ea.length-1];}},o=function(ea){try{return ea.document.referrer;}catch(fa){}return '';},p=function(){var ea=a;try{while(ea!=ea.parent){ea.parent.origin;ea=ea.parent;}}catch(fa){}return ea;},q=function(ea){var fa=ea.indexOf('/',ea.indexOf('://')+3);if(fa===-1)return ea;return ea.substring(0,fa);},r=function(ea){return ea.location.href||o(ea);},s=function(ea,fa){if(ea.sdkLoaded)return;var ga=fa.createElement('iframe');ga.name='fbadnw';ga.style.display='none';j(fa.body).appendChild(ga);ga.contentWindow.addEventListener('error',function(event){m(event.message);},false);var ha=ga.contentDocument.createElement('script');ha.src=e;ha.async=true;j(ga.contentDocument.body).appendChild(ha);ea.sdkLoaded=true;},t=function(ea){var fa=/^https?:\\/\\/www\\.google(\\.com?)?.\\w{2,3}$/;return !!ea.match(fa);},u=function(ea){return ea.endsWith('cdn.ampproject.org');},v=function(){var ea=c.ancestorOrigins||[],fa=ea[ea.length-1]||c.origin,ga=ea[ea.length-2]||c.origin;if(t(fa)&&u(ga)){return q(ga);}else return q(fa);},w=function(ea){try{return JSON.parse(ea);}catch(fa){m(fa.message);return null;}},x=function(ea,fa,ga){if(!ea.iframe){var ha=ga.createElement('iframe');ha.src=d+'/audiencenetwork/iframe/';ha.style.display='none';j(ga.body).appendChild(ha);ea.iframe=ha;ea.iframeAppendedTime=l();ea.iframeData={};}fa.iframe=j(ea.iframe);fa.iframeData=ea.iframeData;fa.tagJsIframeAppendedTime=ea.iframeAppendedTime||0;},y=function(ea){var fa=d+'/audiencenetwork/xhr/?sdk=5.5.web';for(var ga in ea)if(typeof ea[ga]!=='function')fa+='&'+ga+'='+encodeURIComponent(ea[ga]);var ha=new XMLHttpRequest();ha.open('GET',fa,true);ha.withCredentials=true;ha.onreadystatechange=function(){if(ha.readyState===4){var ia=w(ha.response);if(ia)ea.events.push({name:'xhrLoaded',source:ea.iframe.contentWindow,data:ia,postMessageTimestamp:l(),receivedTimestamp:l()});}};ha.send();},z=function(ea,fa){var ga=d+'/audiencenetwork/xhriframe/?sdk=5.5.web';for(var ha in fa)if(typeof fa[ha]!=='function')ga+='&'+ha+'='+encodeURIComponent(fa[ha]);var ia=b.createElement('iframe');ia.src=ga;ia.style.display='none';j(b.body).appendChild(ia);fa.iframe=ia;fa.iframeData={};fa.tagJsIframeAppendedTime=l();},aa=function(ea){var fa=function(event){try{var ia=event.data;if(ia.name in f)ea.events.push({name:ia.name,source:event.source,data:ia.data});}catch(ha){}},ga=j(ea.iframe).contentWindow.parent;ga.addEventListener('message',fa,false);},ba=function(ea){if(ea.context)return true;try{return !!JSON.parse(decodeURI(ea.name)).ampcontextVersion;}catch(fa){return false;}},ca=function(ea){var fa=l(),ga=p(),ha=k(n().parentElement),ia=ga!=a.top,ja=ga.$sf&&ga.$sf.ext,ka=r(ga);ga.ADNW=ga.ADNW||{};ga.ADNW.v55=ga.ADNW.v55||{ads:[]};var la=ga.ADNW.v55;s(la,ga.document);var ma={amp:ba(ga),events:[],tagJsInitTime:fa,rootElement:ha,iframe:null,tagJsIframeAppendedTime:la.iframeAppendedTime||0,url:ka,domain:v(),channel:q(r(ga)),width:screen.width,height:screen.height,pixelratio:a.devicePixelRatio,placementindex:la.ads.length,crossdomain:ia,safeframe:!!ja,placementid:h.placementid,format:h.format||'300x250',testmode:!!h.testmode,onAdLoaded:h.onAdLoaded,onAdError:h.onAdError};if(h.bidid)ma.bidid=h.bidid;if(ia){z(la,ma);}else{x(la,ma,ga.document);y(ma);}aa(ma);ma.rootElement.dataset.placementid=ma.placementid;la.ads.push(ma);};try{ca();}catch(da){m(da.message||da);throw da;}})(window,document,location);
</script>
${nativeContainer}</div></body></html>`;
};

/**
 * Creates a "good" Bid object with the given bid ID and CPM.
 * @param {String} placementId
 * @param {String} bidId
 * @param {String} size
 * @param {Number} cpmCents
 * @returns {Object} Bid
 */
const createSuccessBidResponse = (placementId, size, bidId, cpmCents) => {
  const bid = createBid(STATUS.GOOD, { bidId });
  // Prebid attributes
  bid.bidderCode = getBidderCode();
  bid.cpm = cpmCents / 100;
  bid.ad = createAdHtml(placementId, size, bidId);
  if (!isNative(size)) {
    [bid.width, bid.height] = size.split('x').map(Number);
  }
  // Audience Network attributes
  bid.hb_bidder = 'fan';
  bid.fb_bidid = bidId;
  bid.fb_format = size;
  bid.fb_placementid = placementId;
  return bid;
};

/**
 * Creates a "no bid" Bid object.
 * @returns {Object} Bid
 */
const createFailureBidResponse = () => {
  const bid = createBid(STATUS.NO_BID);
  bid.bidderCode = getBidderCode();
  return bid;
};

/**
 * Fetch bids for given parameters.
 * @param {Object} bidRequest
 * @param {Array} params.bids - list of bids
 * @param {String} params.bids[].placementCode - Prebid placement identifier
 * @param {Object} params.bids[].params
 * @param {String} params.bids[].params.placementId - Audience Network placement identifier
 * @param {Array} params.bids[].sizes - list of accepted advert sizes
 * @param {Array|String} params.bids[].sizes[] - one of 'native', '300x250', '300x50', [300, 250], [300, 50]
 * @returns {void}
 */
const callBids = bidRequest => {
  // Build lists of adUnitCodes, placementids and adformats
  const adUnitCodes = [];
  const placementids = [];
  const adformats = [];
  bidRequest.bids
    .map(flattenBidRequestSizes)
    .filter(validateBidRequest)
    .forEach( bid => bid.sizes.forEach( size => {
      adUnitCodes.push(bid.placementCode);
      placementids.push(bid.params.placementId);
      adformats.push(size);
    }));

  if (placementids.length) {
    // Build URL
    const testmode = isTestmode();
    const url = format({
      protocol: 'https',
      host: 'an.facebook.com',
      pathname: '/v2/placementbid.json',
      search: {
        sdk: '5.5.web',
        testmode,
        placementids,
        adformats
      }
    });
    // Request
    ajax(url, res => {
      // Handle response
      const data = parseJson(res);
      if (data.errors && data.errors.length) {
        const noBid = createFailureBidResponse();
        adUnitCodes.forEach( adUnitCode => addBidResponse(adUnitCode, noBid) );
        data.errors.forEach(logError);
      } else {
        // For each placementId in bids Object
        Object.keys(data.bids)
          // extract Array of bid responses
          .map( placementId => data.bids[placementId] )
          // flatten
          .reduce( (a, b) => a.concat(b), [] )
          // call addBidResponse
          .forEach( (bid, i) =>
            addBidResponse(adUnitCodes[i], createSuccessBidResponse(
              bid.placement_id, adformats[i], bid.bid_id, bid.bid_price_cents
            ))
          );
      }
    }, null, { withCredentials: true });
  } else {
    // No valid bids
    logError('No valid bids requested');
  }
};

/**
 * @class AudienceNetwork
 * @type {Object}
 * @property {Function} callBids - fetch bids for given parameters
 * @property {Function} setBidderCode - used for bidder aliasing
 * @property {Function} getBidderCode - unique 'audienceNetwork' identifier
 */
const AudienceNetwork = () => ({ callBids, setBidderCode, getBidderCode });

module.exports = AudienceNetwork;
