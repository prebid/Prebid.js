import {expect} from 'chai';
import {spec, helper} from 'modules/cleanmedianetBidAdapter.js';
import * as utils from 'src/utils.js';
import {newBidder} from '../../../src/adapters/bidderFactory.js';

const supplyPartnerId = '123';
const adapter = newBidder(spec);
describe('CleanmedianetAdapter', function () {
  describe('Is String start with search ', function () {
    it('check if a string started with', function () {
      expect(helper.startsWith('cleanmediaads.com', 'cleanmediaads')).to.equal(
        true
      );
    });
  });

  describe('inherited functions', function() {
    it('exists and is a function', function() {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    it('should validate supply-partner ID', function() {
      expect(spec.isBidRequestValid({ params: {} })).to.equal(false);
      expect(
        spec.isBidRequestValid({ params: { supplyPartnerId: 123 } })
      ).to.equal(false);
      expect(
        spec.isBidRequestValid({ params: { supplyPartnerId: '123' } })
      ).to.equal(true);
    });

    it('should validate adpos', function() {
      expect(
        spec.isBidRequestValid({ params: { supplyPartnerId: '123' } })
      ).to.equal(true); // adpos has a default
      expect(
        spec.isBidRequestValid({
          params: { supplyPartnerId: '123', adpos: '123' }
        })
      ).to.equal(false);
      expect(
        spec.isBidRequestValid({
          params: { supplyPartnerId: '123', adpos: 0.1 }
        })
      ).to.equal(true);
    });

    it('should validate instl', function() {
      expect(
        spec.isBidRequestValid({ params: { supplyPartnerId: '123' } })
      ).to.equal(true); // adpos has a default
      expect(
        spec.isBidRequestValid({
          params: { supplyPartnerId: '123', instl: '123' }
        })
      ).to.equal(false);
      expect(
        spec.isBidRequestValid({
          params: { supplyPartnerId: '123', instl: -1 }
        })
      ).to.equal(false);
      expect(
        spec.isBidRequestValid({ params: { supplyPartnerId: '123', instl: 0 } })
      ).to.equal(true);
      expect(
        spec.isBidRequestValid({ params: { supplyPartnerId: '123', instl: 1 } })
      ).to.equal(true);
      expect(
        spec.isBidRequestValid({ params: { supplyPartnerId: '123', instl: 2 } })
      ).to.equal(false);
    });
  });

  describe('buildRequests', function() {
    const bidRequest = {
      adUnitCode: 'adunit-code',
      auctionId: '1d1a030790a475',
      mediaTypes: {
        banner: {}
      },
      params: {
        supplyPartnerId: supplyPartnerId
      },
      sizes: [[300, 250], [300, 600]],
      transactionId: 'a123456789',
      refererInfo: { referer: 'https://examplereferer.com', domain: 'examplereferer.com' },
      gdprConsent: {
        consentString: 'some string',
        gdprApplies: true
      }
    };
    it('returns an array', function() {
      let response;
      response = spec.buildRequests([]);
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(0);
      response = spec.buildRequests([bidRequest], bidRequest);
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(1);
      const adUnit1 = Object.assign({}, utils.deepClone(bidRequest), {
        auctionId: '1',
        adUnitCode: 'a'
      });
      const adUnit2 = Object.assign({}, utils.deepClone(bidRequest), {
        auctionId: '1',
        adUnitCode: 'b'
      });
      response = spec.buildRequests([adUnit1, adUnit2], bidRequest);
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(2);
    });

    it('builds request correctly', function() {
      let bidRequest2 = utils.deepClone(bidRequest);
      Object.assign(bidRequest2.refererInfo, {
        page: 'https://www.test.com/page.html',
        domain: 'test.com',
        ref: 'https://referer.com'
      })

      let response = spec.buildRequests([bidRequest], bidRequest2)[0];
      expect(response.data.site.domain).to.equal('test.com');
      expect(response.data.site.page).to.equal('https://www.test.com/page.html');
      expect(response.data.site.ref).to.equal('https://referer.com');
      expect(response.data.imp.length).to.equal(1);
      expect(response.data.imp[0].id).to.equal(bidRequest.transactionId);
      expect(response.data.imp[0].instl).to.equal(0);
      expect(response.data.imp[0].tagid).to.equal(bidRequest.adUnitCode);
      expect(response.data.imp[0].bidfloor).to.equal(0);
      expect(response.data.imp[0].bidfloorcur).to.equal('USD');
      const bidRequestWithInstlEquals1 = utils.deepClone(bidRequest);
      bidRequestWithInstlEquals1.params.instl = 1;
      response = spec.buildRequests(
        [bidRequestWithInstlEquals1],
        bidRequest2
      )[0];
      expect(response.data.imp[0].instl).to.equal(
        bidRequestWithInstlEquals1.params.instl
      );
      const bidRequestWithInstlEquals0 = utils.deepClone(bidRequest);
      bidRequestWithInstlEquals0.params.instl = 1;
      response = spec.buildRequests(
        [bidRequestWithInstlEquals0],
        bidRequest2
      )[0];
      expect(response.data.imp[0].instl).to.equal(
        bidRequestWithInstlEquals0.params.instl
      );
    });

    it('builds request banner object correctly', function() {
      let response;
      const bidRequestWithBanner = utils.deepClone(bidRequest);
      bidRequestWithBanner.mediaTypes = {
        banner: {
          sizes: [[300, 250], [120, 600]]
        }
      };
      response = spec.buildRequests([bidRequestWithBanner], bidRequest)[0];
      expect(response.data.imp[0].banner.w).to.equal(
        bidRequestWithBanner.mediaTypes.banner.sizes[0][0]
      );
      expect(response.data.imp[0].banner.h).to.equal(
        bidRequestWithBanner.mediaTypes.banner.sizes[0][1]
      );
      expect(response.data.imp[0].banner.pos).to.equal(0);
      const bidRequestWithPosEquals1 = utils.deepClone(bidRequestWithBanner);
      bidRequestWithPosEquals1.params.pos = 1;
      response = spec.buildRequests([bidRequestWithPosEquals1], bidRequest)[0];
      expect(response.data.imp[0].banner.pos).to.equal(
        bidRequestWithPosEquals1.params.pos
      );
    });

    it('builds request video object correctly', function() {
      let response;
      const bidRequestWithVideo = utils.deepClone(bidRequest);
      bidRequestWithVideo.mediaTypes = {
        video: {
          sizes: [[300, 250], [120, 600]]
        }
      };
      response = spec.buildRequests([bidRequestWithVideo], bidRequest)[0];
      expect(response.data.imp[0].video.w).to.equal(
        bidRequestWithVideo.mediaTypes.video.sizes[0][0]
      );
      expect(response.data.imp[0].video.h).to.equal(
        bidRequestWithVideo.mediaTypes.video.sizes[0][1]
      );
      expect(response.data.imp[0].video.pos).to.equal(0);
      const bidRequestWithPosEquals1 = utils.deepClone(bidRequestWithVideo);
      bidRequestWithPosEquals1.params.pos = 1;
      response = spec.buildRequests([bidRequestWithPosEquals1], bidRequest)[0];
      expect(response.data.imp[0].video.pos).to.equal(
        bidRequestWithPosEquals1.params.pos
      );
    });

    it('builds request video object correctly with context', function() {
      let response;
      const bidRequestWithVideo = utils.deepClone(bidRequest);
      bidRequestWithVideo.mediaTypes = {
        video: {
          context: 'instream'
        }
      };
      response = spec.buildRequests([bidRequestWithVideo], bidRequest)[0];
      expect(response.data.imp[0].video.ext.context).to.equal('instream');
      bidRequestWithVideo.mediaTypes.video.context = 'outstream';

      const bidRequestWithPosEquals1 = utils.deepClone(bidRequestWithVideo);
      bidRequestWithPosEquals1.mediaTypes.video.context = 'outstream';
      response = spec.buildRequests([bidRequestWithPosEquals1], bidRequest)[0];
      expect(response.data.imp[0].video.ext.context).to.equal('outstream');

      const bidRequestWithPosEquals2 = utils.deepClone(bidRequestWithVideo);
      bidRequestWithPosEquals2.mediaTypes.video.context = null;
      response = spec.buildRequests([bidRequestWithPosEquals2], bidRequest)[0];
      expect(response.data.imp[0].video.ext.context).to.equal(null);
    });
    it('builds request video object correctly with multi-dimensions size array', function () {
      let bidRequestWithVideo = utils.deepClone(bidRequest);
      bidRequestWithVideo.mediaTypes.video = {
        playerSize: [[304, 254], [305, 255]],
        context: 'instream'
      };

      let response = spec.buildRequests([bidRequestWithVideo], bidRequest)[0];
      expect(response.data.imp[1].video.w).to.equal(304);
      expect(response.data.imp[1].video.h).to.equal(254);

      bidRequestWithVideo = utils.deepClone(bidRequest);
      bidRequestWithVideo.mediaTypes.video = {
        playerSize: [304, 254]
      };

      response = spec.buildRequests([bidRequestWithVideo], bidRequest)[0];
      expect(response.data.imp[1].video.w).to.equal(304);
      expect(response.data.imp[1].video.h).to.equal(254);
    });

    it('builds request with gdpr consent', function() {
      let response = spec.buildRequests([bidRequest], bidRequest)[0];
      expect(response.data.ext).to.have.property('gdpr_consent');
      expect(response.data.ext.gdpr_consent.consent_string).to.equal(
        'some string'
      );
      expect(response.data.ext.gdpr_consent.consent_required).to.equal(true);
    });
  });

  describe('interpretResponse', function() {
    const bannerBidRequest = {
      adUnitCode: 'adunit-code',
      auctionId: '1d1a030790a475',
      mediaTypes: {
        banner: {}
      },
      params: {
        supplyPartnerId: supplyPartnerId
      },
      sizes: [[300, 250], [300, 600]],
      transactionId: 'a123456789',
      bidId: '111',
      refererInfo: { referer: 'https://examplereferer.com' }
    };

    const videoBidRequest = {
      adUnitCode: 'adunit-code',
      auctionId: '1d1a030790a475',
      mediaTypes: {
        video: {}
      },
      params: {
        supplyPartnerId: supplyPartnerId
      },
      sizes: [[300, 250], [300, 600]],
      transactionId: 'a123456789',
      bidId: '111',
      refererInfo: { referer: 'https://examplereferer.com' }
    };

    const rtbResponse = {
      id: 'imp_5b05b9fde4b09084267a556f',
      bidid: 'imp_5b05b9fde4b09084267a556f',
      cur: 'USD',
      ext: {
        utrk: [
          { type: 'iframe', url: '//bidder.cleanmediaads.com/user/sync/1' },
          { type: 'image', url: '//bidder.cleanmediaads.com/user/sync/2' }
        ]
      },
      seatbid: [
        {
          seat: 'seat1',
          group: 0,
          bid: [
            {
              id: '0',
              impid: '1',
              price: 2.016,
              adid: '579ef31bfa788b9d2000d562',
              nurl:
                'https://bidder.cleanmediaads.com/pix/monitoring/win_notice/imp_5b05b9fde4b09084267a556f/im.gif?r=imp_5b05b9fde4b09084267a556f&i=1&a=579ef31bfa788b9d2000d562&b=0',
              adm:
                '<?xml version="1.0" encoding="UTF-8"?><VAST version="2.0">↵<Ad id="99aaef40-bbc0-4829-8599-f5313ea27ee9">↵<Wrapper>↵<AdSystem version="2.0"><![CDATA[cleanmediaads.com]]></AdSystem>↵<VASTAdTagURI><![CDATA[https://static.gambid.io/demo/vast.xml]]></VASTAdTagURI>↵<Error><![CDATA[https://bidder.cleanmediaads.com/pix/1707/verror/imp_5c4dcd32e4b044440442782e/im.gif?r=imp_5c4dcd32e4b044440442782e&i=99aaef40-bbc0-4829-8599-f5313ea27ee9&a=1274&b=gb_1&error=[ERRORCODE]]]></Error>↵<Impression><![CDATA[https://bidder.cleanmediaads.com/pix/1707/vimp/imp_5c4dcd32e4b044440442782e/im.gif?r=imp_5c4dcd32e4b044440442782e&i=99aaef40-bbc0-4829-8599-f5313ea27ee9&a=1274&b=gb_1]]></Impression>↵<Creatives>↵<Creative AdID="1274">↵<Linear>↵<TrackingEvents>↵<Tracking event="start"><![CDATA[https://bidder.cleanmediaads.com/pix/1707/start/imp_5c4dcd32e4b044440442782e/im.gif?r=imp_5c4dcd32e4b044440442782e&i=99aaef40-bbc0-4829-8599-f5313ea27ee9&a=1274&b=gb_1]]></Tracking>↵<Tracking event="firstQuartile"><![CDATA[https://bidder.cleanmediaads.com/pix/1707/fq/imp_5c4dcd32e4b044440442782e/im.gif?r=imp_5c4dcd32e4b044440442782e&i=99aaef40-bbc0-4829-8599-f5313ea27ee9&a=1274&b=gb_1]]></Tracking>↵<Tracking event="midpoint"><![CDATA[https://bidder.cleanmediaads.com/pix/1707/mp/imp_5c4dcd32e4b044440442782e/im.gif?r=imp_5c4dcd32e4b044440442782e&i=99aaef40-bbc0-4829-8599-f5313ea27ee9&a=1274&b=gb_1]]></Tracking>↵<Tracking event="thirdQuartile"><![CDATA[https://bidder.cleanmediaads.com/pix/1707/tq/imp_5c4dcd32e4b044440442782e/im.gif?r=imp_5c4dcd32e4b044440442782e&i=99aaef40-bbc0-4829-8599-f5313ea27ee9&a=1274&b=gb_1]]></Tracking>↵<Tracking event="complete"><![CDATA[https://bidder.cleanmediaads.com/pix/1707/comp/imp_5c4dcd32e4b044440442782e/im.gif?r=imp_5c4dcd32e4b044440442782e&i=99aaef40-bbc0-4829-8599-f5313ea27ee9&a=1274&b=gb_1]]></Tracking>↵</TrackingEvents>↵</Linear>↵</Creative>↵</Creatives>↵</Wrapper></Ad>↵</VAST>',
              adomain: ['aaa.com'],
              cid: '579ef268fa788b9d2000d55c',
              crid: '579ef31bfa788b9d2000d562',
              attr: [],
              h: 600,
              w: 120,
              ext: {
                vast_url: 'https://my.vast.com',
                utrk: [{ type: 'iframe', url: '//p.partner1.io/user/sync/1' }]
              }
            }
          ]
        },
        {
          seat: 'seat2',
          group: 0,
          bid: [
            {
              id: '1',
              impid: '1',
              price: 3,
              adid: '542jlhdfd2112jnjf3x',
              nurl:
                'https://bidder.cleanmediaads.com/pix/monitoring/win_notice/imp_5b05b9fde4b09084267a556f/im.gif?r=imp_5b05b9fde4b09084267a556f&i=1&a=579ef31bfa788b9d2000d562&b=0',
              adm:
                '<img width="300px" height="250px" src="https://dummyimage.com/300x250/030d00/52b31e.gif&text=Cleanmedia+Demo" onclick="window.open(\'https://www.cleanmediaads.com\')"> <img width="0px" height="0px" src="https://bidder.cleanmediaads.com/pix/monitoring/imp/imp_5b05b9fde4b09084267a556f/im.gif?r=imp_5b05b9fde4b09084267a556f&i=1&a=579ef31bfa788b9d2000d562&b=0"/>',
              adomain: ['bbb.com'],
              cid: 'fgdlwjh2498ydjhg1',
              crid: 'kjh34297ydh2133d',
              attr: [],
              h: 250,
              w: 300,
              ext: {
                utrk: [{ type: 'image', url: '//p.partner2.io/user/sync/1' }]
              }
            }
          ]
        }
      ]
    };

    it('returns an empty array on missing response', function() {
      let response;

      response = spec.interpretResponse(undefined, {
        bidRequest: bannerBidRequest
      });
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(0);

      response = spec.interpretResponse({}, { bidRequest: bannerBidRequest });
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(0);
    });

    it('aggregates banner bids from all seat bids', function() {
      const response = spec.interpretResponse(
        { body: rtbResponse },
        { bidRequest: bannerBidRequest }
      );
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(1);

      const ad0 = response[0];
      expect(ad0.requestId).to.equal(bannerBidRequest.bidId);
      expect(ad0.cpm).to.equal(rtbResponse.seatbid[1].bid[0].price);
      expect(ad0.width).to.equal(rtbResponse.seatbid[1].bid[0].w);
      expect(ad0.height).to.equal(rtbResponse.seatbid[1].bid[0].h);
      expect(ad0.ttl).to.equal(360);
      expect(ad0.creativeId).to.equal(rtbResponse.seatbid[1].bid[0].crid);
      expect(ad0.netRevenue).to.equal(true);
      expect(ad0.currency).to.equal(
        rtbResponse.seatbid[1].bid[0].cur || rtbResponse.cur || 'USD'
      );
      expect(ad0.ad).to.equal(rtbResponse.seatbid[1].bid[0].adm);
      expect(ad0.vastXml).to.be.an('undefined');
      expect(ad0.vastUrl).to.be.an('undefined');
    });

    it('aggregates video bids from all seat bids', function() {
      const response = spec.interpretResponse(
        { body: rtbResponse },
        { bidRequest: videoBidRequest }
      );
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(1);

      const ad0 = response[0];
      expect(ad0.requestId).to.equal(videoBidRequest.bidId);
      expect(ad0.cpm).to.equal(rtbResponse.seatbid[0].bid[0].price);
      expect(ad0.width).to.equal(rtbResponse.seatbid[0].bid[0].w);
      expect(ad0.height).to.equal(rtbResponse.seatbid[0].bid[0].h);
      expect(ad0.ttl).to.equal(360);
      expect(ad0.creativeId).to.equal(rtbResponse.seatbid[0].bid[0].crid);
      expect(ad0.netRevenue).to.equal(true);
      expect(ad0.currency).to.equal(
        rtbResponse.seatbid[0].bid[0].cur || rtbResponse.cur || 'USD'
      );
      expect(ad0.ad).to.be.an('undefined');
      expect(ad0.vastXml).to.equal(rtbResponse.seatbid[0].bid[0].adm);
      expect(ad0.vastUrl).to.equal(rtbResponse.seatbid[0].bid[0].ext.vast_url);
    });

    it('aggregates user-sync pixels', function() {
      const response = spec.getUserSyncs({}, [{ body: rtbResponse }]);
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(4);
      expect(response[0].type).to.equal(rtbResponse.ext.utrk[0].type);
      expect(response[0].url).to.equal(
        rtbResponse.ext.utrk[0].url + '?gc=missing'
      );
      expect(response[1].type).to.equal(rtbResponse.ext.utrk[1].type);
      expect(response[1].url).to.equal(
        rtbResponse.ext.utrk[1].url + '?gc=missing'
      );
      expect(response[2].type).to.equal(
        rtbResponse.seatbid[0].bid[0].ext.utrk[0].type
      );
      expect(response[2].url).to.equal(
        rtbResponse.seatbid[0].bid[0].ext.utrk[0].url + '?gc=missing'
      );
      expect(response[3].type).to.equal(
        rtbResponse.seatbid[1].bid[0].ext.utrk[0].type
      );
      expect(response[3].url).to.equal(
        rtbResponse.seatbid[1].bid[0].ext.utrk[0].url + '?gc=missing'
      );
    });

    it('supports configuring outstream renderers', function() {
      const videoResponse = {
        id: '64f32497-b2f7-48ec-9205-35fc39894d44',
        bidid: 'imp_5c24924de4b0d106447af333',
        cur: 'USD',
        seatbid: [
          {
            seat: '3668',
            group: 0,
            bid: [
              {
                id: 'gb_1',
                impid: 'afbb5852-7cea-4a81-aa9a-a41aab505c23',
                price: 5.0,
                adid: '1274',
                nurl:
                  'https://bidder.cleanmediaads.com/pix/1275/win_notice/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1',
                adomain: [],
                adm:
                  '<?xml version="1.0" encoding="UTF-8"?><VAST version="2.0">\n<Ad id="afbb5852-7cea-4a81-aa9a-a41aab505c23">\n<Wrapper>\n<AdSystem version="2.0"><![CDATA[cleanmediaads.com]]></AdSystem>\n<VASTAdTagURI><![CDATA[https://static.gambid.io/demo/vast.xml]]></VASTAdTagURI>\n<Error><![CDATA[https://bidder.cleanmediaads.com/pix/1275/verror/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1&error=[ERRORCODE]]]></Error>\n<Impression><![CDATA[https://bidder.cleanmediaads.com/pix/1275/vimp/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Impression>\n<Creatives>\n<Creative AdID="1274">\n<Linear>\n<TrackingEvents>\n<Tracking event="start"><![CDATA[https://bidder.cleanmediaads.com/pix/1275/start/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n<Tracking event="firstQuartile"><![CDATA[https://bidder.cleanmediaads.com/pix/1275/fq/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n<Tracking event="midpoint"><![CDATA[https://bidder.cleanmediaads.com/pix/1275/mp/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n<Tracking event="thirdQuartile"><![CDATA[https://bidder.cleanmediaads.com/pix/1275/tq/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n<Tracking event="complete"><![CDATA[https://bidder.cleanmediaads.com/pix/1275/comp/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n</TrackingEvents>\n</Linear>\n</Creative>\n</Creatives>\n</Wrapper>\n</Ad>\n</VAST>\n',
                cid: '3668',
                crid: '1274',
                cat: [],
                attr: [],
                h: 250,
                w: 300,
                ext: {
                  vast_url:
                    'https://bidder.cleanmediaads.com/pix/1275/vast_o/imp_5c24924de4b0d106447af333/im.xml?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1&w=300&h=250&vatu=aHR0cHM6Ly9zdGF0aWMuZ2FtYmlkLmlvL2RlbW8vdmFzdC54bWw&vwarv',
                  imptrackers: [
                    'https://bidder.cleanmediaads.com/pix/1275/imp/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1'
                  ]
                }
              }
            ]
          }
        ],
        ext: {
          utrk: [
            {
              type: 'image',
              url:
                'https://bidder.cleanmediaads.com/pix/1275/scm?cb=1545900621675'
            }
          ]
        }
      };
      const videoRequest = utils.deepClone(videoBidRequest);
      videoRequest.mediaTypes.video.context = 'outstream';
      const result = spec.interpretResponse(
        { body: videoResponse },
        { bidRequest: videoRequest }
      );
      expect(result[0].renderer).to.not.equal(undefined);
    });

    it('validates in/existing of gdpr consent', function() {
      let videoResponse = {
        id: '64f32497-b2f7-48ec-9205-35fc39894d44',
        bidid: 'imp_5c24924de4b0d106447af333',
        cur: 'USD',
        seatbid: [
          {
            seat: '3668',
            group: 0,
            bid: [
              {
                id: 'gb_1',
                impid: 'afbb5852-7cea-4a81-aa9a-a41aab505c23',
                price: 5.0,
                adid: '1274',
                nurl:
                  'https://bidder.cleanmediaads.com/pix/1275/win_notice/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1',
                adomain: [],
                adm:
                  '<?xml version="1.0" encoding="UTF-8"?><VAST version="2.0">\n<Ad id="afbb5852-7cea-4a81-aa9a-a41aab505c23">\n<Wrapper>\n<AdSystem version="2.0"><![CDATA[cleanmediaads.com]]></AdSystem>\n<VASTAdTagURI><![CDATA[https://static.gambid.io/demo/vast.xml]]></VASTAdTagURI>\n<Error><![CDATA[https://bidder.cleanmediaads.com/pix/1275/verror/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1&error=[ERRORCODE]]]></Error>\n<Impression><![CDATA[https://bidder.cleanmediaads.com/pix/1275/vimp/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Impression>\n<Creatives>\n<Creative AdID="1274">\n<Linear>\n<TrackingEvents>\n<Tracking event="start"><![CDATA[https://bidder.cleanmediaads.com/pix/1275/start/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n<Tracking event="firstQuartile"><![CDATA[https://bidder.cleanmediaads.com/pix/1275/fq/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n<Tracking event="midpoint"><![CDATA[https://bidder.cleanmediaads.com/pix/1275/mp/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n<Tracking event="thirdQuartile"><![CDATA[https://bidder.cleanmediaads.com/pix/1275/tq/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n<Tracking event="complete"><![CDATA[https://bidder.cleanmediaads.com/pix/1275/comp/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n</TrackingEvents>\n</Linear>\n</Creative>\n</Creatives>\n</Wrapper>\n</Ad>\n</VAST>\n',
                cid: '3668',
                crid: '1274',
                cat: [],
                attr: [],
                h: 250,
                w: 300,
                ext: {
                  vast_url:
                    'https://bidder.cleanmediaads.com/pix/1275/vast_o/imp_5c24924de4b0d106447af333/im.xml?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1&w=300&h=250&vatu=aHR0cHM6Ly9zdGF0aWMuZ2FtYmlkLmlvL2RlbW8vdmFzdC54bWw&vwarv',
                  imptrackers: [
                    'https://bidder.cleanmediaads.com/pix/1275/imp/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1'
                  ]
                }
              }
            ]
          }
        ],
        ext: {
          utrk: [
            {
              type: 'image',
              url:
                'https://bidder.cleanmediaads.com/pix/1275/scm?cb=1545900621675'
            }
          ]
        }
      };
      let gdprConsent = {
        gdprApplies: true,
        consentString: 'consent string'
      };
      let result = spec.getUserSyncs(
        {},
        [{ body: videoResponse }],
        gdprConsent
      );
      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal(
        'https://bidder.cleanmediaads.com/pix/1275/scm?cb=1545900621675&gc=consent%20string'
      );

      gdprConsent.gdprApplies = false;
      result = spec.getUserSyncs({}, [{ body: videoResponse }], gdprConsent);
      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal(
        'https://bidder.cleanmediaads.com/pix/1275/scm?cb=1545900621675&gc=missing'
      );

      videoResponse.ext.utrk[0].url =
        'https://bidder.cleanmediaads.com/pix/1275/scm';
      result = spec.getUserSyncs({}, [{ body: videoResponse }], gdprConsent);
      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal(
        'https://bidder.cleanmediaads.com/pix/1275/scm?gc=missing'
      );
    });
  });
});
