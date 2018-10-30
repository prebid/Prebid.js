import { expect } from 'chai';
import { spec } from 'modules/gambidBidAdapter';
import * as utils from 'src/utils';

const supplyPartnerId = '123';

describe('GambidAdapter', function () {
  describe('isBidRequestValid', function () {
    it('should validate supply-partner ID', function () {
      expect(spec.isBidRequestValid({ params: {} })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: 123 } })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123' } })).to.equal(true);
    });
    it('should validate RTB endpoint', function () {
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123' } })).to.equal(true); // RTB endpoint has a default
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123', rtbEndpoint: 123 } })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123', rtbEndpoint: 'https://some.url.com' } })).to.equal(true);
    });
    it('should validate bid floor', function () {
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123' } })).to.equal(true); // bidfloor has a default
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123', bidfloor: '123' } })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123', bidfloor: 0.1 } })).to.equal(true);
    });
    it('should validate adpos', function () {
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123' } })).to.equal(true); // adpos has a default
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123', adpos: '123' } })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123', adpos: 0.1 } })).to.equal(true);
    });
    it('should validate instl', function () {
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123' } })).to.equal(true); // adpos has a default
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123', instl: '123' } })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123', instl: -1 } })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123', instl: 0 } })).to.equal(true);
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123', instl: 1 } })).to.equal(true);
      expect(spec.isBidRequestValid({ params: { supplyPartnerId: '123', instl: 2 } })).to.equal(false);
    });
  });
  describe('buildRequests', function () {
    const bidRequest = {
      'adUnitCode': 'adunit-code',
      'auctionId': '1d1a030790a475',
      'mediaTypes': {
        banner: {}
      },
      'params': {
        'supplyPartnerId': supplyPartnerId
      },
      'sizes': [ [ 300, 250 ], [ 300, 600 ] ],
      'transactionId': 'a123456789'
    };

    it('returns an array', function () {
      let response;

      response = spec.buildRequests([]);
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(0);

      response = spec.buildRequests([ bidRequest ]);
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(1);

      const adUnit1 = Object.assign({}, utils.deepClone(bidRequest), { auctionId: '1', adUnitCode: 'a' });
      const adUnit2 = Object.assign({}, utils.deepClone(bidRequest), { auctionId: '1', adUnitCode: 'b' });
      response = spec.buildRequests([adUnit1, adUnit2]);
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(2);
    });

    it('targets correct endpoint', function () {
      let response;

      response = spec.buildRequests([ bidRequest ])[ 0 ];
      expect(response.method).to.equal('POST');
      expect(response.url).to.match(new RegExp(`^https://rtb\\.gambid\\.io/r/${supplyPartnerId}/bidr\\?rformat=open_rtb&reqformat=rtb_json&bidder=prebid$`, 'g'));
      expect(response.data.id).to.equal(bidRequest.auctionId);

      const bidRequestWithEndpoint = utils.deepClone(bidRequest);
      bidRequestWithEndpoint.params.rtbEndpoint = 'https://rtb2.gambid.io/a12';
      response = spec.buildRequests([ bidRequestWithEndpoint ])[ 0 ];
      expect(response.url).to.match(new RegExp(`^https://rtb2\\.gambid\\.io/a12/r/${supplyPartnerId}/bidr\\?rformat=open_rtb&reqformat=rtb_json&bidder=prebid$`, 'g'));
    });

    it('builds request correctly', function () {
      let stub = sinon.stub(utils, 'getTopWindowUrl').returns('http://www.test.com/page.html');

      let response;
      response = spec.buildRequests([ bidRequest ])[ 0 ];
      expect(response.data.site.domain).to.equal('www.test.com');
      expect(response.data.site.page).to.equal('http://www.test.com/page.html');
      expect(response.data.site.ref).to.equal('');
      expect(response.data.imp.length).to.equal(1);
      expect(response.data.imp[ 0 ].id).to.equal(bidRequest.transactionId);
      expect(response.data.imp[ 0 ].instl).to.equal(0);
      expect(response.data.imp[ 0 ].tagid).to.equal(bidRequest.adUnitCode);
      expect(response.data.imp[ 0 ].bidfloor).to.equal(0);
      expect(response.data.imp[ 0 ].bidfloorcur).to.equal('USD');

      const bidRequestWithInstlEquals1 = utils.deepClone(bidRequest);
      bidRequestWithInstlEquals1.params.instl = 1;
      response = spec.buildRequests([ bidRequestWithInstlEquals1 ])[ 0 ];
      expect(response.data.imp[ 0 ].instl).to.equal(bidRequestWithInstlEquals1.params.instl);

      const bidRequestWithInstlEquals0 = utils.deepClone(bidRequest);
      bidRequestWithInstlEquals0.params.instl = 1;
      response = spec.buildRequests([ bidRequestWithInstlEquals0 ])[ 0 ];
      expect(response.data.imp[ 0 ].instl).to.equal(bidRequestWithInstlEquals0.params.instl);

      const bidRequestWithBidfloorEquals1 = utils.deepClone(bidRequest);
      bidRequestWithBidfloorEquals1.params.bidfloor = 1;
      response = spec.buildRequests([ bidRequestWithBidfloorEquals1 ])[ 0 ];
      expect(response.data.imp[ 0 ].bidfloor).to.equal(bidRequestWithBidfloorEquals1.params.bidfloor);

      stub.restore();
    });

    it('builds request banner object correctly', function () {
      let response;

      const bidRequestWithBanner = utils.deepClone(bidRequest);
      bidRequestWithBanner.mediaTypes = {
        banner: {
          sizes: [ [ 300, 250 ], [ 120, 600 ] ]
        }
      };

      response = spec.buildRequests([ bidRequestWithBanner ])[ 0 ];
      expect(response.data.imp[ 0 ].banner.w).to.equal(bidRequestWithBanner.mediaTypes.banner.sizes[ 0 ][ 0 ]);
      expect(response.data.imp[ 0 ].banner.h).to.equal(bidRequestWithBanner.mediaTypes.banner.sizes[ 0 ][ 1 ]);
      expect(response.data.imp[ 0 ].banner.pos).to.equal(0);
      expect(response.data.imp[ 0 ].banner.topframe).to.equal(0);

      const bidRequestWithPosEquals1 = utils.deepClone(bidRequestWithBanner);
      bidRequestWithPosEquals1.params.pos = 1;
      response = spec.buildRequests([ bidRequestWithPosEquals1 ])[ 0 ];
      expect(response.data.imp[ 0 ].banner.pos).to.equal(bidRequestWithPosEquals1.params.pos);
    });

    it('builds request video object correctly', function () {
      let response;

      const bidRequestWithVideo = utils.deepClone(bidRequest);
      bidRequestWithVideo.mediaTypes = {
        video: {
          sizes: [ [ 300, 250 ], [ 120, 600 ] ]
        }
      };

      response = spec.buildRequests([ bidRequestWithVideo ])[ 0 ];
      expect(response.data.imp[ 0 ].video.w).to.equal(bidRequestWithVideo.mediaTypes.video.sizes[ 0 ][ 0 ]);
      expect(response.data.imp[ 0 ].video.h).to.equal(bidRequestWithVideo.mediaTypes.video.sizes[ 0 ][ 1 ]);
      expect(response.data.imp[ 0 ].video.pos).to.equal(0);
      expect(response.data.imp[ 0 ].video.topframe).to.equal(0);

      const bidRequestWithPosEquals1 = utils.deepClone(bidRequestWithVideo);
      bidRequestWithPosEquals1.params.pos = 1;
      response = spec.buildRequests([ bidRequestWithPosEquals1 ])[ 0 ];
      expect(response.data.imp[ 0 ].video.pos).to.equal(bidRequestWithPosEquals1.params.pos);
    });
  });
  describe('interpretResponse', function () {
    const bannerBidRequest = {
      'adUnitCode': 'adunit-code',
      'auctionId': '1d1a030790a475',
      'mediaTypes': {
        banner: {}
      },
      'params': {
        'supplyPartnerId': supplyPartnerId
      },
      'sizes': [ [ 300, 250 ], [ 300, 600 ] ],
      'transactionId': 'a123456789',
      'bidId': '111'
    };
    const videoBidRequest = {
      'adUnitCode': 'adunit-code',
      'auctionId': '1d1a030790a475',
      'mediaTypes': {
        video: {}
      },
      'params': {
        'supplyPartnerId': supplyPartnerId
      },
      'sizes': [ [ 300, 250 ], [ 300, 600 ] ],
      'transactionId': 'a123456789',
      'bidId': '111'
    };
    const rtbResponse = {
      'id': 'imp_5b05b9fde4b09084267a556f',
      'bidid': 'imp_5b05b9fde4b09084267a556f',
      'cur': 'USD',
      'ext': {
        'utrk': [
          { 'type': 'iframe', 'url': '//p.gsh.io/user/sync/1' },
          { 'type': 'image', 'url': '//p.gsh.io/user/sync/2' }
        ]
      },
      'seatbid': [
        {
          'seat': 'seat1',
          'group': 0,
          'bid': [
            {
              'id': '0',
              'impid': '1',
              'price': 2.016,
              'adid': '579ef31bfa788b9d2000d562',
              'nurl': 'https://p.gsh.io/pix/monitoring/win_notice/imp_5b05b9fde4b09084267a556f/im.gif?r=imp_5b05b9fde4b09084267a556f&i=1&a=579ef31bfa788b9d2000d562&b=0&p=${AUCTION_PRICE}',
              'adm': '<img width="300px" height="250px" src="https://dummyimage.com/300x250/030d00/52b31e.gif&text=Gamoshi+Demo" onclick="window.open(\'https://www.gamoshi.com\')"> <img width="0px" height="0px" src="https://p.gsh.io/pix/monitoring/imp/imp_5b05b9fde4b09084267a556f/im.gif?r=imp_5b05b9fde4b09084267a556f&i=1&a=579ef31bfa788b9d2000d562&b=0"/>',
              'adomain': [ 'aaa.com' ],
              'cid': '579ef268fa788b9d2000d55c',
              'crid': '579ef31bfa788b9d2000d562',
              'attr': [],
              'h': 600,
              'w': 120,
              'ext': {
                'vast_url': 'http://my.vast.com',
                'utrk': [
                  { 'type': 'iframe', 'url': '//p.partner1.io/user/sync/1' }
                ]
              }
            }
          ]
        },
        {
          'seat': 'seat2',
          'group': 0,
          'bid': [
            {
              'id': '1',
              'impid': '1',
              'price': 3,
              'adid': '542jlhdfd2112jnjf3x',
              'nurl': 'https://p.gsh.io/pix/monitoring/win_notice/imp_5b05b9fde4b09084267a556f/im.gif?r=imp_5b05b9fde4b09084267a556f&i=1&a=579ef31bfa788b9d2000d562&b=0&p=${AUCTION_PRICE}',
              'adm': '<img width="300px" height="250px" src="https://dummyimage.com/300x250/030d00/52b31e.gif&text=Gamoshi+Demo" onclick="window.open(\'https://www.gamoshi.com\')"> <img width="0px" height="0px" src="https://p.gsh.io/pix/monitoring/imp/imp_5b05b9fde4b09084267a556f/im.gif?r=imp_5b05b9fde4b09084267a556f&i=1&a=579ef31bfa788b9d2000d562&b=0"/>',
              'adomain': [ 'bbb.com' ],
              'cid': 'fgdlwjh2498ydjhg1',
              'crid': 'kjh34297ydh2133d',
              'attr': [],
              'h': 250,
              'w': 300,
              'ext': {
                'utrk': [
                  { 'type': 'image', 'url': '//p.partner2.io/user/sync/1' }
                ]
              }
            }
          ]
        }
      ]
    };
    it('returns an empty array on missing response', function () {
      let response;

      response = spec.interpretResponse(undefined, { bidRequest: bannerBidRequest });
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(0);

      response = spec.interpretResponse({}, { bidRequest: bannerBidRequest });
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(0);
    });
    it('aggregates banner bids from all seat bids', function () {
      const response = spec.interpretResponse({ body: rtbResponse }, { bidRequest: bannerBidRequest });
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(2);

      const ad0 = response[ 0 ], ad1 = response[ 1 ];
      expect(ad0.requestId).to.equal(bannerBidRequest.bidId);
      expect(ad0.cpm).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].price);
      expect(ad0.width).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].w);
      expect(ad0.height).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].h);
      expect(ad0.ttl).to.equal(60 * 10);
      expect(ad0.creativeId).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].crid);
      expect(ad0.netRevenue).to.equal(true);
      expect(ad0.currency).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].cur || rtbResponse.cur || 'USD');
      expect(ad0.ad).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].adm);
      expect(ad0.vastXml).to.be.an('undefined');

      expect(ad1.requestId).to.equal(bannerBidRequest.bidId);
      expect(ad1.cpm).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].price);
      expect(ad1.width).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].w);
      expect(ad1.height).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].h);
      expect(ad1.ttl).to.equal(60 * 10);
      expect(ad1.creativeId).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].crid);
      expect(ad1.netRevenue).to.equal(true);
      expect(ad1.currency).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].cur || rtbResponse.cur || 'USD');
      expect(ad1.ad).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].adm);
      expect(ad1.vastXml).to.be.an('undefined');

      // expect(ad1.ad).to.be.an('undefined');
      // expect(ad1.vastXml).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].adm);
    });
    it('aggregates video bids from all seat bids', function () {
      const response = spec.interpretResponse({ body: rtbResponse }, { bidRequest: videoBidRequest });
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(2);

      const ad0 = response[ 0 ], ad1 = response[ 1 ];
      expect(ad0.requestId).to.equal(videoBidRequest.bidId);
      expect(ad0.cpm).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].price);
      expect(ad0.width).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].w);
      expect(ad0.height).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].h);
      expect(ad0.ttl).to.equal(60 * 10);
      expect(ad0.creativeId).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].crid);
      expect(ad0.netRevenue).to.equal(true);
      expect(ad0.currency).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].cur || rtbResponse.cur || 'USD');
      expect(ad0.ad).to.be.an('undefined');
      expect(ad0.vastXml).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].adm);
      expect(ad0.vastUrl).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].ext.vast_url);

      expect(ad1.requestId).to.equal(videoBidRequest.bidId);
      expect(ad1.cpm).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].price);
      expect(ad1.width).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].w);
      expect(ad1.height).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].h);
      expect(ad1.ttl).to.equal(60 * 10);
      expect(ad1.creativeId).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].crid);
      expect(ad1.netRevenue).to.equal(true);
      expect(ad1.currency).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].cur || rtbResponse.cur || 'USD');
      expect(ad1.ad).to.be.an('undefined');
      expect(ad1.vastXml).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].adm);
      expect(ad1.vastUrl).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].ext.vast_url);
    });
    it('aggregates user-sync pixels', function () {
      const response = spec.getUserSyncs({}, [ { body: rtbResponse } ]);
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(4);
      expect(response[ 0 ].type).to.equal(rtbResponse.ext.utrk[ 0 ].type);
      expect(response[ 0 ].url).to.equal(rtbResponse.ext.utrk[ 0 ].url + '?gc=missing');
      expect(response[ 1 ].type).to.equal(rtbResponse.ext.utrk[ 1 ].type);
      expect(response[ 1 ].url).to.equal(rtbResponse.ext.utrk[ 1 ].url + '?gc=missing');
      expect(response[ 2 ].type).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].ext.utrk[ 0 ].type);
      expect(response[ 2 ].url).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].ext.utrk[ 0 ].url + '?gc=missing');
      expect(response[ 3 ].type).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].ext.utrk[ 0 ].type);
      expect(response[ 3 ].url).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].ext.utrk[ 0 ].url + '?gc=missing');
    });
  });
});
