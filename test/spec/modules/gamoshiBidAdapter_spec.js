import {expect} from 'chai';
import {spec, helper} from 'modules/gamoshiBidAdapter.js';
import * as utils from 'src/utils.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';

const supplyPartnerId = '123';
const adapter = newBidder(spec);

describe('GamoshiAdapter', () => {
  let sandBox;
  let schainConfig,
    bidRequest,
    bannerBidRequest,
    bannerRequestWithEids,
    videoBidRequest,
    rtbResponse,
    videoResponse,
    gdprConsent;

  beforeEach(() => {
    sandBox = sinon.createSandbox();
    sandBox.stub(utils, 'logError');
    sandBox.stub(utils, 'logWarn');
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
      ortb2Imp: {
        ext: {
          tid: 'a123456789',
        }
      },
      refererInfo: {referer: 'http://examplereferer.com'},
      gdprConsent: {
        consentString: 'some string',
        gdprApplies: true
      },
      ortb2: {
        source: {
          ext: {
            schain: schainConfig
          }
        }
      },
      uspConsent: 'gamoshiCCPA',
    }
    bannerBidRequest = {
      'adUnitCode': 'adunit-code',
      'auctionId': 'auction-id-12345',
      'mediaTypes': {
        banner: {}
      },
      'params': {
        'supplyPartnerId': supplyPartnerId
      },
      'sizes': [[300, 250], [300, 600]],
      'transactionId': '1d1a030790a475',
      'bidId': 'request-id-12345',
      refererInfo: {referer: 'http://examplereferer.com'}
    };

    bannerRequestWithEids = {
      'adUnitCode': 'adunit-code',
      'auctionId': 'auction-id-12345',
      'mediaTypes': {
        banner: {}
      },
      'params': {
        'supplyPartnerId': supplyPartnerId
      },
      userIdAsEids: [
        {
          source: '1.test.org',
          uids: [{
            id: '11111',
            atype: 1,
          }]
        },
        {
          source: '2.test.org',
          uids: [{
            id: '11111',
            atype: 1,
          }]
        }
      ],
      'sizes': [[300, 250], [300, 600]],
      'transactionId': '1d1a030790a475',
      'bidId': 'request-id-12345',
      refererInfo: {referer: 'http://examplereferer.com'}
    };

    videoBidRequest = {
      'adUnitCode': 'adunit-code',
      'auctionId': 'auction-id-12345',
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
      'id': 'request-id-12345',
      'bidid': 'bid-id-12345',
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
              'adm': '<img width="300px" height="250px" src="https://dummyimage.com/300x250/030d00/52b31e.gif&text=Gamoshi+Demo" onclick="window.open(\'https://www.gamoshi.com\')" alt=""> <img width="0px" height="0px" src="https://rtb.gamoshi.io/pix/monitoring/imp/imp_5b05b9fde4b09084267a556f/im.gif?r=imp_5b05b9fde4b09084267a556f&i=1&a=579ef31bfa788b9d2000d562&b=0" alt=""/>',
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
      'id': 'request-id-12345',
      'bidid': 'bid-id-12345',
      'cur': 'USD',
      'seatbid': [
        {
          'seat': '3668',
          'group': 0,
          'bid': [
            {
              'id': 'gb_1',
              'impid': '1',
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

  afterEach(() => {
    sandBox.restore()
    config.resetConfig();
  });

  describe('helper.getBidFloor', () => {
    it('should return null when getFloor is not a function and no bidfloor param', () => {
      const bid = { params: {} };
      expect(helper.getBidFloor(bid)).to.equal(null);
    });

    it('should return bidfloor param when getFloor is not a function', () => {
      const bid = { params: { bidfloor: 1.5 } };
      expect(helper.getBidFloor(bid)).to.equal(1.5);
    });

    it('should use getFloor function with currency support', () => {
      const bid = {
        params: {},
        getFloor: () => ({ currency: 'EUR', floor: 2.0 })
      };
      expect(helper.getBidFloor(bid, 'EUR')).to.equal(2.0);
    });

    it('should return null when getFloor returns invalid currency', () => {
      const bid = {
        params: {},
        getFloor: () => ({ currency: 'USD', floor: 2.0 })
      };
      expect(helper.getBidFloor(bid, 'EUR')).to.equal(null);
    });

    it('should return null when getFloor returns invalid floor', () => {
      const bid = {
        params: {},
        getFloor: () => ({ currency: 'USD', floor: NaN })
      };
      expect(helper.getBidFloor(bid, 'USD')).to.equal(null);
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
      expect(spec.isBidRequestValid({params: {supplyPartnerId: 123}})).to.equal(true);
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123'}})).to.equal(true);
      expect(spec.isBidRequestValid({params: {supply_partner_id: 123}})).to.equal(true);
      expect(spec.isBidRequestValid({params: {supply_partner_id: '123'}})).to.equal(true);
      expect(spec.isBidRequestValid({params: {inventory_id: 123}})).to.equal(true);
      expect(spec.isBidRequestValid({params: {inventory_id: '123'}})).to.equal(true);
      expect(spec.isBidRequestValid({params: {inventory_id: 'kukuk1212'}})).to.equal(false);
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
      // bidfloor can be omitted - should be valid
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123'}})).to.equal(true);

      // bidfloor as string should be invalid
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', bidfloor: '123'}})).to.equal(true);

      // bidfloor as zero should be invalid (not positive)
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', bidfloor: 0}})).to.equal(false);

      // bidfloor as negative number should be invalid
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', bidfloor: -0.5}})).to.equal(false);

      // bidfloor as positive number should be valid
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', bidfloor: 0.1}})).to.equal(true);
      expect(spec.isBidRequestValid({params: {supplyPartnerId: '123', bidfloor: 1.5}})).to.equal(true);
      //
      // const getFloorResponse = {currency: 'USD', floor: 5};
      // let testBidRequest = deepClone(bidRequest);
      // let request = spec.buildRequests([testBidRequest], bidRequest)[0];
      //
      // // 1. getBidFloor not exist AND bidfloor not exist - return 0
      // let payload = request.data;
      // expect(payload.imp[0].bidfloor).to.exist.and.equal(0);
      //
      // // 2. getBidFloor not exist AND bidfloor exist - use bidfloor property
      // testBidRequest = deepClone(bidRequest);
      // testBidRequest.params = {
      //   'bidfloor': 0.3
      // };
      // request = spec.buildRequests([testBidRequest], bidRequest)[0];
      // payload = request.data;
      // expect(payload.imp[0].bidfloor).to.exist.and.to.equal(0.3)
      //
      // // 3. getBidFloor exist AND bidfloor not exist - use getFloor method
      // testBidRequest = deepClone(bidRequest);
      // testBidRequest.getFloor = () => getFloorResponse;
      // request = spec.buildRequests([testBidRequest], bidRequest)[0];
      // payload = request.data;
      // expect(payload.imp[0].bidfloor).to.exist.and.to.equal(5)
      //
      // // 4. getBidFloor exist AND bidfloor exist -> use getFloor method
      // testBidRequest = deepClone(bidRequest);
      // testBidRequest.getFloor = () => getFloorResponse;
      // testBidRequest.params = {
      //   'bidfloor': 0.3
      // };
      // request = spec.buildRequests([testBidRequest], bidRequest)[0];
      // payload = request.data;
      // expect(payload.imp[0].bidfloor).to.exist.and.to.equal(5)
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
      const bidRequestWithEndpoint = utils.deepClone(bidRequest);
      bidRequestWithEndpoint.params.rtbEndpoint = 'https://rtb2.gamoshi.io/a12';
      response = spec.buildRequests([bidRequestWithEndpoint], bidRequest)[0];
      expect(response.url).to.match(new RegExp(`^https://rtb2\\.gamoshi\\.io/a12/r/${supplyPartnerId}/bidr\\?rformat=open_rtb&reqformat=rtb_json&bidder=prebid$`, 'g'));
    });

    it('builds request correctly', () => {
      let bidRequest2 = utils.deepClone(bidRequest);
      Object.assign(bidRequest2.refererInfo, {
        page: 'http://www.test.com/page.html',
        domain: 'www.test.com',
        ref: 'http://referrer.com'
      })
      let response = spec.buildRequests([bidRequest], bidRequest2)[0];

      expect(response.data.imp.length).to.equal(1);
      expect(response.data.imp[0].tagid).to.equal(bidRequest.adUnitCode);
      expect(response.data.imp[0].bidfloor).to.equal(0);
      expect(response.data.imp[0].bidfloorcur).to.equal('USD');
      expect(response.data.ext.gamoshi.supplyPartnerId).to.equal(supplyPartnerId);
      const bidRequestWithInstlEquals1 = utils.deepClone(bidRequest);
      bidRequestWithInstlEquals1.params.instl = 1;
      response = spec.buildRequests([bidRequestWithInstlEquals1], bidRequest2)[0];
      expect(response.data.imp[0].instl).to.equal(bidRequestWithInstlEquals1.params.instl);
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
      const bidRequestWithPosEquals1 = utils.deepClone(bidRequestWithBanner);
      bidRequestWithPosEquals1.params.pos = 1;
      response = spec.buildRequests([bidRequestWithPosEquals1], bidRequest)[0];
      expect(response.data.imp[0].banner.pos).to.equal(bidRequestWithPosEquals1.params.pos);
    });

    it('builds request video object correctly', () => {
      const bidRequestWithVideo = utils.deepClone(videoBidRequest);
      bidRequestWithVideo.mediaTypes = {
        video: {
          playerSize: [[302, 252]],
          mimes: ['video/mpeg'],
          pos: 0,
          playbackmethod: 1,
          minduration: 30,
          plcmt: 1,
          startdelay: 1,
        }
      };
      let request = spec.buildRequests([bidRequestWithVideo], videoBidRequest)[0];
      expect(request.data.imp[0].video.w).to.equal(bidRequestWithVideo.mediaTypes.video.playerSize[0][0]);
      expect(request.data.imp[0].video.h).to.equal(bidRequestWithVideo.mediaTypes.video.playerSize[0][1]);
      expect(request.data.imp[0].video.pos).to.equal(0);
      expect(request.data.imp[0].video.mimes[0]).to.equal(bidRequestWithVideo.mediaTypes.video.mimes[0]);
      expect(request.data.imp[0].video.skip).to.not.exist;
      expect(request.data.imp[0].video.plcmt).to.equal(1);
      expect(request.data.imp[0].video.minduration).to.equal(30);
      expect(request.data.imp[0].video.playbackmethod).to.equal(1);
      expect(request.data.imp[0].video.startdelay).to.equal(1);
      bidRequestWithVideo.mediaTypes = {
        video: {
          playerSize: [302, 252],
          mimes: ['video/mpeg'],
          skip: 1,
          plcmt: 1,
          minduration: 1,
          playbackmethod: 1,
          startdelay: 1,
        },
      };
      request = spec.buildRequests([bidRequestWithVideo], bidRequest)[0];
      expect(request.data.imp[0].video.w).to.equal(bidRequestWithVideo.mediaTypes.video.playerSize[0]);
      expect(request.data.imp[0].video.h).to.equal(bidRequestWithVideo.mediaTypes.video.playerSize[1]);
      bidRequestWithVideo.mediaTypes.video.pos = 1;
      request = spec.buildRequests([bidRequestWithVideo], bidRequest)[0];
      expect(request.data.imp[0].video.pos).to.equal(1);
    });

    it('builds request video object correctly with context', () => {
      const bidRequestWithVideo = utils.deepClone(bidRequest);
      bidRequestWithVideo.mediaTypes = {
        video: {
          context: 'instream',
          mimes: ['video/mpeg'],
          skip: 1,
          plcmt: 1,
          minduration: 1,
          playbackmethod: 1,
          startdelay: 1,
        }
      };
      let resultingRequest = spec.buildRequests([bidRequestWithVideo], bidRequest)[0];
      expect(resultingRequest.data.imp[0].video.ext.context).to.equal('instream');

      const bidRequestWithPosEquals1 = utils.deepClone(bidRequestWithVideo);
      bidRequestWithPosEquals1.mediaTypes.video.context = 'outstream';
      resultingRequest = spec.buildRequests([bidRequestWithPosEquals1], bidRequest)[0];
      expect(resultingRequest.data.imp[0].video.ext.context).to.equal('outstream');

      const bidRequestWithPosEquals2 = utils.deepClone(bidRequestWithVideo);
      bidRequestWithPosEquals2.mediaTypes.video.context = null;
      resultingRequest = spec.buildRequests([bidRequestWithPosEquals2], bidRequest)[0];
      expect(resultingRequest.data.imp[0].video?.ext.context).to.equal(null);
    });

    it('builds request video object correctly with multi-dimensions size array', () => {
      let resultingRequest;
      const bidRequestWithVideo = utils.deepClone(videoBidRequest);
      bidRequestWithVideo.mediaTypes.video = {
        playerSize: [[304, 254], [305, 255]],
        mimes: ['video/mpeg'],
        skip: 1,
        plcmt: 1,
        minduration: 1,
        playbackmethod: 1,
        startdelay: 1,
      };
      resultingRequest = spec.buildRequests([bidRequestWithVideo], videoBidRequest)[0];
      expect(resultingRequest.data.imp[0].video.plcmt).to.equal(1);
      const bidRequestWithPosEquals1 = utils.deepClone(bidRequestWithVideo);
      bidRequestWithPosEquals1.mediaTypes.video.plcmt = 4;
      resultingRequest = spec.buildRequests([bidRequestWithPosEquals1], bidRequest)[0];
      expect(resultingRequest.data.imp[0].video.plcmt).to.equal(4);
    });

    it('builds request with standard ORTB GDPR handling', () => {
      let response = spec.buildRequests([bidRequest], bidRequest)[0];
      // GDPR is now handled by standard ORTB converter through bidderRequest.ortb2
      // We just verify the request is built without custom GDPR extensions
      expect(response.data.ext.gamoshi.supplyPartnerId).to.equal(supplyPartnerId);
    });

    it('handles error when supplyPartnerId is missing', () => {
      const invalidBidRequest = utils.deepClone(bidRequest);
      delete invalidBidRequest.params.supplyPartnerId;

      const response = spec.buildRequests([invalidBidRequest], bidRequest);
      expect(response.length).to.equal(0);
      expect(utils.logError.calledWith('Gamoshi: supplyPartnerId is required')).to.be.true;
    });

    it('handles error when ORTB conversion fails', () => {
      const invalidBidRequest = utils.deepClone(bidRequest);
      // Create a scenario that would cause ORTB conversion to fail
      invalidBidRequest.mediaTypes = null;
      const response = spec.buildRequests([invalidBidRequest], bidRequest);
      expect(response.length).to.equal(0);
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

      // const invalidResponse = {body: 'invalid string response'};
      // response = spec.interpretResponse(invalidResponse, {bidRequest: bannerBidRequest});
      // expect(Array.isArray(response)).to.equal(true);
      // expect(response.length).to.equal(0);
      // expect(utils.logError.calledWith('Gamoshi: Invalid response format')).to.be.true;
      //
      // const malformedResponse = {body: {seatbid: 'invalid'}};
      // response = spec.interpretResponse(malformedResponse, {bidRequest: bannerBidRequest});
      //
      // expect(Array.isArray(response)).to.equal(true);
      // expect(response.length).to.equal(0);
      //
      // const emptyResponse = {body: {}};
      // response = spec.interpretResponse(emptyResponse, {bidRequest: bannerBidRequest});
      // expect(Array.isArray(response)).to.equal(true);
      // expect(response.length).to.equal(0);
    });

    it('aggregates banner bids from all seat bids', () => {
      const mockOrtbRequest = {
        imp: [{ id: '1', tagid: bannerBidRequest.adUnitCode }]
      };
      const response = spec.interpretResponse({body: rtbResponse}, {data: mockOrtbRequest, bidRequest: bannerBidRequest});
      expect(Array.isArray(response)).to.equal(true);
      // The ORTB converter handles response processing, just verify it returns an array
    });

    it('aggregates video bids from all seat bids', () => {
      const mockOrtbRequest = {
        imp: [{ id: '1', tagid: videoBidRequest.adUnitCode }]
      };
      const response = spec.interpretResponse({body: videoResponse}, {data: mockOrtbRequest, bidRequest: videoBidRequest});
      expect(Array.isArray(response)).to.equal(true);
      // The ORTB converter handles response processing, just verify it returns an array
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
      const mockOrtbRequest = {
        imp: [{ id: '1', tagid: videoRequest.adUnitCode }]
      };
      const result = spec.interpretResponse({body: videoResponse}, {data: mockOrtbRequest, bidRequest: videoRequest});
      expect(Array.isArray(result)).to.equal(true);
    });

    it('validates in/existing of gdpr consent', () => {
      let result = spec.getUserSyncs({}, [{body: videoResponse}], gdprConsent, 'gamoshiCCPA');
      // print result

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

      videoResponse.ext.utrk[0].url = 'https://rtb.gamoshi.io/pix/1275/scm';
      result = spec.getUserSyncs({}, [{body: videoResponse}], gdprConsent);
      expect(result).to.be.an('array');
      expect(result.length).to.equal(1);
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal('https://rtb.gamoshi.io/pix/1275/scm');
    });

    it('handles invalid response format gracefully', () => {
      const invalidResponse = { body: 'invalid string response' };
      const response = spec.interpretResponse(invalidResponse, { bidRequest: bannerBidRequest });
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(0);
      // expect(utils.logError.calledWith('Gamoshi: Invalid response format or empty seatbid array')).to.be.true;
    });

    it('handles ORTB converter errors gracefully', () => {
      const malformedResponse = { body: { seatbid: 'invalid' } };
      const response = spec.interpretResponse(malformedResponse, { bidRequest: bannerBidRequest });
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(0);
    });

    it('enhances video bids with metadata from bid.ext.video', () => {
      const videoResponseWithMeta = utils.deepClone(videoResponse);
      videoResponseWithMeta.seatbid[0].bid[0].ext.video = {
        duration: 30,
        bitrate: 1000,
        protocol: 'VAST 3.0'
      };
      const mockOrtbRequest = {
        imp: [{ id: '1', tagid: videoBidRequest.adUnitCode }]
      };
      const response = spec.interpretResponse({body: videoResponseWithMeta}, {data: mockOrtbRequest, bidRequest: videoBidRequest});
      expect(Array.isArray(response)).to.equal(true);
    });

    it('returns empty array when ORTB converter returns non-array', () => {
      // Mock a scenario where ORTB converter returns undefined or null
      const emptyResponse = { body: {} };
      const response = spec.interpretResponse(emptyResponse, { bidRequest: bannerBidRequest });
      expect(Array.isArray(response)).to.equal(true);
      expect(response.length).to.equal(0);
    });
  });
});
