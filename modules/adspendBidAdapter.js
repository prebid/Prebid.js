import * as utils from 'src/utils';
import { config } from 'src/config';
import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes';

const BIDDER_CODE = 'adspend';
const URL = '//rtb.com.ru/headerbidding-bid';
const COOKIE_NAME = 'hb-adspend-id';
const UUID_LEN = 36;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['adspend'],
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: function(bid) {
    const conf = config.getConfig();
    return !!(conf.currency && conf.currency.adServerCurrency && bid.crumbs.pubcid);
  },

  buildRequests: function(bidRequests, bidderRequest) {
    const req = bidRequests[Math.floor(Math.random() * bidRequests.length)];

    const conf = config.getConfig();
    const cur = conf.currency.adServerCurrency;

    const bidfloor = req.params.bidfloor;

    const payload = {
      'id': req.bidId,
      'site': {
        'id': req.crumbs.pubcid,
        'domain': document.domain
      },
      'device': {
        'ua': navigator.userAgent,
        'ip': ''
      },
      'user': { 'id': getUserID(document.cookie) },
      'imp': [
        {
          'id': req.params.placementId,
          'tagid': req.params.tagId,
          'banner': { 'format': getFormats(req.sizes) },
          'bidfloor': bidfloor !== undefined ? Number(bidfloor) : 1,
          'bidfloorcur': cur,
          'secure': 0
        }
      ],
      'cur': [
        cur
      ],
      'tmax': bidderRequest.timeout
    };

    return {
      method: 'POST',
      url: URL,
      data: JSON.stringify(payload),
    };
  },

  interpretResponse: function(resp, {bidderRequest}) {
    const bids = [];

    if (resp.body === '') return bids;

    const respBid = resp.body.seatbid[0].bid[0];
    const bid = {
      cpm: respBid.price,
      requestId: resp.body.id,
      width: 300,
      height: 250,
      creativeId: respBid.adid,
      dealId: respBid.dealid,
      currency: resp.body.cur,
      netRevenue: true,
      ttl: 10000,
      ad: respBid.adm
    };

    bids.push(bid);
    return bids;
  },

  getUserSyncs: function(syncOptions, resps) {
    let syncs = [];

    resps.forEach(resp => {
      if (syncOptions.pixelEnabled && resp.body === '') {
        const uuid = getUserID();
        syncs.push({
          type: 'image',
          url: `//rtb.com.ru/headerbidding-sync?uid=${uuid}`
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
