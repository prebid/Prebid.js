import * as utils from '../src/utils';
import { config } from '../src/config';
import { registerBidder } from '../src/adapters/bidderFactory';
import { Renderer } from '../src/Renderer';
import { VIDEO } from '../src/mediaTypes';

const BIDDER_CODE = 'byplay';
const ENDPOINT_URL = 'https://tasp0g98f2.execute-api.ap-northeast-1.amazonaws.com/v1/bidder';
const VIDEO_PLAYER_URL = 'https://cdn.byplay.net/prebid-byplay-v2.js';
const A1_CODE = '!function(e,r,t,a){if(!e.a1tracker){var n=e.a1tracker={};n.VERSION="v0.6.1",n.queue=n.queue||[];for(var s=0;s<t.length;s++){var u=t[s];n[u]=n[u]||function(e){return function(){for(var r=arguments.length,t=Array(r),a=0;a<r;a++)t[a]=arguments[a];n.queue.push({name:e,arguments:t.slice()})}}(u)}var c=r.createElement("script"),i=r.getElementsByTagName("script")[0];c.async=!0,c.src="//img.ak.impact-ad.jp/ut/a1/tracking.min.js",i.parentNode.insertBefore(c,i)}}(window,document,["ready","send","sendEvent","setParams","initParams","sendCustomerId","getSegments","getUserId"]);'
const A1_OID = 'b13242ebb93a372e';
const A1_COOKIE_NAME = 'a1_segment_ids';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO],
  isBidRequestValid: (bid) => {
    return !!bid.params.sectionId;
  },
  buildRequests: function(validBidRequests) {
    const segments = getSegments();

    return validBidRequests.map(req => {
      const payload = {
        requestId: req.bidId,
        sectionId: req.params.sectionId,
        ...segments,
        ...(req.params.env ? { env: req.params.env } : {})
      };

      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: JSON.stringify(payload),
        options: {
          withCredentials: false
        }
      };
    });
  },
  interpretResponse: (serverResponse, bidderRequest) => {
    const response = serverResponse.body;
    const data = JSON.parse(bidderRequest.data);
    const bidResponse = {
      requestId: data.requestId,
      cpm: response.cpm,
      width: response.width,
      height: response.height,
      creativeId: response.creativeId || '0',
      ttl: config.getConfig('_bidderTimeout'),
      currency: 'JPY',
      netRevenue: response.netRevenue,
      mediaType: VIDEO,
      vastXml: response.vastXml,
      renderer: createRenderer()
    };

    setSegments();

    return [bidResponse];
  }
};

function createRenderer() {
  const renderer = Renderer.install({ url: VIDEO_PLAYER_URL });

  renderer.setRender(bid => {
    bid.renderer.push(() => {
      adtagRender(bid.vastXml);
    });
  });

  return renderer;
}

function getSegments() {
  const ids = utils.getCookie(A1_COOKIE_NAME);

  return ids ? { 'seg': ids } : {};
}

function setSegments() {
  pageTracking(segments => {
    utils.setCookie(A1_COOKIE_NAME, segments.map(x => `${x}`).join('_'));
  });
}

function pageTracking(f) {
  const script = document.createElement('script');

  script.type = 'text/javascript';
  script.textContent = A1_CODE;

  document.head.appendChild(script);

  a1tracker.send(A1_OID, (error, data) => {
    if (error) {
      throw error;
    }

    f(data.segments);
  });
}

registerBidder(spec);
