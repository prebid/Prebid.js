// jshint esversion: 6, es3: false, node: true
'use strict';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { triggerPixel, isFn, deepAccess, getAdUnitSizes, parseGPTSingleSizeArrayToRtbSize, _map } from '../src/utils.js';
import {parseDomain} from '../src/refererDetection.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'revcontent';
const NATIVE_PARAMS = {
  title: {
    id: 0,
    name: 'title'
  },
  image: {
    id: 3,
    type: 3,
    name: 'img'
  },
  sponsoredBy: {
    id: 5,
    name: 'data',
    type: 1
  }
};
const STYLE_EXTRA = '<style type="text/css">.undefined-photo { background-size: cover !important;}</style>';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],
  isBidRequestValid: function (bid) {
    return (typeof bid.params.apiKey !== 'undefined' && typeof bid.params.userId !== 'undefined');
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const userId = validBidRequests[0].params.userId;
    const widgetId = validBidRequests[0].params.widgetId;
    const apiKey = validBidRequests[0].params.apiKey;
    var domain = validBidRequests[0].params.domain;
    var host = validBidRequests[0].params.endpoint;

    if (typeof host === 'undefined') {
      host = 'trends.revcontent.com';
    }

    let serverRequests = [];
    var refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo.page;
    }

    if (typeof domain === 'undefined') {
      domain = parseDomain(refererInfo, {noPort: true});
    }

    var endpoint = 'https://' + host + '/rtb?apiKey=' + apiKey + '&userId=' + userId;

    if (!isNaN(widgetId) && widgetId > 0) {
      endpoint = endpoint + '&widgetId=' + widgetId;
    }

    const imp = validBidRequests.map((bid, id) => buildImp(bid, id));

    let data = {
      id: bidderRequest.auctionId,
      imp: imp,
      site: {
        id: widgetId,
        domain: domain,
        page: refererInfo,
        publisher: {
          id: userId,
          domain: domain
        }
      },
      device: {
        ua: navigator.userAgent,
        language: 'en'
      },
      user: {
        id: 1
      },
      at: 2
    };
    serverRequests.push({
      method: 'POST',
      options: {
        contentType: 'application/json'
      },
      url: endpoint,
      data: JSON.stringify(data),
      bid: validBidRequests
    });

    return serverRequests;
  },
  interpretResponse: function (serverResponse, serverRequest) {
    let response = serverResponse.body;
    if ((!response) || (!response.seatbid)) {
      return [];
    }

    let rtbRequest = JSON.parse(serverRequest.data);
    let rtbBids = response.seatbid
      .map(seatbid => seatbid.bid)
      .reduce((a, b) => a.concat(b), []);

    return rtbBids.map(rtbBid => {
      const bidIndex = +rtbBid.impid - 1;
      let imp = rtbRequest.imp.filter(imp => imp.id.toString() === rtbBid.impid)[0];

      let prBid = {
        requestId: serverRequest.bid[bidIndex].bidId,
        cpm: rtbBid.price,
        creativeId: rtbBid.crid,
        nurl: rtbBid.nurl,
        currency: response.cur || 'USD',
        ttl: 360,
        netRevenue: true,
        bidder: 'revcontent',
        bidderCode: 'revcontent'
      };
      if ('banner' in imp) {
        prBid.mediaType = BANNER;
        prBid.width = rtbBid.w;
        prBid.height = rtbBid.h;
        prBid.ad = STYLE_EXTRA + rtbBid.adm;
      } else if ('native' in imp) {
        let adm = JSON.parse(rtbBid.adm);
        let ad = {
          clickUrl: adm.link.url
        };

        adm.assets.forEach(asset => {
          switch (asset.id) {
            case 3:
              ad['image'] = {
                url: asset.img.url,
                height: 1,
                width: 1
              };
              break;
            case 0:
              ad['title'] = asset.title.text;
              break;
            case 5:
              ad['sponsoredBy'] = asset.data.value || 'Revcontent';
              break;
          }
        });
        var size = serverRequest.bid[0].params.size;
        prBid.width = size.width;
        prBid.height = size.height;

        prBid.mediaType = NATIVE;
        prBid.native = ad;
        prBid.ad = displayNative(ad, getTemplate(serverRequest.bid[0].params.size, serverRequest.bid[0].params.template));
      }

      return prBid;
    });
  },
  onBidWon: function (bid) {
    if (bid.nurl) {
      triggerPixel(bid.nurl);
    }
    return true;
  }
};

registerBidder(spec);

function displayNative(ad, template) {
  template = template.replace(/{image}/g, ad['image']['url']);
  template = template.replace(/{title}/g, ad['title']);
  template = template.replace(/{clickUrl}/g, ad['clickUrl']);
  template = template.replace(/{sponsoredBy}/g, ad['sponsoredBy']);
  return template;
}

