import {expect} from 'chai';
import {newBidder} from 'src/adapters/bidderFactory';
import {spec} from 'modules/telariaBidAdapter';

const ENDPOINT = '.ads.tremorhub.com/ad/tag';
const AD_CODE = 'ssp-!demo!-lufip';
const SUPPLY_CODE = 'ssp-demo-rm6rh';
const SIZES = [640, 480];
const REQUEST = {
  'code': 'video1',
  'sizes': [640, 480],
  'mediaType': 'video',
  'bids': [{
    'bidder': 'tremor',
    'params': {
      'videoId': 'MyCoolVideo',
      'inclSync': true
    }
  }]
};

const RESPONSE = {
  'cur': 'USD',
  'id': '3dba13e35f3d42f998bc7e65fd871889',
  'seatbid': [{
    'seat': 'TremorVideo',
    'bid': [{
      'adomain': [],
      'price': 0.50000,
      'id': '3dba13e35f3d42f998bc7e65fd871889',
      'adm': '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<VAST version="2.0">    <Ad id="defaultText">        <InLine>            <AdSystem version="1.0">Tremor Video</AdSystem>            <AdTitle>Test MP4 Creative</AdTitle>            <Error><![CDATA[https://events.tremorhub.com/diag?rid=3dba13e35f3d42f998bc7e65fd871889&req_ts=1503951950395&pbid=47376&seatid=60858&aid=348453&asid=null&lid=null&rid=3dba13e35f3d42f998bc7e65fd871889&rtype=VAST_ERR&vastError=[ERRORCODE]&sec=true&adcode=ssp-!demo!-lufip&seatId=60858&pbid=47376&brid=141046&sid=149810&sdom=console.tremorhub.com&aid=348453]]></Error>\n<Impression id="TV"><![CDATA[https://events.tremorhub.com/evt?rid=3dba13e35f3d42f998bc7e65fd871889&req_ts=1503951950395&pbid=47376&seatid=60858&aid=348453&asid=null&lid=null&tuid=97e0d10a4b504700b578e4f7d22cac35&evt=IMP&tvssa=false]]></Impression>\n<Impression/>            <Creatives>                <Creative>                    <Linear>                        <Duration><![CDATA[ 00:00:30 ]]></Duration>                        <AdParameters><![CDATA[ &referer=- ]]></AdParameters>                        <MediaFiles>                            <MediaFile delivery="progressive" height="360" type="video/mp4" width="640">                                <![CDATA[https://cdn.tremorhub.com/adUnitTest/tremor_video_test_ad_30sec_640x360.mp4]]>                            </MediaFile>                        </MediaFiles>                        <TrackingEvents>\n<Tracking event="start"><![CDATA[https://events.tremorhub.com/evt?rid=3dba13e35f3d42f998bc7e65fd871889&req_ts=1503951950395&pbid=47376&seatid=60858&aid=348453&asid=null&lid=null&tuid=97e0d10a4b504700b578e4f7d22cac35&evt=start&vastcrtype=linear&crid=]]></Tracking>\n<Tracking event="firstQuartile"><![CDATA[https://events.tremorhub.com/evt?rid=3dba13e35f3d42f998bc7e65fd871889&req_ts=1503951950395&pbid=47376&seatid=60858&aid=348453&asid=null&lid=null&tuid=97e0d10a4b504700b578e4f7d22cac35&evt=firstQuartile&vastcrtype=linear&crid=]]></Tracking>\n<Tracking event="midpoint"><![CDATA[https://events.tremorhub.com/evt?rid=3dba13e35f3d42f998bc7e65fd871889&req_ts=1503951950395&pbid=47376&seatid=60858&aid=348453&asid=null&lid=null&tuid=97e0d10a4b504700b578e4f7d22cac35&evt=midpoint&vastcrtype=linear&crid=]]></Tracking>\n<Tracking event="thirdQuartile"><![CDATA[https://events.tremorhub.com/evt?rid=3dba13e35f3d42f998bc7e65fd871889&req_ts=1503951950395&pbid=47376&seatid=60858&aid=348453&asid=null&lid=null&tuid=97e0d10a4b504700b578e4f7d22cac35&evt=thirdQuartile&vastcrtype=linear&crid=]]></Tracking>\n<Tracking event="complete"><![CDATA[https://events.tremorhub.com/evt?rid=3dba13e35f3d42f998bc7e65fd871889&req_ts=1503951950395&pbid=47376&seatid=60858&aid=348453&asid=null&lid=null&tuid=97e0d10a4b504700b578e4f7d22cac35&evt=complete&vastcrtype=linear&crid=]]></Tracking>\n</TrackingEvents>                        <VideoClicks>\n<ClickTracking id="TV"><![CDATA[https://events.tremorhub.com/evt?rid=3dba13e35f3d42f998bc7e65fd871889&req_ts=1503951950395&pbid=47376&seatid=60858&aid=348453&asid=null&lid=null&tuid=97e0d10a4b504700b578e4f7d22cac35&evt=click&vastcrtype=linear&crid=]]></ClickTracking>\n</VideoClicks>                    </Linear>                </Creative>            </Creatives>            <Extensions/>        </InLine>    </Ad>\n</VAST>\n',
      'impid': '1'
    }]
  }]
};

