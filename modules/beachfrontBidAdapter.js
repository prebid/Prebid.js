import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { Renderer } from 'src/Renderer';
import { VIDEO, BANNER } from 'src/mediaTypes';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';

const ADAPTER_VERSION = '1.1';
const ADAPTER_NAME = 'BFIO_PREBID';
const OUTSTREAM = 'outstream';

export const VIDEO_ENDPOINT = '//reachms.bfmio.com/bid.json?exchange_id=';
export const BANNER_ENDPOINT = '//display.bfmio.com/prebid_display';
export const OUTSTREAM_SRC = '//player-cdn.beachfrontmedia.com/playerapi/loader/outstream.js';

export const VIDEO_TARGETING = ['mimes'];
export const DEFAULT_MIMES = ['video/mp4', 'application/javascript'];

export const spec = {
  code: 'beachfront',
  supportedMediaTypes: [ VIDEO, BANNER ],

  isBidRequestValid(bid) {
    return !!(bid && bid.params && bid.params.appId && bid.params.bidfloor);
  },

  buildRequests(bids) {
    let requests = [];
    let videoBids = bids.filter(bid => isVideoBid(bid));
    let bannerBids = bids.filter(bid => !isVideoBid(bid));
    videoBids.forEach(bid => {
      requests.push({
        method: 'POST',
        url: VIDEO_ENDPOINT + bid.params.appId,
        data: createVideoRequestData(bid),
        bidRequest: bid
      });
    });
    if (bannerBids.length) {
      requests.push({
        method: 'POST',
        url: BANNER_ENDPOINT,
        data: createBannerRequestData(bannerBids),
        bidRequest: bannerBids
      });
    }
    return requests;
  },

  interpretResponse(response, { bidRequest }) {
    response = response.body;

    if (isVideoBid(bidRequest)) {
      if (!response || !response.url || !response.bidPrice) {
        utils.logWarn(`No valid video bids from ${spec.code} bidder`);
        return [];
      }
      let size = getFirstSize(bidRequest);
      let context = utils.deepAccess(bidRequest, 'mediaTypes.video.context');
      return {
        requestId: bidRequest.bidId,
        bidderCode: spec.code,
        vastUrl: response.url,
        cpm: response.bidPrice,
        width: size.w,
        height: size.h,
        creativeId: response.cmpId,
        renderer: context === OUTSTREAM ? createRenderer(bidRequest) : null,
        mediaType: VIDEO,
        currency: 'USD',
        netRevenue: true,
        ttl: 300
      };
    } else {
      if (!response || !response.length) {
        utils.logWarn(`No valid banner bids from ${spec.code} bidder`);
        return [];
      }
      return response.map((bid) => {
        let request = find(bidRequest, req => req.adUnitCode === bid.slot);
        return {
          requestId: request.bidId,
          bidderCode: spec.code,
          ad: bid.adm,
          creativeId: bid.crid,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          mediaType: BANNER,
          currency: 'USD',
          netRevenue: true,
          ttl: 300
        };
      });
    }
  }
};

function createRenderer(bidRequest) {
  const renderer = Renderer.install({
    id: bidRequest.bidId,
    url: OUTSTREAM_SRC,
    loaded: false
  });

  renderer.setRender(outstreamRender);

  return renderer;
}

function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.Beachfront.Player(bid.adUnitCode, {
      ad_tag_url: bid.vastUrl,
      width: bid.width,
      height: bid.height,
      expand_in_view: false,
      collapse_on_complete: true
    });
  });
}

function getSizes(bid) {
  return utils.parseSizesInput(bid.sizes).map(size => {
    let [ width, height ] = size.split('x');
    return {
      w: parseInt(width, 10) || undefined,
      h: parseInt(height, 10) || undefined
    };
  });
}

function getFirstSize(bid) {
  let sizes = getSizes(bid);
  return sizes.length ? sizes[0] : { w: undefined, h: undefined };
}

function getOsVersion() {
  let clientStrings = [
    { s: 'Android', r: /Android/ },
    { s: 'iOS', r: /(iPhone|iPad|iPod)/ },
    { s: 'Mac OS X', r: /Mac OS X/ },
    { s: 'Mac OS', r: /(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/ },
    { s: 'Linux', r: /(Linux|X11)/ },
    { s: 'Windows 10', r: /(Windows 10.0|Windows NT 10.0)/ },
    { s: 'Windows 8.1', r: /(Windows 8.1|Windows NT 6.3)/ },
    { s: 'Windows 8', r: /(Windows 8|Windows NT 6.2)/ },
    { s: 'Windows 7', r: /(Windows 7|Windows NT 6.1)/ },
    { s: 'Windows Vista', r: /Windows NT 6.0/ },
    { s: 'Windows Server 2003', r: /Windows NT 5.2/ },
    { s: 'Windows XP', r: /(Windows NT 5.1|Windows XP)/ },
    { s: 'UNIX', r: /UNIX/ },
    { s: 'Search Bot', r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/ }
  ];
  let cs = find(clientStrings, cs => cs.r.test(navigator.userAgent));
  return cs ? cs.s : 'unknown';
}

function isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
}

function isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
}

function getDoNotTrack() {
  return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNoTrack === '1' || navigator.doNotTrack === 'yes';
}

function isVideoBid(bid) {
  return bid.mediaTypes && bid.mediaTypes.video;
}

function getVideoParams(bid) {
  return Object.keys(Object(bid.params.video))
    .filter(param => includes(VIDEO_TARGETING, param))
    .reduce((obj, param) => {
      obj[ param ] = bid.params.video[ param ];
      return obj;
    }, {});
}

function createVideoRequestData(bid) {
  let size = getFirstSize(bid);
  let video = getVideoParams(bid);
  let topLocation = utils.getTopWindowLocation();
  return {
    isPrebid: true,
    appId: bid.params.appId,
    domain: document.location.hostname,
    id: utils.getUniqueIdentifierStr(),
    imp: [{
      video: Object.assign({
        w: size.w,
        h: size.h,
        mimes: DEFAULT_MIMES
      }, video),
      bidfloor: bid.params.bidfloor,
      secure: topLocation.protocol === 'https:' ? 1 : 0
    }],
    site: {
      page: topLocation.href,
      domain: topLocation.hostname
    },
    device: {
      ua: navigator.userAgent,
      language: navigator.language,
      devicetype: isMobile() ? 1 : isConnectedTV() ? 3 : 2,
      dnt: getDoNotTrack() ? 1 : 0,
      js: 1,
      geo: {}
    },
    cur: ['USD']
  };
}

function createBannerRequestData(bids) {
  let topLocation = utils.getTopWindowLocation();
  let referrer = utils.getTopWindowReferrer();
  let slots = bids.map(bid => {
    return {
      slot: bid.adUnitCode,
      id: bid.params.appId,
      bidfloor: bid.params.bidfloor,
      sizes: getSizes(bid)
    };
  });
  return {
    slots: slots,
    page: topLocation.href,
    domain: topLocation.hostname,
    search: topLocation.search,
    secure: topLocation.protocol === 'https:' ? 1 : 0,
    referrer: referrer,
    ua: navigator.userAgent,
    deviceOs: getOsVersion(),
    isMobile: isMobile() ? 1 : 0,
    dnt: getDoNotTrack() ? 1 : 0,
    adapterVersion: ADAPTER_VERSION,
    adapterName: ADAPTER_NAME
  };
}

registerBidder(spec);
