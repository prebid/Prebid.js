import { ortbConverter } from '../libraries/ortbConverter/converter.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { BANNER } from '../src/mediaTypes.js'
import * as utils from '../src/utils.js'

export const BIDDER_CODE = 'eightPod'
const url = 'https://demo.8pod.com/bidder/rtb/eightpod_exchange/bid';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  isBannerBid,
  isVideoBid,
  onBidWon
}

registerBidder(spec)

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context)
    return req
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    const response = buildResponse(bidResponses, ortbResponse, context)
    return response.bids
  },
  imp(buildImp, bidRequest, context) {
    return buildImp(bidRequest, context)
  },
  bidResponse
})

function hasRequiredParams(bidRequest) {
  return !!bidRequest?.params?.placementId
}

function isBidRequestValid(bidRequest) {
  return hasRequiredParams(bidRequest)
}

function buildRequests(bids, bidderRequest) {
  let bannerBids = bids.filter((bid) => isBannerBid(bid))
  let requests = bannerBids.length
    ? createRequest(bannerBids, bidderRequest, BANNER)
    : []

  return requests
}

function bidResponse(buildBidResponse, bid, context) {
  bid.nurl = replacePriceInUrl(bid.nurl, bid.price);

  const bidResponse = buildBidResponse(bid, context);

  bidResponse.height = context?.imp?.banner?.format?.[0].h;
  bidResponse.width = context?.imp?.banner?.format?.[0].w;
  bidResponse.cid = bid.cid;

  bidResponse.burl = replacePriceInUrl(bid.burl, bidResponse.originalCpm || bidResponse.cpm);

  return bidResponse;
}

function onBidWon(bid) {
  if (bid.burl) {
    utils.triggerPixel(bid.burl)
  }
}
function replacePriceInUrl(url, price) {
  return url.replace(/\${AUCTION_PRICE}/, price)
}

export function parseUserAgent() {
  const ua = navigator.userAgent.toLowerCase();

  // Check if it's iOS
  if (/iphone|ipad|ipod/.test(ua)) {
    // Extract iOS version and device type
    const iosInfo = /(iphone|ipad|ipod) os (\d+[._]\d+)|((iphone|ipad|ipod)(\D+cpu) os (\d+(?:[._\s]\d+)?))/.exec(ua);
    return {
      platform: 'ios',
      version: iosInfo ? iosInfo[1] : '',
      device: iosInfo ? iosInfo[2].replace('_', '.') : ''
    };
  } else if (/android/.test(ua)) {
    // Check if it's Android
    // Extract Android version
    const androidVersion = /android (\d+([._]\d+)?)/.exec(ua);
    return {
      platform: 'android',
      version: androidVersion ? androidVersion[1].replace('_', '.') : '',
      device: ''
    };
  } else {
    // If neither iOS nor Android, return unknown
    return {
      platform: 'Unknown',
      version: '',
      device: ''
    };
  }
}

export function getPageKeywords(win = window) {
  let element;

  try {
    element = win.top.document.querySelector('meta[name="keywords"]');
  } catch (e) {
    element = document.querySelector('meta[name="keywords"]');
  }

  return ((element && element.content) || '').replaceAll(' ', '');
}

function createRequest(bidRequests, bidderRequest, mediaType) {
  const requests = bidRequests.map((bidRequest) => {
    const data = converter.toORTB({
      bidRequests: [bidRequest],
      bidderRequest,
      context: { mediaType },
    });

    data.adSlotPositionOnScreen = 'ABOVE_THE_FOLD';
    data.at = 1;

    const userId =
      utils.deepAccess(bidRequest, 'userId.unifiedId.id') ||
      utils.deepAccess(bidRequest, 'userId.id5id.uid') ||
      utils.deepAccess(bidRequest, 'userId.idl_env');

    const params = getBidderParams(bidRequest);
    data.device = {
      ...data.device,
      devicetype: 4,
      geo: {
        country: params.country || 'GRB'
      },
      language: params.language || data.device.language,
    }
    data.site = {
      ...data.site,
      keywords: getPageKeywords(window),
      publisher: {
        id: params.publisherId
      }
    }
    data.imp = [
      {
        ...data.imp?.[0],
        secure: 1,
        pmp: params.dealId
          ? {
            ...data.pmp,
            deals: [
              {
                id: params.dealId,
              },
            ],
            private_auction: 1,
          }
          : data.pmp,
      }
    ]
    data.adSlotPlacementId = params.placementId;

    if (userId) {
      data.user = {
        id: userId
      }
    }

    const req = {
      method: 'POST',
      url: url && params.trace ? url + '?trace=true' : url,
      options: { withCredentials: false },
      data
    }
    return req
  })

  return requests;
}

function getBidderParams(bid) {
  return bid?.params ? bid.params : undefined;
}

function isVideoBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.video')
}

function isBannerBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.banner')
}

function interpretResponse(resp, req) {
  const impressionId = resp.body.seatbid[0].bid[0].impid;
  const bidResponses = converter.fromORTB({ request: req.data, response: resp.body });
  const ad = bidResponses[0].ad;
  const trackingTag = `<script src="https://cdn.doubleverify.com/dvtp_src.js?ctx=818052&cmp=APAC_Cert_20&sid=se_a551&plc=240411845&adsrv=0&btreg=ad-unit-container&auevent=${impressionId}&btadsrv=&crt=01&tagtype=&dvtagver=6.1.src" type="text/javascript"></script>
        <script type="text/javascript">
            (function() {
                /** CONFIGURATION START **/
                var _sf_async_config = window._sf_async_config = (window._sf_async_config || {});
                _sf_async_config.uid = 67171;
                _sf_async_config.domain = 'demo.8pod.com';
                _sf_async_config.flickerControl = false;
                _sf_async_config.useCanonical = true;
                _sf_async_config.useCanonicalDomain = true;
                _sf_async_config.sections = '';
                _sf_async_config.authors = '';
                /** CONFIGURATION END **/
                function loadChartbeat() {
                    var e = document.createElement('script');
                    var n = document.getElementsByTagName('script')[0];
                    e.type = 'text/javascript';
                    e.async = true;
                    e.src = '//static.chartbeat.com/js/chartbeat.js';
                    n.parentNode.insertBefore(e, n);
                }
                loadChartbeat();
            })();
        </script>
        <script async src="//static.chartbeat.com/js/chartbeat_mab.js"></script>

        <script type="text/javascript">
            var utag_data = {
            }
        </script>
        <script type="text/javascript">
            (function(a,b,c,d){
                a='https://tags.tiqcdn.com/utag/sales-richard-coghlan/8pod/prod/utag.js';
                b=document;c='script';d=b.createElement(c);d.src=a;d.type='text/java'+c;d.async=true;
                a=b.getElementsByTagName(c)[0];a.parentNode.insertBefore(d,a);
            })();
        </script>`

  bidResponses[0].ad = ad.replace('</head>', trackingTag + '</head>');
  return bidResponses;
}
