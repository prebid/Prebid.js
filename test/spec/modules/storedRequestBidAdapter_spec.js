import 'src/prebid.js';
import { registerBidder } from 'src/adapters/bidderFactory.js';
import StoredRequestBidAdapterBase from 'modules/prebidServerBidAdapter/storedRequestBidAdapterBase';
import {server} from 'test/mocks/xhr.js';
import {getHook} from 'src/hook';
import {auctionManager} from 'src/auctionManager.js';

const expect = require('chai').expect;

const HOST = 'dev-api.relevant-digital.com';
const IMP_ID = '/12345/stored/request/test';
const ADAPTER_CODE = 'storedRequestTestAdapter';

const BID = {
  bidder: 'storedRequestTestAdapter',
  params: {
    adUnitCode: '620525862d7518bfd4bbb81e_620523b5d1dbed6b0fbbb817',
    accountId: '620523ae7f4bbe1691bbb815',
    pbsHost: HOST,
  },
};

const AD_UNIT = {
  code: IMP_ID,
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600], [320, 320]],
    }
  },
  bids: [BID],
};

const response = ({ id, host }) => ({
  'id': id,
  'seatbid': [
    {
      'bid': [
        {
          'id': '613673EF-A07C-4486-8EE9-3FC71A7DC73D',
          'impid': IMP_ID,
          'price': 10.76091063668997,
          'adm': '<html><a href="http://www.pubmatic.com" target="_blank"><img src ="https://stagingva.pubmatic.com:8443/image/300x250.jpg" /></a></html>',
          'adomain': [
            'www.addomain.com'
          ],
          'iurl': 'http://localhost11',
          'crid': 'creative111',
          'w': 300,
          'h': 250,
          'ext': {
            'bidtype': 0,
            'dspid': 6,
            'origbidcpm': 1,
            'origbidcur': 'USD',
            'prebid': {
              'meta': {
                'adaptercode': 'pubmatic'
              },
              'targeting': {
                'hb_bidder': 'pubmatic',
                'hb_cache_host': host,
                'hb_cache_path': '/analytics_cache/read',
                'hb_format': 'banner',
                'hb_pb': '10.70',
                'hb_size': '300x250'
              },
              'type': 'banner',
              'video': {
                'duration': 0,
                'primary_category': ''
              },
              'events': {
                'win': `https://${host}/event?t=win&b=fed970f7-4295-456d-a251-38013faab795&a=620523ae7f4bbe1691bbb815&bidder=pubmatic&ts=1678646619765`,
                'imp': `https://${host}/event?t=imp&b=fed970f7-4295-456d-a251-38013faab795&a=620523ae7f4bbe1691bbb815&bidder=pubmatic&ts=1678646619765`
              },
              'bidid': 'fed970f7-4295-456d-a251-38013faab795'
            }
          }
        }
      ],
      'seat': 'pubmatic'
    }
  ],
  'cur': 'SEK',
  'ext': {
    'responsetimemillis': {
      'appnexus': 305,
      'pubmatic': 156
    },
    'tmaxrequest': 2750,
    'prebid': {
      'auctiontimestamp': 1678646619765
    }
  }
});

let waitingPbs;

function onModifyPBSRequest(fn, ...args) {
  setTimeout(() => {
    const waiter = waitingPbs;
    if (waiter) {
      waitingPbs = null;
      waiter();
    }
  });
  fn.call(this, ...args);
}

const findReq = (str) => server.requests.find((r) => r.url.includes(str));

describe('Stored Request Bid Adaper', function () {
  before(function() {
    registerBidder(new StoredRequestBidAdapterBase({ spec: { code: ADAPTER_CODE } }).spec);
    getHook('modifyPBSRequest').before(onModifyPBSRequest, 10);
  });
  after(function () {
    getHook('modifyPBSRequest').getHooks({hook: onModifyPBSRequest}).remove();
    auctionManager.clearAllAuctions((auction) => auction.getAuctionId().includes('storedRequest'));
  });
  describe('Make requests', function () {
    it('should work', async function() {
      $$PREBID_GLOBAL$$.requestBids({ adUnits: [AD_UNIT], auctionId: 'storedRequest' + Math.random() });
      await new Promise((resolve) => { waitingPbs = resolve; });
      const req = findReq('/openrtb2/auction');
      const reqBody = JSON.parse(req.requestBody);
      const { id, ext } = reqBody;
      const { prebid } = reqBody.imp[0].ext;
      req.respond(200, {}, JSON.stringify(response({ id, host: HOST })));
      const cookieReq = findReq('/cookie_sync');
      const syncedBidders = JSON.parse(cookieReq.requestBody).bidders.sort();
      const bid = $$PREBID_GLOBAL$$.getBidResponses()[IMP_ID]?.bids?.[0];

      expect(!!bid).to.be.true;
      expect(bid.bidderCode).to.be.equal(ADAPTER_CODE);
      expect(syncedBidders).to.deep.equal(['appnexus', 'pubmatic']);
      expect(req.url.startsWith(`https://${HOST}`)).to.be.true;
      expect(cookieReq.url.startsWith(`https://${HOST}`)).to.be.true;
      expect(prebid.bidders).to.not.exist;
      expect(prebid.storedrequest.id).to.be.equal(BID.params.adUnitCode);
      expect(ext.prebid.storedrequest.id).to.be.equal(BID.params.accountId);
    });
  });
});