function getTemplate(size, customTemplate) {
  if (typeof (customTemplate) !== 'undefined' && customTemplate !== '') {
    return customTemplate;
  }

  if (size.width == 300 && size.height == 250) {
    return '<a href="{clickUrl}" rel="nofollow sponsored"  target="_blank" style="border: 1px solid #eee;    width: 298px;    height: 248px;    display: block;"><div style="background-image:url({image});width: 300px;height: 165px;background-repeat: none;background-size: cover;border-bottom:5px solid;border-color:#3f92f7"><div style="position: absolute;top: 160px;left:12px"><h1 style="max-height:45px;overflow:hidden;color: #000;font-family: Georgia;font-weight:normal;font-size: 19px; position: relative; width: 290px;margin-bottom:3px">{title}</h1> <div style="border:1px solid #3f92f7;background-color:#3f92f7;color:#fff;text-align:center;width:94%;height:17px;line-height: 20px;font-size:15px;padding:2px">SEE MORE</div></div></div></a>';
  }

  if (size.width == 728 && size.height == 90) {
    return '<a href="{clickUrl}" rel="nofollow sponsored"  target="_blank" style="    border: 1px solid #eee;    width: 726px;    height: 86px;    display: block;"><div style="border-right:5px solid #3f92f7;background-image:url({image});width: 130px;height: 88px;background-repeat: no-repeat;background-size: cover;"><div style="position: absolute;left:125px;"><h1 style="color: #000;width:80%;font-family: Georgia;font-weight:normal;font-size: 24px; position: relative; width: 100%%;margin-bottom:-5px;margin-left:20px;">{title}</h1> <div style="text-align:center;line-height: 39px;margin-top:-45px;height:40px;border-radius:50%;display:inline-block;border:1px solid #3f92f7;background-color:#3f92f7;width:7%;float:right;color:#fff;margin-right:20px;">&#x3e;</div></div></div></a>';
  }

  if (size.width == 300 && size.height == 600) {
    return '<a href="{clickUrl}" rel="nofollow sponsored"  target="_blank" style="    border: 1px solid #eee;    width: 296px;    height: 597px;    display: block;"><div style="border-bottom:5px solid #3f92f7;background-image:url({image});width: 298px;height: 230px;background-repeat: no-repeat;background-size: cover;"><div style="position: absolute;top:220px;"><h1 style="color: #000;font-family: Georgia;font-weight:normal;font-size: 45px; position: relative; width: 97%;margin-left:3px;height:270px;max-height:270px;overflow:hidden;">{title}</h1> <div style="text-align:center;line-height: 39px;height:40px;border-radius:50%;display:inline-block;border:1px solid #3f92f7;background-color:#3f92f7;width:15%;font-size:25px;color:#fff;margin-left:38%;margin-top:-15px">&#x3e;</div></div></div></a>';
  }

  return '';
}

function buildImp(bid, id) {
  let bidfloor;
  if (isFn(bid.getFloor)) {
    bidfloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*'
    }).floor;
  } else {
    bidfloor = deepAccess(bid, `params.bidfloor`) || 0.1;
  }

  let imp = {
    id: id + 1,
    tagid: bid.adUnitCode,
    bidderRequestId: bid.bidderRequestId,
    auctionId: bid.auctionId,
    transactionId: bid.transactionId,
    instl: 0,
    bidfloor: bidfloor,
    secure: '1'
  };

  let bannerReq = deepAccess(bid, `mediaTypes.banner`);
  let nativeReq = deepAccess(bid, `mediaTypes.native`);
  if (bannerReq) {
    let sizes = getAdUnitSizes(bid);
    imp.banner = {
      w: sizes[0][0],
      h: sizes[0][1],
      format: sizes.map(wh => parseGPTSingleSizeArrayToRtbSize(wh)),
    };
  } else if (nativeReq) {
    const assets = _map(bid.nativeParams, (bidParams, key) => {
      const props = NATIVE_PARAMS[key];
      const asset = {
        required: bidParams.required & 1
      };
      if (props) {
        asset.id = props.id;
        let wmin, hmin, w, h;
        let aRatios = bidParams.aspect_ratios;

        if (aRatios && aRatios[0]) {
          aRatios = aRatios[0];
          wmin = aRatios.min_width || 0;
          hmin = aRatios.ratio_height * wmin / aRatios.ratio_width | 0;
        }

        asset[props.name] = {
          len: bidParams.len,
          type: props.type,
          wmin,
          hmin,
          w,
          h
        };

        return asset;
      }
    }).filter(Boolean);
    imp.native = {
      request: {
        ver: '1.1',
        context: 2,
        contextsubtype: 21,
        plcmttype: 1,
        plcmtcnt: 1,
        assets: assets
      },
      ver: '1.1',
      battr: [1, 3, 8, 11, 17]
    };
  }
  return imp;
}
