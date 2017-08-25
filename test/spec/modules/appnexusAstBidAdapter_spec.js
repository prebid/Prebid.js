import { expect } from 'chai';
import Adapter from 'modules/appnexusAstBidAdapter';
import bidmanager from 'src/bidmanager';

const ENDPOINT = '//ib.adnxs.com/ut/v3/prebid';

const REQUEST = {
  'bidderCode': 'appnexusAst',
  'requestId': 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
  'bidderRequestId': '7101db09af0db2',
  'bids': [
    {
      'bidder': 'appnexusAst',
      'params': {
        'placementId': '4799418',
      },
      'placementCode': '/19968336/header-bid-tag1',
      'sizes': [
        [728, 90],
        [970, 90]
      ],
      'bidId': '84ab500420319d',
      'bidderRequestId': '7101db09af0db2',
      'requestId': 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6'
    }
  ],
  'start': 1469479810130
};

const RESPONSE = {
  'version': '0.0.1',
  'tags': [{
    'uuid': '84ab500420319d',
    'tag_id': 4799418,
    'auction_id': '2256922143947979797',
    'no_ad_url': 'http://lax1-ib.adnxs.com/no-ad',
    'timeout_ms': 2500,
    'ads': [{
      'content_source': 'rtb',
      'ad_type': 'banner',
      'buyer_member_id': 958,
      'creative_id': 33989846,
      'media_type_id': 1,
      'media_subtype_id': 1,
      'cpm': 0.500000,
      'cpm_publisher_currency': 0.500000,
      'publisher_currency_code': '$',
      'client_initiated_ad_counting': true,
      'rtb': {
        'banner': {
          'width': 728,
          'height': 90,
          'content': '<!-- Creative -->'
        },
        'trackers': [{
          'impression_urls': ['http://lax1-ib.adnxs.com/impression']
        }]
      }
    }]
  }]
};

