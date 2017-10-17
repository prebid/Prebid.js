import {expect} from 'chai';
import {assert} from 'chai';
import Adapter from 'modules/spotxBidAdapter';
import bidManager from 'src/bidmanager';
import adLoader from 'src/adloader';

const CHANNEL_ID = 85394;
const CACHE_KEY = 'eyJob3N0IjoiZmUwMDEuc3BvdHguZ2FkZ2V0cy5sb2QiLCJja';

let bidRequest = {
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
          'channel_id': CHANNEL_ID,
          'hide_skin': false,
          'slot': null,
          'video_slot': null
        }
      },
      'placementCode': 'video1',
      'requestId': '5e1e93aa-55cf-4f73-a56a-8a74d0584c5f',
      'sizes': [[640, 480]],
      'transactionId': 'df629792-c9ae-481e-9ce1-eaa83bde4cdb'
    }
  ]
};

let badBidRequest = {
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

var xhrResponse = JSON.stringify({
  'id': CHANNEL_ID.toString(),
  'cur': 'USD',
  'seatbid': [
    {
      'bid': [
        {
          'id': '47e.fc9b5.90ede6',
          'impid': '1497549328279',
          'impression_guid': 'e2514a4651f311e7b50f113c04e90000',
          'price': '20',
          'adm': '<VAST><Ad><Wrapper><VASTAdTagURI><![CDATA[http:\/\/search.spotxchange.com\/\/ad\/vast.html?key=' +
            CACHE_KEY + ']]><\/VASTAdTagURI><\/Wrapper><\/Ad><\/VAST>',
          'adomain': 'null',
          'crid': '47e.fc9b5.90ede6',
          'cid': 'null',
          'ext': {
            'cache_key': CACHE_KEY
          }
        }
      ]
    }
  ]
});

describe('spotx adapter tests', () => {
  describe('callBids', () => {
    let server;
    let adapter;

    beforeEach(() => {
      adapter = new Adapter();

      var slot = document.createElement('div');
      slot.setAttribute('id', 'contentSpotx');
      document.body.appendChild(slot);

      var videoSlot = document.createElement('video');
      videoSlot.setAttribute('id', 'contentElementSpotx');
      slot.appendChild(videoSlot);

      var source1 = document.createElement('source');
      source1.setAttribute('src', 'http://rmcdn.2mdn.net/Demo/vast_inspector/android.mp4');
      videoSlot.appendChild(source1);

      bidRequest.bids[0].params.video.slot = slot;
      bidRequest.bids[0].params.video.video_slot = videoSlot;

      server = sinon.fakeServer.create();
      server.respondImmediately = true;
    });

    afterEach(() => {
      var slot = document.getElementById('contentSpotx');
      while (slot.firstChild) {
        slot.removeChild(slot.firstChild);
      }
      var body = slot.parentElement;
      body.removeChild(slot);

      server.restore();
    });

    it('should load Direct AdOS onto page', () => {
      sinon.spy(adLoader, 'loadScript');

      adapter.callBids(bidRequest);

      sinon.assert.calledOnce(adLoader.loadScript);
      expect(adLoader.loadScript.firstCall.args[0]).to.equal('//js.spotx.tv/directsdk/v1/' + CHANNEL_ID + '.js');
      expect(adLoader.loadScript.firstCall.args[1]).to.be.a('function');

      adLoader.loadScript.restore();
    });

    it('should not load Direct AdOS onto page if no bid is provided', () => {
      sinon.spy(adLoader, 'loadScript');

      adapter.callBids();
      sinon.assert.notCalled(adLoader.loadScript);
      adLoader.loadScript.restore();
    });

    describe('bid response tests', () => {
      let loadScriptStub;
      let getAdServerKVPsStub;

      before(() => {
        let response = {
          spotx_bid: 20,
          spotx_ad_key: CACHE_KEY
        };

        getAdServerKVPsStub = sinon.stub();
        getAdServerKVPsStub.onCall(0).returns({
          then: function (successCb) {
            return successCb(response);
          }
        });

        getAdServerKVPsStub.onCall(1).returns({
          then: function (successCb, failureCb) {
            return failureCb();
          }
        });

        window.SpotX = {
          DirectAdOS: function(options) {
            return {
              getAdServerKVPs: getAdServerKVPsStub
            }
          }
        };

        loadScriptStub = sinon.stub(adLoader, 'loadScript', function(url, callback) {
          callback();
        });
      });

      after(() => {
        loadScriptStub.restore();
      });

      it('should add bid response on success', (done) => {
        sinon.stub(bidManager, 'addBidResponse', (placementCode, bid) => {
          expect(placementCode).to.equal('video1');
          expect(bid.bidderCode).to.equal('spotx');
          expect(bid.cpm).to.equal(20);
          expect(bid.mediaType).to.equal('video');
          expect(bid.statusMessage).to.equal('Bid available');
          expect(bid.vastUrl).to.equal('//search.spotxchange.com/ad/vast.html?key=' + CACHE_KEY);

          bidManager.addBidResponse.restore();
          done();
        });

        server.respondWith((request) => {
          if (request.url.match(/openrtb\/2.3\/dados/) && request.method === 'POST') {
            request.respond(200, {}, xhrResponse);
          }
        });

        adapter.callBids(bidRequest);
      });

      it('should add failed bid response on error', (done) => {
        sinon.stub(bidManager, 'addBidResponse', (placementCode, bid) => {
          expect(placementCode).to.equal('video1');
          expect(bid.bidderCode).to.equal('spotx');
          expect(bid.statusMessage).to.equal('Bid returned empty or error response');
          expect(bid.cpm).to.be.undefined;
          expect(bid.vastUrl).to.be.undefined;

          bidManager.addBidResponse.restore();
          done();
        });

        server.respondWith((request) => {
          if (request.url.match(/openrtb\/2.3\/dados/) && request.method === 'POST') {
            request.respond(204, {}, '');
          }
        });

        adapter.callBids(bidRequest);
      });
    });
  });
});
