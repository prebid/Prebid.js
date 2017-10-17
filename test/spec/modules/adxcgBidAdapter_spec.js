import { expect } from 'chai';
import Adapter from 'modules/adxcgBidAdapter';
import bidmanager from 'src/bidmanager';
import * as url from 'src/url';

const REQUEST = {
  'bidderCode': 'adxcg',
  'bids': [
    {
      'bidder': 'adxcg',
      'params': {
        'adzoneid': '1',
      },
      'sizes': [
        [300, 250],
        [640, 360],
        [1, 1]
      ],
      'bidId': '84ab500420319d',
      'bidderRequestId': '7101db09af0db2'
    }
  ]
};

const RESPONSE = [{
  'bidId': '84ab500420319d',
  'width': 300,
  'height': 250,
  'creativeId': '42',
  'cpm': 0.45,
  'ad': '<!-- adContent -->'
}]

const VIDEO_RESPONSE = [{
  'bidId': '84ab500420319d',
  'width': 640,
  'height': 360,
  'creativeId': '42',
  'cpm': 0.45,
  'vastUrl': 'vastContentUrl'
}]

const NATIVE_RESPONSE = [{
  'bidId': '84ab500420319d',
  'width': 0,
  'height': 0,
  'creativeId': '42',
  'cpm': 0.45,
  'nativeResponse': {
    'assets': [{
      'id': 1,
      'required': 0,
      'title': {
        'text': 'titleContent'
      }
    }, {
      'id': 2,
      'required': 0,
      'img': {
        'url': 'imageContent',
        'w': 600,
        'h': 600
      }
    }, {
      'id': 3,
      'required': 0,
      'data': {
        'label': 'DESC',
        'value': 'descriptionContent'
      }
    }, {
      'id': 0,
      'required': 0,
      'data': {
        'label': 'SPONSORED',
        'value': 'sponsoredByContent'
      }
    }],
    'link': {
      'url': 'linkContent'
    },
    'imptrackers': ['impressionTracker1', 'impressionTracker2']
  }
}]

describe('AdxcgAdapter', () => {
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

    it('creates a valid adxcg request url', () => {
      adapter.callBids(REQUEST);

      let parsedRequestUrl = url.parse(requests[0].url);

      expect(parsedRequestUrl.hostname).to.equal('ad-emea.adxcg.net');
      expect(parsedRequestUrl.pathname).to.equal('/get/adi');

      let query = parsedRequestUrl.search;
      expect(query.renderformat).to.equal('javascript');
      expect(query.ver).to.equal('r20141124');
      expect(query.adzoneid).to.equal('1');
      expect(query.format).to.equal('300x250|640x360|1x1');
      expect(query.jsonp).to.be.empty;
      expect(query.prebidBidIds).to.equal('84ab500420319d');
    });
  });

  describe('response handler', () => {
    let server;

    beforeEach(() => {
      server = sinon.fakeServer.create();
      sinon.stub(bidmanager, 'addBidResponse');
    });

    afterEach(() => {
      server.restore()
      bidmanager.addBidResponse.restore();
    });

    it('handles regular responses', () => {
      server.respondWith(JSON.stringify(RESPONSE));

      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
      expect(bidResponse.bidderCode).to.equal('adxcg');
      expect(bidResponse.width).to.equal(300);
      expect(bidResponse.height).to.equal(250);
      expect(bidResponse.statusMessage).to.equal('Bid available');
      expect(bidResponse.adId).to.equal('84ab500420319d');
      expect(bidResponse.mediaType).to.equal('banner');
      expect(bidResponse.creative_id).to.equal('42');
      expect(bidResponse.code).to.equal('adxcg');
      expect(bidResponse.cpm).to.equal(0.45);
      expect(bidResponse.ad).to.equal('<!-- adContent -->');
    });

    it('handles video responses', () => {
      server.respondWith(JSON.stringify(VIDEO_RESPONSE));

      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
      expect(bidResponse.bidderCode).to.equal('adxcg');
      expect(bidResponse.width).to.equal(640);
      expect(bidResponse.height).to.equal(360);
      expect(bidResponse.statusMessage).to.equal('Bid available');
      expect(bidResponse.adId).to.equal('84ab500420319d');
      expect(bidResponse.mediaType).to.equal('video');
      expect(bidResponse.creative_id).to.equal('42');
      expect(bidResponse.code).to.equal('adxcg');
      expect(bidResponse.cpm).to.equal(0.45);
      expect(bidResponse.vastUrl).to.equal('vastContentUrl');
      expect(bidResponse.descriptionUrl).to.equal('vastContentUrl');
    });

    it('handles native responses', () => {
      server.respondWith(JSON.stringify(NATIVE_RESPONSE));

      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
      expect(bidResponse.bidderCode).to.equal('adxcg');
      expect(bidResponse.width).to.equal(0);
      expect(bidResponse.height).to.equal(0);
      expect(bidResponse.statusMessage).to.equal('Bid available');
      expect(bidResponse.adId).to.equal('84ab500420319d');
      expect(bidResponse.mediaType).to.equal('native');
      expect(bidResponse.creative_id).to.equal('42');
      expect(bidResponse.code).to.equal('adxcg');
      expect(bidResponse.cpm).to.equal(0.45);

      expect(bidResponse.native.clickUrl).to.equal('linkContent');
      expect(bidResponse.native.impressionTrackers).to.deep.equal(['impressionTracker1', 'impressionTracker2']);
      expect(bidResponse.native.title).to.equal('titleContent');
      expect(bidResponse.native.image).to.equal('imageContent');
      expect(bidResponse.native.body).to.equal('descriptionContent');
      expect(bidResponse.native.sponsoredBy).to.equal('sponsoredByContent');
    });

    it('handles nobid responses', () => {
      server.respondWith('[]');

      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const bidResponse = bidmanager.addBidResponse.firstCall.args[1];
      expect(bidResponse.statusMessage).to.equal('Bid returned empty or error response');
    });
  });
});
