import { spec } from 'modules/lkqdBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import { expect } from 'chai';

describe('lkqdBidAdapter', () => {
  const BIDDER_CODE = 'lkqd';
  const SITE_ID = '662921';
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
    const videoBid = {

    };

    let bid = {
      bidder: 'lkqd',
      params: {
        'siteId': '662921',
        'placementId': '263'
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
    const ENDPOINT = 'https://v.lkqd.net/ad';
    let bidRequests = [
      {
        'bidder': 'lkqd',
        'params': {
          'siteId': '662921',
          'placementId': '263',
          'c1': 'newWindow',
          'c20': 'lkqdCustom'
        },
        'adUnitCode': 'lkqd',
        'sizes': [[300, 250], [640, 480]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'requestId': 'a09c66c3-53e3-4428-b296-38fc08e7cd2a',
        'transactionId': 'd6f6b392-54a9-454c-85fb-a2fd882c4a2d',
      }
    ];
    let bidRequest = [
      {
        'bidder': 'lkqd',
        'params': {
          'siteId': '662921',
          'placementId': '263',
          'schain': '1.0,1!exchange1.com,1234%21abcd,1,bid-request-1,publisher%2c%20Inc.,publisher.com'
        },
        'adUnitCode': 'lkqd',
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
      expect(object1.pid).to.eq('263');
      expect(object1.sid).to.eq('662921');
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
      const requests = spec.buildRequests(bidRequests);

      const serverRequestObject = requests[0];
      expect(serverRequestObject.data.device.dnt).to.be.a('undefined');
      expect(serverRequestObject.data.content).to.be.a('undefined');
      expect(serverRequestObject.data.regs.coppa).to.be.a('undefined');

      const imp1 = serverRequestObject.data.imp[0];
      expect(imp1.video.ext.lkqdcustomparameters.c10).to.be.a('undefined');

      const imp2 = serverRequestObject.data.imp[1];
      expect(imp2.video.ext.lkqdcustomparameters.c39).to.be.a('undefined');

      // TODO
      expect(imp1).to.have.string('&schain=');
    });

    it('should handle single size request', () => {
      const requests = spec.buildRequests(bidRequests, {});
      const serverRequestObject = requests[0];
      expect(serverRequestObject.data.imp.length).to.equal(2);

      const imp1 = serverRequestObject.data.imp[0];
      expect(imp1.video.w).to.be.a('number');
      expect(imp1.video.w).to.eq(640);
      expect(imp1.video.h).to.be.a('number');
      expect(imp1.video.h).to.eq(480);
      expect(imp1.video.ext.lkqdcustomparameters.c1).to.be.a('string');
      expect(imp1.video.ext.lkqdcustomparameters.c1).to.eq('newWindow');
      expect(imp1.video.ext.lkqdcustomparameters.c20).to.be.a('string');
      expect(imp1.video.ext.lkqdcustomparameters.c20).to.eq('lkqdCustom');
      expect(imp1).to.have.string('&schain=1.0,1!exchange1.com,1234%21abcd,1,bid-request-1,publisher%2c%20Inc.,publisher.com&');
    });
  });

  context('interpretResponse', () => {
    let bidRequest = {
      'url': 'https://ssp.lkqd.net/ad?pid=263&sid=662921&output=vast&execution=any&placement=&playinit=auto&volume=100&timeout=&width=300%E2%80%8C&height=250&pbt=[PREBID_TOKEN]%E2%80%8C&dnt=[DO_NOT_TRACK]%E2%80%8C&pageurl=[PAGEURL]%E2%80%8C&contentid=[CONTENT_ID]%E2%80%8C&contenttitle=[CONTENT_TITLE]%E2%80%8C&contentlength=[CONTENT_LENGTH]%E2%80%8C&contenturl=[CONTENT_URL]&prebid=true%E2%80%8C&rnd=874313435?bidId=253dcb69fb2577&bidWidth=300&bidHeight=250&',
      'data': 'pid=263&sid=662921&prebid=true&output=vast&execution=any&support=html5&playinit=auto&volume=100&width=640&height=480&rnd=89811791&bidId=20d2f9095ba4e3&bidWidth=640&bidHeight=480&'
    };
    let serverResponse = {};
    serverResponse.body = `<VAST version="2.0">
<Ad id="677477">
<InLine>
<AdSystem version="1.2">LKQD</AdSystem>
<AdTitle>
<![CDATA[ Mobile Video QA ]]>
</AdTitle>
<Pricing model="CPM" currency="USD">2.87</Pricing>
<Impression>
<![CDATA[
https://sb.scorecardresearch.com/p?C1=1&C2=23229166&C3=platform&C5=01&C7=
]]>
</Impression>
<Impression>
<![CDATA[
https://sb.scorecardresearch.com/p?c1=2&c2=23229166&c3=platform&ns_ap_sv=2.1511.10&ns_type=hidden&ns_st_it=a&ns_st_sv=4.0.0&ns_st_ad=1&ns_st_sq=1&ns_st_id=1522437348&ns_st_ec=1&ns_st_cn=1&ns_st_ev=play&ns_st_ct=va&ns_st_cl=30000&ns_st_pt=0&ns_ts=1522437348
]]>
</Impression>
<Impression>
<![CDATA[
https://t.lkqd.net/t?ev=3&tsid=662921&env=3&cb=761218674439&format=0&did=2&osid=6&osv=10.12.6&pubtagtype=vast&render=&apt=auto&uimp=93862023567791182&svrs=0.90&srvid=10.10.4.4&oip=208.59.120.2&vrs=&tsl=&ear=100&width=&height=250&phost=&host=&thost=&appname=&idfa=&aid=&bundleid=&lsid=&loclat=&loclong=&contentid=%5BCONTENT_ID%5D%E2%80%8C&contenttitle=%5BCONTENT_TITLE%5D%E2%80%8C&contentlength=&contenturl=&appstoreurl=&execution=any&placement=&browserid=1&browserv=65.0&adplayersize=small&pid=263&sid=662921&spid=44784&psid=&ppid=&lkqdtagtype=vast&tlr=1&adid=677477&asrc=33062&aoid=96110&dealid=654322&pbid=0&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=&key=hiddddddd8&sc=dddflkddd8&prcid=0&bp=&rfp=&segkey=&dur=30.0&cs=-1294926671
]]>
</Impression>
<Impression>
<![CDATA[ https//t.lkqd.net/t?ev=16&env=1&pid=2&sid=71 ]]>
</Impression>
<Impression>
<![CDATA[
https://test.com/?iamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatch&pageurl=&deviceid=&siteid=1374&cookie=8295056521223792901&cpm=4.5&avid=96110&plid=677477&publisherId=662921&siteId=662921&caid=654322&kv1=&kv2=
]]>
</Impression>
<Error>
<![CDATA[
https://t.lkqd.net/t?ev=9&tsid=662921&env=3&cb=761218674439&format=0&did=2&osid=6&osv=10.12.6&pubtagtype=vast&render=&apt=auto&uimp=93862023567791182&svrs=0.90&srvid=10.10.4.4&oip=208.59.120.2&vrs=&tsl=&ear=100&width=&height=250&phost=&host=&thost=&appname=&idfa=&aid=&bundleid=&lsid=&loclat=&loclong=&contentid=%5BCONTENT_ID%5D%E2%80%8C&contenttitle=%5BCONTENT_TITLE%5D%E2%80%8C&contentlength=&contenturl=&appstoreurl=&execution=any&placement=&browserid=1&browserv=65.0&adplayersize=small&pid=263&sid=662921&spid=44784&psid=&ppid=&lkqdtagtype=vast&tlr=1&adid=677477&asrc=33062&aoid=96110&dealid=654322&pbid=0&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=&dur=30.0&cs=1262611271
]]>
</Error>
<Error>
<![CDATA[ https//t.lkqd.net/t?ev=17&env=1&pid=2&sid=71 ]]>
</Error>
<Creatives>
<Creative>
<Linear>
<Duration>00:00:30</Duration>
<TrackingEvents>
<Tracking event="firstQuartile">
<![CDATA[ https//t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
</Tracking>
<Tracking event="firstQuartile">
<![CDATA[
https://t.lkqd.net/t?ev=4&tsid=662921&env=3&cb=761218674439&format=0&did=2&osid=6&osv=10.12.6&pubtagtype=vast&render=&apt=auto&uimp=93862023567791182&svrs=0.90&srvid=10.10.4.4&oip=208.59.120.2&vrs=&tsl=&ear=100&width=&height=250&phost=&host=&thost=&appname=&idfa=&aid=&bundleid=&lsid=&loclat=&loclong=&contentid=%5BCONTENT_ID%5D%E2%80%8C&contenttitle=%5BCONTENT_TITLE%5D%E2%80%8C&contentlength=&contenturl=&appstoreurl=&execution=any&placement=&browserid=1&browserv=65.0&adplayersize=small&pid=263&sid=662921&spid=44784&psid=&ppid=&lkqdtagtype=vast&tlr=1&adid=677477&asrc=33062&aoid=96110&dealid=654322&pbid=0&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=&dur=30.0&cs=-573688932
]]>
</Tracking>
<Tracking event="firstQuartile">
<![CDATA[
https://test.com/?iamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatch&pageurl=&deviceid=&siteid=1374
]]>
</Tracking>
<Tracking event="pause">
<![CDATA[ https//t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
</Tracking>
<Tracking event="fullscreen">
<![CDATA[ https//t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
</Tracking>
<Tracking event="mute">
<![CDATA[ https//t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
</Tracking>
<Tracking event="unmute">
<![CDATA[ https//t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
</Tracking>
<Tracking event="complete">
<![CDATA[ https//t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
</Tracking>
<Tracking event="complete">
<![CDATA[
https://t.lkqd.net/t?ev=7&tsid=662921&env=3&cb=761218674439&format=0&did=2&osid=6&osv=10.12.6&pubtagtype=vast&render=&apt=auto&uimp=93862023567791182&svrs=0.90&srvid=10.10.4.4&oip=208.59.120.2&vrs=&tsl=&ear=100&width=&height=250&phost=&host=&thost=&appname=&idfa=&aid=&bundleid=&lsid=&loclat=&loclong=&contentid=%5BCONTENT_ID%5D%E2%80%8C&contenttitle=%5BCONTENT_TITLE%5D%E2%80%8C&contentlength=&contenturl=&appstoreurl=&execution=any&placement=&browserid=1&browserv=65.0&adplayersize=small&pid=263&sid=662921&spid=44784&psid=&ppid=&lkqdtagtype=vast&tlr=1&adid=677477&asrc=33062&aoid=96110&dealid=654322&pbid=0&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=&dur=30.0&cs=-1387907
]]>
</Tracking>
<Tracking event="complete">
<![CDATA[
https://test.com/?iamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatch&pageurl=&deviceid=&siteid=1374
]]>
</Tracking>
<Tracking event="thirdQuartile">
<![CDATA[ https//t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
</Tracking>
<Tracking event="thirdQuartile">
<![CDATA[
https://t.lkqd.net/t?ev=6&tsid=662921&env=3&cb=761218674439&format=0&did=2&osid=6&osv=10.12.6&pubtagtype=vast&render=&apt=auto&uimp=93862023567791182&svrs=0.90&srvid=10.10.4.4&oip=208.59.120.2&vrs=&tsl=&ear=100&width=&height=250&phost=&host=&thost=&appname=&idfa=&aid=&bundleid=&lsid=&loclat=&loclong=&contentid=%5BCONTENT_ID%5D%E2%80%8C&contenttitle=%5BCONTENT_TITLE%5D%E2%80%8C&contentlength=&contenturl=&appstoreurl=&execution=any&placement=&browserid=1&browserv=65.0&adplayersize=small&pid=263&sid=662921&spid=44784&psid=&ppid=&lkqdtagtype=vast&tlr=1&adid=677477&asrc=33062&aoid=96110&dealid=654322&pbid=0&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=&dur=30.0&cs=-503935710
]]>
</Tracking>
<Tracking event="thirdQuartile">
<![CDATA[
https://test.com/?iamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatch&pageurl=&deviceid=&siteid=1374
]]>
</Tracking>
<Tracking event="midpoint">
<![CDATA[ https//t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
</Tracking>
<Tracking event="midpoint">
<![CDATA[
https://t.lkqd.net/t?ev=5&tsid=662921&env=3&cb=761218674439&format=0&did=2&osid=6&osv=10.12.6&pubtagtype=vast&render=&apt=auto&uimp=93862023567791182&svrs=0.90&srvid=10.10.4.4&oip=208.59.120.2&vrs=&tsl=&ear=100&width=&height=250&phost=&host=&thost=&appname=&idfa=&aid=&bundleid=&lsid=&loclat=&loclong=&contentid=%5BCONTENT_ID%5D%E2%80%8C&contenttitle=%5BCONTENT_TITLE%5D%E2%80%8C&contentlength=&contenturl=&appstoreurl=&execution=any&placement=&browserid=1&browserv=65.0&adplayersize=small&pid=263&sid=662921&spid=44784&psid=&ppid=&lkqdtagtype=vast&tlr=1&adid=677477&asrc=33062&aoid=96110&dealid=654322&pbid=0&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=&dur=30.0&cs=-1009619773
]]>
</Tracking>
<Tracking event="midpoint">
<![CDATA[
https://test.com/?iamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatch&pageurl=&deviceid=&siteid=1374
]]>
</Tracking>
<Tracking event="start">
<![CDATA[ https//t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
</Tracking>
<Tracking event="start">
<![CDATA[
https://t.lkqd.net/t?ev=2&tsid=662921&env=3&cb=761218674439&format=0&did=2&osid=6&osv=10.12.6&pubtagtype=vast&render=&apt=auto&uimp=93862023567791182&svrs=0.90&srvid=10.10.4.4&oip=208.59.120.2&vrs=&tsl=&ear=100&width=&height=250&phost=&host=&thost=&appname=&idfa=&aid=&bundleid=&lsid=&loclat=&loclong=&contentid=%5BCONTENT_ID%5D%E2%80%8C&contenttitle=%5BCONTENT_TITLE%5D%E2%80%8C&contentlength=&contenturl=&appstoreurl=&execution=any&placement=&browserid=1&browserv=65.0&adplayersize=small&pid=263&sid=662921&spid=44784&psid=&ppid=&lkqdtagtype=vast&tlr=1&adid=677477&asrc=33062&aoid=96110&dealid=654322&pbid=0&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=&dur=30.0&cs=-1719144354
]]>
</Tracking>
<Tracking event="start">
<![CDATA[
https://test.com/?iamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatch&pageurl=&deviceid=&siteid=1374
]]>
</Tracking>
</TrackingEvents>
<VideoClicks>
<ClickThrough>
<![CDATA[ https//www.lkqd.com/ ]]>
</ClickThrough>
<ClickTracking>
<![CDATA[
https://t.lkqd.net/t?ev=8&tsid=662921&env=3&cb=761218674439&format=0&did=2&osid=6&osv=10.12.6&pubtagtype=vast&render=&apt=auto&uimp=93862023567791182&svrs=0.90&srvid=10.10.4.4&oip=208.59.120.2&vrs=&tsl=&ear=100&width=&height=250&phost=&host=&thost=&appname=&idfa=&aid=&bundleid=&lsid=&loclat=&loclong=&contentid=%5BCONTENT_ID%5D%E2%80%8C&contenttitle=%5BCONTENT_TITLE%5D%E2%80%8C&contentlength=&contenturl=&appstoreurl=&execution=any&placement=&browserid=1&browserv=65.0&adplayersize=small&pid=263&sid=662921&spid=44784&psid=&ppid=&lkqdtagtype=vast&tlr=1&adid=677477&asrc=33062&aoid=96110&dealid=654322&pbid=0&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=&dur=30.0&cs=1432204312
]]>
</ClickTracking>
<ClickTracking>
<![CDATA[ https//t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
</ClickTracking>
<ClickTracking>
<![CDATA[
https://test.com/?iamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatchiamatrackingpixelforcloudwatch&pageurl=&deviceid=&siteid=1374
]]>
</ClickTracking>
</VideoClicks>
<MediaFiles>
<MediaFile type="video/mp4" delivery="progressive" width="800" height="450" bitrate="1499" scalable="true" maintainAspectRatio="false">
<![CDATA[
https://creative.lkqd.net/internal/lkqd_800x450.mp4
]]>
</MediaFile>
<MediaFile type="video/mp4" delivery="progressive" width="300" height="170" bitrate="626" scalable="true" maintainAspectRatio="false">
<![CDATA[
https://creative.lkqd.net/internal/lkqd_300x250.mp4
]]>
</MediaFile>
</MediaFiles>
</Linear>
</Creative>
<Creative>
<CompanionAds>
<Companion width="300" height="250" id="medium_rectangle">
<HTMLResource>
<![CDATA[
<a href="https://www.lkqd.com/" border="0" target="_blank"><img style="border:0; width:300px; height:250px;" src="https://ad.lkqd.net/serve/87123789f4ede3dcb692a277cff145ad.jpg"/></a>
]]>
</HTMLResource>
</Companion>
</CompanionAds>
</Creative>
</Creatives>
<Extensions/>
</InLine>
</Ad>
</VAST>`;

    it('should correctly parse valid bid response', () => {
      const BIDDER_CODE = 'lkqd';
      let bidResponses = spec.interpretResponse(serverResponse, bidRequest);
      expect(bidResponses.length).to.equal(1);
      let bidResponse = bidResponses[0];
      expect(bidResponse.requestId).to.equal('20d2f9095ba4e3');
      expect(bidResponse.bidderCode).to.equal(BIDDER_CODE);
      expect(bidResponse.ad).to.equal('');
      expect(bidResponse.cpm).to.equal(2.87);
      expect(bidResponse.width).to.equal('640');
      expect(bidResponse.height).to.equal('480');
      expect(bidResponse.ttl).to.equal(300);
      expect(bidResponse.creativeId).to.equal('677477');
      expect(bidResponse.currency).to.equal('USD');
      expect(bidResponse.netRevenue).to.equal(true);
      expect(bidResponse.mediaType).to.equal('video');
    });

    it('safely handles XML parsing failure from invalid bid response', () => {
      let invalidServerResponse = {};
      invalidServerResponse.body = '<Ad id="677477"><InLine></AdSystem></InLine></Ad>';

      let result = spec.interpretResponse(invalidServerResponse, bidRequest);
      expect(result.length).to.equal(0);
    });

    it('handles nobid responses', () => {
      let nobidResponse = {};
      nobidResponse.body = '<?xml version=\'1.0\' encoding=\'UTF-8\'?><VAST version=\'2.0\'></VAST>';

      let result = spec.interpretResponse(nobidResponse, bidRequest);
      expect(result.length).to.equal(0);
    });
  });
});
