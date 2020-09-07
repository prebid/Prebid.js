import { expect } from 'chai';
import {
  spec as adapter,
  SUPPORTED_ID_SYSTEMS,
  createDomain,
  hashCode,
  extractPID,
  extractCID,
  extractSubDomain,
  getStorageItem,
  setStorageItem,
  tryParseJSON,
  getUniqueDealId,
  getNextDealId,
  getVidazooSessionId,
} from 'modules/vidazooBidAdapter.js';
import * as utils from 'src/utils.js';
import { version } from 'package.json';
import { useFakeTimers } from 'sinon';

const SUB_DOMAIN = 'openrtb';

const BID = {
  'bidId': '2d52001cabd527',
  'adUnitCode': 'div-gpt-ad-12345-0',
  'params': {
    'subDomain': SUB_DOMAIN,
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
    'consentString': 'consent_string',
    'gdprApplies': true
  },
  'uspConsent': 'consent_string',
  'refererInfo': {
    'referer': 'https://www.greatsite.com'
  }
};

const SERVER_RESPONSE = {
  body: {
    results: [{
      'ad': '<iframe>console.log("hello world")</iframe>',
      'price': 0.8,
      'creativeId': '12610997325162499419',
      'exp': 30,
      'width': 300,
      'height': 250,
      'cookies': [{
        'src': 'https://sync.com',
        'type': 'iframe'
      }, {
        'src': 'https://sync.com',
        'type': 'img'
      }]
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

describe('VidazooBidAdapter', function () {
  describe('validtae spec', function () {
    it('exists and is a function', function () {
      expect(adapter.isBidRequestValid).to.exist.and.to.be.a('function');
    });

    it('exists and is a function', function () {
      expect(adapter.buildRequests).to.exist.and.to.be.a('function');
    });

    it('exists and is a function', function () {
      expect(adapter.interpretResponse).to.exist.and.to.be.a('function');
    });

    it('exists and is a function', function () {
      expect(adapter.getUserSyncs).to.exist.and.to.be.a('function');
    });

    it('exists and is a string', function () {
      expect(adapter.code).to.exist.and.to.be.a('string');
    });
  });

  describe('validate bid requests', function () {
    it('should require cId', function () {
      const isValid = adapter.isBidRequestValid({
        params: {
          pId: 'pid'
        }
      });
      expect(isValid).to.be.false;
    });

    it('should require pId', function () {
      const isValid = adapter.isBidRequestValid({
        params: {
          cId: 'cid'
        }
      });
      expect(isValid).to.be.false;
    });

    it('should validate correctly', function () {
      const isValid = adapter.isBidRequestValid({
        params: {
          cId: 'cid',
          pId: 'pid'
        }
      });
      expect(isValid).to.be.true;
    });
  });

  describe('build requests', function () {
    let sandbox;
    before(function () {
      sandbox = sinon.sandbox.create();
      sandbox.stub(Date, 'now').returns(1000);
    });

    it('should build request for each size', function () {
      const hashUrl = hashCode(BIDDER_REQUEST.refererInfo.referer);
      const requests = adapter.buildRequests([BID], BIDDER_REQUEST);
      expect(requests).to.have.length(1);
      expect(requests[0]).to.deep.equal({
        method: 'POST',
        url: `${createDomain(SUB_DOMAIN)}/prebid/multi/59db6b3b4ffaa70004f45cdc`,
        data: {
          gdprConsent: 'consent_string',
          gdpr: 1,
          usPrivacy: 'consent_string',
          sizes: ['300x250', '300x600'],
          url: 'https%3A%2F%2Fwww.greatsite.com',
          cb: 1000,
          bidFloor: 0.1,
          bidId: '2d52001cabd527',
          adUnitCode: 'div-gpt-ad-12345-0',
          publisherId: '59ac17c192832d0011283fe3',
          dealId: 1,
          sessionId: '',
          uniqueDealId: `${hashUrl}_${Date.now().toString()}`,
          bidderVersion: adapter.version,
          prebidVersion: version,
          res: `${window.top.screen.width}x${window.top.screen.height}`,
          'ext.param1': 'loremipsum',
          'ext.param2': 'dolorsitamet',
        }
      });
    });

    after(function () {
      sandbox.restore();
    });
  });
  describe('getUserSyncs', function () {
    it('should have valid user sync with iframeEnabled', function () {
      const result = adapter.getUserSyncs({ iframeEnabled: true }, [SERVER_RESPONSE]);

      expect(result).to.deep.equal([{
        type: 'iframe',
        url: 'https://prebid.cootlogix.com/api/sync/iframe/?gdpr=0&gdpr_consent=&us_privacy='
      }]);
    });

    it('should have valid user sync with pixelEnabled', function () {
      const result = adapter.getUserSyncs({ pixelEnabled: true }, [SERVER_RESPONSE]);

      expect(result).to.deep.equal([{
        'url': 'https://prebid.cootlogix.com/api/sync/image/?gdpr=0&gdpr_consent=&us_privacy=',
        'type': 'image'
      }]);
    })
  });

  describe('interpret response', function () {
    it('should return empty array when there is no response', function () {
      const responses = adapter.interpretResponse(null);
      expect(responses).to.be.empty;
    });

    it('should return empty array when there is no ad', function () {
      const responses = adapter.interpretResponse({ price: 1, ad: '' });
      expect(responses).to.be.empty;
    });

    it('should return empty array when there is no price', function () {
      const responses = adapter.interpretResponse({ price: null, ad: 'great ad' });
      expect(responses).to.be.empty;
    });

    it('should return an array of interpreted responses', function () {
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

    it('should take default TTL', function () {
      const serverResponse = utils.deepClone(SERVER_RESPONSE);
      delete serverResponse.body.results[0].exp;
      const responses = adapter.interpretResponse(serverResponse, REQUEST);
      expect(responses).to.have.length(1);
      expect(responses[0].ttl).to.equal(300);
    });
  });

  describe('user id system', function () {
    Object.keys(SUPPORTED_ID_SYSTEMS).forEach((idSystemProvider) => {
      const id = Date.now().toString();
      const bid = utils.deepClone(BID);

      const userId = (function () {
        switch (idSystemProvider) {
          case 'digitrustid': return { data: { id: id } };
          case 'lipb': return { lipbid: id };
          case 'parrableId': return { eid: id };
          default: return id;
        }
      })();

      bid.userId = {
        [idSystemProvider]: userId
      };

      it(`should include 'uid.${idSystemProvider}' in request params`, function () {
        const requests = adapter.buildRequests([bid], BIDDER_REQUEST);
        expect(requests[0].data[`uid.${idSystemProvider}`]).to.equal(id);
      });
    });
  });

  describe('alternate param names extractors', function () {
    it('should return undefined when param not supported', function () {
      const cid = extractCID({ 'c_id': '1' });
      const pid = extractPID({ 'p_id': '1' });
      const subDomain = extractSubDomain({ 'sub_domain': 'prebid' });
      expect(cid).to.be.undefined;
      expect(pid).to.be.undefined;
      expect(subDomain).to.be.undefined;
    });

    it('should return value when param supported', function () {
      const cid = extractCID({ 'cID': '1' });
      const pid = extractPID({ 'Pid': '2' });
      const subDomain = extractSubDomain({ 'subDOMAIN': 'prebid' });
      expect(cid).to.be.equal('1');
      expect(pid).to.be.equal('2');
      expect(subDomain).to.be.equal('prebid');
    });
  });

  describe('vidazoo session id', function () {
    it('should get undefined vidazoo session id', function () {
      const sessionId = getVidazooSessionId();
      expect(sessionId).to.be.empty;
    });

    it('should get vidazoo session id from storage', function () {
      const vidSid = '1234-5678';
      window.localStorage.setItem('vidSid', vidSid);
      const sessionId = getVidazooSessionId();
      expect(sessionId).to.be.equal(vidSid);
    });
  });

  describe('deal id', function () {
    const key = 'myDealKey';

    it('should get the next deal id', function () {
      const dealId = getNextDealId(key);
      const nextDealId = getNextDealId(key);
      expect(dealId).to.be.equal(1);
      expect(nextDealId).to.be.equal(2);
    });

    it('should get the first deal id on expiration', function (done) {
      setTimeout(function () {
        const dealId = getNextDealId(key, 100);
        expect(dealId).to.be.equal(1);
        done();
      }, 200);
    });
  });

  describe('unique deal id', function () {
    const key = 'myKey';
    let uniqueDealId;
    uniqueDealId = getUniqueDealId(key);

    it('should get current unique deal id', function (done) {
      // waiting some time so `now` will become past
      setTimeout(() => {
        const current = getUniqueDealId(key);
        expect(current).to.be.equal(uniqueDealId);
        done();
      }, 200);
    });

    it('should get new unique deal id on expiration', function () {
      const current = getUniqueDealId(key, 100);
      expect(current).to.not.be.equal(uniqueDealId);
    });
  });

  describe('storage utils', function () {
    it('should get value from storage with create param', function () {
      const now = Date.now();
      const clock = useFakeTimers({
        shouldAdvanceTime: true,
        now
      });
      setStorageItem('myKey', 2020);
      const { value, created } = getStorageItem('myKey');
      expect(created).to.be.equal(now);
      expect(value).to.be.equal(2020);
      expect(typeof value).to.be.equal('number');
      expect(typeof created).to.be.equal('number');
      clock.restore();
    });

    it('should get external stored value', function () {
      const value = 'superman'
      window.localStorage.setItem('myExternalKey', value);
      const item = getStorageItem('myExternalKey');
      expect(item).to.be.equal(value);
    });

    it('should parse JSON value', function () {
      const data = JSON.stringify({ event: 'send' });
      const { event } = tryParseJSON(data);
      expect(event).to.be.equal('send');
    });

    it('should get original value on parse fail', function () {
      const value = 21;
      const parsed = tryParseJSON(value);
      expect(typeof parsed).to.be.equal('number');
      expect(parsed).to.be.equal(value);
    });
  });
});
