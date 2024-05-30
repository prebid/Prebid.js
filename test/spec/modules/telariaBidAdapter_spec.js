import {expect} from 'chai';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {spec, getTimeoutUrl} from 'modules/telariaBidAdapter.js';
import * as utils from 'src/utils.js';

const ENDPOINT = '.ads.tremorhub.com/ad/tag';
const AD_CODE = 'ssp-!demo!-lufip';
const SUPPLY_CODE = 'ssp-demo-rm6rh';
const SIZES = [640, 480];
const REQUEST = {
  'code': 'video1',
  'mediaTypes': {
    'video': {
      'playerSize': [[640, 480]],
      'context': 'instream'
    }
  },
  'mediaType': 'video',
  'bids': [{
    'bidder': 'telaria',
    'params': {
      'videoId': 'MyCoolVideo',
      'inclSync': true
    }
  }]
};

const REQUEST_WITH_SCHAIN = [{
  'bidder': 'telaria',
  'params': {
    'videoId': 'MyCoolVideo',
    'inclSync': true,
    'schain': {
      'ver': '1.0',
      'complete': 1,
      'nodes': [
        {
          'asi': 'exchange1.com',
          'sid': '1234',
          'hp': 1,
          'rid': 'bid-request-1',
          'name': 'publisher',
          'domain': 'publisher.com'
        },
        {
          'asi': 'exchange2.com',
          'sid': 'abcd',
          'hp': 1,
          'rid': 'bid-request-2',
          'name': 'intermediary',
          'domain': 'intermediary.com'
        }
      ]
    }
  }
}];

