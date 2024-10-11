import { isEmpty } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { createRequestData, getBannerBidFloor, getBannerBidParam, getBannerSizes, getVideoBidFloor, getVideoBidParam, getVideoSizes, isBannerBidValid, isVideoBid, isVideoBidValid } from '../libraries/advangUtils/index.js';

const ADAPTER_VERSION = '1.0';
const BIDDER_CODE = 'advangelists';
export const VIDEO_TARGETING = ['mimes', 'playbackmethod', 'maxduration', 'skip', 'playerSize', 'context'];
export const VIDEO_ENDPOINT = 'https://nep.advangelists.com/xp/get?pubid=';
export const BANNER_ENDPOINT = 'https://nep.advangelists.com/xp/get?pubid=';
export const OUTSTREAM_SRC = 'https://player-cdn.beachfrontmedia.com/playerapi/loader/outstream.js';

let pubid = '';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  aliases: ['saambaa'],
  isBidRequestValid(bidRequest) {
    if (typeof bidRequest !== 'undefined') {
      if (bidRequest.bidder !== BIDDER_CODE && typeof bidRequest.params === 'undefined') { return false; }
      if (bidRequest === '' || bidRequest.params.placement === '' || bidRequest.params.pubid === '') { return false; }
      return true;
    } else { return false; }
  },

  buildRequests(bids, bidderRequest) {
    let requests = [];
    let videoBids = bids.filter(bid => isVideoBidValid(bid));
    let bannerBids = bids.filter(bid => isBannerBidValid(bid));
    videoBids.forEach(bid => {
      pubid = getVideoBidParam(bid, 'pubid');
      requests.push({
        method: 'POST',
        url: VIDEO_ENDPOINT + pubid,
        data: createRequestData(bid, bidderRequest, true, getVideoBidParam, getVideoSizes, getVideoBidFloor),
        bidRequest: bid
      });
    });

    bannerBids.forEach(bid => {
      pubid = getBannerBidParam(bid, 'pubid');
      requests.push({
        method: 'POST',
        url: BANNER_ENDPOINT + pubid,
        data: createRequestData(bid, bidderRequest, false, getBannerBidParam, getBannerSizes, getBannerBidFloor, BIDDER_CODE, ADAPTER_VERSION),
        bidRequest: bid
      });
    });
    return requests;
  },

  interpretResponse(serverResponse, { bidRequest }) {
    let response = serverResponse.body;
    if (response !== null && isEmpty(response) === false) {
      if (isVideoBid(bidRequest)) {
        let bidResponse = {
          requestId: response.id,
          cpm: response.seatbid[0].bid[0].price,
          width: response.seatbid[0].bid[0].w,
          height: response.seatbid[0].bid[0].h,
          ttl: response.seatbid[0].bid[0].ttl || 60,
          creativeId: response.seatbid[0].bid[0].crid,
          currency: response.cur,
          meta: { 'advertiserDomains': response.seatbid[0].bid[0].adomain },
          mediaType: VIDEO,
          netRevenue: true
        };

        if (response.seatbid[0].bid[0].adm) {
          bidResponse.vastXml = response.seatbid[0].bid[0].adm;
          bidResponse.adResponse = {
            content: response.seatbid[0].bid[0].adm
          };
        } else {
          bidResponse.vastUrl = response.seatbid[0].bid[0].nurl;
        }

        return bidResponse;
      } else {
        return {
          requestId: response.id,
          bidderCode: BIDDER_CODE,
          cpm: response.seatbid[0].bid[0].price,
          width: response.seatbid[0].bid[0].w,
          height: response.seatbid[0].bid[0].h,
          ad: response.seatbid[0].bid[0].adm,
          ttl: response.seatbid[0].bid[0].ttl || 60,
          creativeId: response.seatbid[0].bid[0].crid,
          currency: response.cur,
          meta: { 'advertiserDomains': response.seatbid[0].bid[0].adomain },
          mediaType: BANNER,
          netRevenue: true
        };
      }
    }
  }
};

registerBidder(spec);
