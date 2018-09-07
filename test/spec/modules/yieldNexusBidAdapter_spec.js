import { expect } from 'chai';
import { spec } from 'modules/yieldNexusBidAdapter';
import * as utils from 'src/utils';

const spid = '123';

describe('YieldNexusAdapter', () => {
  describe('isBidRequestValid', () => {
    it('should validate supply', () => {
      expect(spec.isBidRequestValid({ params: {} })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { spid: 123 } })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { spid: '123' } })).to.equal(true);
    });
    it('should validate bid floor', () => {
      expect(spec.isBidRequestValid({ params: { spid: '123' } })).to.equal(true); // bidfloor has a default
      expect(spec.isBidRequestValid({ params: { spid: '123', bidfloor: '123' } })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { spid: '123', bidfloor: 0.1 } })).to.equal(true);
    });
    it('should validate adpos', () => {
      expect(spec.isBidRequestValid({ params: { spid: '123' } })).to.equal(true); // adpos has a default
      expect(spec.isBidRequestValid({ params: { spid: '123', adpos: '123' } })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { spid: '123', adpos: 0.1 } })).to.equal(true);
    });
    it('should validate instl', () => {
      expect(spec.isBidRequestValid({ params: { spid: '123' } })).to.equal(true); // adpos has a default
      expect(spec.isBidRequestValid({ params: { spid: '123', instl: '123' } })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { spid: '123', instl: -1 } })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { spid: '123', instl: 0 } })).to.equal(true);
      expect(spec.isBidRequestValid({ params: { spid: '123', instl: 1 } })).to.equal(true);
      expect(spec.isBidRequestValid({ params: { spid: '123', instl: 2 } })).to.equal(false);
    });
  });
  describe('buildRequests', () => {
    const bidRequest = {
      'adUnitCode': 'adunit-code',
      'auctionId': 'fdkhjg3s7ahjja',
      'mediaTypes': {
        banner: {}
      },
      'params': { spid },
      'sizes': [ [ 300, 250 ], [ 300, 600 ] ]
    };

    it('returns an array', () => {
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

    it('uses yieldnexus dns', () => {
      const response = spec.buildRequests([ bidRequest ])[ 0 ];
      expect(response.method).to.equal('POST');
      expect(response.url).to.match(new RegExp(`^https://ssp\\.ynxs\\.io/r/${spid}/bidr\\?bidder=prebid&rformat=open_rtb&reqformat=rtb_json$`, 'g'));
      expect(response.data.id).to.equal(bidRequest.auctionId);
    });

    it('builds request correctly', () => {
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

    it('builds request banner object correctly', () => {
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

    it('builds request video object correctly', () => {
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
  describe('interpretResponse', () => {
    const bannerBidRequest = {
      'adUnitCode': 'adunit-code',
      'auctionId': 'fdkhjg3s7ahjja',
      'mediaTypes': {
        banner: {}
      },
      'params': {
        'spid': spid
      },
      'sizes': [ [ 300, 250 ], [ 300, 600 ] ],
      'bidId': '111'
    };
    const videoBidRequest = {
      'adUnitCode': 'adunit-code',
      'auctionId': 'fdkhjg3s7ahjja',
      'mediaTypes': {
        video: {}
      },
      'params': {
        'spid': spid
      },
      'sizes': [ [ 300, 250 ], [ 300, 600 ] ],
      'bidId': '111'
    };
    const rtbResponse = {
      'id': 'imp_5b05b9fde4b09084267a556f',
      'bidid': 'imp_5b05b9fde4b09084267a556f',
      'cur': 'USD',
      'ext': {
        'utrk': [
          { 'type': 'iframe', 'url': '//ssp.ynxs.io/user/sync/1' },
          { 'type': 'image', 'url': '//ssp.ynxs.io/user/sync/2' }
        ]
      },
      'seatbid': [
        {
          'seat': 'testSeatBidA',
          'bid': [
            {
              'id': '0',
              'impid': '1',
              'price': 2.016,
              'adm': '<img width="300px" height="250px" src="http://test.com/test.gif">',
              'adomain': [ 'nike.com' ],
              'h': 600,
              'w': 120,
              'ext': {
                'vast_url': 'http://vast.tag.com',
                'utrk': [
                  { 'type': 'iframe', 'url': '//pix.usersync.io/user-sync' }
                ]
              }
            }
          ]
        },
        {
          'seat': 'testSeatBidB',
          'bid': [
            {
              'id': '1',
              'impid': '1',
              'price': 3,
              'adid': '542jlhdfd2112jnjf3x',
              'adm': '<img width="300px" height="250px" src="http://test.com/test.gif">',
              'adomain': [ 'adidas.com' ],
              'h': 250,
              'w': 300,
              'ext': {
                'utrk': [
                  { 'type': 'image', 'url': '//pix.usersync.io/user-sync' }
                ]
              }
            }
          ]
        }
      ]
    };
    it('fails gracefully on empty response body', () => {
      let response;

      response = spec.interpretResponse(undefined, { bidRequest: bannerBidRequest });
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(0);

      response = spec.interpretResponse({}, { bidRequest: bannerBidRequest });
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(0);
    });
    it('collects banner bids', () => {
      const response = spec.interpretResponse({ body: rtbResponse }, { bidRequest: bannerBidRequest });
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(2);

      const ad0 = response[ 0 ], ad1 = response[ 1 ];
      expect(ad0.requestId).to.equal(bannerBidRequest.bidId);
      expect(ad0.cpm).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].price);
      expect(ad0.width).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].w);
      expect(ad0.height).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].h);
      expect(ad0.ttl).to.equal(15 * 60);
      expect(ad0.creativeId).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].crid);
      expect(ad0.netRevenue).to.equal(true);
      expect(ad0.currency).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].cur || rtbResponse.cur || 'USD');
      expect(ad0.ad).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].adm);
      expect(ad0.vastXml).to.be.an('undefined');

      expect(ad1.requestId).to.equal(bannerBidRequest.bidId);
      expect(ad1.cpm).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].price);
      expect(ad1.width).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].w);
      expect(ad1.height).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].h);
      expect(ad1.ttl).to.equal(15 * 60);
      expect(ad1.creativeId).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].crid);
      expect(ad1.netRevenue).to.equal(true);
      expect(ad1.currency).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].cur || rtbResponse.cur || 'USD');
      expect(ad1.ad).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].adm);
      expect(ad1.vastXml).to.be.an('undefined');

      // expect(ad1.ad).to.be.an('undefined');
      // expect(ad1.vastXml).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].adm);
    });
    it('collects video bids', () => {
      const response = spec.interpretResponse({ body: rtbResponse }, { bidRequest: videoBidRequest });
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(2);

      const ad0 = response[ 0 ], ad1 = response[ 1 ];
      expect(ad0.requestId).to.equal(videoBidRequest.bidId);
      expect(ad0.cpm).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].price);
      expect(ad0.width).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].w);
      expect(ad0.height).to.equal(rtbResponse.seatbid[ 0 ].bid[ 0 ].h);
      expect(ad0.ttl).to.equal(15 * 60);
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
      expect(ad1.ttl).to.equal(15 * 60);
      expect(ad1.creativeId).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].crid);
      expect(ad1.netRevenue).to.equal(true);
      expect(ad1.currency).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].cur || rtbResponse.cur || 'USD');
      expect(ad1.ad).to.be.an('undefined');
      expect(ad1.vastXml).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].adm);
      expect(ad1.vastUrl).to.equal(rtbResponse.seatbid[ 1 ].bid[ 0 ].ext.vast_url);
    });
    it('applies user-syncs', () => {
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