const BIDDER_REQUEST = {
  'refererInfo': {
    'referer': 'www.test.com'
  },
  'gdprConsent': {
    'consentString': 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
    'gdprApplies': true
  }
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

describe('TelariaAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = REQUEST.bids[0];

    it('should return true when required params found', () => {
      let tempBid = bid;
      tempBid.params.adCode = 'ssp-!demo!-lufip';
      tempBid.params.supplyCode = 'ssp-demo-rm6rh';
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found', () => {
      let tempBid = bid;
      delete tempBid.params;
      tempBid.params = {
        supplyCode: 'ssp-demo-rm6rh',
        adCode: 'ssp-!demo!-lufip',
      };

      expect(spec.isBidRequestValid(tempBid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let tempBid = bid;
      tempBid.params = {};
      expect(spec.isBidRequestValid(tempBid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    const stub = () => ([{
      mediaTypes: {
        video: {
          playerSize: [[640, 480]],
          context: 'instream'
        }
      },
      bidder: 'tremor',
      params: {
        supplyCode: 'ssp-demo-rm6rh',
        adCode: 'ssp-!demo!-lufip',
        videoId: 'MyCoolVideo'
      }
    }]);

    const schainStub = REQUEST_WITH_SCHAIN;

    it('exists and is a function', () => {
      expect(spec.buildRequests).to.exist.and.to.be.a('function');
    });

    it('requires supply code & ad code to make a request', () => {
      const tempRequest = spec.buildRequests(stub(), BIDDER_REQUEST);
      expect(tempRequest.length).to.equal(1);
    });

    it('generates an array of requests with 4 params, method, url, bidId and vastUrl', () => {
      const tempRequest = spec.buildRequests(stub(), BIDDER_REQUEST);

      expect(tempRequest.length).to.equal(1);
      expect(tempRequest[0].method).to.equal('GET');
      expect(tempRequest[0].url).to.exist;
      expect(tempRequest[0].bidId).to.equal(undefined);
      expect(tempRequest[0].vastUrl).to.exist;
    });

    it('doesn\'t require player size but is highly recommended', () => {
      let tempBid = stub();
      tempBid[0].mediaTypes.video.playerSize = null;
      const tempRequest = spec.buildRequests(tempBid, BIDDER_REQUEST);

      expect(tempRequest.length).to.equal(1);
    });

    it('generates a valid request with sizes as an array of two elements', () => {
      let tempBid = stub();
      tempBid[0].mediaTypes.video.playerSize = [640, 480];
      tempBid[0].params.adCode = 'ssp-!demo!-lufip';
      tempBid[0].params.supplyCode = 'ssp-demo-rm6rh';
      let builtRequests = spec.buildRequests(tempBid, BIDDER_REQUEST);
      expect(builtRequests.length).to.equal(1);
    });

    it('requires ad code and supply code to make a request', () => {
      let tempBid = stub();
      tempBid[0].params.adCode = null;
      tempBid[0].params.supplyCode = null;

      const tempRequest = spec.buildRequests(tempBid, BIDDER_REQUEST);

      expect(tempRequest.length).to.equal(0);
    });

    it('converts the schain object into a tag param', () => {
      let tempBid = schainStub;
      tempBid[0].params.adCode = 'ssp-!demo!-lufip';
      tempBid[0].params.supplyCode = 'ssp-demo-rm6rh';
      let builtRequests = spec.buildRequests(tempBid, BIDDER_REQUEST);
      expect(builtRequests.length).to.equal(1);
    });

    it('adds adUnitCode to the request url', () => {
      const builtRequests = spec.buildRequests(stub(), BIDDER_REQUEST);

      expect(builtRequests.length).to.equal(1);
      const parts = builtRequests[0].url.split('adCode=');
      expect(parts.length).to.equal(2);
    });

    it('adds srcPageUrl to the request url', () => {
      const builtRequests = spec.buildRequests(stub(), BIDDER_REQUEST);

      expect(builtRequests.length).to.equal(1);
      const parts = builtRequests[0].url.split('srcPageUrl=');
      expect(parts.length).to.equal(2);
    });

    it('adds srcPageUrl from params to the request only once', () => {
      const tempBid = stub();
      tempBid[0].params.srcPageUrl = 'http://www.test.com';
      const builtRequests = spec.buildRequests(tempBid, BIDDER_REQUEST);

      expect(builtRequests.length).to.equal(1);
      const parts = builtRequests[0].url.split('srcPageUrl=');
      expect(parts.length).to.equal(2);
    });
  });

  describe('interpretResponse', () => {
    const responseStub = RESPONSE;
    const stub = [{
      mediaTypes: {
        video: {
          playerSize: [[640, 480]],
          context: 'instream'
        }
      },
      bidder: 'tremor',
      params: {
        supplyCode: 'ssp-demo-rm6rh',
        adCode: 'ssp-!demo!-lufip',
        videoId: 'MyCoolVideo'
      }
    }];

    it('should get correct bid response', () => {
      let expectedResponseKeys = ['requestId', 'cpm', 'creativeId', 'vastXml', 'vastUrl', 'mediaType', 'width', 'height', 'currency', 'netRevenue', 'ttl', 'ad', 'meta'];

      let bidRequest = spec.buildRequests(stub, BIDDER_REQUEST)[0];
      bidRequest.bidId = '1234';
      let result = spec.interpretResponse({body: responseStub}, bidRequest);
      expect(Object.keys(result[0])).to.have.members(expectedResponseKeys);
    });

    it('handles nobid responses', () => {
      let tempResponse = responseStub;
      tempResponse.seatbid = [];

      let bidRequest = spec.buildRequests(stub, BIDDER_REQUEST)[0];
      bidRequest.bidId = '1234';

      let result = spec.interpretResponse({body: tempResponse}, bidRequest);
      expect(result.length).to.equal(0);
    });

    it('handles invalid responses', () => {
      let result = spec.interpretResponse(null, {bbidderCode: 'telaria'});
      expect(result.length).to.equal(0);
    });

    it('handles error responses', () => {
      let result = spec.interpretResponse({body: {error: 'Invalid request'}}, {bbidderCode: 'telaria'});
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', () => {
    const responses = [{body: RESPONSE}];
    responses[0].body.ext = {
      telaria: {
        userSync: [
          'https://url.com',
          'https://url2.com'
        ]
      }
    };

    it('should get the correct number of sync urls', () => {
      let urls = spec.getUserSyncs({pixelEnabled: true}, responses);
      expect(urls.length).to.equal(2);
    });
  });

  describe('onTimeout', () => {
    const timeoutData = [{
      adUnitCode: 'video1',
      auctionId: 'd8d239f4-303a-4798-8c8c-dd3151ced4e7',
      bidId: '2c749c0101ea92',
      bidder: 'telaria',
      params: [{
        adCode: 'ssp-!demo!-lufip',
        supplyCode: 'ssp-demo-rm6rh',
        mediaId: 'MyCoolVideo'
      }]
    }];

    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function() {
      utils.triggerPixel.restore();
    });

    it('should return a pixel url', () => {
      let url = getTimeoutUrl(timeoutData);
      assert(url);
    });

    it('should fire a pixel', () => {
      expect(spec.onTimeout(timeoutData)).to.be.undefined;
      expect(utils.triggerPixel.called).to.equal(true);
    });
  });
});
