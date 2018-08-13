import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';
import { EVENTS } from 'src/constants.json';

const CONSUMABLE_BIDDER_CODE = 'consumable'

const SYNC_TYPES = {
  IFRAME: {
    TAG: 'iframe',
    TYPE: 'iframe'
  },
  IMAGE: {
    TAG: 'img',
    TYPE: 'image'
  }
};

const pubapiTemplate = ({host, network, placement}) => `//${host}/pubapi/3.0/${network}/${placement}/0/0/ADTECH;v=2;cmd=bid;cors=yes;misc=${new Date().getTime()}`
const CONSUMABLE_URL = 'adserver-us.adtech.advertising.com';
const CONSUMABLE_TTL = 60;
const CONSUMABLE_NETWORK = '10947.1';

$$PREBID_GLOBAL$$.consumableGlobals = {
  pixelsDropped: false
};

function parsePixelItems(pixels) {
  let itemsRegExp = /<(img|iframe)[\s\S]*?src\s*=\s*("|')(.*?)\2/gi;
  let tagNameRegExp = /\w*(?=\s)/;
  let srcRegExp = /src=("|')(.*?)\1/;
  let pixelsItems = [];

  if (pixels) {
    let matchedItems = pixels.match(itemsRegExp);
    if (matchedItems) {
      matchedItems.forEach(item => {
        let tagName = item.match(tagNameRegExp)[0];
        let url = item.match(srcRegExp)[2];

        if (tagName && url) {
          pixelsItems.push({
            type: tagName === SYNC_TYPES.IMAGE.TAG ? SYNC_TYPES.IMAGE.TYPE : SYNC_TYPES.IFRAME.TYPE,
            url: url
          });
        }
      });
    }
  }

  return pixelsItems;
}

function _buildConsumableUrl(bid) {
  const params = bid.params;

  return pubapiTemplate({
    host: CONSUMABLE_URL,
    network: params.network || CONSUMABLE_NETWORK,
    placement: parseInt(params.placement, 10)
  });
}

function formatBidRequest(bid) {
  let bidRequest;

  bidRequest = {
    url: _buildConsumableUrl(bid),
    method: 'GET'
  };

  bidRequest.bidderCode = bid.bidder;
  bidRequest.bidId = bid.bidId;
  bidRequest.userSyncOn = bid.params.userSyncOn;
  bidRequest.unitId = bid.params.unitId;
  bidRequest.unitName = bid.params.unitName;
  bidRequest.zoneId = bid.params.zoneId;
  bidRequest.network = bid.params.network || CONSUMABLE_NETWORK;

  return bidRequest;
}

function _parseBidResponse (response, bidRequest) {
  let bidData;
  try {
    bidData = response.seatbid[0].bid[0];
  } catch (e) {
    return;
  }

  let cpm;

  if (bidData.ext && bidData.ext.encp) {
    cpm = bidData.ext.encp;
  } else {
    cpm = bidData.price;

    if (cpm === null || isNaN(cpm)) {
      utils.logError('Invalid cpm in bid response', CONSUMABLE_BIDDER_CODE, bid);
      return;
    }
  }
  cpm = cpm * (parseFloat(bidRequest.zoneId) / parseFloat(bidRequest.network));

  let oad = bidData.adm;
  let cb = bidRequest.network === '9599.1' ? 7654321 : Math.round(new Date().getTime());
  let ad = '<script type=\'text/javascript\'>document.write(\'<div id=\"' + bidRequest.unitName + '-' + bidRequest.unitId + '\">\');</script>' + oad;
  ad += '<script type=\'text/javascript\'>document.write(\'</div>\');</script>';
  ad += '<script type=\'text/javascript\'>document.write(\'<div class=\"' + bidRequest.unitName + '\"></div>\');</script>';
  ad += '<script type=\'text/javascript\'>document.write(\'<scr\'+\'ipt type=\"text/javascript\" src=\"https://yummy.consumable.com/' + bidRequest.unitId + '/' + bidRequest.unitName + '/widget/unit.js?cb=' + cb + '\" charset=\"utf-8\" async></scr\'+\'ipt>\');</script>'
  if (response.ext && response.ext.pixels) {
    if (config.getConfig('consumable.userSyncOn') !== EVENTS.BID_RESPONSE) {
      ad += _formatPixels(response.ext.pixels);
    }
  }

  return {
    bidderCode: bidRequest.bidderCode,
    requestId: bidRequest.bidId,
    ad: ad,
    cpm: cpm,
    width: bidData.w,
    height: bidData.h,
    creativeId: bidData.crid,
    pubapiId: response.id,
    currency: response.cur,
    dealId: bidData.dealid,
    netRevenue: true,
    ttl: CONSUMABLE_TTL
  };
}

function _formatPixels (pixels) {
  let formattedPixels = pixels.replace(/<\/?script( type=('|")text\/javascript('|")|)?>/g, '');

  return '<script>var w=window,prebid;' +
    'for(var i=0;i<10;i++){w = w.parent;prebid=w.$$PREBID_GLOBAL$$;' +
    'if(prebid && prebid.consumableGlobals && !prebid.consumableGlobals.pixelsDropped){' +
    'try{prebid.consumableGlobals.pixelsDropped=true;' + formattedPixels + 'break;}' +
    'catch(e){continue;}' +
    '}}</script>';
}

export const spec = {
  code: CONSUMABLE_BIDDER_CODE,
  isBidRequestValid: function(bid) {
    return bid.params && bid.params.placement
  },
  buildRequests: function (bids) {
    return bids.map(formatBidRequest);
  },
  interpretResponse: function ({body}, bidRequest) {
    if (!body) {
      utils.logError('Empty bid response', bidRequest.bidderCode, body);
    } else {
      let bid = _parseBidResponse(body, bidRequest);
      if (bid) {
        return bid;
      }
    }
  },
  getUserSyncs: function(options, bidResponses) {
    let bidResponse = bidResponses[0];

    if (config.getConfig('consumable.userSyncOn') === EVENTS.BID_RESPONSE) {
      if (!$$PREBID_GLOBAL$$.consumableGlobals.pixelsDropped && bidResponse.ext && bidResponse.ext.pixels) {
        $$PREBID_GLOBAL$$.consumableGlobals.pixelsDropped = true;

        return parsePixelItems(bidResponse.ext.pixels);
      }
    }

    return [];
  }
};

registerBidder(spec);
