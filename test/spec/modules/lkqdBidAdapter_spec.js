import { spec } from 'modules/lkqdBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
const { expect } = require('chai');

describe('LKQD Bid Adapter Test', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'lkqd',
      'params': {
        'siteId': '662921',
        'placementId': '263'
      },
      'adUnitCode': 'video1',
      'sizes': [[300, 250], [640, 480]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'requestId': 'a09c66c3-53e3-4428-b296-38fc08e7cd2a',
      'transactionId': 'd6f6b392-54a9-454c-85fb-a2fd882c4a2d',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        wrong: 'missing zone id'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    const ENDPOINT = 'https://v.lkqd.net/ad';
    let bidRequests = [
      {
        'bidder': 'lkqd',
        'params': {
          'siteId': '662921',
          'placementId': '263'
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
          'placementId': '263'
        },
        'adUnitCode': 'lkqd',
        'sizes': [640, 480],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'requestId': 'a09c66c3-53e3-4428-b296-38fc08e7cd2a',
        'transactionId': 'd6f6b392-54a9-454c-85fb-a2fd882c4a2d',
      }
    ];

    it('should populate available parameters', function () {
      const requests = spec.buildRequests(bidRequests);
      expect(requests.length).to.equal(2);
      const r1 = requests[0].data;
      expect(r1).to.have.property('pid');
      expect(r1.pid).to.equal('263');
      expect(r1).to.have.property('sid');
      expect(r1.sid).to.equal('662921');
      expect(r1).to.have.property('width');
      expect(r1.width).to.equal(300);
      expect(r1).to.have.property('height');
      expect(r1.height).to.equal(250);
      const r2 = requests[1].data;
      expect(r2).to.have.property('pid');
      expect(r2.pid).to.equal('263');
      expect(r2).to.have.property('sid');
      expect(r2.sid).to.equal('662921');
      expect(r2).to.have.property('width');
      expect(r2.width).to.equal(640);
      expect(r2).to.have.property('height');
      expect(r2.height).to.equal(480);
    });

    it('should not populate unspecified parameters', function () {
      const requests = spec.buildRequests(bidRequests);
      expect(requests.length).to.equal(2);
      const r1 = requests[0].data;
      expect(r1).to.not.have.property('dnt');
      expect(r1).to.not.have.property('contentid');
      expect(r1).to.not.have.property('contenttitle');
      expect(r1).to.not.have.property('contentlength');
      expect(r1).to.not.have.property('contenturl');
      const r2 = requests[1].data;
      expect(r2).to.not.have.property('dnt');
      expect(r2).to.not.have.property('contentid');
      expect(r2).to.not.have.property('contenttitle');
      expect(r2).to.not.have.property('contentlength');
      expect(r2).to.not.have.property('contenturl');
    });

    it('should handle single size request', function () {
      const requests = spec.buildRequests(bidRequest);
      expect(requests.length).to.equal(1);
      const r1 = requests[0].data;
      expect(r1).to.have.property('pid');
      expect(r1.pid).to.equal('263');
      expect(r1).to.have.property('sid');
      expect(r1.sid).to.equal('662921');
      expect(r1).to.have.property('width');
      expect(r1.width).to.equal(640);
      expect(r1).to.have.property('height');
      expect(r1.height).to.equal(480);
    });

    it('sends bid request to ENDPOINT via GET', function () {
      const requests = spec.buildRequests(bidRequests);
      expect(requests.length).to.equal(2);
      const r1 = requests[0];
      expect(r1.url).to.contain(ENDPOINT);
      expect(r1.method).to.equal('GET');
      const r2 = requests[1]
      expect(r2.url).to.contain(ENDPOINT);
      expect(r2.method).to.equal('GET');
    });
  });

  describe('interpretResponse', function () {
    let bidRequest = {
      'url': 'https://ssp.lkqd.net/ad?pid=263&sid=662921&output=vast&execution=any&placement=&playinit=auto&volume=100&timeout=&width=300%E2%80%8C&height=250&pbt=[PREBID_TOKEN]%E2%80%8C&dnt=[DO_NOT_TRACK]%E2%80%8C&pageurl=[PAGEURL]%E2%80%8C&contentid=[CONTENT_ID]%E2%80%8C&contenttitle=[CONTENT_TITLE]%E2%80%8C&contentlength=[CONTENT_LENGTH]%E2%80%8C&contenturl=[CONTENT_URL]&prebid=true%E2%80%8C&rnd=874313435?bidId=253dcb69fb2577&bidWidth=300&bidHeight=250&',
      'data': {
        'bidId': '253dcb69fb2577',
        'bidWidth': '640',
        'bidHeight': '480'
      }
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
<![CDATA[ http://t.lkqd.net/t?ev=16&env=1&pid=2&sid=71 ]]>
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
<![CDATA[ http://t.lkqd.net/t?ev=17&env=1&pid=2&sid=71 ]]>
</Error>
<Creatives>
<Creative>
<Linear>
<Duration>00:00:30</Duration>
<TrackingEvents>
<Tracking event="firstQuartile">
<![CDATA[ http://t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
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
<![CDATA[ http://t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
</Tracking>
<Tracking event="fullscreen">
<![CDATA[ http://t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
</Tracking>
<Tracking event="mute">
<![CDATA[ http://t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
</Tracking>
<Tracking event="unmute">
<![CDATA[ http://t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
</Tracking>
<Tracking event="complete">
<![CDATA[ http://t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
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
<![CDATA[ http://t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
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
<![CDATA[ http://t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
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
<![CDATA[ http://t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
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
<![CDATA[ http://www.lkqd.com/ ]]>
</ClickThrough>
<ClickTracking>
<![CDATA[
https://t.lkqd.net/t?ev=8&tsid=662921&env=3&cb=761218674439&format=0&did=2&osid=6&osv=10.12.6&pubtagtype=vast&render=&apt=auto&uimp=93862023567791182&svrs=0.90&srvid=10.10.4.4&oip=208.59.120.2&vrs=&tsl=&ear=100&width=&height=250&phost=&host=&thost=&appname=&idfa=&aid=&bundleid=&lsid=&loclat=&loclong=&contentid=%5BCONTENT_ID%5D%E2%80%8C&contenttitle=%5BCONTENT_TITLE%5D%E2%80%8C&contentlength=&contenturl=&appstoreurl=&execution=any&placement=&browserid=1&browserv=65.0&adplayersize=small&pid=263&sid=662921&spid=44784&psid=&ppid=&lkqdtagtype=vast&tlr=1&adid=677477&asrc=33062&aoid=96110&dealid=654322&pbid=0&rseat=&radomain=&rcid=&rcrid=&rdealid=&iabc=&dur=30.0&cs=1432204312
]]>
</ClickTracking>
<ClickTracking>
<![CDATA[ http://t.lkqd.net/t?ev=18&env=1&pid=2&sid=71 ]]>
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
<a href="http://www.lkqd.com/" border="0" target="_blank"><img style="border:0; width:300px; height:250px;" src="https://ad.lkqd.net/serve/87123789f4ede3dcb692a277cff145ad.jpg"/></a>
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

    it('should correctly parse valid bid response', function () {
      const BIDDER_CODE = 'lkqd';
      let bidResponses = spec.interpretResponse(serverResponse, bidRequest);
      expect(bidResponses.length).to.equal(1);
      let bidResponse = bidResponses[0];
      expect(bidResponse.requestId).to.equal(bidRequest.data.bidId);
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

    it('safely handles XML parsing failure from invalid bid response', function () {
      let invalidServerResponse = {};
      invalidServerResponse.body = '<Ad id="677477"><InLine></AdSystem></InLine></Ad>';

      let result = spec.interpretResponse(invalidServerResponse, bidRequest);
      expect(result.length).to.equal(0);
    });

    it('handles nobid responses', function () {
      let nobidResponse = {};
      nobidResponse.body = '<?xml version=\'1.0\' encoding=\'UTF-8\'?><VAST version=\'2.0\'></VAST>';

      let result = spec.interpretResponse(nobidResponse, bidRequest);
      expect(result.length).to.equal(0);
    });
  });
});
