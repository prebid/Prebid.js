import {expect} from 'chai';
import {spec, helper} from 'modules/gamoshiBidAdapter';
import * as utils from 'src/utils';
import {newBidder} from '../../../src/adapters/bidderFactory';

const supplyPartnerId = '123';
const adapter = newBidder(spec);
const TTL = 360;

describe('GamoshiAdapter', () => {
  let schainConfig,
    bidRequest,
    bannerBidRequest,
    videoBidRequest,
    rtbResponse,
    videoResponse,
    gdprConsent;

  beforeEach(() => {
    schainConfig = {
      'ver': '1.0',
      'complete': 1,
      'nodes': [
        {
          'asi': 'indirectseller.com',
          'sid': '00001',
          'hp': 1
        },

        {
          'asi': 'indirectseller-2.com',
          'sid': '00002',
          'hp': 2
        }
      ]
    };

    bidRequest = {
      'adUnitCode': 'adunit-code',
      'auctionId': '1d1a030790a475',
      'mediaTypes': {
        banner: {}
      },
      'params': {
        'supplyPartnerId': supplyPartnerId
      },
      'sizes': [[300, 250], [300, 600]],
      'transactionId': 'a123456789',
      refererInfo: {referer: 'http://examplereferer.com'},
      gdprConsent: {
        consentString: 'some string',
        gdprApplies: true
      },
      schain: schainConfig,
      uspConsent: 'gamoshiCCPA'
    };

    bannerBidRequest = {
      'adUnitCode': 'adunit-code',
      'auctionId': '1d1a030790a475',
      'mediaTypes': {
        banner: {}
      },
      'params': {
        'supplyPartnerId': supplyPartnerId
      },
      'sizes': [[300, 250], [300, 600]],
      'transactionId': 'a123456789',
      'bidId': '111',
      refererInfo: {referer: 'http://examplereferer.com'}
    };

    videoBidRequest = {
      'adUnitCode': 'adunit-code',
      'auctionId': '1d1a030790a475',
      'mediaTypes': {
        video: {}
      },
      'params': {
        'supplyPartnerId': supplyPartnerId
      },
      'sizes': [[300, 250], [300, 600]],
      'transactionId': 'a123456789',
      'bidId': '111',
      refererInfo: {referer: 'http://examplereferer.com'}
    };

    rtbResponse = {
      'id': 'imp_5b05b9fde4b09084267a556f',
      'bidid': 'imp_5b05b9fde4b09084267a556f',
      'cur': 'USD',
      'ext': {
        'utrk': [
          {'type': 'iframe', 'url': '//rtb.gamoshi.io/user/sync/1?gdpr=[GDPR]&consent=[CONSENT]&usp=[US_PRIVACY]'},
          {'type': 'image', 'url': '//rtb.gamoshi.io/user/sync/2'}
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
              'nurl': 'https://rtb.gamoshi.io/pix/monitoring/win_notice/imp_5b05b9fde4b09084267a556f/im.gif?r=imp_5b05b9fde4b09084267a556f&i=1&a=579ef31bfa788b9d2000d562&b=0',
              'adm': '<?xml version="1.0" encoding="UTF-8"?><VAST version="2.0">↵<Ad id="99aaef40-bbc0-4829-8599-f5313ea27ee9">↵<Wrapper>↵<AdSystem version="2.0"><![CDATA[gamoshi.io]]></AdSystem>↵<VASTAdTagURI><![CDATA[https://static.gambid.io/demo/vast.xml]]></VASTAdTagURI>↵<Error><![CDATA[https://rtb.gamoshi.io/pix/1707/verror/imp_5c4dcd32e4b044440442782e/im.gif?r=imp_5c4dcd32e4b044440442782e&i=99aaef40-bbc0-4829-8599-f5313ea27ee9&a=1274&b=gb_1&error=[ERRORCODE]]]></Error>↵<Impression><![CDATA[https://rtb.gamoshi.io/pix/1707/vimp/imp_5c4dcd32e4b044440442782e/im.gif?r=imp_5c4dcd32e4b044440442782e&i=99aaef40-bbc0-4829-8599-f5313ea27ee9&a=1274&b=gb_1]]></Impression>↵<Creatives>↵<Creative AdID="1274">↵<Linear>↵<TrackingEvents>↵<Tracking event="start"><![CDATA[https://rtb.gamoshi.io/pix/1707/start/imp_5c4dcd32e4b044440442782e/im.gif?r=imp_5c4dcd32e4b044440442782e&i=99aaef40-bbc0-4829-8599-f5313ea27ee9&a=1274&b=gb_1]]></Tracking>↵<Tracking event="firstQuartile"><![CDATA[https://rtb.gamoshi.io/pix/1707/fq/imp_5c4dcd32e4b044440442782e/im.gif?r=imp_5c4dcd32e4b044440442782e&i=99aaef40-bbc0-4829-8599-f5313ea27ee9&a=1274&b=gb_1]]></Tracking>↵<Tracking event="midpoint"><![CDATA[https://rtb.gamoshi.io/pix/1707/mp/imp_5c4dcd32e4b044440442782e/im.gif?r=imp_5c4dcd32e4b044440442782e&i=99aaef40-bbc0-4829-8599-f5313ea27ee9&a=1274&b=gb_1]]></Tracking>↵<Tracking event="thirdQuartile"><![CDATA[https://rtb.gamoshi.io/pix/1707/tq/imp_5c4dcd32e4b044440442782e/im.gif?r=imp_5c4dcd32e4b044440442782e&i=99aaef40-bbc0-4829-8599-f5313ea27ee9&a=1274&b=gb_1]]></Tracking>↵<Tracking event="complete"><![CDATA[https://rtb.gamoshi.io/pix/1707/comp/imp_5c4dcd32e4b044440442782e/im.gif?r=imp_5c4dcd32e4b044440442782e&i=99aaef40-bbc0-4829-8599-f5313ea27ee9&a=1274&b=gb_1]]></Tracking>↵</TrackingEvents>↵</Linear>↵</Creative>↵</Creatives>↵</Wrapper></Ad>↵</VAST>',
              'adomain': ['aaa.com'],
              'cid': '579ef268fa788b9d2000d55c',
              'crid': '579ef31bfa788b9d2000d562',
              'attr': [],
              'h': 600,
              'w': 120,
              'ext': {
                'vast_url': 'http://my.vast.com',
                'utrk': [
                  {'type': 'iframe', 'url': '//p.partner1.io/user/sync/1'}
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
              'nurl': 'https://rtb.gamoshi.io/pix/monitoring/win_notice/imp_5b05b9fde4b09084267a556f/im.gif?r=imp_5b05b9fde4b09084267a556f&i=1&a=579ef31bfa788b9d2000d562&b=0',
              'adm': '<img width="300px" height="250px" src="https://dummyimage.com/300x250/030d00/52b31e.gif&text=Gamoshi+Demo" onclick="window.open(\'https://www.gamoshi.com\')"> <img width="0px" height="0px" src="https://rtb.gamoshi.io/pix/monitoring/imp/imp_5b05b9fde4b09084267a556f/im.gif?r=imp_5b05b9fde4b09084267a556f&i=1&a=579ef31bfa788b9d2000d562&b=0"/>',
              'adomain': ['bbb.com'],
              'cid': 'fgdlwjh2498ydjhg1',
              'crid': 'kjh34297ydh2133d',
              'attr': [],
              'h': 250,
              'w': 300,
              'ext': {
                'utrk': [
                  {'type': 'image', 'url': '//p.partner2.io/user/sync/1'}
                ]
              }
            }
          ]
        }
      ]
    };

    videoResponse = {
      'id': '64f32497-b2f7-48ec-9205-35fc39894d44',
      'bidid': 'imp_5c24924de4b0d106447af333',
      'cur': 'USD',
      'seatbid': [
        {
          'seat': '3668',
          'group': 0,
          'bid': [
            {
              'id': 'gb_1',
              'impid': 'afbb5852-7cea-4a81-aa9a-a41aab505c23',
              'price': 5.0,
              'adid': '1274',
              'nurl': 'https://rtb.gamoshi.io/pix/1275/win_notice/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1',
              'adomain': [],
              'adm': '<?xml version=\"1.0\" encoding=\"UTF-8\"?><VAST version=\"2.0\">\n<Ad id=\"afbb5852-7cea-4a81-aa9a-a41aab505c23\">\n<Wrapper>\n<AdSystem version=\"2.0\"><![CDATA[gamoshi.io]]></AdSystem>\n<VASTAdTagURI><![CDATA[https://static.gambid.io/demo/vast.xml]]></VASTAdTagURI>\n<Error><![CDATA[https://rtb.gamoshi.io/pix/1275/verror/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1&error=[ERRORCODE]]]></Error>\n<Impression><![CDATA[https://rtb.gamoshi.io/pix/1275/vimp/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Impression>\n<Creatives>\n<Creative AdID=\"1274\">\n<Linear>\n<TrackingEvents>\n<Tracking event=\"start\"><![CDATA[https://rtb.gamoshi.io/pix/1275/start/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n<Tracking event=\"firstQuartile\"><![CDATA[https://rtb.gamoshi.io/pix/1275/fq/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n<Tracking event=\"midpoint\"><![CDATA[https://rtb.gamoshi.io/pix/1275/mp/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n<Tracking event=\"thirdQuartile\"><![CDATA[https://rtb.gamoshi.io/pix/1275/tq/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n<Tracking event=\"complete\"><![CDATA[https://rtb.gamoshi.io/pix/1275/comp/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1]]></Tracking>\n</TrackingEvents>\n</Linear>\n</Creative>\n</Creatives>\n</Wrapper>\n</Ad>\n</VAST>\n',
              'cid': '3668',
              'crid': '1274',
              'cat': [],
              'attr': [],
              'h': 250,
              'w': 300,
              'ext': {
                'vast_url': 'https://rtb.gamoshi.io/pix/1275/vast_o/imp_5c24924de4b0d106447af333/im.xml?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1&w=300&h=250&vatu=aHR0cHM6Ly9zdGF0aWMuZ2FtYmlkLmlvL2RlbW8vdmFzdC54bWw&vwarv',
                'imptrackers': [
                  'https://rtb.gamoshi.io/pix/1275/imp/imp_5c24924de4b0d106447af333/im.gif?r=imp_5c24924de4b0d106447af333&i=afbb5852-7cea-4a81-aa9a-a41aab505c23&a=1274&b=gb_1']
              }
            }
          ]
        }
      ],
      'ext': {
        'utrk': [{
          'type': 'image',
          'url': 'https://rtb.gamoshi.io/pix/1275/scm?cb=1545900621675&gdpr=[GDPR]&consent=[CONSENT]&us_privacy=[US_PRIVACY]'
        }]
      }
    };

    gdprConsent = {
      gdprApplies: true,
      consentString: 'consent string'
    };
  });

  describe('Get top Frame', () => {
    it('check if you are in the top frame', () => {
      expect(helper.getTopFrame()).to.equal(0);
    });

    it('verify domain parsing', () => {
      expect(helper.getTopWindowDomain('http://www.domain.com')).to.equal('www.domain.com');
    });
  });

  describe('Is String start with search', () => {
    it('check if a string started with', () => {
      expect(helper.startsWith('gamoshi.com', 'gamo')).to.equal(true);
    });
  });

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('should validate supply-partner ID', () => {
      expect(spec.isBidRequestValid({params: {}})).to.equal(false);
      expect(spec.isBidRequestValid({params: {supplyPartnerId: 123}})).to.equal(false);
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123'}})).to.equal(true);
    });

    it('should validate RTB endpoint', () => {
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123'}})).to.equal(true); // RTB endpoint has a default
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', rtbEndpoint: 123}})).to.equal(false);
      expect(spec.isBidRequestValid({
        params: {
          supplyPartnerId: '123',
          rtbEndpoint: 'https://some.url.com'
        }
      })).to.equal(true);
    });

    it('should validate bid floor', () => {
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123'}})).to.equal(true); // bidfloor has a default
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', bidfloor: '123'}})).to.equal(false);
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', bidfloor: 0.1}})).to.equal(true);
    });

    it('should validate adpos', () => {
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123'}})).to.equal(true); // adpos has a default
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', adpos: '123'}})).to.equal(false);
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', adpos: 0.1}})).to.equal(true);
    });

    it('should validate instl', () => {
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123'}})).to.equal(true); // adpos has a default
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', instl: '123'}})).to.equal(false);
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', instl: -1}})).to.equal(false);
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', instl: 0}})).to.equal(true);
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', instl: 1}})).to.equal(true);
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', instl: 2}})).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    it('returns an array', () => {
      let response;
      response = spec.buildRequests([]);
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(0);
      response = spec.buildRequests([bidRequest], bidRequest);
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(1);
      const adUnit1 = Object.assign({}, utils.deepClone(bidRequest), {auctionId: '1', adUnitCode: 'a'});
      const adUnit2 = Object.assign({}, utils.deepClone(bidRequest), {auctionId: '1', adUnitCode: 'b'});
      response = spec.buildRequests([adUnit1, adUnit2], bidRequest);
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(2);
    });

    it('targets correct endpoint', () => {
      let response;
      response = spec.buildRequests([bidRequest], bidRequest)[0];
      expect(response.method).to.equal('POST');
      expect(response.url).to.match(new RegExp(`^https://rtb\\.gamoshi\\.io/r/${supplyPartnerId}/bidr\\?rformat=open_rtb&reqformat=rtb_json&bidder=prebid$`, 'g'));
      expect(response.data.id).to.equal(bidRequest.auctionId);
      const bidRequestWithEndpoint = utils.deepClone(bidRequest);
      bidRequestWithEndpoint.params.rtbEndpoint = 'https://rtb2.gamoshi.io/a12';
      response = spec.buildRequests([bidRequestWithEndpoint], bidRequest)[0];
      expect(response.url).to.match(new RegExp(`^https://rtb2\\.gamoshi\\.io/a12/r/${supplyPartnerId}/bidr\\?rformat=open_rtb&reqformat=rtb_json&bidder=prebid$`, 'g'));
    });

    it('builds request correctly', () => {
      let bidRequest2 = utils.deepClone(bidRequest);
      bidRequest2.refererInfo.referer = 'http://www.test.com/page.html';
      let response = spec.buildRequests([bidRequest], bidRequest2)[0];

      expect(response.data.site.domain).to.equal('www.test.com');
      expect(response.data.site.page).to.equal('http://www.test.com/page.html');
      expect(response.data.site.ref).to.equal('http://www.test.com/page.html');
      expect(response.data.imp.length).to.equal(1);
      expect(response.data.imp[0].id).to.equal(bidRequest.transactionId);
      expect(response.data.imp[0].instl).to.equal(0);
      expect(response.data.imp[0].tagid).to.equal(bidRequest.adUnitCode);
      expect(response.data.imp[0].bidfloor).to.equal(0);
      expect(response.data.imp[0].bidfloorcur).to.equal('USD');
      expect(response.data.regs.ext.us_privacy).to.equal('gamoshiCCPA');// USP/CCPAs
      expect(response.data.source.ext.schain).to.deep.equal(bidRequest2.schain);

      const bidRequestWithInstlEquals1 = utils.deepClone(bidRequest);
      bidRequestWithInstlEquals1.params.instl = 1;
      response = spec.buildRequests([bidRequestWithInstlEquals1], bidRequest2)[0];
      expect(response.data.imp[0].instl).to.equal(bidRequestWithInstlEquals1.params.instl);
      const bidRequestWithInstlEquals0 = utils.deepClone(bidRequest);
      bidRequestWithInstlEquals0.params.instl = 1;
      response = spec.buildRequests([bidRequestWithInstlEquals0], bidRequest2)[0];
      expect(response.data.imp[0].instl).to.equal(bidRequestWithInstlEquals0.params.instl);
      const bidRequestWithBidfloorEquals1 = utils.deepClone(bidRequest);
      bidRequestWithBidfloorEquals1.params.bidfloor = 1;
      response = spec.buildRequests([bidRequestWithBidfloorEquals1], bidRequest2)[0];
      expect(response.data.imp[0].bidfloor).to.equal(bidRequestWithBidfloorEquals1.params.bidfloor);
    });

    it('builds request banner object correctly', () => {
      let response;
      const bidRequestWithBanner = utils.deepClone(bidRequest);
      bidRequestWithBanner.mediaTypes = {
        banner: {
          sizes: [[300, 250], [120, 600]]
        }
      };
      response = spec.buildRequests([bidRequestWithBanner], bidRequest)[0];
      expect(response.data.imp[0].banner.w).to.equal(bidRequestWithBanner.mediaTypes.banner.sizes[0][0]);
      expect(response.data.imp[0].banner.h).to.equal(bidRequestWithBanner.mediaTypes.banner.sizes[0][1]);
      expect(response.data.imp[0].banner.pos).to.equal(0);
      expect(response.data.imp[0].banner.topframe).to.equal(0);
      const bidRequestWithPosEquals1 = utils.deepClone(bidRequestWithBanner);
      bidRequestWithPosEquals1.params.pos = 1;
      response = spec.buildRequests([bidRequestWithPosEquals1], bidRequest)[0];
      expect(response.data.imp[0].banner.pos).to.equal(bidRequestWithPosEquals1.params.pos);
    });

    it('builds request video object correctly', () => {
      let response;
      const bidRequestWithVideo = utils.deepClone(bidRequest);
      bidRequestWithVideo.mediaTypes = {
        video: {
          playerSize: [[302, 252]]
        }
      };
      response = spec.buildRequests([bidRequestWithVideo], bidRequest)[0];
      expect(response.data.imp[0].video.w).to.equal(bidRequestWithVideo.mediaTypes.video.playerSize[0][0]);
      expect(response.data.imp[0].video.h).to.equal(bidRequestWithVideo.mediaTypes.video.playerSize[0][1]);
      expect(response.data.imp[0].video.pos).to.equal(0);
      bidRequestWithVideo.mediaTypes = {
        video: {
          playerSize: [302, 252]
        }
      };

      const bidRequestWithPosEquals1 = utils.deepClone(bidRequestWithVideo);
      expect(response.data.imp[0].video.w).to.equal(bidRequestWithVideo.mediaTypes.video.playerSize[0]);
      expect(response.data.imp[0].video.h).to.equal(bidRequestWithVideo.mediaTypes.video.playerSize[1]);

      bidRequestWithPosEquals1.params.pos = 1;
      response = spec.buildRequests([bidRequestWithPosEquals1], bidRequest)[0];
      expect(response.data.imp[0].video.pos).to.equal(bidRequestWithPosEquals1.params.pos);
    });

    it('builds request video object correctly with context', () => {
      const bidRequestWithVideo = utils.deepClone(bidRequest);
      bidRequestWithVideo.mediaTypes = {
        video: {
          context: 'instream'
        }
      };
      let response = spec.buildRequests([bidRequestWithVideo], bidRequest)[0];
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

    it('builds request video object correctly with multi-dimensions size array', () => {
      let response;
      const bidRequestWithVideo = utils.deepClone(bidRequest);
      bidRequestWithVideo.mediaTypes.video = {
        playerSize: [[304, 254], [305, 255]],
        context: 'instream'
      };

      response = spec.buildRequests([bidRequestWithVideo], bidRequest)[0];
      expect(response.data.imp[1].video.ext.context).to.equal('instream');
      bidRequestWithVideo.mediaTypes.video.context = 'outstream';

      const bidRequestWithPosEquals1 = utils.deepClone(bidRequestWithVideo);
      bidRequestWithPosEquals1.mediaTypes.video.context = 'outstream';
      response = spec.buildRequests([bidRequestWithPosEquals1], bidRequest)[0];
      expect(response.data.imp[1].video.ext.context).to.equal('outstream');

      const bidRequestWithPosEquals2 = utils.deepClone(bidRequestWithVideo);
      bidRequestWithPosEquals2.mediaTypes.video.context = null;
      response = spec.buildRequests([bidRequestWithPosEquals2], bidRequest)[0];
      expect(response.data.imp[1].video.ext.context).to.equal(null);
    });

    it('builds request with gdpr consent', () => {
      let response = spec.buildRequests([bidRequest], bidRequest)[0];

      expect(response.data.ext.gdpr_consent).to.not.equal(null).and.not.equal(undefined);
      expect(response.data.ext).to.have.property('gdpr_consent');
      expect(response.data.ext.gdpr_consent.consent_string).to.equal('some string');
      expect(response.data.ext.gdpr_consent.consent_required).to.equal(true);

      expect(response.data.regs.ext.gdpr).to.not.equal(null).and.not.equal(undefined);
      expect(response.data.user.ext.consent).to.equal('some string');
    });

    it('build request with ID5 Id', () => {
      const bidRequestClone = utils.deepClone(bidRequest);
      bidRequestClone.userId = {};
      bidRequestClone.userId.id5id = 'id5-user-id';
      let request = spec.buildRequests([bidRequestClone], bidRequestClone)[0];
      expect(request.data.user.ext.eids).to.deep.equal([{
        'source': 'id5-sync.com',
        'uids': [{
          'id': 'id5-user-id',
          'ext': {
            'rtiPartner': 'ID5ID'
          }
        }]
      }]);
    });

    it('build request with unified Id', () => {
      const bidRequestClone = utils.deepClone(bidRequest);
      bidRequestClone.userId = {};
      bidRequestClone.userId.tdid = 'tdid-user-id';
      let request = spec.buildRequests([bidRequestClone], bidRequestClone)[0];
      expect(request.data.user.ext.eids).to.deep.equal([{
        'source': 'adserver.org',
        'uids': [{
          'id': 'tdid-user-id',
          'ext': {
            'rtiPartner': 'TDID'
          }
        }]
      }]);
    });
  });

  describe('interpretResponse', () => {
    it('returns an empty array on missing response', () => {
      let response = spec.interpretResponse(undefined, {bidRequest: bannerBidRequest});
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(0);

      response = spec.interpretResponse({}, {bidRequest: bannerBidRequest});
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(0);
    });

    it('aggregates banner bids from all seat bids', () => {
      const response = spec.interpretResponse({body: rtbResponse}, {bidRequest: bannerBidRequest});
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(1);
      const ad0 = response[0];
      expect(ad0.requestId).to.equal(bannerBidRequest.bidId);
      expect(ad0.cpm).to.equal(rtbResponse.seatbid[1].bid[0].price);
      expect(ad0.width).to.equal(rtbResponse.seatbid[1].bid[0].w);
      expect(ad0.height).to.equal(rtbResponse.seatbid[1].bid[0].h);
      expect(ad0.ttl).to.equal(TTL);
      expect(ad0.creativeId).to.equal(rtbResponse.seatbid[1].bid[0].crid);
      expect(ad0.netRevenue).to.equal(true);
      expect(ad0.currency).to.equal(rtbResponse.seatbid[1].bid[0].cur || rtbResponse.cur || 'USD');
      expect(ad0.ad).to.equal(rtbResponse.seatbid[1].bid[0].adm);
      expect(ad0.vastXml).to.be.an('undefined');
      expect(ad0.vastUrl).to.be.an('undefined');
    });

    it('aggregates video bids from all seat bids', () => {
      const response = spec.interpretResponse({body: rtbResponse}, {bidRequest: videoBidRequest});
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(1);
      const ad0 = response[0];
      expect(ad0.requestId).to.equal(videoBidRequest.bidId);
      expect(ad0.cpm).to.equal(rtbResponse.seatbid[0].bid[0].price);
      expect(ad0.width).to.equal(rtbResponse.seatbid[0].bid[0].w);
      expect(ad0.height).to.equal(rtbResponse.seatbid[0].bid[0].h);
      expect(ad0.ttl).to.equal(TTL);
      expect(ad0.creativeId).to.equal(rtbResponse.seatbid[0].bid[0].crid);
      expect(ad0.netRevenue).to.equal(true);
      expect(ad0.currency).to.equal(rtbResponse.seatbid[0].bid[0].cur || rtbResponse.cur || 'USD');
      expect(ad0.ad).to.be.an('undefined');
      expect(ad0.vastXml).to.equal(rtbResponse.seatbid[0].bid[0].adm);
      expect(ad0.vastUrl).to.equal(rtbResponse.seatbid[0].bid[0].ext.vast_url);
    });

    it('aggregates user-sync pixels', () => {
      const response = spec.getUserSyncs({}, [{body: rtbResponse}]);
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(4);
      expect(response[0].type).to.equal(rtbResponse.ext.utrk[0].type);
      expect(response[0].url).to.equal('//rtb.gamoshi.io/user/sync/1?gdpr=0&consent=&usp=');
      expect(response[1].type).to.equal(rtbResponse.ext.utrk[1].type);
      expect(response[1].url).to.equal('//rtb.gamoshi.io/user/sync/2');
      expect(response[2].type).to.equal(rtbResponse.seatbid[0].bid[0].ext.utrk[0].type);
      expect(response[2].url).to.equal('//p.partner1.io/user/sync/1');
      expect(response[3].type).to.equal(rtbResponse.seatbid[1].bid[0].ext.utrk[0].type);
      expect(response[3].url).to.equal('//p.partner2.io/user/sync/1');
    });

    it('supports configuring outstream renderers', () => {
      const videoRequest = utils.deepClone(videoBidRequest);
      videoRequest.mediaTypes.video.context = 'outstream';
      const result = spec.interpretResponse({body: videoResponse}, {bidRequest: videoRequest});
      expect(result[0].renderer).to.not.equal(undefined);
    });

    it('validates in/existing of gdpr consent', () => {
      let result = spec.getUserSyncs({}, [{body: videoResponse}], gdprConsent, 'gamoshiCCPA');
      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal('https://rtb.gamoshi.io/pix/1275/scm?cb=1545900621675&gdpr=1&consent=consent%20string&us_privacy=gamoshiCCPA');

      gdprConsent.gdprApplies = false;
      result = spec.getUserSyncs({}, [{body: videoResponse}], gdprConsent, 'gamoshiCCPA');
      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal('https://rtb.gamoshi.io/pix/1275/scm?cb=1545900621675&gdpr=0&consent=&us_privacy=gamoshiCCPA');

      videoResponse.ext.utrk[0].url = 'https://rtb.gamoshi.io/pix/1275/scm';
      result = spec.getUserSyncs({}, [{body: videoResponse}], gdprConsent);
      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal('https://rtb.gamoshi.io/pix/1275/scm');
    });

    it('validates existence of gdpr, gdpr consent and usp consent', () => {
      let result = spec.getUserSyncs({}, [{body: videoResponse}], gdprConsent, 'gamoshiCCPA');
      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal('https://rtb.gamoshi.io/pix/1275/scm?cb=1545900621675&gdpr=1&consent=consent%20string&us_privacy=gamoshiCCPA');

      gdprConsent.gdprApplies = false;
      result = spec.getUserSyncs({}, [{body: videoResponse}], gdprConsent, '');
      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal('https://rtb.gamoshi.io/pix/1275/scm?cb=1545900621675&gdpr=0&consent=&us_privacy=');
    });
  });
});
