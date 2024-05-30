import { spec } from 'modules/lkqdBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import { expect } from 'chai';

describe('lkqdBidAdapter', () => {
  const BIDDER_CODE = 'lkqd';
  const SITE_ID = '662921';
  const PUBLISHER_ID = '263';
  const END_POINT = new URL('https://rtb.lkqd.net/ad');
  const ADAPTER = newBidder(spec);

  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  context('inherited functions', () => {
    it('exists and is a function', () => {
      expect(ADAPTER.callBids).to.exist.and.to.be.a('function');
    });
  });

  context('isBidRequestValid', () => {
    const bid = {
      bidder: BIDDER_CODE,
      params: {
        'siteId': SITE_ID,
        'placementId': PUBLISHER_ID
      },
      adUnitCode: 'video1',
      sizes: [[300, 250], [640, 480]],
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      requestId: 'a09c66c3-53e3-4428-b296-38fc08e7cd2a',
      transactionId: 'd6f6b392-54a9-454c-85fb-a2fd882c4a2d',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        wrong: 'missing zone id'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  context('buildRequests', () => {
    const bidRequests = [
      {
        'bidder': BIDDER_CODE,
        'params': {
          'siteId': SITE_ID,
          'placementId': PUBLISHER_ID,
          'c1': 'newWindow',
          'c20': 'lkqdCustom'
        },
        'adUnitCode': BIDDER_CODE,
        'sizes': [[300, 250], [640, 480]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'requestId': 'a09c66c3-53e3-4428-b296-38fc08e7cd2a',
        'transactionId': 'd6f6b392-54a9-454c-85fb-a2fd882c4a2d',
      }
    ];
    const bidRequest = [
      {
        'bidder': BIDDER_CODE,
        'params': {
          'siteId': SITE_ID,
          'placementId': PUBLISHER_ID,
          'schain': '1.0,1!exchange1.com,1234%21abcd,1,bid-request-1,publisher%2c%20Inc.,publisher.com'
        },
        'adUnitCode': BIDDER_CODE,
        'sizes': [640, 480],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'requestId': 'a09c66c3-53e3-4428-b296-38fc08e7cd2a',
        'transactionId': 'd6f6b392-54a9-454c-85fb-a2fd882c4a2d',
      }
    ];

    it('should have correct url params, method', () => {
      const requests = spec.buildRequests(bidRequests, {});
      expect(requests[0].method).to.eq('POST');

      const url1 = new URL(requests[0].url);
      expect(url1.origin).to.eq(END_POINT.origin);

      const params1 = new URLSearchParams(url1.search);
      const object1 = Object.fromEntries(params1.entries());
      expect(object1.pid).to.eq(PUBLISHER_ID);
      expect(object1.sid).to.eq(SITE_ID);
      expect(object1.output).to.eq('rtb');
      expect(object1.prebid).to.eq('true');
    });

    it('should populate height, width, c1, c20, coppa with 2 imp', () => {
      sandbox.stub(config, 'getConfig')
        .withArgs('coppa')
        .returns(true);

      const requests = spec.buildRequests(bidRequests, {});
      expect(requests.length).to.equal(1);

      const serverRequestObject = requests[0];
      expect(serverRequestObject.data.imp.length).to.equal(2);
      expect(serverRequestObject.data.regs.coppa).to.be.a('number');
      expect(serverRequestObject.data.regs.coppa).to.eq(1);

      const imp1 = serverRequestObject.data.imp[0];
      expect(imp1.video.w).to.be.a('number');
      expect(imp1.video.w).to.eq(300);
      expect(imp1.video.h).to.be.a('number');
      expect(imp1.video.h).to.eq(250);
      expect(imp1.video.ext.lkqdcustomparameters.c1).to.be.a('string');
      expect(imp1.video.ext.lkqdcustomparameters.c1).to.eq('newWindow');
      expect(imp1.video.ext.lkqdcustomparameters.c20).to.be.a('string');
      expect(imp1.video.ext.lkqdcustomparameters.c20).to.eq('lkqdCustom');

      const imp2 = serverRequestObject.data.imp[1];
      expect(imp2.video.w).to.be.a('number');
      expect(imp2.video.w).to.eq(640);
      expect(imp2.video.h).to.be.a('number');
      expect(imp2.video.h).to.eq(480);
      expect(imp2.video.ext.lkqdcustomparameters.c1).to.be.a('string');
      expect(imp2.video.ext.lkqdcustomparameters.c1).to.eq('newWindow');
      expect(imp2.video.ext.lkqdcustomparameters.c20).to.be.a('string');
      expect(imp2.video.ext.lkqdcustomparameters.c20).to.eq('lkqdCustom');
    });

    it('should not populate unspecified parameters', () => {
      const requests = spec.buildRequests(bidRequests, { timeout: 1000 });

      const serverRequestObject = requests[0];
      expect(serverRequestObject.data.device.dnt).to.be.a('undefined');
      expect(serverRequestObject.data.content).to.be.a('undefined');
      expect(serverRequestObject.data.regs.coppa).to.be.a('undefined');
      expect(serverRequestObject.data.source).to.be.a('undefined');

      const imp1 = serverRequestObject.data.imp[0];
      expect(imp1.video.ext.lkqdcustomparameters.c10).to.be.a('undefined');

      const imp2 = serverRequestObject.data.imp[1];
      expect(imp2.video.ext.lkqdcustomparameters.c39).to.be.a('undefined');
    });

    it('should handle single size request', () => {
      const requests = spec.buildRequests(bidRequest, {});
      const serverRequestObject = requests[0];
      expect(serverRequestObject.data.imp.length).to.equal(1);
      expect(serverRequestObject.data.source).to.not.be.a('undefined');
      expect(serverRequestObject.data.source.ext).to.not.be.a('undefined');
      expect(serverRequestObject.data.source.ext.schain).to.not.be.a('undefined');

      const imp1 = serverRequestObject.data.imp[0];
      expect(imp1.video.w).to.be.a('number');
      expect(imp1.video.w).to.eq(640);
      expect(imp1.video.h).to.be.a('number');
      expect(imp1.video.h).to.eq(480);

      const schain = serverRequestObject.data.source.ext.schain;
      expect(schain.validation).to.have.string('strict');
      expect(schain.config.ver).to.have.string('1.0');
      expect(schain.config.complete).to.eq(1);
      expect(schain.config.nodes[0].asi).to.have.string('exchange1.com');
      expect(schain.config.nodes[0].sid).to.have.string('1234!abcd');
      expect(schain.config.nodes[0].hp).to.eq(1);
      expect(schain.config.nodes[0].rid).to.have.string('bid-request-1');
      expect(schain.config.nodes[0].name).to.have.string('publisher, Inc.');
      expect(schain.config.nodes[0].domain).to.have.string('publisher.com');
    });
  });

  context('interpretResponse', () => {
    const bidRequest = {
      'method': 'POST',
      'url': `https://rtb.lkqd.net/ad?pid=${PUBLISHER_ID}&sid=${SITE_ID}&output=rtb&prebid=true`,
      'id': '5511262729333416592',
      'imp': [{
        'id': '5511262729333416592',
        'displaymanager': 'LKQD SDK',
        'video': {
          'mimes': ['application/x-mpegURL', 'video/mp4', 'video/H264'],
          'protocols': [1, 2, 3, 4, 5, 6, 7, 8],
          'w': 1920,
          'h': 1080,
          'startdelay': 0,
          'placement': 1,
          'playbackmethod': [1],
          'ext': {
            'lkqdcustomparameters': {
              'custom1': 'cus1',
              'custom4': 'cus4',
              'custom7': 'cus7'
            }
          }
        },
        'bidfloorcur': 'USD',
        'secure': 1
      }],
      'app': {
        'id': '1112444-5742940365329809425',
        'name': 'lkqdappfortesting',
        'bundle': 'com.lkqdbundleid.fortesting',
        'content': {
          'id': '123456',
          'title': 'MyLkqdContent',
          'url': 'https://lkqd.com',
          'len': 600
        }
      },
      'device': {
        'ua': 'Mozilla/5.0 (SMART-TV; Linux; Tizen 4.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/4.0 TV Safari/538.1',
        'geo': {
          'utcoffset': -420,
        },
        'dnt': 0,
        'ifa': 'f4254ada-4174-6cfd-83c7-2f999c457c1d'
      },
      'user': {
        'ext': {}
      },
      'test': 0,
      'at': 2,
      'tmax': 100,
      'cur': ['USD'],
      'source': {
        'ext': {
          'schain': {
            'ver': '1.0',
            'complete': 0,
            'nodes': [{
              'asi': 'lkqd.net',
              'sid': '604',
              'hp': 1
            }]
          }
        }
      },
      'regs': {
        'coppa': 1,
        'ext': {
          'gdpr': 0,
          'us_privacy': '1NNN'
        }
      }
    };

    const serverResponse = {
      body: {
        'id': '5511262729333416592',
        'seatbid': [{
          'bid': [{
            'id': '281063413403658952',
            'impid': '5511262729333416592',
            'price': 5.409,
            'adm': '<?xml version="1.0" ?><VAST version="3.0"><Ad id="1030666"><InLine><AdSystem version="1.2">LKQD</AdSystem><AdTitle><![CDATA[In-Stream Video]]></AdTitle><Survey><![CDATA[https://pixel.adsafeprotected.com/jload?anId=6635&advId=2069924&campId=8080001&pubId=1035147&chanId=57858819&placementId=108204362&planId=281550531&adsafe_par&impId=2475219281617420376]]></Survey><Impression><![CDATA[https://sb.scorecardresearch.com/p?c1=19&c2=23229166&c3=platform&c12=240805ed2d34ef1d54be675bdf483c89393d7acc&ns_ap_pn=js&ns_ap_sv=2.1602.11&ns_type=hidden&ns_st_it=a&ns_st_sv=4.0.0&ns_st_ad=1&ns_st_sq=1&ns_st_id=1643240042&ns_st_ec=1&ns_st_cn=1&ns_st_ev=play&ns_st_ct=va&ns_st_cl=15000&ns_st_pt=0&ns_ap_device=&ns_ts=1643240042]]></Impression><Impression><![CDATA[https://t.lkqd.net/t?ev=3&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=6&sid=4973&spid=15&psid=1114710&ppid=320&lkqdtagtype=platform-connection&tlr=0&adid=1030666&asrc=38308&aoid=114070&dealid=985193&pbid=79&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&key=jdddddddd8&sc=dddihdmdd8&prcid=0&bp=ldddddddd8&rfp=jdddddddd8&segkey=&dur=15.0&cs=1719831200]]></Impression><Impression><![CDATA[https://t.lkqd.net/t?ev=3&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=320&sid=1114710&spid=54540&psid=&ppid=&lkqdtagtype=rtb&tlr=1&adid=98425&asrc=13785&aoid=75809&dealid=89211&pbid=4&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&c7=cus7&c1=cus1&c4=cus4&key=ihdmddddd8&sc=${AUCTION_PRICE}&prcid=0&bp=&rfp=&segkey=&dur=&cs=-221930846]]></Impression><Impression><![CDATA[http://googleads4.g.doubleclick.net/pagead/adview?ai=B6-UrK2BtU4bfEue6lAL59YCQCgAAAAAQASAAOABQ16C09ANYg7bLG2DJ5uOGyKOQGYIBCWNhLWdvb2dsZcgBBagDAeAEApoFGAiLlz8QyqLMMxjDvaCGASCDtssbKKSrftoFAggBoAY64Aakq34&sigh=xpLvymKV8ew&adurl=]]></Impression><Impression><![CDATA[http://d.agkn.com/pixel/2387/?ct=US&st=CA&city=13326&dma=195&zp=92614&bw=4&che=2267971988&col=8080001,1035147,108204362,281550531,57858819]]></Impression><Impression><![CDATA[http://test.com/?auctionId=281063413403658952&auctionBidId=12345&auctionImpId=281063413403658952&auctionSeatId=&auctionAdId=&auctionPrice=6.01&auctionCurrency=USD]]></Impression><Impression><![CDATA[https://s.adxyield.com/2/954655/analytics.gif?dt=9546551552428162383000&si=1114710&pi=320&cr=98425&cb=1311901165&di=&dm=1920x1080&c1=&c2=lkqdsappfortesting&c3=com.lkqdsbundleid.fortesting&c4=connected%20tv&c5=US&c6=tizen&ui=f4254ada-4174-6cfd-83c7-2f999c457c1d&ti=281063413403658952&r1=f4254ada-4174-6cfd-83c7-2f999c457c1d&r2=184.103.177.205&r3=${WODETECTIONID}&pv=&to=]]></Impression><Error><![CDATA[https://t.lkqd.net/t?ev=9&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=6&sid=4973&spid=15&psid=1114710&ppid=320&lkqdtagtype=platform-connection&tlr=0&adid=1030666&asrc=38308&aoid=114070&dealid=985193&pbid=79&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&dur=15.0&cs=1839662101]]></Error><Error><![CDATA[https://t.lkqd.net/t?ev=9&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=320&sid=1114710&spid=54540&psid=&ppid=&lkqdtagtype=rtb&tlr=1&adid=98425&asrc=13785&aoid=75809&dealid=89211&pbid=4&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&c7=cus7&c1=cus1&c4=cus4&dur=&cs=619373796]]></Error><Creatives><Creative id="lkqd-rtb-79-1030666"><Linear><Duration>00:00:15</Duration><TrackingEvents><Tracking event="firstQuartile"><![CDATA[http://ad.doubleclick.net/activity;src=2069924;met=1;v=1;pid=108204362;aid=281550531;ko=0;cid=57858819;rid=57747926;rv=1;timestamp=2267971988;ecn1=1;etm1=0;eid1=960584;]]></Tracking><Tracking event="firstQuartile"><![CDATA[https://t.lkqd.net/t?ev=4&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=6&sid=4973&spid=15&psid=1114710&ppid=320&lkqdtagtype=platform-connection&tlr=0&adid=1030666&asrc=38308&aoid=114070&dealid=985193&pbid=79&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&dur=15.0&cs=1505347799]]></Tracking><Tracking event="firstQuartile"><![CDATA[https://t.lkqd.net/t?ev=4&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=320&sid=1114710&spid=54540&psid=&ppid=&lkqdtagtype=rtb&tlr=1&adid=98425&asrc=13785&aoid=75809&dealid=89211&pbid=4&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&c7=cus7&c1=cus1&c4=cus4&dur=&cs=-2080286040]]></Tracking><Tracking event="pause"><![CDATA[http://ad.doubleclick.net/activity;src=2069924;met=1;v=1;pid=108204362;aid=281550531;ko=0;cid=57858819;rid=57747926;rv=1;timestamp=2267971988;ecn1=1;etm1=0;eid1=15;]]></Tracking><Tracking event="fullscreen"><![CDATA[http://ad.doubleclick.net/activity;src=2069924;met=1;v=1;pid=108204362;aid=281550531;ko=0;cid=57858819;rid=57747926;rv=1;timestamp=2267971988;ecn1=1;etm1=0;eid1=19;]]></Tracking><Tracking event="mute"><![CDATA[http://ad.doubleclick.net/activity;src=2069924;met=1;v=1;pid=108204362;aid=281550531;ko=0;cid=57858819;rid=57747926;rv=1;timestamp=2267971988;ecn1=1;etm1=0;eid1=16;]]></Tracking><Tracking event="unmute"><![CDATA[http://ad.doubleclick.net/activity;src=2069924;met=1;v=1;pid=108204362;aid=281550531;ko=0;cid=57858819;rid=57747926;rv=1;timestamp=2267971988;ecn1=1;etm1=0;eid1=149645;]]></Tracking><Tracking event="complete"><![CDATA[http://ad.doubleclick.net/activity;src=2069924;met=1;v=1;pid=108204362;aid=281550531;ko=0;cid=57858819;rid=57747926;rv=1;timestamp=2267971988;ecn1=1;etm1=0;eid1=13;]]></Tracking><Tracking event="complete"><![CDATA[https://t.lkqd.net/t?ev=7&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=6&sid=4973&spid=15&psid=1114710&ppid=320&lkqdtagtype=platform-connection&tlr=0&adid=1030666&asrc=38308&aoid=114070&dealid=985193&pbid=79&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&dur=15.0&cs=41549411]]></Tracking><Tracking event="complete"><![CDATA[https://t.lkqd.net/t?ev=7&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=320&sid=1114710&spid=54540&psid=&ppid=&lkqdtagtype=rtb&tlr=1&adid=98425&asrc=13785&aoid=75809&dealid=89211&pbid=4&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&c7=cus7&c1=cus1&c4=cus4&dur=&cs=-695766357]]></Tracking><Tracking event="thirdQuartile"><![CDATA[http://ad.doubleclick.net/activity;src=2069924;met=1;v=1;pid=108204362;aid=281550531;ko=0;cid=57858819;rid=57747926;rv=1;timestamp=2267971988;ecn1=1;etm1=0;eid1=960585;]]></Tracking><Tracking event="thirdQuartile"><![CDATA[https://t.lkqd.net/t?ev=6&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=6&sid=4973&spid=15&psid=1114710&ppid=320&lkqdtagtype=platform-connection&tlr=0&adid=1030666&asrc=38308&aoid=114070&dealid=985193&pbid=79&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&dur=15.0&cs=-2112426448]]></Tracking><Tracking event="thirdQuartile"><![CDATA[https://t.lkqd.net/t?ev=6&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=320&sid=1114710&spid=54540&psid=&ppid=&lkqdtagtype=rtb&tlr=1&adid=98425&asrc=13785&aoid=75809&dealid=89211&pbid=4&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&c7=cus7&c1=cus1&c4=cus4&dur=&cs=-419075414]]></Tracking><Tracking event="midpoint"><![CDATA[http://ad.doubleclick.net/activity;src=2069924;met=1;v=1;pid=108204362;aid=281550531;ko=0;cid=57858819;rid=57747926;rv=1;timestamp=2267971988;ecn1=1;etm1=0;eid1=18;]]></Tracking><Tracking event="midpoint"><![CDATA[https://t.lkqd.net/t?ev=5&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=6&sid=4973&spid=15&psid=1114710&ppid=320&lkqdtagtype=platform-connection&tlr=0&adid=1030666&asrc=38308&aoid=114070&dealid=985193&pbid=79&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&dur=15.0&cs=-640231292]]></Tracking><Tracking event="midpoint"><![CDATA[https://t.lkqd.net/t?ev=5&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=320&sid=1114710&spid=54540&psid=&ppid=&lkqdtagtype=rtb&tlr=1&adid=98425&asrc=13785&aoid=75809&dealid=89211&pbid=4&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&c7=cus7&c1=cus1&c4=cus4&dur=&cs=-1249688919]]></Tracking><Tracking event="start"><![CDATA[http://ad.doubleclick.net/activity;src=2069924;met=1;v=1;pid=108204362;aid=281550531;ko=0;cid=57858819;rid=57747926;rv=1;timestamp=2267971988;ecn1=1;etm1=0;eid1=11;]]></Tracking><Tracking event="start"><![CDATA[https://t.lkqd.net/t?ev=2&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=6&sid=4973&spid=15&psid=1114710&ppid=320&lkqdtagtype=platform-connection&tlr=0&adid=1030666&asrc=38308&aoid=114070&dealid=985193&pbid=79&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&dur=15.0&cs=-298211905]]></Tracking><Tracking event="start"><![CDATA[https://t.lkqd.net/t?ev=2&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=320&sid=1114710&spid=54540&psid=&ppid=&lkqdtagtype=rtb&tlr=1&adid=98425&asrc=13785&aoid=75809&dealid=89211&pbid=4&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&c7=cus7&c1=cus1&c4=cus4&dur=&cs=554502830]]></Tracking><Tracking event="start"><![CDATA[https://testPixel.lkqd.net?level=account]]></Tracking></TrackingEvents><VideoClicks><ClickThrough><![CDATA[http://d.agkn.com/pixel/2389/?che=2267971988&col=8080001,1035147,108204362,281550531,57858819&l0=http://thinkaboutyoureyes.com/?utm_source=N5371.288332.ACCUEN.COM&utm_medium=video&utm_campaign=8080001]]></ClickThrough><ClickTracking><![CDATA[https://t.lkqd.net/t?ev=8&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=6&sid=4973&spid=15&psid=1114710&ppid=320&lkqdtagtype=platform-connection&tlr=0&adid=1030666&asrc=38308&aoid=114070&dealid=985193&pbid=79&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&dur=15.0&cs=-305654714]]></ClickTracking><ClickTracking><![CDATA[https://t.lkqd.net/t?ev=8&tsid=1114710&env=4&cb=821620021026&format=0&did=11&osid=28&osv=4.0&adtype=video&pubtagtype=rtb&render=&apt=&uimp=281063413403658952&svrs=0.124&srvid=10.20.4.43&oip=184.103.177.205&hip=QalMfPQtFIsOv2mwg3B1hyMlXkZqTWFbjCevgob3-Fo&vrs=&tsl=&ear=&width=1920&height=1080&phost=&host=&thost=&appname=lkqdsappfortesting&idfa=f4254ada-4174-6cfd-83c7-2f999c457c1d&aid=f4254ada-4174-6cfd-83c7-2f999c457c1d&bundleid=com.lkqdsbundleid.fortesting&lsid=&loclat=&loclong=&contentid=123456&contenttitle=MylkqdContent&contentlength=600.0&contenturl=https%3A%2F%2Flkqd.com&appstoreurl=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dlkqd.tv.plus.140&execution=&placement=&browserid=0&browserv=&adplayersize=&gdpr=0&trm=&csr=&pid=320&sid=1114710&spid=54540&psid=&ppid=&lkqdtagtype=rtb&tlr=1&adid=98425&asrc=13785&aoid=75809&dealid=89211&pbid=4&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=IAB8&c7=cus7&c1=cus1&c4=cus4&dur=&cs=359202021]]></ClickTracking><ClickTracking><![CDATA[http://adclick.g.doubleclick.net/aclk?sa=L&ai=B6-UrK2BtU4bfEue6lAL59YCQCgAAAAAQASAAOABQ16C09ANYg7bLG2DJ5uOGyKOQGYIBCWNhLWdvb2dsZcgBBagDAeAEApoFGAiLlz8QyqLMMxjDvaCGASCDtssbKKSrftoFAggBoAY64Aakq34&num=0&sig=AOD64_39RE7mD4okzbSR4BppsqcsWRqBHg&client=&adurl=]]></ClickTracking></VideoClicks><MediaFiles><MediaFile type="video/x-flv" delivery="progressive" width="426" height="240" bitrate="268" scalable="false" maintainAspectRatio="false"><![CDATA[http://gcdn.2mdn.net/videoplayback/id/6ad0b8020d1b0faf/itag/5/source/doubleclick_dmm/ratebypass/yes/ip/0.0.0.0/ipbits/0/expire/3542633433/sparams/id,itag,source,ratebypass,ip,ipbits,expire/signature/251A147CD4ABAECCEA161A0076B6E023EAF0B86F.A5693967D3A13B73BD8A8A0D66914D38A39C60DA/key/ck2/file/file.flv]]></MediaFile><MediaFile type="video/x-flv" delivery="progressive" width="640" height="360" bitrate="598" scalable="false" maintainAspectRatio="false"><![CDATA[http://gcdn.2mdn.net/videoplayback/id/6ad0b8020d1b0faf/itag/34/source/doubleclick_dmm/ratebypass/yes/ip/0.0.0.0/ipbits/0/expire/3542633441/sparams/id,itag,source,ratebypass,ip,ipbits,expire/signature/AEFA788E2BDA4EE3CCA312680BC77354DCB5E364.611D7B93D8DA65C6DDFA2A3EBDDC7446D68EB16E/key/ck2/file/file.flv]]></MediaFile><MediaFile type="video/x-flv" delivery="progressive" width="854" height="480" bitrate="957" scalable="false" maintainAspectRatio="false"><![CDATA[http://gcdn.2mdn.net/videoplayback/id/6ad0b8020d1b0faf/itag/35/source/doubleclick_dmm/ratebypass/yes/ip/0.0.0.0/ipbits/0/expire/3542633448/sparams/id,itag,source,ratebypass,ip,ipbits,expire/signature/95733EF286EA8739EB1C797136B351D1BE696848.1E9D19581A489C6F950EE46F4BFEE4A685ECCE50/key/ck2/file/file.flv]]></MediaFile><MediaFile type="video/3gpp" delivery="progressive" width="176" height="144" bitrate="56" scalable="false" maintainAspectRatio="false"><![CDATA[http://gcdn.2mdn.net/videoplayback/id/6ad0b8020d1b0faf/itag/17/source/doubleclick_dmm/ratebypass/yes/ip/0.0.0.0/ipbits/0/expire/3542633419/sparams/id,itag,source,ratebypass,ip,ipbits,expire/signature/BB76570CD855F1DE3AA608C21D480FCE013223F9.155A1E326665A207F980C98090F389A91E97C9A0/key/ck2/file/file.3gpp]]></MediaFile><MediaFile type="video/3gpp" delivery="progressive" width="320" height="180" bitrate="185" scalable="false" maintainAspectRatio="false"><![CDATA[http://gcdn.2mdn.net/videoplayback/id/6ad0b8020d1b0faf/itag/36/source/doubleclick_dmm/ratebypass/yes/ip/0.0.0.0/ipbits/0/expire/3542633423/sparams/id,itag,source,ratebypass,ip,ipbits,expire/signature/5809918D8EC632351D8634A9130C98FB3ED5D839.82037CACB6356F27FE7FAF15FBBB323F218854F5/key/ck2/file/file.3gpp]]></MediaFile><MediaFile type="video/mp4" delivery="progressive" width="640" height="360" bitrate="624" scalable="false" maintainAspectRatio="false"><![CDATA[http://gcdn.2mdn.net/videoplayback/id/6ad0b8020d1b0faf/itag/18/source/doubleclick_dmm/ratebypass/yes/ip/0.0.0.0/ipbits/0/expire/3542633438/sparams/id,itag,source,ratebypass,ip,ipbits,expire/signature/3E9CE9016B64E62F0926F228967EAAB8BF3CB959.51F9775683EB50E982438CAEEB9619F94094B758/key/ck2/file/file.mp4]]></MediaFile><MediaFile type="video/mp4" delivery="progressive" width="1200" height="800" bitrate="2332" scalable="false" maintainAspectRatio="false"><![CDATA[http://gcdn.2mdn.net/videoplayback/id/6ad0b8020d1b0faf/itag/22/source/doubleclick_dmm/ratebypass/yes/ip/0.0.0.0/ipbits/0/expire/3542633479/sparams/id,itag,source,ratebypass,ip,ipbits,expire/signature/9F0541D77C2BA7D20A487BB9B5C4E07817BB268E.21DEE7CAFBB72ABEE6071AFDB74D62B55844FE4B/key/ck2/file/file.mp4]]></MediaFile><MediaFile type="video/webm" delivery="progressive" width="640" height="360" bitrate="708" scalable="false" maintainAspectRatio="false"><![CDATA[http://gcdn.2mdn.net/videoplayback/id/6ad0b8020d1b0faf/itag/43/source/doubleclick_dmm/ratebypass/yes/ip/0.0.0.0/ipbits/0/expire/3542633463/sparams/id,itag,source,ratebypass,ip,ipbits,expire/signature/4CC1CC1997C7998BE4995619195354C4B0859EEB.43E8AD874A6CDE8C747788EFA00D79E031DA606F/key/ck2/file/file.webm]]></MediaFile><MediaFile type="video/webm" delivery="progressive" width="854" height="480" bitrate="1054" scalable="false" maintainAspectRatio="false"><![CDATA[http://gcdn.2mdn.net/videoplayback/id/6ad0b8020d1b0faf/itag/44/source/doubleclick_dmm/ratebypass/yes/ip/0.0.0.0/ipbits/0/expire/3542633470/sparams/id,itag,source,ratebypass,ip,ipbits,expire/signature/15A5F1E3BAB1358A8D4D11231EA6E7015ABF886D.5CCA7A23FED43A44E26B0AE6F865344F0ED6F02F/key/ck2/file/file.webm]]></MediaFile><MediaFile type="video/webm" delivery="progressive" width="1280" height="720" bitrate="2566" scalable="false" maintainAspectRatio="false"><![CDATA[http://gcdn.2mdn.net/videoplayback/id/6ad0b8020d1b0faf/itag/45/source/doubleclick_dmm/ratebypass/yes/ip/0.0.0.0/ipbits/0/expire/3542633480/sparams/id,itag,source,ratebypass,ip,ipbits,expire/signature/995DC316FCAEEABEDE178832C776B6D8071EEEDE.24692AD16EFC48A6ABAF744FA281CB6FC05A4AB5/key/ck2/file/file.webm]]></MediaFile></MediaFiles></Linear></Creative><Creative id="lkqd-rtb-79-1030666"><CompanionAds><Companion width="300" height="250"><StaticResource creativeType="image/jpeg"><![CDATA[http://s0.2mdn.net/viewad/2069924/1-Specific_Media_Companion_Banner_300x250.jpg]]></StaticResource><TrackingEvents><Tracking event="creativeView"><![CDATA[http://googleads4.g.doubleclick.net/pagead/adview?ai=BRpm8K2BtU4bfEue6lAL59YCQCgAAAAAQAiAAOABQ16C09ANYnK3LG2DJ5uOGyKOQGYIBCWNhLWdvb2dsZcgBAqgDAeAEApoFGAiLlz8QyqLMMxjDvaCGASCcrcsbKKSrftoFAggBoAYU4Aakq34&sigh=O_8MyWF9Eqw&adurl=]]></Tracking></TrackingEvents><CompanionClickThrough><![CDATA[http://adclick.g.doubleclick.net/aclk?sa=L&ai=BRpm8K2BtU4bfEue6lAL59YCQCgAAAAAQAiAAOABQ16C09ANYnK3LG2DJ5uOGyKOQGYIBCWNhLWdvb2dsZcgBAqgDAeAEApoFGAiLlz8QyqLMMxjDvaCGASCcrcsbKKSrftoFAggBoAYU4Aakq34&num=0&sig=AOD64_3mxlFjey90eqTalLRHC49IZUNfPg&client=&adurl=http://d.agkn.com/pixel/2389/%3Fche%3D2267971988%26col%3D8080001,1035147,108204362,281550531,57858819%26l0%3Dhttp://thinkaboutyoureyes.com/%3Futm_source%3DN5371.288332.ACCUEN.COM%26utm_medium%3Dvideo%26utm_campaign%3D8080001]]></CompanionClickThrough></Companion></CompanionAds></Creative></Creatives><Extensions><Extension><AuctionId><![CDATA[${AUCTION_ID}]]></AuctionId><AuctionBidId><![CDATA[${AUCTION_BID_ID}]]></AuctionBidId><AuctionImpId><![CDATA[${AUCTION_IMP_ID}]]></AuctionImpId><AuctionSeatId><![CDATA[${AUCTION_SEAT_ID}]]></AuctionSeatId><AuctionAdId><![CDATA[${AUCTION_AD_ID}]]></AuctionAdId><AuctionPrice><![CDATA[${AUCTION_PRICE}]]></AuctionPrice><AuctionCurrency><![CDATA[${AUCTION_CURRENCY}]]></AuctionCurrency></Extension><Extension type="dart"><AdServingData><DeliveryData><GeoData><![CDATA[ct=US&st=CA&city=13326&dma=195&zp=92614&bw=4]]></GeoData></DeliveryData></AdServingData></Extension></Extensions></InLine></Ad></VAST>',
            'adomain': ['lkqd.com'],
            'crid': 'lkqd-rtb-79-1030666',
            'protocol': 3,
            'w': 1920,
            'h': 1080,
            'ext': {
              'imptrackers': []
            }
          }]
        }],
        'cur': 'USD'
      }
    };

    it('should correctly parse valid bid response', () => {
      const bidResponses = spec.interpretResponse(serverResponse, bidRequest);
      expect(bidResponses.length).to.equal(1);

      const bidResponse = bidResponses[0];
      expect(bidResponse.requestId).to.equal('5511262729333416592');
      expect(bidResponse.ad).to.equal(serverResponse.body.seatbid[0].bid[0].adm);
      expect(bidResponse.cpm).to.equal(5.409);
      expect(bidResponse.width).to.equal(1920);
      expect(bidResponse.height).to.equal(1080);
      expect(bidResponse.ttl).to.equal(300);
      expect(bidResponse.creativeId).to.equal('lkqd-rtb-79-1030666');
      expect(bidResponse.currency).to.equal('USD');
      expect(bidResponse.netRevenue).to.equal(true);
      expect(bidResponse.meta.mediaType).to.equal('video');
    });

    it('safely handles invalid bid response', () => {
      let invalidServerResponse = {};
      invalidServerResponse.body = '';

      let result = spec.interpretResponse(invalidServerResponse, bidRequest);
      expect(result.length).to.equal(0);
    });

    it('handles nobid responses', () => {
      let nobidResponse = {};
      nobidResponse.body = {
        seatbid: [
          {
            bid: []
          }
        ]
      };

      let result = spec.interpretResponse(nobidResponse, bidRequest);
      expect(result.length).to.equal(0);
    });
  });
});
