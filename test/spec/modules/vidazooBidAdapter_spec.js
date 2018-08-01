import {expect} from 'chai';
import {spec as adapter, URL} from 'modules/vidazooBidAdapter';
import * as utils from 'src/utils';

const BID = {
  'bidId': '2d52001cabd527',
  'params': {
    'cId': '59db6b3b4ffaa70004f45cdc',
    'pId': '59ac17c192832d0011283fe3',
    'bidFloor': 0.1,
    'ext': {
      'param1': 'loremipsum',
      'param2': 'dolorsitamet'
    }
  },
  'placementCode': 'div-gpt-ad-1460505748561-0',
  'transactionId': 'c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf',
  'sizes': [[300, 250], [300, 600]],
  'bidderRequestId': '1fdb5ff1b6eaa7',
  'requestId': 'b0777d85-d061-450e-9bc7-260dd54bbb7a'
};

const BIDDER_REQUEST = {
  'gdprConsent': {
    'consentString': 'consent_string'
  }
};

const SERVER_RESPONSE = {
  body: {
    'ad': '<iframe>console.log("hello world")</iframe>',
    'price': 0.8,
    'creativeId': '12610997325162499419',
    'exp': 30,
    'cookies': [{
      'src': 'https://sync.com',
      'type': 'iframe'
    }, {
      'src': 'https://sync.com',
      'type': 'img'
    }]
  }
};

const REQUEST = {
  data: {
    width: 300,
    height: 250,
    bidId: '2d52001cabd527'
  }
};

const SYNC_OPTIONS = {
  'pixelEnabled': true
};

describe('VidazooBidAdapter', () => {
  describe('validtae spec', () => {
    it('exists and is a function', () => {
      expect(adapter.isBidRequestValid).to.exist.and.to.be.a('function');
    });

    it('exists and is a function', () => {
      expect(adapter.buildRequests).to.exist.and.to.be.a('function');
    });

    it('exists and is a function', () => {
      expect(adapter.interpretResponse).to.exist.and.to.be.a('function');
    });

    it('exists and is a function', () => {
      expect(adapter.getUserSyncs).to.exist.and.to.be.a('function');
    });

    it('exists and is a string', () => {
      expect(adapter.code).to.exist.and.to.be.a('string');
    });
  });

  describe('validate bid requests', () => {
    it('should require cId', () => {
      const isValid = adapter.isBidRequestValid({
        params: {
          pId: 'pid'
        }
      });
      expect(isValid).to.be.false;
    });

    it('should require pId', () => {
      const isValid = adapter.isBidRequestValid({
        params: {
          cId: 'cid'
        }
      });
      expect(isValid).to.be.false;
    });

    it('should validate correctly', () => {
      const isValid = adapter.isBidRequestValid({
        params: {
          cId: 'cid',
          pId: 'pid'
        }
      });
      expect(isValid).to.be.true;
    });
  });

  describe('build requests', () => {
    let sandbox;
    before(() => {
      sandbox = sinon.sandbox.create();
      sandbox.stub(utils, 'getTopWindowUrl').returns('http://www.greatsite.com');
      sandbox.stub(Date, 'now').returns(1000);
    });

    it('should build request for each size', () => {
      const requests = adapter.buildRequests([BID], BIDDER_REQUEST);
      expect(requests).to.have.length(2);
      expect(requests[0]).to.deep.equal({
        method: 'GET',
        url: `${URL}/prebid/59db6b3b4ffaa70004f45cdc`,
        data: {
          consent: 'consent_string',
          width: '300',
          height: '250',
          url: 'http://www.greatsite.com',
          cb: 1000,
          bidFloor: 0.1,
          bidId: '2d52001cabd527',
          publisherId: '59ac17c192832d0011283fe3',
          'ext.param1': 'loremipsum',
          'ext.param2': 'dolorsitamet',
        }
      });
      expect(requests[1]).to.deep.equal({
        method: 'GET',
        url: `${URL}/prebid/59db6b3b4ffaa70004f45cdc`,
        data: {
          consent: 'consent_string',
          width: '300',
          height: '600',
          url: 'http://www.greatsite.com',
          cb: 1000,
          bidFloor: 0.1,
          bidId: '2d52001cabd527',
          publisherId: '59ac17c192832d0011283fe3',
          'ext.param1': 'loremipsum',
          'ext.param2': 'dolorsitamet',
        }
      });
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('interpret response', () => {
    it('should return empty array when there is no response', () => {
      const responses = adapter.interpretResponse(null);
      expect(responses).to.be.empty;
    });

    it('should return empty array when there is no ad', () => {
      const responses = adapter.interpretResponse({price: 1, ad: ''});
      expect(responses).to.be.empty;
    });

    it('should return empty array when there is no price', () => {
      const responses = adapter.interpretResponse({price: null, ad: 'great ad'});
      expect(responses).to.be.empty;
    });

    it('should return an array of interpreted responses', () => {
      const responses = adapter.interpretResponse(SERVER_RESPONSE, REQUEST);
      expect(responses).to.have.length(1);
      expect(responses[0]).to.deep.equal({
        requestId: '2d52001cabd527',
        cpm: 0.8,
        width: 300,
        height: 250,
        creativeId: '12610997325162499419',
        currency: 'USD',
        netRevenue: true,
        ttl: 30,
        ad: '<iframe>console.log("hello world")</iframe>'
      });
    });

    it('should take default TTL', () => {
      const serverResponse = utils.deepClone(SERVER_RESPONSE);
      delete serverResponse.body.exp;
      const responses = adapter.interpretResponse(serverResponse, REQUEST);
      expect(responses).to.have.length(1);
      expect(responses[0].ttl).to.equal(300);
    });
  });
});
