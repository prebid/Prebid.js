import {expect} from 'chai';
import Adapter from 'modules/tremorBidAdapter';
import bidmanager from 'src/bidmanager';

const AD_CODE = 'ssp-!demo!-lufip';
const SUPPLY_CODE = 'ssp-%21demo%21-rm6rh';
const SIZES = [640, 480];
const REQUEST = {
  'code': 'video1',
  'sizes': [640, 480],
  'mediaType': 'video',
  'bids': [{
    'bidder': 'tremor',
    'params': {
      'mediaId': 'MyCoolVideo',
      'mediaUrl': '',
      'mediaTitle': '',
      'contentLength': '',
      'floor': '',
      'efloor': '',
      'custom': '',
      'categories': '',
      'keywords': '',
      'blockDomains': '',
      'c2': '',
      'c3': '',
      'c4': '',
      'skip': '',
      'skipmin': '',
      'skipafter': '',
      'delivery': '',
      'placement': '',
      'videoMinBitrate': '',
      'videoMaxBitrate': ''
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

describe('TremorBidAdapter', () => {
  let adapter;

  beforeEach(() => adapter = new Adapter());

  describe('request function', () => {
    let xhr;
    let requests;

    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = request => requests.push(request);
    });

    afterEach(() => xhr.restore());

    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('requires paramters to make request', () => {
      adapter.callBids({});
      expect(requests).to.be.empty;
    });

    it('requires adCode && supplyCode', () => {
      let backup = REQUEST.bids[0].params;
      REQUEST.bids[0].params = {adCode: AD_CODE};
      adapter.callBids(REQUEST);
      expect(requests).to.be.empty;
      REQUEST.bids[0].params = backup;
    });

    it('requires proper sizes to make a bid request', () => {
      let backupBid = REQUEST;
      backupBid.sizes = [];
      adapter.callBids(backupBid);
      expect(requests).to.be.empty;
    });

    it('generates a proper ad call URL', () => {
      REQUEST.bids[0].params.adCode = AD_CODE;
      REQUEST.bids[0].params.supplyCode = SUPPLY_CODE;
      REQUEST.bids[0].sizes = SIZES;
      adapter.callBids(REQUEST);
      const requestUrl = requests[0].url;
      let srcPageURl = ('&srcPageUrl=' + encodeURIComponent(document.location.href));
      expect(requestUrl).to.equal('http://ssp-%21demo%21-rm6rh.ads.tremorhub.com/ad/tag?adCode=ssp-!demo!-lufip&playerWidth=640&playerHeight=480' + srcPageURl + '&mediaId=MyCoolVideo&fmt=json');
    });

    it('generates a proper ad call URL given a different size format', () => {
      REQUEST.bids[0].params.adCode = AD_CODE;
      REQUEST.bids[0].params.supplyCode = SUPPLY_CODE;
      REQUEST.bids[0].sizes = [SIZES];
      adapter.callBids(REQUEST);
      const requestUrl = requests[0].url;
      let srcPageURl = ('&srcPageUrl=' + encodeURIComponent(document.location.href));
      expect(requestUrl).to.equal('http://ssp-%21demo%21-rm6rh.ads.tremorhub.com/ad/tag?adCode=ssp-!demo!-lufip&playerWidth=640&playerHeight=480' + srcPageURl + '&mediaId=MyCoolVideo&fmt=json');
    });
  });

  describe('response handler', () => {
    let server;

    beforeEach(() => {
      server = sinon.fakeServer.create();
      sinon.stub(bidmanager, 'addBidResponse');
    });

    afterEach(() => {
      server.restore();
      bidmanager.addBidResponse.restore();
    });

    it('registers bids', () => {
      server.respondWith(JSON.stringify(RESPONSE));

      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm', 0.50000);
    });

    it('handles nobid responses', () => {
      server.respondWith(JSON.stringify({
        'cur': 'USD',
        'id': 'ff83ce7e00df41c9bce79b651afc7c51',
        'seatbid': []
      }));

      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property(
        'statusMessage',
        'Bid returned empty or error response'
      );
    });

    it('handles JSON.parse errors', () => {
      server.respondWith('');

      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property(
        'statusMessage',
        'Bid returned empty or error response'
      );
    });
  });
});
