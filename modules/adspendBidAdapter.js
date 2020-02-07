import * as utils from '../src/utils';
import { ajax } from '../src/ajax'
import { config } from '../src/config';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';

const BIDDER_CODE = 'adspend';
const BID_URL = 'https://rtb.com.ru/headerbidding-bid';
const SYNC_URL = 'https://rtb.com.ru/headerbidding-sync?uid={UUID}';
const COOKIE_NAME = 'hb-adspend-id';
const UUID_LEN = 36;
const TTL = 10000;
const RUB = 'RUB';
const FIRST_PRICE = 1;
const NET_REVENUE = true;

const winEventURLs = {};
const placementToBidMap = {};

export const spec = {
  code: BIDDER_CODE,
  aliases: ['as'],
  supportedMediaTypes: [BANNER],

  onBidWon: function(winObj) {
    const requestId = winObj.requestId;
    const cpm = winObj.cpm;
    const event = winEventURLs[requestId].replace(
      /\$\{AUCTION_PRICE\}/,
      cpm
    );

    ajax(event, null);
  },

  isBidRequestValid: function(bid) {
    const adServerCur = config.getConfig('currency.adServerCurrency') === RUB;

    return !!(adServerCur &&
      bid.params &&
      bid.params.bidfloor &&
      bid.crumbs.pubcid &&
      utils.checkCookieSupport() &&
      utils.cookiesAreEnabled()
    );
  },

  buildRequests: function(bidRequests, bidderRequest) {
    const req = bidRequests[Math.floor(Math.random() * bidRequests.length)];
    const bidId = req.bidId;
    const at = FIRST_PRICE;
    const site = { id: req.crumbs.pubcid, domain: document.domain };
    const device = { ua: navigator.userAgent, ip: '' };
    const user = { id: getUserID() }
    const cur = [ RUB ];
    const tmax = bidderRequest.timeout;

    const imp = bidRequests.map(req => {
      const params = req.params;

      const tagId = params.tagId;
      const id = params.placement;
      const banner = { 'format': getFormats(req.sizes) };
      const bidfloor = params.bidfloor !== undefined
        ? Number(params.bidfloor) : 1;
      const bidfloorcur = RUB;

      placementToBidMap[id] = bidId;

      return {
        id,
        tagId,
        banner,
        bidfloor,
        bidfloorcur,
        secure: 0,
      };
    });

    const payload = {
      bidId,
      at,
      site,
      device,
      user,
      imp,
      cur,
      tmax,
    };

    return {
      method: 'POST',
      url: BID_URL,
      data: JSON.stringify(payload),
    };
  },

  interpretResponse: function(resp, {bidderRequest}) {
    if (resp.body === '') return [];

    const bids = resp.body.seatbid[0].bid.map(bid => {
      const cpm = bid.price;
      const impid = bid.impid;
      const requestId = placementToBidMap[impid];
      const width = bid.w;
      const height = bid.h;
      const creativeId = bid.adid;
      const dealId = bid.dealid;
      const currency = resp.body.cur;
      const netRevenue = NET_REVENUE;
      const ttl = TTL;
      const ad = bid.adm;

      return {
        cpm,
        requestId,
        width,
        height,
        creativeId,
        dealId,
        currency,
        netRevenue,
        ttl,
        ad,
      };
    });

    return bids;
  },

  getUserSyncs: function(syncOptions, resps) {
    let syncs = [];

    resps.forEach(resp => {
      if (syncOptions.pixelEnabled && resp.body === '') {
        const uuid = getUserID();
        syncs.push({
          type: 'image',
          url: SYNC_URL.replace('{UUID}', uuid),
        });
      }
    });

    return syncs
  }
}

const getUserID = () => {
  const i = document.cookie.indexOf(COOKIE_NAME);

  if (i === -1) {
    const uuid = utils.generateUUID();
    document.cookie = `${COOKIE_NAME}=${uuid}; path=/`;
    return uuid;
  }

  const j = i + COOKIE_NAME.length + 1;
  return document.cookie.substring(j, j + UUID_LEN);
};

const getFormats = arr => arr.map((s) => {
  return { w: s[0], h: s[1] };
});

registerBidder(spec);
