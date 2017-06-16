import {expect} from 'chai';
import {assert} from 'chai';
import Adapter from 'src/adapters/spotx';
import bidmanager from 'src/bidmanager';

const OpenRTBEndpoint =  'search.spotxchange.com/openrtb/2.3/dados/156189'// '//gadgets.lod.search.spotxchange.com/openrtb/2.3/dados/1296'

const REQUEST = {
  'bidderCode': 'spotx',
  'requestId': '4b8bb067-fca9-478b-9207-d24b87fce85c',
  'bidderRequestId': '1bfc89fa86fd1d',
  'timeout': 1000,
  'bids': [
    {
      'bidId': '2626663210bd26',
      'bidder': 'spotx',
      'bidderRequestId': '145a190a61161e',
      'mediaType': 'video',
      'params': {
        'placementId': '123456789',
        'video': {
            'ad_mute': false,
            'autoplay': true,
            'channel_id': 156189,
            'hide_skin': false,
            'slot': 'contentSpotx',
            'video_slot': 'contentElementSpotx'
          }
      },
      'placementCode': 'video1',
      'requestId': '5e1e93aa-55cf-4f73-a56a-8a74d0584c5f',
      'sizes': [[640, 480]],
      'transactionId': 'df629792-c9ae-481e-9ce1-eaa83bde4cdb'
    }
  ]
};

const BADREQUEST = {
  'bidderCode': 'spotx',
  'bids': [
    {
      'bidId': '2626663210bd26',
      'bidder': 'spotx',
      'mediaType': 'video',
      'params': {
        'placementId': '123456789',
        'video': {
            'slot': 'contentSpotx',
            'video_slot': 'contentElementSpotx'
          }
      },
      'placementCode': 'video1',
    }
  ]
};

var xhrResponse = {  
   'id': '156189',
   'cur': 'USD',
   'seatbid':[  
      {  
         'bid':[  
            {  
               'id':'47e.fc9b5.90ede6',
               'impid': '1497549328279',
               'impression_guid':'e2514a4651f311e7b50f113c04e90000',
               'price':'20',
               'adm':'<VAST><Ad><Wrapper><VASTAdTagURI><![CDATA[http:\/\/search.spotxchange.com\/\/ad\/vast.html?key=eyJob3N0IjoiZmUwMDEuc3BvdHguZ2FkZ2V0cy5sb2QiLCJjaGFubmVsIjoiMTI5NiIsInB1YiI6IjExNTAiLCJndWlkIjoiZTI1MDg0ZjU1MWYzMTFlN2I1MGYxMTNjMDRlOTAwMDAiLCJ0dGwiOiIxNDk3NTQ5MzI4MTA4MDAiLCJ2IjoiMi4wIiwiaGFzaCI6ImM1NDI4NTFmNGIxMGY0ZTFlODcwMzE0YmM3ODU4ODc3ZTg4MGYzNzMxZWU5MDkyNWQ3NTM5MmRhZjIxNTAwMmUifQ]]><\/VASTAdTagURI><\/Wrapper><\/Ad><\/VAST>',
               'adomain':'null',
               'crid':'47e.fc9b5.90ede6',
               'cid':'null',
               'ext':{  
                  'cache_key':'eyJob3N0IjoiZmUwMDEuc3BvdHguZ2FkZ2V0cy5sb2QiLCJjaGFubmVsIjoiMTI5NiIsInB1YiI6IjExNTAiLCJndWlkIjoiZTI1MDg0ZjU1MWYzMTFlN2I1MGYxMTNjMDRlOTAwMDAiLCJ0dGwiOiIxNDk3NTQ5MzI4MTA4MDAiLCJ2IjoiMi4wIiwiaGFzaCI6ImM1NDI4NTFmNGIxMGY0ZTFlODcwMzE0YmM3ODU4ODc3ZTg4MGYzNzMxZWU5MDkyNWQ3NTM5MmRhZjIxNTAwMmUifQ'
               }
            }
         ]
      }
   ]
}