describe('AppNexusAdapter', () => {
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

    it('requires member && invCode', () => {
      let backup = REQUEST.bids[0].params;
      REQUEST.bids[0].params = {member: 1234};
      adapter.callBids(REQUEST);
      expect(requests).to.be.empty;
      REQUEST.bids[0].params = backup;
    });

    it('attaches valid video params to the tag', () => {
      REQUEST.bids[0].params.video = {
        id: 123,
        minduration: 100,
        foobar: 'invalid'
      };

      adapter.callBids(REQUEST);

      const request = JSON.parse(requests[0].requestBody).tags[0];
      expect(request.video).to.deep.equal({
        id: 123,
        minduration: 100
      });

      delete REQUEST.bids[0].params.video;
    });

    it('attaches valid user params to the tag', () => {
      REQUEST.bids[0].params.user = {
        external_uid: '123',
        foobar: 'invalid'
      };

      adapter.callBids(REQUEST);

      const request = JSON.parse(requests[0].requestBody);
      expect(request.user).to.exist;
      expect(request.user).to.deep.equal({
        external_uid: '123',
      });

      delete REQUEST.bids[0].params.user;
    });

    it('attaches native params to the request', () => {
      REQUEST.bids[0].mediaType = 'native';
      REQUEST.bids[0].nativeParams = {
        title: {required: true},
        body: {required: true},
        image: {required: true, sizes: [{ width: 100, height: 100 }] },
        cta: {required: false},
        sponsoredBy: {required: true}
      };

      adapter.callBids(REQUEST);

      const request = JSON.parse(requests[0].requestBody);
      expect(request.tags[0].native.layouts[0]).to.deep.equal({
        title: {required: true},
        description: {required: true},
        main_image: {required: true, sizes: [{ width: 100, height: 100 }] },
        ctatext: {required: false},
        sponsored_by: {required: true}
      });

      delete REQUEST.bids[0].mediaType;
      delete REQUEST.bids[0].params.nativeParams;
    });

    it('sets required native asset params when not provided on adunit', () => {
      REQUEST.bids[0].mediaType = 'native';
      REQUEST.bids[0].nativeParams = {
        image: {required: true},
      };

      adapter.callBids(REQUEST);

      const request = JSON.parse(requests[0].requestBody);
      expect(request.tags[0].native.layouts[0]).to.deep.equal({
        main_image: {required: true, sizes: [{}] },
      });

      delete REQUEST.bids[0].mediaType;
      delete REQUEST.bids[0].params.nativeParams;
    });

    it('sends bid request to ENDPOINT via POST', () => {
      adapter.callBids(REQUEST);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('POST');
    });

    it('converts keyword params to proper form and attaches to request', () => {
      REQUEST.bids[0].params.keywords = {
        single: 'val',
        singleArr: ['val'],
        singleArrNum: [5],
        multiValMixed: ['value1', 2, 'value3'],
        singleValNum: 123,
        badValue: {'foo': 'bar'} // should be dropped
      };

      adapter.callBids(REQUEST);

      const request = JSON.parse(requests[0].requestBody).tags[0];
      expect(request.keywords).to.deep.equal([{
        'key': 'single',
        'value': ['val']
      }, {
        'key': 'singleArr',
        'value': ['val']
      }, {
        'key': 'singleArrNum',
        'value': ['5']
      }, {
        'key': 'multiValMixed',
        'value': ['value1', '2', 'value3']
      }, {
        'key': 'singleValNum',
        'value': ['123']
      }]);

      delete REQUEST.bids[0].params.keywords;
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

    it('registers bids', () => {
      server.respondWith(JSON.stringify(RESPONSE));

      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
      expect(response).to.have.property('cpm', 0.5);
    });

    it('handles nobid responses', () => {
      server.respondWith(JSON.stringify({
        'version': '0.0.1',
        'tags': [{
          'uuid': '84ab500420319d',
          'tag_id': 5976557,
          'auction_id': '297492697822162468',
          'nobid': true
        }]
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

    it('handles non-banner media responses', () => {
      server.respondWith(JSON.stringify({
        'tags': [{
          'uuid': '84ab500420319d',
          'ads': [{
            'ad_type': 'video',
            'cpm': 0.500000,
            'rtb': {
              'video': {
                'content': '<!-- Creative -->'
              }
            }
          }]
        }]
      }));

      adapter.callBids(REQUEST);
      server.respond();
      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];
      expect(response).to.have.property('statusMessage', 'Bid available');
    });

    it('handles native responses', () => {
      RESPONSE.tags[0].ads[0].ad_type = 'native';
      RESPONSE.tags[0].ads[0].rtb.native = {
        'title': 'Native Creative',
        'desc': 'Cool description great stuff',
        'ctatext': 'Do it',
        'sponsored': 'AppNexus',
        'icon': {
          'width': 0,
          'height': 0,
          'url': 'http://cdn.adnxs.com/icon.png'
        },
        'main_img': {
          'width': 2352,
          'height': 1516,
          'url': 'http://cdn.adnxs.com/img.png'
        },
        'link': {
          'url': 'https://www.appnexus.com',
          'fallback_url': '',
          'click_trackers': ['http://nym1-ib.adnxs.com/click']
        },
        'impression_trackers': ['http://example.com'],
      };

      adapter.callBids(REQUEST);
      server.respondWith(JSON.stringify(RESPONSE));
      server.respond();

      sinon.assert.calledOnce(bidmanager.addBidResponse);

      const response = bidmanager.addBidResponse.firstCall.args[1];

      expect(response.native.title).to.equal('Native Creative');
      expect(response.native.body).to.equal('Cool description great stuff');
      expect(response.native.cta).to.equal('Do it');
      expect(response.native.image).to.equal('http://cdn.adnxs.com/img.png');

      RESPONSE.tags[0].ads[0].ad_type = 'banner';
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
