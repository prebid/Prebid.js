import { isEmpty, parseUrl, isStr, triggerPixel } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'videoheroes';
const DEFAULT_CUR = 'USD';
const ENDPOINT_URL = `https://point.contextualadv.com/?t=2&partner=hash`;

const NATIVE_ASSETS_IDS = { 1: 'title', 2: 'icon', 3: 'image', 4: 'body', 5: 'sponsoredBy', 6: 'cta' };
const NATIVE_ASSETS = {
  title: { id: 1, name: 'title' },
  icon: { id: 2, type: 1, name: 'img' },
  image: { id: 3, type: 3, name: 'img' },
  body: { id: 4, type: 2, name: 'data' },
  sponsoredBy: { id: 5, type: 1, name: 'data' },
  cta: { id: 6, type: 12, name: 'data' }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    return !!(bid.params.placementId && bid.params.placementId.toString().length === 32);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    if (validBidRequests.length === 0 || !bidderRequest) return [];

    const endpointURL = ENDPOINT_URL.replace('hash', validBidRequests[0].params.placementId);

    let imp = validBidRequests.map(br => {
      let impObject = {
        id: br.bidId,
        secure: 1
      };

      if (br.mediaTypes.banner) {
        impObject.banner = createBannerRequest(br);
      } else if (br.mediaTypes.video) {
        impObject.video = createVideoRequest(br);
      } else if (br.mediaTypes.native) {
        impObject.native = {
          id: br.transactionId,
          ver: '1.2',
          request: createNativeRequest(br)
        };
      }
      return impObject;
    });

    let w = window;
    let l = w.document.location.href;
    let r = w.document.referrer;

    let loopChecker = 0;
    while (w !== w.parent) {
      if (++loopChecker == 10) break;
      try {
        w = w.parent;
        l = w.location.href;
        r = w.document.referrer;
      } catch (e) {
        break;
      }
    }

    let page = l || bidderRequest.refererInfo.referer;

    let data = {
      id: bidderRequest.bidderRequestId,
      cur: [ DEFAULT_CUR ],
      device: {
        w: screen.width,
        h: screen.height,
        language: (navigator && navigator.language) ? navigator.language.indexOf('-') != -1 ? navigator.language.split('-')[0] : navigator.language : '',
        ua: navigator.userAgent,
      },
      site: {
        domain: parseUrl(page).hostname,
        page: page,
      },
      tmax: bidderRequest.timeout || config.getConfig('bidderTimeout') || 500,
      imp
    };

    if (r) {
      data.site.ref = r;
    }

    if (bidderRequest.gdprConsent) {
      data['regs'] = {'ext': {'gdpr': bidderRequest.gdprConsent.gdprApplies ? 1 : 0}};
      data['user'] = {'ext': {'consent': bidderRequest.gdprConsent.consentString ? bidderRequest.gdprConsent.consentString : ''}};
    }

    if (bidderRequest.uspConsent !== undefined) {
      if (!data['regs'])data['regs'] = {'ext': {}};
      data['regs']['ext']['us_privacy'] = bidderRequest.uspConsent;
    }

    if (config.getConfig('coppa') === true) {
      if (!data['regs'])data['regs'] = {'coppa': 1};
      else data['regs']['coppa'] = 1;
    }

    if (validBidRequests[0].schain) {
      data['source'] = {'ext': {'schain': validBidRequests[0].schain}};
    }

    return {
      method: 'POST',
      url: endpointURL,
      data: data
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse) => {
    if (!serverResponse || isEmpty(serverResponse.body)) return [];

    let bids = [];
    serverResponse.body.seatbid.forEach(response => {
      response.bid.forEach(bid => {
        let mediaType = bid.ext && bid.ext.mediaType ? bid.ext.mediaType : 'banner';

        let bidObj = {
          requestId: bid.impid,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          ttl: 1200,
          currency: DEFAULT_CUR,
          netRevenue: true,
          creativeId: bid.crid,
          dealId: bid.dealid || null,
          mediaType: mediaType
        };

        switch (mediaType) {
          case 'video':
            bidObj.vastUrl = bid.adm;
            break;
          case 'native':
            bidObj.native = parseNative(bid.adm);
            break;
          default:
            bidObj.ad = bid.adm;
        }

        bids.push(bidObj);
      });
    });

    return bids;
  },

  onBidWon: (bid) => {
    if (isStr(bid.nurl) && bid.nurl !== '') {
      triggerPixel(bid.nurl);
    }
  }
};

const parseNative = adm => {
  let bid = {
    clickUrl: adm.native.link && adm.native.link.url,
    impressionTrackers: adm.native.imptrackers || [],
    clickTrackers: (adm.native.link && adm.native.link.clicktrackers) || [],
    jstracker: adm.native.jstracker || []
  };
  adm.native.assets.forEach(asset => {
    let kind = NATIVE_ASSETS_IDS[asset.id];
    let content = kind && asset[NATIVE_ASSETS[kind].name];
    if (content) {
      bid[kind] = content.text || content.value || { url: content.url, width: content.w, height: content.h };
    }
  });

  return bid;
}

const createNativeRequest = br => {
  let impObject = {
    ver: '1.2',
    assets: []
  };

  let keys = Object.keys(br.mediaTypes.native);

  for (let key of keys) {
    const props = NATIVE_ASSETS[key];
    if (props) {
      const asset = {
        required: br.mediaTypes.native[key].required ? 1 : 0,
        id: props.id,
        [props.name]: {}
      };

      if (props.type) asset[props.name]['type'] = props.type;
      if (br.mediaTypes.native[key].len) asset[props.name]['len'] = br.mediaTypes.native[key].len;
      if (br.mediaTypes.native[key].sizes && br.mediaTypes.native[key].sizes[0]) {
        asset[props.name]['w'] = br.mediaTypes.native[key].sizes[0];
        asset[props.name]['h'] = br.mediaTypes.native[key].sizes[1];
      }

      impObject.assets.push(asset);
    }
  }

  return impObject;
}

const createBannerRequest = br => {
  let size = [];

  if (br.mediaTypes.banner.sizes && Array.isArray(br.mediaTypes.banner.sizes)) {
    if (Array.isArray(br.mediaTypes.banner.sizes[0])) { size = br.mediaTypes.banner.sizes[0]; } else { size = br.mediaTypes.banner.sizes; }
  } else size = [300, 250];

  return { id: br.transactionId, w: size[0], h: size[1] };
};

const createVideoRequest = br => {
  let videoObj = {id: br.transactionId};
  let supportParamsList = ['mimes', 'minduration', 'maxduration', 'protocols', 'startdelay', 'skip', 'minbitrate', 'maxbitrate', 'api', 'linearity'];

  for (let param of supportParamsList) {
    if (br.mediaTypes.video[param] !== undefined) {
      videoObj[param] = br.mediaTypes.video[param];
    }
  }

  if (br.mediaTypes.video.playerSize && Array.isArray(br.mediaTypes.video.playerSize)) {
    if (Array.isArray(br.mediaTypes.video.playerSize[0])) {
      videoObj.w = br.mediaTypes.video.playerSize[0][0];
      videoObj.h = br.mediaTypes.video.playerSize[0][1];
    } else {
      videoObj.w = br.mediaTypes.video.playerSize[0];
      videoObj.h = br.mediaTypes.video.playerSize[1];
    }
  } else {
    videoObj.w = 640;
    videoObj.h = 480;
  }

  return videoObj;
}

registerBidder(spec);