var spotxKVPs = {
  spotx_ad_key: 'eyJob3N0IjoiZmUwMDEuc3BvdHguZ2FkZ2V0cy5sb2QiLCJjaGFubmVsIjoiMTI5NiIsInB1YiI6IjExNTAiLCJndWlkIjoiNDlmYjllNGQ0ZmIzMTFlN2I0ZjQxMTNjMDRlOTAwMDAiLCJ0dGwiOiIxNDk3MzAxNzA4MTA4MDAiLCJ2IjoiMi4wIiwiaGFzaCI6ImEyODk5MGFjNTFhZGVlNmZlMTFjYmZiNGFmZGQ4ZDA3YzY5NjFmZWNmZDk0MWIyZTZjOTA3NWM3MWQ1MDdmMTMifQ',
  spotx_bid: 15
};

var RESPONSE = {
  'bids': [
    {
      'cmpId': '156189',
      'cpm': '15',
      'url': 'http://search.spotxchange.com/ad/vast.html?key=eyJob3N0IjoiZmUwMDEuc3BvdHguZ2FkZ2V0cy5sb2QiLCJjaGFubmVsIjoiMTI5NiIsInB1YiI6IjExNTAiLCJndWlkIjoiNDlmYjllNGQ0ZmIzMTFlN2I0ZjQxMTNjMDRlOTAwMDAiLCJ0dGwiOiIxNDk3MzAxNzA4MTA4MDAiLCJ2IjoiMi4wIiwiaGFzaCI6ImEyODk5MGFjNTFhZGVlNmZlMTFjYmZiNGFmZGQ4ZDA3YzY5NjFmZWNmZDk0MWIyZTZjOTA3NWM3MWQ1MDdmMTMifQ',
      'cur': 'USD'
    }
  ]
};

describe('spotx', () => {
  let adapter;
  let server;

  beforeEach(() => adapter = Adapter.createNew());

  describe('request function', () => {
    let xhr;
    let requests;

    beforeEach(() => {
      var slot = document.createElement('div');
      slot.setAttribute('id', 'contentSpotx');
      document.body.appendChild(slot);

      var video_slot = document.createElement('video');
      video_slot.setAttribute('id', 'contentElementSpotx');
      slot.appendChild(video_slot);

      var source1 = document.createElement('source')
      source1.setAttribute('src', 'http://rmcdn.2mdn.net/Demo/vast_inspector/android.mp4');
      video_slot.appendChild(source1);

      var source2 = document.createElement('source')
      source2.setAttribute('src', 'http://rmcdn.2mdn.net/Demo/vast_inspector/android.webm');
      video_slot.appendChild(source2);

      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = function (request) {
        console.log('XHR Intercept');
        console.dir(request);
        requests.push(request);
        console.log('All requests');
        console.dir(requests);
      }
    });

    afterEach(() => {

      console.log('Restoring original XHR function');
      xhr.restore();
      var slot = document.getElementById('contentSpotx');
      while(slot.firstChild)
      {
        slot.removeChild(slot.firstChild);
      }
      var body = slot.parentElement;
      body.removeChild(slot);
    });

    it('request requires slot and video slot params', () =>{
      expect(REQUEST.bids[0].params.video.slot).to.equal('contentSpotx');
      expect(REQUEST.bids[0].params.video.video_slot).to.equal('contentElementSpotx');
    })

    it('Correct Endpoint is hit', (done) => {
      sinon.spy(bidmanager, 'addBidResponse');

      adapter.callBids(REQUEST);

      setTimeout(function(){
        requests[1].respond(200, {'Content-Type': 'text/xml;charset=UTF-8'}, JSON.stringify(xhrResponse));
        requests[1].autoRespond;

        sinon.assert.calledOnce(bidmanager.addBidResponse);

        const response = bidmanager.addBidResponse.firstCall.args[1];
        console.dir(response);

        expect(requests[1].url).to.equal(OpenRTBEndpoint);
        bidManager.addBidResponse.restore();
        done();
      }, 1500);


    });

    it('video player should be on the page', () => {
      var div = document.getElementById('contentSpotx');
      expect(div).to.exist;
      var video = document.getElementById('contentElementSpotx');
      expect(video).to.exist;
    });

    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('requires parameters to make request', () => {
      adapter.callBids({});
      expect(requests).to.be.empty;
    });

    // it('xhr request is made when calling callBids', (done) => {
    //   adapter.callBids(REQUEST);
    //   expect(requests).to.not.be.empty;
    // });

    it('DSDK exists and is a function', () => {
      expect(adapter.createBid).to.exist.and.to.be.a('function');
    });

    // it('initDSDK', (done) => {
    //   adapter.callBids(REQUEST);
    //   expect(requests).to.equal.true;
    // });

  });
});
