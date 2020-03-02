// jshint esversion: 6, es3: false, node: true
'use strict';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import {ajax} from '../src/ajax.js';

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

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['native'],
  isBidRequestValid: function (bid) {
    return (typeof bid.params.apiKey !== 'undefined' && typeof bid.params.userId !== 'undefined' && bid.hasOwnProperty('nativeParams'));
  },
  buildRequests: (validBidRequests, bidderRequest) => {
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
      refererInfo = bidderRequest.refererInfo.referer;
    }

    if (typeof domain === 'undefined') {
      domain = extractHostname(refererInfo);
    }

    var endpoint = 'https://' + host + '/rtb?apiKey=' + apiKey + '&userId=' + userId;

    if (!isNaN(widgetId) && widgetId > 0) {
      endpoint = endpoint + '&widgetId=' + widgetId;
    }

    let bidfloor = 0.1;
    if (!isNaN(validBidRequests[0].params.bidfloor) && validBidRequests[0].params.bidfloor > 0) {
      bidfloor = validBidRequests[0].params.bidfloor;
    }

    const imp = validBidRequests.map((bid, id) => {
      if (bid.hasOwnProperty('nativeParams')) {
        const assets = utils._map(bid.nativeParams, (bidParams, key) => {
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

        return {
          id: id + 1,
          tagid: bid.params.mid,
          bidderRequestId: bid.bidderRequestId,
          auctionId: bid.auctionId,
          transactionId: bid.transactionId,
          native: {
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
          },
          instl: 0,
          bidfloor: bidfloor,
          secure: '1'
        };
      }
    });

    let data = {
      id: bidderRequest.auctionId,
      imp: imp,
      site: {
        id: widgetId,
        domain: domain,
        page: refererInfo,
        cat: ['IAB17'],
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
      at: 2,
      bcat: [
        'IAB24',
        'IAB25',
        'IAB25-1',
        'IAB25-2',
        'IAB25-3',
        'IAB25-4',
        'IAB25-5',
        'IAB25-6',
        'IAB25-7',
        'IAB26',
        'IAB26-1',
        'IAB26-2',
        'IAB26-3',
        'IAB26-4'
      ]
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
  interpretResponse: function (serverResponse, originalBidRequest) {
    if (!serverResponse.body) {
      return;
    }
    const seatbid = serverResponse.body.seatbid[0];
    const bidResponses = [];

    for (var x in seatbid.bid) {
      let adm = JSON.parse(seatbid.bid[x]['adm']);
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
            ad['sponsoredBy'] = asset.data.value;
            break;
        }
      });

      var size = originalBidRequest.bid[0].params.size;

      const bidResponse = {
        bidder: BIDDER_CODE,
        requestId: originalBidRequest.bid[0].bidId,
        cpm: seatbid.bid[x]['price'],
        creativeId: seatbid.bid[x]['adid'],
        currency: 'USD',
        netRevenue: true,
        ttl: 360,
        nurl: seatbid.bid[x]['nurl'],
        bidderCode: 'revcontent',
        mediaType: 'native',
        native: ad,
        width: size.width,
        height: size.height,
        ad: displayNative(ad, getTemplate(size, originalBidRequest.bid[0].params.template))
      };

      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },
  onBidWon: function (bid) {
    var winUrl = bid.nurl;
    winUrl = winUrl.replace(/\$\{AUCTION_PRICE\}/, bid.cpm);
    var host = extractHostname(winUrl);

    ajax(winUrl + '&viewed=1', null, {withCredentials: true});
    ajax('https://' + host + '/imp.php', null, 'v=' + encodeURIComponent(encodeURIComponent(getQueryVariable('d', winUrl))) + '&i=' + encodeURIComponent(window.location.href), {method: 'POST', contentType: 'application/x-www-form-urlencoded'});

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

function extractHostname(url) {
  if (typeof url == 'undefined' || url == null) {
    return '';
  }
  var hostname;
  if (url.indexOf('//') > -1) {
    hostname = url.split('/')[2];
  } else {
    hostname = url.split('/')[0];
  }

  hostname = hostname.split(':')[0];
  hostname = hostname.split('?')[0];

  return hostname;
}

function getQueryVariable(variable, url) {
  var query = url;
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) == variable) {
      return decodeURIComponent(pair[1]);
    }
  }
}
