// import or require modules necessary for the test, e.g.:
import { expect } from 'chai'; // may prefer 'assert' in place of 'expect'
import { spec } from 'modules/brainxBidAdapter.js';
// import adapter from 'src/adapters/<adapter>';
import { BANNER } from 'src/mediaTypes.js';

describe('Brain-X Aapater', function () {
  describe('isBidRequestValid', function () {
    it('undefined bid should return false', function () {
      expect(spec.isBidRequestValid()).to.be.false;
    });

    it('null bid should return false', function () {
      expect(spec.isBidRequestValid(null)).to.be.false;
    });

    it('bid.params should be set', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
    });

    it('bid.params.pubId should be set', function () {
      expect(spec.isBidRequestValid({
        params: { pubId: 'F7B53DBC-85C1-4685-9A06-9CF4B6261FA3', endpoint: 'http://adx-engine-gray.tec-do.cn/bid' }
      })).to.be.false;
    });
  })

  // describe('isBidRequestValid', function () {
  //   it('Test the banner request processing function', function () {
  //     const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
  //     expect(request).to.not.be.empty;
  //     const payload = request.data;
  //     expect(payload).to.not.be.empty;
  //   });
  //   it('Test the video request processing function', function () {
  //     const request = spec.buildRequests(videoRequest, videoRequest[0]);
  //     expect(request).to.not.be.empty;
  //     const payload = request.data;
  //     expect(payload).to.not.be.empty;
  //   });
  //   it('Test the param', function () {
  //     const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
  //     const payload = JSON.parse(request.data);
  //     expect(payload.imp[0].tagid).to.eql(videoRequest[0].params.tagid);
  //     expect(payload.imp[0].bidfloor).to.eql(videoRequest[0].params.bidfloor);
  //   });
  // })

  describe('interpretResponse', function () {
    it('Test banner interpretResponse', function () {
      const serverResponse = {
        body: {
          'bidid': 'a82042c055b04e539ec6876112c10ced1729663902983',
          'cur': 'USD',
          'id': '28f8f1f525372a',
          'seatbid': [
            {
              'bid': [
                {
                  'adid': '76797',
                  'adm': '<div>simple brainx ad</div>',
                  'adomain': [
                    'taobao.com'
                  ],
                  'bundle': 'com.taobao',
                  'burl': 'https://adx-event-server.bidtrail.top/billing?s=Eid0ZWMxNDk4NDQzODk3MjcwOTU1MzAwNzM3YjczMTQwMTA4ODk5ODQaDjI4ZjhmMWY1MjUzNzJhIKkCKgbmtYvor5U6DmxvY2FsaG9zdDo5OTk5Qgl1bmRlZmluZWRKA0hLR1ADYAFoAXADeAOAAQKKAQpjb20udGFvYmFvlQEX2U49nQEX2U49pQEX2U49ugEqCO4HEiUI7gcSCFRlY2RvRFNQGA01F9lOPTgBQBVKC1RlY2RvRFNQX1NHwAHuB8gBjcqCwKsy0AEC-gGbAmh0dHBzOi8vbm90aWNlLXNnLmJpZHRyYWlsLnRvcC93aW4_YmlkX2lkPWE4MjA0MmMwNTViMDRlNTM5ZWM2ODc2MTEyYzEwY2VkMTcyOTY2MzkwMjk4MyZjYW1wYWlnbl9pZD00MjgmYWRfZ3JvdXBfaWQ9OTc2MSZhZF9pZD03Njc5NyZjcmVhdGl2ZV9pZD02NTI2JmFmZmlsaWF0ZV9pZD0yOTcmYnVuZGxlPSZmaXJzdF9zc3A9YnJhaW54LnRlY2gmcHVibGlzaF9pZD0mb3M9QW5kcm9pZCZ0YWdfaWQ9dW5kZWZpbmVkJmJpZF9zdWNjZXNzX3ByaWNlPTAuMDUwNSZzaWduPWUzODQyNjhiYzAzYzhmYmOSAgp0YW9iYW8uY29togILYnJhaW54LnRlY2ioAgGyAgdhbmRyb2lkwAICygICc2fQAgHYAo3hlcWrMuACjeGVxasy&v=P-1b7JJWs-uUQ68A37V4xDLplU0&auction_price=${AUCTION_PRICE}',
                  'cat': [
                    'IAB18-5'
                  ],
                  'cid': '428',
                  'crid': 'creative-6526',
                  'h': 480,
                  'id': 'a82042c055b04e539ec6876112c10ced1729663902983',
                  'impid': '3c1dd9e1700358',
                  'iurl': 'https://creative.bidtrail.top/png/2/20f24c10f21e/091b422e3014033e57acffcf2a5c71dbb17383ec15ac9421',
                  'lurl': 'https://notice-sg.bidtrail.top/loss?bid_id=a82042c055b04e539ec6876112c10ced1729663902983&sign=e384268bc03c8fbc&campaign_id=428&ad_group_id=9761&ad_id=76797&creative_id=6526&affiliate_id=297&loss_code=${AUCTION_LOSS}',
                  'nurl': 'https://adx-event-server.bidtrail.top/winnotice?s=Eid0ZWMxNDk4NDQzODk3MjcwOTU1MzAwNzM3YjczMTQwMTA4ODk5ODQaDjI4ZjhmMWY1MjUzNzJhIKkCKgbmtYvor5U6DmxvY2FsaG9zdDo5OTk5Qgl1bmRlZmluZWRKA0hLR1ADYAFoAXADeAOAAQKKAQpjb20udGFvYmFvlQEX2U49nQEX2U49pQEX2U49ugEqCO4HEiUI7gcSCFRlY2RvRFNQGA01F9lOPTgBQBVKC1RlY2RvRFNQX1NHwAHuB8gBjcqCwKsy0AEB-gGbAmh0dHBzOi8vbm90aWNlLXNnLmJpZHRyYWlsLnRvcC93aW4_YmlkX2lkPWE4MjA0MmMwNTViMDRlNTM5ZWM2ODc2MTEyYzEwY2VkMTcyOTY2MzkwMjk4MyZjYW1wYWlnbl9pZD00MjgmYWRfZ3JvdXBfaWQ9OTc2MSZhZF9pZD03Njc5NyZjcmVhdGl2ZV9pZD02NTI2JmFmZmlsaWF0ZV9pZD0yOTcmYnVuZGxlPSZmaXJzdF9zc3A9YnJhaW54LnRlY2gmcHVibGlzaF9pZD0mb3M9QW5kcm9pZCZ0YWdfaWQ9dW5kZWZpbmVkJmJpZF9zdWNjZXNzX3ByaWNlPTAuMDUwNSZzaWduPWUzODQyNjhiYzAzYzhmYmOSAgp0YW9iYW8uY29togILYnJhaW54LnRlY2ioAgGyAgdhbmRyb2lkwAICygICc2fQAgHYAo3hlcWrMuACjeGVxasy&v=jFUg_b6F14d50JL-M6UE5Jc8VuA&auction_price=${AUCTION_PRICE}',
                  'price': 0.0505,
                  'w': 320
                }
              ],
              'group': 0,
              'seat': 'agency'
            }
          ]
        }
      };

      const bidResponses = spec.interpretResponse(serverResponse, {
        originalBidRequest: {
          auctionId: '3eedbf83-7d1d-423c-be27-39e4af687040',
          auctionStart: 1729663900819,
          adUnitCode: 'dev-1',
          bidId: '28f8f1f525372a',
          bidder: 'brainx',
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          params: {
            pubId: 'F7B53DBC-85C1-4685-9A06-9CF4B6261FA3',
            endpoint: 'http://adx-engine-gray.tec-do.cn/bid'
          },
          src: 'client'
        }
      });

      expect(bidResponses).to.be.an('array').that.is.not.empty;

      const bid = serverResponse.body.seatbid[0].bid[0];
      const bidResponse = bidResponses[0];

      expect(bidResponse.mediaType).to.equal(BANNER);
      expect(bidResponse.requestId).to.equal(bid.impid);
      expect(bidResponse.cpm).to.equal(parseFloat(bid.price).toFixed(2))
      expect(bidResponse.currency).to.equal(serverResponse.body.cur);
      expect(bidResponse.creativeId).to.equal(bid.crid || bid.id);
      expect(bidResponse.netRevenue).to.be.true;
      expect(bidResponse.nurl).to.equal(bid.nurl);
      expect(bidResponse.lurl).to.equal(bid.lurl);

      expect(bidResponse.meta).to.be.an('object');
      expect(bidResponse.meta.mediaType).to.equal(BANNER);
      expect(bidResponse.meta.primaryCatId).to.equal('IAB18-5');
      // expect(bidResponse.meta.secondaryCatIds).to.deep.equal(['IAB8']);
      expect(bidResponse.meta.advertiserDomains).to.deep.equal(bid.adomain);
      expect(bidResponse.meta.clickUrl).to.equal(bid.adomain[0]);

      expect(bidResponse.ad).to.equal(bid.adm);
      expect(bidResponse.width).to.equal(bid.w);
      expect(bidResponse.height).to.equal(bid.h);
    });
  });
});