describe('TelariaAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = REQUEST.bids[0];

    it('should return true when required params found', function () {
      let tempBid = bid;
      tempBid.params.adCode = 'ssp-!demo!-lufip';
      tempBid.params.supplyCode = 'ssp-demo-rm6rh';
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found', function () {
      let tempBid = bid;
      delete tempBid.params;
      tempBid.params = {
        supplyCode: 'ssp-demo-rm6rh',
        adCode: 'ssp-!demo!-lufip',
      };

      expect(spec.isBidRequestValid(tempBid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let tempBid = bid;
      tempBid.params = {};
      expect(spec.isBidRequestValid(tempBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const stub = [{
      bidder: 'tremor',
      sizes: [[300, 250], [300, 600]],
      params: {
        supplyCode: 'ssp-demo-rm6rh',
        adCode: 'ssp-!demo!-lufip',
        videoId: 'MyCoolVideo'
      }
    }];

    it('exists and is a function', function () {
      expect(spec.buildRequests).to.exist.and.to.be.a('function');
    });

    it('requires supply code, ad code and sizes to make a request', function () {
      const tempRequest = spec.buildRequests(stub);
      expect(tempRequest.length).to.equal(1);
    });

    it('generates an array of requests with 4 params, method, url, bidId and vastUrl', function () {
      const tempRequest = spec.buildRequests(stub);

      expect(tempRequest.length).to.equal(1);
      expect(tempRequest[0].method).to.equal('GET');
      expect(tempRequest[0].url).to.exist;
      expect(tempRequest[0].bidId).to.equal(undefined);
      expect(tempRequest[0].vastUrl).to.exist;
    });

    it('requires sizes to make a request', function () {
      let tempBid = stub;
      tempBid[0].sizes = null;
      const tempRequest = spec.buildRequests(tempBid);

      expect(tempRequest.length).to.equal(0);
    });

    it('generates a valid request with sizes as an array of two elements', function () {
      let tempBid = stub;
      tempBid[0].sizes = [640, 480];
      expect(spec.buildRequests(tempBid).length).to.equal(1);
    });

    it('requires ad code and supply code to make a request', function () {
      let tempBid = stub;
      tempBid[0].params.adCode = null;
      tempBid[0].params.supplyCode = null;

      const tempRequest = spec.buildRequests(tempBid);

      expect(tempRequest.length).to.equal(0);
    });
  });

  describe('interpretResponse', function () {
    const responseStub = RESPONSE;
    const stub = [{
      bidder: 'tremor',
      sizes: [[300, 250], [300, 600]],
      params: {
        supplyCode: 'ssp-demo-rm6rh',
        adCode: 'ssp-!demo!-lufip',
        videoId: 'MyCoolVideo'
      }
    }];

    it('should get correct bid response', function () {
      let expectedResponseKeys = ['bidderCode', 'width', 'height', 'statusMessage', 'adId', 'mediaType', 'source',
        'getStatusCode', 'getSize', 'requestId', 'cpm', 'creativeId', 'vastXml',
        'vastUrl', 'currency', 'netRevenue', 'ttl', 'ad'];

      let bidRequest = spec.buildRequests(stub)[0];
      bidRequest.bidId = '1234';
      let result = spec.interpretResponse({body: responseStub}, bidRequest);
      expect(Object.keys(result[0])).to.have.members(expectedResponseKeys);
    });

    it('handles nobid responses', function () {
      let tempResponse = responseStub;
      tempResponse.seatbid = [];

      let bidRequest = spec.buildRequests(stub)[0];
      bidRequest.bidId = '1234';

      let result = spec.interpretResponse({body: tempResponse}, bidRequest);
      expect(result.length).to.equal(0);
    });

    it('handles invalid responses', function () {
      let result = spec.interpretResponse(null, {bbidderCode: 'telaria'});
      expect(result.length).to.equal(0);
    });

    it('handles error responses', function () {
      let result = spec.interpretResponse({body: {error: 'Invalid request'}}, {bbidderCode: 'telaria'});
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    const responses = [{body: RESPONSE}];
    responses[0].body.ext = {
      telaria: {
        userSync: [
          'https://url.com',
          'https://url2.com'
        ]
      }
    };

    it('should get the correct number of sync urls', function () {
      let urls = spec.getUserSyncs({pixelEnabled: true}, responses);
      expect(urls.length).to.equal(2);
    });
  });
});
