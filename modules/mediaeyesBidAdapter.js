import {
  BANNER,
  VIDEO
} from '../src/mediaTypes.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';
import { deepAccess, deepSetValue, generateUUID, isArray, isFn, isNumber, isPlainObject, isStr } from '../src/utils.js';

const ENDPOINT_URL = 'https://rtb.upremium.asia/ortb/open/auction';

export const spec = {
  code: 'mediaeyes',
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: (bid) => {
    return !!(bid.params.itemId);
  },

  buildRequests: (bidRequests, bidderRequest) => {
    const requests = [];

    bidRequests.forEach(bidRequest => {
      const { itemId } = bidRequest.params;
      const requestData = {
        id: generateUUID(),
        imp: [cookingImp(bidRequest)],
        device: bidRequest.ortb2?.device,
        site: bidRequest.ortb2?.site,
      }
      requests.push({
        method: 'POST',
        url: ENDPOINT_URL + "?item_id=" + itemId,
        data: JSON.stringify(requestData),
      });
    })

    return requests
  },

  interpretResponse: (serverResponse, serverRequest) => {
    const response = serverResponse.body;
    if (!response.seatbid) {
      return [];
    }

    const rtbBids = response.seatbid
      .map(seatbid => seatbid.bid)
      .reduce((a, b) => a.concat(b), []);

    const data = rtbBids.map(rtbBid => {
      const prBid = {
        requestId: rtbBid.impid,
        cpm: rtbBid.price,
        creativeId: rtbBid.crid,
        currency: response.cur || 'USD',
        ttl: 360,
        netRevenue: true
      };

      let mediaType = rtbBid.ext?.mediaType;
      if (!mediaType) {
        if (rtbBid.adm && rtbBid.adm.includes('<VAST')) {
          mediaType = VIDEO;
        } else {
          mediaType = BANNER;
        }
      }

      if (mediaType === VIDEO) {
        prBid.mediaType = VIDEO;
        prBid.vastXml = rtbBid.adm;
      } else {
        prBid.mediaType = BANNER;
        prBid.ad = rtbBid.adm;
      }
      prBid.width = rtbBid.w;
      prBid.height = rtbBid.h;
      if (isArray(rtbBid.adomain)) {
        deepSetValue(prBid, 'meta.advertiserDomains', rtbBid.adomain);
      }
      if (isPlainObject(rtbBid.ext)) {
        if (isNumber(rtbBid.ext.advertiser_id)) {
          deepSetValue(prBid, 'meta.advertiserId', rtbBid.ext.advertiser_id);
        }
        if (isStr(rtbBid.ext.advertiser_name)) {
          deepSetValue(prBid, 'meta.advertiserName', rtbBid.ext.advertiser_name);
        }
        if (isStr(rtbBid.ext.agency_name)) {
          deepSetValue(prBid, 'meta.agencyName', rtbBid.ext.agency_name);
        }
      }

      return prBid
    });

    return data
  }
}

registerBidder(spec);

function cookingImp(bidReq) {
  const imp = {};
  if (bidReq) {
    const bidfloor = getBidFloor(bidReq);
    if (bidfloor) {
      imp.bidfloor = parseFloat(bidfloor);
      imp.bidfloorcur = 'USD';
    }

    imp.id = bidReq.bidId;
    imp.bidfloor = bidfloor;
    if (bidReq.mediaTypes?.banner) {
      imp.banner = cookImpBanner(bidReq);
    }

    if (bidReq.mediaTypes?.video) {
      imp.video = cookImpVideo(bidReq);
    }
  }
  return imp;
}

const cookImpBanner = ({ mediaTypes, params }) => {
  if (!mediaTypes?.banner) return {};

  const { sizes } = mediaTypes.banner;
  return {
    format: sizes.map(([w, h]) => ({
      w,
      h
    }))
  }
};

function cookImpVideo({ mediaTypes }) {
  const video = mediaTypes.video;

  const size = Array.isArray(video.playerSize[0])
    ? video.playerSize[0]
    : video.playerSize;

  const [w, h] = size;

  let placement = video.placement;
  if (!placement && video.context) {
    if (video.context === 'outstream') {
      placement = 4;
    } else if (video.context === 'instream') {
      placement = 1;
    }
  }

  return {
    w,
    h,
    mimes: video.mimes || ['video/mp4'],
    protocols: video.protocols || [2, 3, 5, 6],
    placement: video.placement || 1
  };
}

function getBidFloor(bidRequest) {
  let bidfloor = deepAccess(bidRequest, 'params.bidFloor', 0)

  if (!bidfloor && isFn(bidRequest.getFloor)) {
    const floor = bidRequest.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*'
    });
    if (isPlainObject(floor) && !isNaN(floor.floor)) {
      bidfloor = floor.floor;
    }
  }

  return bidfloor;
}
