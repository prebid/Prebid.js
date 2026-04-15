import * as utilities from 'libraries/vidazooUtils/bidderUtils.js'
import { expect } from "chai";
import sinon from "sinon";
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import {
  IFRAME_SYNC_DEFAULT_URL,
  IMAGE_SYNC_DEFAULT_URL,
  SESSION_ID_KEY
} from "../../../../libraries/vidazooUtils/constants.js";
import { bidderSettings } from 'src/bidderSettings.js';

describe('Vidazoo Bidder Utils Tests', function () {
  describe('createSessionId', function () {
    it('Should return string with wsid_', function () {
      const result = utilities.createSessionId()
      expect(result).to.exist.and.to.include('wsid_');
    });
  });

  describe('getTopWindowQueryParams', function () {
    it('should return a string', function () {
      const result = utilities.getTopWindowQueryParams();
      expect(result).to.be.a('string');
    });

    it('should return empty string when parseUrl throws', function () {
      const stub = sinon.stub(utils, 'parseUrl').throws(new Error('cross-origin'));
      const result = utilities.getTopWindowQueryParams();
      expect(result).to.equal('');
      stub.restore();
    });
  });

  describe('extractCID', function () {
    it('should return undefined when param not supported', function () {
      const cid = utilities.extractCID({ 'c_id': '1' });
      expect(cid).to.be.undefined;
    });
    it('should return value when param supported: cID', function () {
      const cid = utilities.extractCID({ 'cID': '1' });
      expect(cid).to.be.equal('1');
    });
    it('should return value when param supported: cId', function () {
      const cid = utilities.extractCID({ 'cId': '1' });
      expect(cid).to.be.equal('1');
    });
    it('should return value when param supported: CID', function () {
      const cid = utilities.extractCID({ 'CID': '1' });
      expect(cid).to.be.equal('1');
    });
    it('should return value when param supported: CId', function () {
      const cid = utilities.extractCID({ 'CId': '1' });
      expect(cid).to.be.equal('1');
    });
    it('should return value when param supported: cid', function () {
      const cid = utilities.extractCID({ 'cid': '1' });
      expect(cid).to.be.equal('1');
    });
    it('should return value when param supported: Cid', function () {
      const cid = utilities.extractCID({ 'Cid': '1' });
      expect(cid).to.be.equal('1');
    });
    it('should return value when param supported: CiD', function () {
      const cid = utilities.extractCID({ 'CiD': '1' });
      expect(cid).to.be.equal('1');
    });
    it('should return value when param supported: ciD', function () {
      const cid = utilities.extractCID({ 'ciD': '1' });
      expect(cid).to.be.equal('1');
    });
  });

  describe('extractPID', function () {
    it('should return undefined when param not supported', function () {
      const pid = utilities.extractPID({ 'p_id': '1' });
      expect(pid).to.be.undefined;
    });
    it('should return value when param supported: pId', function () {
      const pid = utilities.extractPID({ 'pId': '2' });
      expect(pid).to.be.equal('2');
    });
    it('should return value when param supported: PID', function () {
      const pid = utilities.extractPID({ 'PID': '2' });
      expect(pid).to.be.equal('2');
    });
    it('should return value when param supported: pID', function () {
      const pid = utilities.extractPID({ 'pID': '2' });
      expect(pid).to.be.equal('2');
    });
    it('should return value when param supported: PId', function () {
      const pid = utilities.extractPID({ 'PId': '2' });
      expect(pid).to.be.equal('2');
    });
    it('should return value when param supported: pid', function () {
      const pid = utilities.extractPID({ 'pid': '2' });
      expect(pid).to.be.equal('2');
    });
    it('should return value when param supported: piD', function () {
      const pid = utilities.extractPID({ 'piD': '2' });
      expect(pid).to.be.equal('2');
    });
    it('should return value when param supported: Pid', function () {
      const pid = utilities.extractPID({ 'Pid': '2' });
      expect(pid).to.be.equal('2');
    });
    it('should return value when param supported: PiD', function () {
      const pid = utilities.extractPID({ 'PiD': '2' });
      expect(pid).to.be.equal('2');
    });
  });

  describe('extractSubDomain', function () {
    it('should return undefined when param not supported', function () {
      const subDomain = utilities.extractSubDomain({ 'sub_domain': 'prebid' });
      expect(subDomain).to.be.undefined;
    });
    it('should return value when param supported: subDomain', function () {
      const subDomain = utilities.extractSubDomain({ 'subDomain': 'prebid' });
      expect(subDomain).to.be.equal('prebid');
    });
    it('should return value when param supported: SubDomain', function () {
      const subDomain = utilities.extractSubDomain({ 'SubDomain': 'prebid' });
      expect(subDomain).to.be.equal('prebid');
    });
    it('should return value when param supported: Subdomain', function () {
      const subDomain = utilities.extractSubDomain({ 'Subdomain': 'prebid' });
      expect(subDomain).to.be.equal('prebid');
    });
    it('should return value when param supported: subdomain', function () {
      const subDomain = utilities.extractSubDomain({ 'subdomain': 'prebid' });
      expect(subDomain).to.be.equal('prebid');
    });
    it('should return value when param supported: SUBDOMAIN', function () {
      const subDomain = utilities.extractSubDomain({ 'SUBDOMAIN': 'prebid' });
      expect(subDomain).to.be.equal('prebid');
    });
    it('should return value when param supported: subDOMAIN', function () {
      const subDomain = utilities.extractSubDomain({ 'subDOMAIN': 'prebid' });
      expect(subDomain).to.be.equal('prebid');
    });
  });

  describe('isBidRequestValid', function () {
    it('should require cId', function () {
      const isValid = utilities.isBidRequestValid({
        params: {
          pId: 'pid'
        }
      });
      expect(isValid).to.be.false;
    });

    it('should require pId', function () {
      const isValid = utilities.isBidRequestValid({
        params: {
          cId: 'cid'
        }
      });
      expect(isValid).to.be.false;
    });

    it('should validate correctly', function () {
      const isValid = utilities.isBidRequestValid({
        params: {
          cId: 'cid',
          pId: 'pid'
        }
      });
      expect(isValid).to.be.true;
    });

    it('should return false when bid has no params', function () {
      const isValid = utilities.isBidRequestValid({});
      expect(isValid).to.be.false;
    });
  });
  describe('tryParseJSON', function () {
    it('should parse JSON value', function () {
      const data = JSON.stringify({ event: 'send' });
      const { event } = utilities.tryParseJSON(data);
      expect(event).to.be.equal('send');
    });

    it('should get original value on parse fail', function () {
      const value = 21;
      const parsed = utilities.tryParseJSON(value);
      expect(typeof parsed).to.be.equal('number');
      expect(parsed).to.be.equal(value);
    });

    it('should return original string when JSON.parse throws', function () {
      const value = 'not{valid:json';
      const parsed = utilities.tryParseJSON(value);
      expect(parsed).to.equal(value);
    });
  });

  describe('setStorageItem and getStorageItem', function () {
    it('should set JSON value in local storage when value is object', function () {
      const localStore = {};
      const storageMock = {
        setDataInLocalStorage: sinon.stub().callsFake((k, v) => { localStore[k] = v; }),
        getDataFromLocalStorage: sinon.stub().callsFake((k) => localStore[k] || null)
      };
      const key = 'newKey';
      const value = { 'a': 1 };
      const timestamp = Date.now();
      // test the set
      utilities.setStorageItem(storageMock, key, value, timestamp);
      expect(storageMock.setDataInLocalStorage.calledOnce).to.be.true;
      expect(storageMock.setDataInLocalStorage.calledWith(key, JSON.stringify({ value, created: timestamp }))).to.be.true;
      // now test the get
      const result = utilities.getStorageItem(storageMock, key);
      expect(result.created).to.be.equal(timestamp);
      expect(result.value).to.be.deep.equal(value);
      expect(typeof result.value).to.be.equal('object');
      expect(typeof result.created).to.be.equal('number');
    });
    it('should set JSON value in local storage when value is string', function () {
      const localStore = {};
      const storageMock = {
        setDataInLocalStorage: sinon.stub().callsFake((k, v) => { localStore[k] = v; }),
        getDataFromLocalStorage: sinon.stub().callsFake((k) => localStore[k] || null)
      };
      const key = 'newKey';
      const value = "stringValue";
      const timestamp = Date.now();
      // test the set
      utilities.setStorageItem(storageMock, key, value, timestamp);
      expect(storageMock.setDataInLocalStorage.calledOnce).to.be.true;
      expect(storageMock.setDataInLocalStorage.calledWith(key, JSON.stringify({ value, created: timestamp }))).to.be.true;
      // now test the get
      const result = utilities.getStorageItem(storageMock, key);
      expect(storageMock.getDataFromLocalStorage.calledOnce).to.be.true;
      expect(storageMock.getDataFromLocalStorage.calledWith(key, null)).to.be.true;
      expect(result.created).to.be.equal(timestamp);
      expect(result.value).to.be.equal(value);
      expect(typeof result.value).to.be.equal('string');
      expect(typeof result.created).to.be.equal('number');
    });

    it('should use Date.now() as timestamp when not provided', function () {
      const now = Date.now();
      const clock = sinon.useFakeTimers({ now, shouldAdvanceTime: true });
      const localStore = {};
      const storageMock = {
        setDataInLocalStorage: sinon.stub().callsFake((k, v) => { localStore[k] = v; }),
        getDataFromLocalStorage: sinon.stub().callsFake((k) => localStore[k] || null)
      };
      utilities.setStorageItem(storageMock, 'key1', 'val1');
      expect(storageMock.setDataInLocalStorage.calledWith('key1', JSON.stringify({ value: 'val1', created: now }))).to.be.true;
      clock.restore();
    });

    it('should not throw when setDataInLocalStorage throws', function () {
      const storageMock = {
        setDataInLocalStorage: sinon.stub().throws(new Error('storage error')),
        getDataFromLocalStorage: sinon.stub().returns(null)
      };
      expect(() => utilities.setStorageItem(storageMock, 'key', 'value')).to.not.throw();
    });

    it('should return null when getDataFromLocalStorage throws', function () {
      const storageMock = {
        getDataFromLocalStorage: sinon.stub().throws(new Error('storage error'))
      };
      const result = utilities.getStorageItem(storageMock, 'key');
      expect(result).to.be.null;
    });
  });

  describe('getCacheOpt', function () {
    it('should set undefined value when key was not set prior the call', function () {
      const localStore = {};
      const storageMock = {
        setDataInLocalStorage: sinon.stub().callsFake((k, v) => { localStore[k] = v; }),
        getDataFromLocalStorage: sinon.stub().callsFake((k) => localStore[k] || null)
      };
      const now = Date.now();
      const clock = sinon.useFakeTimers({
        shouldAdvanceTime: true,
        now
      });

      const key = 'newKey';
      const result = utilities.getCacheOpt(storageMock, key);
      expect(storageMock.getDataFromLocalStorage.calledOnce).to.be.true;
      expect(storageMock.getDataFromLocalStorage.calledWith(key, null)).to.be.true;
      expect(storageMock.setDataInLocalStorage.calledOnce).to.be.true;
      expect(storageMock.setDataInLocalStorage.calledWith(key, String(now), null)).to.be.true;
      expect(result).to.be.equal(String(now));
      clock.restore();
    });
    it('should get value that was previously set', function () {
      const value = "something"
      const localStore = { newKey: value };
      const storageMock = {
        setDataInLocalStorage: sinon.stub().callsFake((k, v) => { localStore[k] = v; }),
        getDataFromLocalStorage: sinon.stub().callsFake((k) => localStore[k] || null)
      };
      const now = Date.now();
      const clock = sinon.useFakeTimers({
        shouldAdvanceTime: true,
        now
      });

      const key = 'newKey';
      const result = utilities.getCacheOpt(storageMock, key);
      expect(storageMock.getDataFromLocalStorage.calledOnce).to.be.true;
      expect(storageMock.getDataFromLocalStorage.calledWith(key, null)).to.be.true;
      expect(storageMock.setDataInLocalStorage.calledOnce).to.be.false;
      expect(result).to.be.equal(value);
      clock.restore();
    });
  });

  describe('getUniqueDealId', function () {
    it('should get current unique deal id', function (done) {
      const key = 'myDealKey';
      const localStore = {};
      const storageMock = {
        setDataInLocalStorage: sinon.stub().callsFake((k, v) => { localStore[k] = v; }),
        getDataFromLocalStorage: sinon.stub().callsFake((k) => localStore[k] || null)
      };
      const uniqueDealId = utilities.getUniqueDealId(storageMock, key, 0);
      // waiting some time so `now` will become past
      setTimeout(() => {
        const current = utilities.getUniqueDealId(storageMock, key);
        expect(current).to.be.equal(uniqueDealId);
        done();
      }, 200);
    });

    it('should get new unique deal id on expiration', function (done) {
      const key = 'myDealKey';
      const localStore = {};
      const storageMock = {
        setDataInLocalStorage: sinon.stub().callsFake((k, v) => { localStore[k] = v; }),
        getDataFromLocalStorage: sinon.stub().callsFake((k) => localStore[k] || null)
      };
      const uniqueDealId = utilities.getUniqueDealId(storageMock, key, 0);
      // waiting some time so `now` will become past
      setTimeout(() => {
        const current = utilities.getUniqueDealId(storageMock, key, 100);
        expect(current).to.not.be.equal(uniqueDealId);
        done();
      }, 200)
    });
  });

  describe('getNextDealId', function () {
    it('should get the next deal id', function () {
      const key = 'myDealKey';
      const localStore = {};
      const storageMock = {
        setDataInLocalStorage: sinon.stub().callsFake((k, v) => { localStore[k] = v; }),
        getDataFromLocalStorage: sinon.stub().callsFake((k) => localStore[k] || null)
      };
      const dealId = utilities.getNextDealId(storageMock, key);
      const nextDealId = utilities.getNextDealId(storageMock, key);
      expect(dealId).to.be.equal(1);
      expect(nextDealId).to.be.equal(2);
    });

    it('should get the first deal id on expiration', function (done) {
      const key = 'myDealKey';
      const localStore = {};
      const storageMock = {
        setDataInLocalStorage: sinon.stub().callsFake((k, v) => { localStore[k] = v; }),
        getDataFromLocalStorage: sinon.stub().callsFake((k) => localStore[k] || null)
      };
      setTimeout(function () {
        const dealId = utilities.getNextDealId(storageMock, key, 100);
        expect(dealId).to.be.equal(1);
        done();
      }, 200);
    });
  });
  describe('hashCode', function () {
    it('should result with _ as a prefix and 8 digits', function () {
      const result = utilities.hashCode("code")
      expect(result).to.be.equal("_3059181");
    })
    it('should result with ^ as a prefix and 10 digits', function () {
      const result = utilities.hashCode("1234567890", "^")
      expect(result).to.be.equal("^-2054162789");
    })
    it('should return prefix with 0 for empty string', function () {
      const result = utilities.hashCode('');
      expect(result).to.equal('_0');
    });
  });

  describe('onBidWon', function () {
    beforeEach(function () {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function () {
      utils.triggerPixel.restore();
    });

    it('should call triggerPixel with nurl', function () {
      const bid = {
        adUnitCode: 'div-gpt-ad-12345-0',
        adId: '2d52001cabd527',
        auctionId: '1fdb5ff1b6eaa7',
        transactionId: 'c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf',
        status: 'rendered',
        timeToRespond: 100,
        cpm: 0.8,
        originalCpm: 0.8,
        creativeId: '12610997325162499419',
        currency: 'USD',
        originalCurrency: 'USD',
        height: 250,
        mediaType: 'banner',
        nurl: 'https://test.com/win-notice?test=123',
        netRevenue: true,
        requestId: '2d52001cabd527',
        ttl: 30,
        width: 300
      };
      utilities.onBidWon(bid);
      expect(utils.triggerPixel.called).to.be.true;

      const url = utils.triggerPixel.args[0];

      expect(url[0]).to.be.equal('https://test.com/win-notice?test=123&adId=2d52001cabd527&creativeId=12610997325162499419&auctionId=1fdb5ff1b6eaa7&transactionId=c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf&adUnitCode=div-gpt-ad-12345-0&cpm=0.8&currency=USD&originalCpm=0.8&originalCurrency=USD&netRevenue=true&mediaType=banner&timeToRespond=100&status=rendered');
    });

    it('should append ? when nurl has no existing query string', function () {
      const bid = {
        adUnitCode: 'div-gpt-ad-12345-0',
        adId: '2d52001cabd527',
        auctionId: '1fdb5ff1b6eaa7',
        transactionId: 'c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf',
        status: 'rendered',
        timeToRespond: 100,
        cpm: 0.8,
        originalCpm: 0.8,
        creativeId: '12610997325162499419',
        currency: 'USD',
        originalCurrency: 'USD',
        height: 250,
        mediaType: 'banner',
        nurl: 'https://test.com/win-notice',
        netRevenue: true,
        requestId: '2d52001cabd527',
        ttl: 30,
        width: 300
      };
      utilities.onBidWon(bid);
      expect(utils.triggerPixel.called).to.be.true;
      const url = utils.triggerPixel.args[0][0];
      expect(url).to.match(/^https:\/\/test\.com\/win-notice\?adId=/);
    });

    it('should not call triggerPixel when nurl not passed in bid', function () {
      const bid = {
        adUnitCode: 'div-gpt-ad-12345-0',
        adId: '2d52001cabd527',
        auctionId: '1fdb5ff1b6eaa7',
        transactionId: 'c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf',
        status: 'rendered',
        timeToRespond: 100,
        cpm: 0.8,
        originalCpm: 0.8,
        creativeId: '12610997325162499419',
        currency: 'USD',
        originalCurrency: 'USD',
        height: 250,
        mediaType: 'banner',
        netRevenue: true,
        requestId: '2d52001cabd527',
        ttl: 30,
        width: 300
      };
      utilities.onBidWon(bid);
      expect(utils.triggerPixel.called).to.be.false;
    });
  });

  describe('onBidBillable', function () {
    beforeEach(function () {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function () {
      utils.triggerPixel.restore();
    });

    it('should call triggerPixel with burl', function () {
      const bid = {
        adUnitCode: 'div-gpt-ad-12345-0',
        adId: '2d52001cabd527',
        auctionId: '1fdb5ff1b6eaa7',
        transactionId: 'c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf',
        status: 'rendered',
        timeToRespond: 100,
        cpm: 0.8,
        originalCpm: 0.8,
        creativeId: '12610997325162499419',
        currency: 'USD',
        originalCurrency: 'USD',
        height: 250,
        mediaType: 'banner',
        burl: 'https://test.com/billing-notice?test=123',
        netRevenue: true,
        requestId: '2d52001cabd527',
        ttl: 30,
        width: 300
      };
      utilities.onBidBillable(bid);
      expect(utils.triggerPixel.called).to.be.true;

      const url = utils.triggerPixel.args[0];

      expect(url[0]).to.be.equal('https://test.com/billing-notice?test=123&adId=2d52001cabd527&creativeId=12610997325162499419&auctionId=1fdb5ff1b6eaa7&transactionId=c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf&adUnitCode=div-gpt-ad-12345-0&cpm=0.8&currency=USD&originalCpm=0.8&originalCurrency=USD&netRevenue=true&mediaType=banner&timeToRespond=100&status=rendered');
    });

    it('should append ? when burl has no existing query string', function () {
      const bid = {
        adUnitCode: 'div-gpt-ad-12345-0',
        adId: '2d52001cabd527',
        auctionId: '1fdb5ff1b6eaa7',
        transactionId: 'c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf',
        status: 'rendered',
        timeToRespond: 100,
        cpm: 0.8,
        originalCpm: 0.8,
        creativeId: '12610997325162499419',
        currency: 'USD',
        originalCurrency: 'USD',
        height: 250,
        mediaType: 'banner',
        burl: 'https://test.com/billing-notice',
        netRevenue: true,
        requestId: '2d52001cabd527',
        ttl: 30,
        width: 300
      };
      utilities.onBidBillable(bid);
      expect(utils.triggerPixel.called).to.be.true;
      const url = utils.triggerPixel.args[0][0];
      expect(url).to.match(/^https:\/\/test\.com\/billing-notice\?adId=/);
    });

    it('should not call triggerPixel when burl not passed in bid', function () {
      const bid = {
        adUnitCode: 'div-gpt-ad-12345-0',
        adId: '2d52001cabd527',
        auctionId: '1fdb5ff1b6eaa7',
        transactionId: 'c881914b-a3b5-4ecf-ad9c-1c2f37c6aabf',
        status: 'rendered',
        timeToRespond: 100,
        cpm: 0.8,
        originalCpm: 0.8,
        creativeId: '12610997325162499419',
        currency: 'USD',
        originalCurrency: 'USD',
        height: 250,
        mediaType: 'banner',
        netRevenue: true,
        requestId: '2d52001cabd527',
        ttl: 30,
        width: 300
      };
      utilities.onBidBillable(bid);
      expect(utils.triggerPixel.called).to.be.false;
    });
  });

  describe('createUserSyncGetter', function () {
    let sandbox;
    const iframeSyncUrl = 'https://sync.example.com/api/sync/iframe';
    const imageSyncUrl = 'https://sync.example.com/api/sync/image';
    const responses = [{ body: { cid: 'testcid' }, headers: { get: (key) => key === 'x-us-base-url' ? 'other-example.com' : undefined } }];
    const gdprConsent = { gdprApplies: true, consentString: 'COvFyGBOvFyGBAbAAAENAPCAAOAAAAAAAAAAAEEUACCKAAA' };
    const uspConsent = '1YNN';

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(config, 'getConfig').withArgs('coppa').returns(false);
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should return iframe sync when iframeEnabled is true and iframeSyncUrl is provided', function () {
      const getUserSyncs = utilities.createUserSyncGetter({ iframeSyncUrl, imageSyncUrl });
      const syncs = getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, responses, gdprConsent, uspConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.be.equal('iframe');
      expect(syncs[0].url).to.include(iframeSyncUrl);
      expect(syncs[0].url).to.include('cid=testcid');
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('us_privacy=1YNN');
    });
    it('should return iframe sync from header when iframeEnabled is false but iframeHeader exists', function () {
      const getUserSyncs = utilities.createUserSyncGetter({});
      const syncs = getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, responses, gdprConsent, uspConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.be.equal('iframe');
      expect(syncs[0].url).to.include('https://sync.other-example.com/api/sync/iframe/');
      expect(syncs[0].url).to.include('cid=testcid');
    });
    it('should return iframe sync from header when iframeEnabled is false and iframeHeader unpresent', function () {
      const getUserSyncs = utilities.createUserSyncGetter({});
      const responsesNoHeaders = [{ body: { cid: 'testcid' }, headers: { get: () => undefined } }];
      const syncs = getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, responsesNoHeaders, gdprConsent, uspConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.be.equal('iframe');
      expect(syncs[0].url).to.include(IFRAME_SYNC_DEFAULT_URL);
      expect(syncs[0].url).to.include('cid=testcid');
    });
    it('should return image sync when pixelEnabled is true and imageSyncUrl is provided', function () {
      const getUserSyncs = utilities.createUserSyncGetter({ iframeSyncUrl, imageSyncUrl });
      const syncs = getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, responses, gdprConsent, uspConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.be.equal('image');
      expect(syncs[0].url).to.include(imageSyncUrl);
      expect(syncs[0].url).to.include('cid=testcid');
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('us_privacy=1YNN');
    });
    it('should return image sync from header when pixelEnabled is false but imageHeader exists', function () {
      const getUserSyncs = utilities.createUserSyncGetter({});
      const syncs = getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, responses, gdprConsent, uspConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.be.equal('image');
      expect(syncs[0].url).to.include('https://sync.other-example.com/api/sync/image/');
      expect(syncs[0].url).to.include('cid=testcid');
    });
    it('should return image sync from header when pixelEnabled is false and imageHeader unpresent', function () {
      const getUserSyncs = utilities.createUserSyncGetter({});
      const responsesNoHeaders = [{ body: { cid: 'testcid' }, headers: { get: () => undefined } }];
      const syncs = getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, responsesNoHeaders, gdprConsent, uspConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.be.equal('image');
      expect(syncs[0].url).to.include(IMAGE_SYNC_DEFAULT_URL);
      expect(syncs[0].url).to.include('cid=testcid');
    });
    it('should return empty syncs when iframeEnabled, pixelEnabled are false and no headers', function () {
      const getUserSyncs = utilities.createUserSyncGetter({});
      const responsesNoHeaders = [{ body: { cid: 'testcid' }, headers: { get: () => undefined } }];
      const syncs = getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, responsesNoHeaders, gdprConsent, uspConsent);
      expect(syncs).to.have.lengthOf(0);
    });
    it('should return empty syncs when iframeEnabled, pixelEnabled are true and no headers', function () {
      const getUserSyncs = utilities.createUserSyncGetter({});
      const responsesNoHeaders = [{ body: { cid: 'testcid' }, headers: { get: () => undefined } }];
      const syncs = getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, responsesNoHeaders, gdprConsent, uspConsent);
      expect(syncs).to.have.lengthOf(2);
    });

    it('should include GPP params in sync URL when gppConsent is provided', function () {
      const getUserSyncs = utilities.createUserSyncGetter({ iframeSyncUrl, imageSyncUrl });
      const gppConsent = { gppString: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA', applicableSections: [7, 8] };
      const syncs = getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, responses, gdprConsent, uspConsent, gppConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].url).to.include('gpp=');
      expect(syncs[0].url).to.include('gpp_sid=7%2C8');
    });

    it('should not include GPP params when gppString or applicableSections is missing', function () {
      const getUserSyncs = utilities.createUserSyncGetter({ iframeSyncUrl, imageSyncUrl });
      const gppConsent = { gppString: 'some-gpp-string' };
      const syncs = getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, responses, gdprConsent, uspConsent, gppConsent);
      expect(syncs[0].url).to.not.include('gpp=');
    });

    it('should set coppa=1 in sync URL when coppa config is true', function () {
      sandbox.restore();
      sandbox = sinon.createSandbox();
      sandbox.stub(config, 'getConfig').withArgs('coppa').returns(true);
      const getUserSyncs = utilities.createUserSyncGetter({ iframeSyncUrl, imageSyncUrl });
      const syncs = getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, responses, gdprConsent, uspConsent);
      expect(syncs[0].url).to.include('coppa=1');
    });

    it('should deduplicate cids from multiple responses', function () {
      const getUserSyncs = utilities.createUserSyncGetter({ iframeSyncUrl, imageSyncUrl });
      const dupResponses = [
        { body: { cid: 'testcid' }, headers: { get: () => undefined } },
        { body: { cid: 'testcid' }, headers: { get: () => undefined } },
        { body: { cid: 'othercid' }, headers: { get: () => undefined } }
      ];
      const syncs = getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, dupResponses, gdprConsent, uspConsent);
      expect(syncs[0].url).to.include('cid=testcid%2Cothercid');
    });

    it('should handle responses with no cid', function () {
      const getUserSyncs = utilities.createUserSyncGetter({ iframeSyncUrl, imageSyncUrl });
      const noCidResponses = [{ body: {}, headers: { get: () => undefined } }];
      const syncs = getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, noCidResponses, gdprConsent, uspConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].url).to.include('cid=');
    });
  });

  describe('appendUserIdsToRequestPayload', function () {
    it('should extract lipbid from lipb provider', function () {
      const payload = {};
      const userIds = {
        lipb: { lipbid: 'lipb-id-123' }
      };
      utilities.appendUserIdsToRequestPayload(payload, userIds);
      expect(payload['uid.lipb']).to.be.equal('lipb-id-123');
    });

    it('should extract uid from id5id provider', function () {
      const payload = {};
      const userIds = {
        id5id: { uid: 'id5-uid-456' }
      };
      utilities.appendUserIdsToRequestPayload(payload, userIds);
      expect(payload['uid.id5id']).to.be.equal('id5-uid-456');
    });

    it('should use raw value for other providers', function () {
      const payload = {};
      const userIds = {
        tdid: 'tdid-value-789',
        criteoId: 'criteo-value-000'
      };
      utilities.appendUserIdsToRequestPayload(payload, userIds);
      expect(payload['uid.tdid']).to.be.equal('tdid-value-789');
      expect(payload['uid.criteoId']).to.be.equal('criteo-value-000');
    });

    it('should handle all provider types together', function () {
      const payload = {};
      const userIds = {
        lipb: { lipbid: 'lipb-id' },
        id5id: { uid: 'id5-uid' },
        tdid: 'tdid-value'
      };
      utilities.appendUserIdsToRequestPayload(payload, userIds);
      expect(payload['uid.lipb']).to.be.equal('lipb-id');
      expect(payload['uid.id5id']).to.be.equal('id5-uid');
      expect(payload['uid.tdid']).to.be.equal('tdid-value');
    });

    it('should not modify payload when userIds is empty', function () {
      const payload = { existing: 'value' };
      utilities.appendUserIdsToRequestPayload(payload, {});
      expect(Object.keys(payload)).to.have.lengthOf(1);
      expect(payload.existing).to.be.equal('value');
    });
  });

  describe('getVidazooSessionId', function () {
    it('should call getStorageItem with SESSION_ID_KEY via storage mock', function () {
      const storageMock = {
        getDataFromLocalStorage: sinon.stub().returns(null)
      };
      utilities.getVidazooSessionId(storageMock);
      expect(storageMock.getDataFromLocalStorage.calledOnce).to.be.true;
      expect(storageMock.getDataFromLocalStorage.calledWith(SESSION_ID_KEY, null)).to.be.true;
    });

    it('should return empty string when storage has no session', function () {
      const storageMock = {
        getDataFromLocalStorage: sinon.stub().returns(null)
      };
      const result = utilities.getVidazooSessionId(storageMock);
      expect(result).to.be.equal('');
    });

    it('should return parsed value when storage has a session', function () {
      const sessionData = JSON.stringify({ value: 'stored-session-id', created: Date.now() });
      const storageMock = {
        getDataFromLocalStorage: sinon.stub().returns(sessionData)
      };
      const result = utilities.getVidazooSessionId(storageMock);
      expect(storageMock.getDataFromLocalStorage.calledWith(SESSION_ID_KEY, null)).to.be.true;
      expect(result).to.be.deep.equal({ value: 'stored-session-id', created: JSON.parse(sessionData).created });
    });
  });

  describe('buildRequestData', function () {
    let sandbox;
    let storageMock;
    let clock;

    const baseBid = {
      params: { pId: 'test-pid', cId: 'test-cid', bidFloor: 0.5 },
      bidId: 'bid-123',
      adUnitCode: 'div-gpt-ad-1',
      schain: { ver: '1.0', nodes: [{ asi: 'exchange.com', sid: '1234' }] },
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      ortb2Imp: { ext: { tid: 'txn-abc', gpid: '/1234/homepage' } },
      bidderRequestId: 'br-456',
      bidRequestsCount: 1,
      bidderRequestsCount: 1,
      bidderWinsCount: 0
    };

    const baseBidderRequest = {
      refererInfo: { ref: 'https://referrer.com' },
      ortb2: {
        site: {
          cat: ['IAB1'],
          pagecat: ['IAB1-1'],
          content: { data: [{ name: 'test' }], language: 'en' }
        },
        user: { data: [{ name: 'userData' }] },
        device: { ua: 'test-ua' },
        regs: { coppa: 1 }
      }
    };

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(bidderSettings, 'get').returns(true);
      storageMock = {
        setDataInLocalStorage: sinon.stub(),
        getDataFromLocalStorage: sinon.stub().returns(null)
      };
      clock = sinon.useFakeTimers({ now: Date.now(), shouldAdvanceTime: true });
    });

    afterEach(function () {
      sandbox.restore();
      clock.restore();
    });

    it('should build basic request data with correct fields', function () {
      const data = utilities.buildRequestData(
        baseBid, 'https://publisher.com', [[300, 250]], baseBidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.bidId).to.equal('bid-123');
      expect(data.adUnitCode).to.equal('div-gpt-ad-1');
      expect(data.publisherId).to.equal('test-pid');
      expect(data.sizes).to.deep.equal([[300, 250]]);
      expect(data.bidFloor).to.equal(0.5);
      expect(data.bidderVersion).to.equal('1.0.0');
      expect(data.referrer).to.equal('https://referrer.com');
      expect(data.bidderRequestId).to.equal('br-456');
      expect(data.bidRequestsCount).to.equal(1);
      expect(data.bidderRequestsCount).to.equal(1);
      expect(data.bidderWinsCount).to.equal(0);
      expect(data.bidderTimeout).to.equal(3000);
      expect(data.mediaTypes).to.deep.equal({ banner: { sizes: [[300, 250]] } });
      expect(data.schain).to.deep.equal({ ver: '1.0', nodes: [{ asi: 'exchange.com', sid: '1234' }] });
      expect(data.url).to.equal(encodeURIComponent('https://publisher.com'));
    });

    it('should extract ortb2 site fields (cat, pagecat, contentData, contentLang, coppa)', function () {
      const data = utilities.buildRequestData(
        baseBid, 'https://publisher.com', [[300, 250]], baseBidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.cat).to.deep.equal(['IAB1']);
      expect(data.pagecat).to.deep.equal(['IAB1-1']);
      expect(data.contentData).to.deep.equal([{ name: 'test' }]);
      expect(data.contentLang).to.equal('en');
      expect(data.coppa).to.equal(1);
      expect(data.userData).to.deep.equal([{ name: 'userData' }]);
      expect(data.device).to.deep.equal({ ua: 'test-ua' });
    });

    it('should extract gpid and transactionId from ortb2Imp', function () {
      const data = utilities.buildRequestData(
        baseBid, 'https://publisher.com', [[300, 250]], baseBidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.gpid).to.equal('/1234/homepage');
      expect(data.transactionId).to.equal('txn-abc');
    });

    it('should use bid.getFloor when available and currency is USD', function () {
      const bid = {
        ...baseBid,
        getFloor: sinon.stub().returns({ currency: 'USD', floor: 1.5 })
      };
      const data = utilities.buildRequestData(
        bid, 'https://publisher.com', [[300, 250]], baseBidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(bid.getFloor.calledOnce).to.be.true;
      expect(data.bidFloor).to.equal(1.5);
    });

    it('should not override bidFloor when getFloor returns non-USD currency', function () {
      const bid = {
        ...baseBid,
        getFloor: sinon.stub().returns({ currency: 'EUR', floor: 2.0 })
      };
      const data = utilities.buildRequestData(
        bid, 'https://publisher.com', [[300, 250]], baseBidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.bidFloor).to.equal(0.5);
    });

    it('should include GDPR consent data when present', function () {
      const bidderRequest = {
        ...baseBidderRequest,
        gdprConsent: { consentString: 'consent-abc', gdprApplies: true }
      };
      const data = utilities.buildRequestData(
        baseBid, 'https://publisher.com', [[300, 250]], bidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.gdprConsent).to.equal('consent-abc');
      expect(data.gdpr).to.equal(1);
    });

    it('should include USP consent when present', function () {
      const bidderRequest = {
        ...baseBidderRequest,
        uspConsent: '1YNN'
      };
      const data = utilities.buildRequestData(
        baseBid, 'https://publisher.com', [[300, 250]], bidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.usPrivacy).to.equal('1YNN');
    });

    it('should include GPP consent from gppConsent when present', function () {
      const bidderRequest = {
        ...baseBidderRequest,
        gppConsent: { gppString: 'gpp-string-123', applicableSections: [1, 2] }
      };
      const data = utilities.buildRequestData(
        baseBid, 'https://publisher.com', [[300, 250]], bidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.gppString).to.equal('gpp-string-123');
      expect(data.gppSid).to.deep.equal([1, 2]);
    });

    it('should fall back to ortb2.regs.gpp when gppConsent is absent', function () {
      const bidderRequest = {
        ...baseBidderRequest,
        ortb2: {
          ...baseBidderRequest.ortb2,
          regs: { coppa: 0, gpp: 'ortb2-gpp', gpp_sid: [3, 4] }
        }
      };
      const data = utilities.buildRequestData(
        baseBid, 'https://publisher.com', [[300, 250]], bidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.gppString).to.equal('ortb2-gpp');
      expect(data.gppSid).to.deep.equal([3, 4]);
    });

    it('should include SUA when present in ortb2.device', function () {
      const bidderRequest = {
        ...baseBidderRequest,
        ortb2: {
          ...baseBidderRequest.ortb2,
          device: { ua: 'test-ua', sua: { platform: { brand: 'macOS' } } }
        }
      };
      const data = utilities.buildRequestData(
        baseBid, 'https://publisher.com', [[300, 250]], bidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.sua).to.deep.equal({ platform: { brand: 'macOS' } });
    });

    it('should include DSA when present in ortb2.regs.ext', function () {
      const bidderRequest = {
        ...baseBidderRequest,
        ortb2: {
          ...baseBidderRequest.ortb2,
          regs: { coppa: 0, ext: { dsa: { required: 1 } } }
        }
      };
      const data = utilities.buildRequestData(
        baseBid, 'https://publisher.com', [[300, 250]], bidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.dsa).to.deep.equal({ required: 1 });
    });

    it('should include placementId when set in params', function () {
      const bid = {
        ...baseBid,
        params: { ...baseBid.params, placementId: 'placement-xyz' }
      };
      const data = utilities.buildRequestData(
        bid, 'https://publisher.com', [[300, 250]], baseBidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.placementId).to.equal('placement-xyz');
    });

    it('should spread ext params with ext. prefix', function () {
      const bid = {
        ...baseBid,
        params: { ...baseBid.params, ext: { customKey: 'customVal', anotherKey: 123 } }
      };
      const data = utilities.buildRequestData(
        bid, 'https://publisher.com', [[300, 250]], baseBidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data['ext.customKey']).to.equal('customVal');
      expect(data['ext.anotherKey']).to.equal(123);
    });

    it('should call getUniqueRequestData and merge result when provided', function () {
      const uniqueDataFn = sinon.stub().returns({ dealId: 42, sessionId: 'sess-1' });
      const data = utilities.buildRequestData(
        baseBid, 'https://publisher.com', [[300, 250]], baseBidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', uniqueDataFn
      );
      expect(uniqueDataFn.calledOnce).to.be.true;
      expect(data.dealId).to.equal(42);
      expect(data.sessionId).to.equal('sess-1');
    });

    it('should append userIdAsEids to request data', function () {
      const bid = {
        ...baseBid,
        userIdAsEids: [{ source: 'adserver.org', uids: [{ id: 'eid-123' }] }]
      };
      const data = utilities.buildRequestData(
        bid, 'https://publisher.com', [[300, 250]], baseBidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data['uid.adserver.org']).to.equal('eid-123');
    });

    it('should append userId to request data', function () {
      const bid = {
        ...baseBid,
        userId: { tdid: 'tdid-val', lipb: { lipbid: 'lipb-val' } }
      };
      const data = utilities.buildRequestData(
        bid, 'https://publisher.com', [[300, 250]], baseBidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data['uid.tdid']).to.equal('tdid-val');
      expect(data['uid.lipb']).to.equal('lipb-val');
    });

    it('should include ortb2 and ortb2Imp in data', function () {
      const data = utilities.buildRequestData(
        baseBid, 'https://publisher.com', [[300, 250]], baseBidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.ortb2).to.deep.equal(baseBidderRequest.ortb2);
      expect(data.ortb2Imp).to.deep.equal(baseBid.ortb2Imp);
    });

    it('should include OMID fields when video api includes 7 and source ext is present', function () {
      const bid = {
        ...baseBid,
        mediaTypes: { video: { api: [7] } }
      };
      const bidderRequest = {
        ...baseBidderRequest,
        ortb2: {
          ...baseBidderRequest.ortb2,
          source: { ext: { omidpv: '1.0', omidpn: 'omid-partner' } }
        }
      };
      const data = utilities.buildRequestData(
        bid, 'https://publisher.com', [[640, 480]], bidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.omidpv).to.equal('1.0');
      expect(data.omidpn).to.equal('omid-partner');
    });

    it('should not include OMID fields when video api does not include 7', function () {
      const bid = {
        ...baseBid,
        mediaTypes: { video: { api: [1, 2] } }
      };
      const bidderRequest = {
        ...baseBidderRequest,
        ortb2: {
          ...baseBidderRequest.ortb2,
          source: { ext: { omidpv: '1.0', omidpn: 'omid-partner' } }
        }
      };
      const data = utilities.buildRequestData(
        bid, 'https://publisher.com', [[640, 480]], bidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.omidpv).to.be.undefined;
      expect(data.omidpn).to.be.undefined;
    });

    it('should append user.ext.eids to request data', function () {
      const bid = {
        ...baseBid,
        user: { ext: { eids: [{ source: 'id5-sync.com', uids: [{ id: 'eid-abc' }] }] } }
      };
      const data = utilities.buildRequestData(
        bid, 'https://publisher.com', [[300, 250]], baseBidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data['uid.id5-sync.com']).to.equal('eid-abc');
    });

    it('should fall back to document.documentElement.lang when content language is not set', function () {
      const bidderRequest = {
        ...baseBidderRequest,
        ortb2: {
          ...baseBidderRequest.ortb2,
          site: {
            ...baseBidderRequest.ortb2.site,
            content: { data: [] }
          }
        }
      };
      const data = utilities.buildRequestData(
        baseBid, 'https://publisher.com', [[300, 250]], bidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.contentLang).to.equal(document.documentElement.lang);
    });

    it('should include res field with screen resolution format', function () {
      const data = utilities.buildRequestData(
        baseBid, 'https://publisher.com', [[300, 250]], baseBidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      if (data.res) {
        expect(data.res).to.match(/^\d+x\d+$/);
      }
    });

    it('should handle missing ortb2 sub-objects gracefully', function () {
      const bidderRequest = {
        refererInfo: { ref: 'https://referrer.com' },
        ortb2: {}
      };
      const bid = {
        ...baseBid,
        ortb2Imp: undefined
      };
      const data = utilities.buildRequestData(
        bid, 'https://publisher.com', [[300, 250]], bidderRequest, 3000, storageMock, '1.0.0', 'vidazoo', null
      );
      expect(data.cat).to.deep.equal([]);
      expect(data.pagecat).to.deep.equal([]);
      expect(data.contentData).to.deep.equal([]);
      expect(data.userData).to.deep.equal([]);
      expect(data.gpid).to.equal('');
    });
  });

  describe('createInterpretResponseFn', function () {
    it('should return empty array when serverResponse is null', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const result = interpretResponse(null, {});
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty array when serverResponse has no body', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const result = interpretResponse({}, {});
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty array when results is not iterable', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const result = interpretResponse({ body: { results: null } }, {});
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should skip results with no ad', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const serverResponse = {
        body: {
          results: [{ creativeId: '123', price: 1.5, width: 300, height: 250 }]
        }
      };
      const result = interpretResponse(serverResponse, { data: { bidId: 'bid-1' } });
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should skip results with no price', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const serverResponse = {
        body: {
          results: [{ creativeId: '123', ad: '<div>ad</div>', width: 300, height: 250 }]
        }
      };
      const result = interpretResponse(serverResponse, { data: { bidId: 'bid-1' } });
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should parse a valid banner response', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const serverResponse = {
        body: {
          results: [{
            creativeId: 'cr-1',
            ad: '<div>banner</div>',
            price: 2.5,
            width: 728,
            height: 90,
            currency: 'USD',
            exp: 120,
            advertiserDomains: ['adv.com'],
            mediaType: 'banner'
          }]
        }
      };
      const request = { data: { bidId: 'bid-1' } };
      const bids = interpretResponse(serverResponse, request);
      expect(bids).to.have.lengthOf(1);
      const bid = bids[0];
      expect(bid.requestId).to.equal('bid-1');
      expect(bid.cpm).to.equal(2.5);
      expect(bid.width).to.equal(728);
      expect(bid.height).to.equal(90);
      expect(bid.creativeId).to.equal('cr-1');
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.be.true;
      expect(bid.ttl).to.equal(120);
      expect(bid.ad).to.equal('<div>banner</div>');
      expect(bid.meta.advertiserDomains).to.deep.equal(['adv.com']);
    });

    it('should parse a valid video response with vastXml', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const serverResponse = {
        body: {
          results: [{
            creativeId: 'cr-2',
            ad: '<VAST></VAST>',
            price: 5.0,
            width: 640,
            height: 480,
            mediaType: 'video'
          }]
        }
      };
      const request = { data: { bidId: 'bid-2' } };
      const bids = interpretResponse(serverResponse, request);
      expect(bids).to.have.lengthOf(1);
      const bid = bids[0];
      expect(bid.vastXml).to.equal('<VAST></VAST>');
      expect(bid.mediaType).to.equal('video');
      expect(bid.ad).to.be.undefined;
    });

    it('should default currency to USD and ttl to TTL_SECONDS when not provided', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const serverResponse = {
        body: {
          results: [{
            creativeId: 'cr-3',
            ad: '<div>ad</div>',
            price: 1.0,
            width: 300,
            height: 250
          }]
        }
      };
      const bids = interpretResponse(serverResponse, { data: { bidId: 'bid-3' } });
      expect(bids[0].currency).to.equal('USD');
      expect(bids[0].ttl).to.equal(300);
    });

    it('should include nurl in response when provided', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const serverResponse = {
        body: {
          results: [{
            creativeId: 'cr-4',
            ad: '<div>ad</div>',
            price: 1.0,
            width: 300,
            height: 250,
            nurl: 'https://win.example.com/nurl'
          }]
        }
      };
      const bids = interpretResponse(serverResponse, { data: { bidId: 'bid-4' } });
      expect(bids[0].nurl).to.equal('https://win.example.com/nurl');
    });

    it('should not include nurl when not provided', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const serverResponse = {
        body: {
          results: [{
            creativeId: 'cr-5',
            ad: '<div>ad</div>',
            price: 1.0,
            width: 300,
            height: 250
          }]
        }
      };
      const bids = interpretResponse(serverResponse, { data: { bidId: 'bid-5' } });
      expect(bids[0].nurl).to.be.undefined;
    });

    it('should include burl in response when provided', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const serverResponse = {
        body: {
          results: [{
            creativeId: 'cr-burl',
            ad: '<div>ad</div>',
            price: 1.0,
            width: 300,
            height: 250,
            burl: 'https://billing.example.com/burl'
          }]
        }
      };
      const bids = interpretResponse(serverResponse, { data: { bidId: 'bid-burl' } });
      expect(bids[0].burl).to.equal('https://billing.example.com/burl');
    });

    it('should not include burl when not provided', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const serverResponse = {
        body: {
          results: [{
            creativeId: 'cr-noburl',
            ad: '<div>ad</div>',
            price: 1.0,
            width: 300,
            height: 250
          }]
        }
      };
      const bids = interpretResponse(serverResponse, { data: { bidId: 'bid-noburl' } });
      expect(bids[0].burl).to.be.undefined;
    });

    it('should use metaData directly when provided', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const metaData = { advertiserDomains: ['test.com'], networkId: 123 };
      const serverResponse = {
        body: {
          results: [{
            creativeId: 'cr-6',
            ad: '<div>ad</div>',
            price: 1.0,
            width: 300,
            height: 250,
            metaData: metaData
          }]
        }
      };
      const bids = interpretResponse(serverResponse, { data: { bidId: 'bid-6' } });
      expect(bids[0].meta).to.deep.equal(metaData);
    });

    it('should default advertiserDomains to empty array when neither metaData nor advertiserDomains provided', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const serverResponse = {
        body: {
          results: [{
            creativeId: 'cr-7',
            ad: '<div>ad</div>',
            price: 1.0,
            width: 300,
            height: 250
          }]
        }
      };
      const bids = interpretResponse(serverResponse, { data: { bidId: 'bid-7' } });
      expect(bids[0].meta).to.deep.equal({ advertiserDomains: [] });
    });

    it('should handle multiple results', function () {
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const serverResponse = {
        body: {
          results: [
            { creativeId: 'cr-a', ad: '<div>a</div>', price: 1.0, width: 300, height: 250 },
            { creativeId: 'cr-b', ad: '<div>b</div>', price: 2.0, width: 728, height: 90 },
            { creativeId: 'cr-c', price: 3.0, width: 300, height: 600 }
          ]
        }
      };
      const bids = interpretResponse(serverResponse, { data: { bidId: 'bid-multi' } });
      expect(bids).to.have.lengthOf(2);
      expect(bids[0].creativeId).to.equal('cr-a');
      expect(bids[1].creativeId).to.equal('cr-b');
    });

    it('should use bidId from result in singleRequest mode for vidazoo', function () {
      const sandbox = sinon.createSandbox();
      sandbox.stub(config, 'getConfig').withArgs('vidazoo.singleRequest').returns(true);
      const interpretResponse = utilities.createInterpretResponseFn('vidazoo', true);
      const serverResponse = {
        body: {
          results: [{
            creativeId: 'cr-sr',
            ad: '<div>ad</div>',
            price: 1.0,
            width: 300,
            height: 250,
            bidId: 'result-bid-id'
          }]
        }
      };
      const bids = interpretResponse(serverResponse, { data: { bidId: 'request-bid-id' } });
      expect(bids[0].requestId).to.equal('result-bid-id');
      sandbox.restore();
    });

    it('should use request bidId when not in singleRequest mode', function () {
      const interpretResponse = utilities.createInterpretResponseFn('tagoras', false);
      const serverResponse = {
        body: {
          results: [{
            creativeId: 'cr-ns',
            ad: '<div>ad</div>',
            price: 1.0,
            width: 300,
            height: 250,
            bidId: 'result-bid-id'
          }]
        }
      };
      const bids = interpretResponse(serverResponse, { data: { bidId: 'request-bid-id' } });
      expect(bids[0].requestId).to.equal('request-bid-id');
    });
  });

  describe('createBuildRequestsFn', function () {
    let sandbox;
    let storageMock;

    const createDomain = (subDomain) => `https://${subDomain || 'exchange'}.example.com`;

    const makeBid = (overrides = {}) => ({
      params: { cId: 'test-cid', pId: 'test-pid', bidFloor: 0.1 },
      bidId: 'bid-1',
      adUnitCode: 'ad-unit-1',
      sizes: [[300, 250]],
      schain: null,
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      ortb2Imp: { ext: { tid: 'txn-1' } },
      bidderRequestId: 'br-1',
      bidRequestsCount: 1,
      bidderRequestsCount: 1,
      bidderWinsCount: 0,
      ...overrides
    });

    const baseBidderRequest = {
      refererInfo: { page: 'https://publisher.com', ref: 'https://referrer.com' },
      timeout: 3000,
      ortb2: {
        site: { cat: [], pagecat: [], content: { data: [], language: 'en' } },
        user: { data: [] },
        device: {},
        regs: { coppa: 0 }
      }
    };

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(bidderSettings, 'get').returns(true);
      storageMock = {
        setDataInLocalStorage: sinon.stub(),
        getDataFromLocalStorage: sinon.stub().returns(null)
      };
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should build one request per bid in normal (non-singleRequest) mode', function () {
      const buildRequests = utilities.createBuildRequestsFn(createDomain, null, storageMock, 'tagoras', '1.0.0', false);
      const bids = [makeBid({ bidId: 'bid-1' }), makeBid({ bidId: 'bid-2' })];
      const requests = buildRequests(bids, baseBidderRequest);
      expect(requests).to.have.lengthOf(2);
      expect(requests[0].data.bidId).to.equal('bid-1');
      expect(requests[1].data.bidId).to.equal('bid-2');
    });

    it('should use POST method', function () {
      const buildRequests = utilities.createBuildRequestsFn(createDomain, null, storageMock, 'tagoras', '1.0.0', false);
      const requests = buildRequests([makeBid()], baseBidderRequest);
      expect(requests[0].method).to.equal('POST');
    });

    it('should construct correct URL with subDomain and cId', function () {
      const buildRequests = utilities.createBuildRequestsFn(createDomain, null, storageMock, 'tagoras', '1.0.0', false);
      const bid = makeBid({ params: { cId: 'my-cid', pId: 'my-pid', subDomain: 'custom' } });
      const requests = buildRequests([bid], baseBidderRequest);
      expect(requests[0].url).to.equal('https://custom.example.com/prebid/multi/my-cid');
    });

    it('should use default subDomain when not provided in params', function () {
      const buildRequests = utilities.createBuildRequestsFn(createDomain, null, storageMock, 'tagoras', '1.0.0', false);
      const requests = buildRequests([makeBid()], baseBidderRequest);
      expect(requests[0].url).to.include('https://exchange.example.com/prebid/multi/test-cid');
    });

    it('should use page URL from refererInfo', function () {
      const buildRequests = utilities.createBuildRequestsFn(createDomain, null, storageMock, 'tagoras', '1.0.0', false);
      const requests = buildRequests([makeBid()], baseBidderRequest);
      expect(requests[0].data.url).to.equal(encodeURIComponent('https://publisher.com'));
    });

    it('should fall back to topmostLocation when page is not available', function () {
      const buildRequests = utilities.createBuildRequestsFn(createDomain, null, storageMock, 'tagoras', '1.0.0', false);
      const bidderReq = {
        ...baseBidderRequest,
        refererInfo: { topmostLocation: 'https://topmost.com', ref: 'https://referrer.com' }
      };
      const requests = buildRequests([makeBid()], bidderReq);
      expect(requests[0].data.url).to.equal(encodeURIComponent('https://topmost.com'));
    });

    it('should use bidderRequest.timeout as bidderTimeout', function () {
      const buildRequests = utilities.createBuildRequestsFn(createDomain, null, storageMock, 'tagoras', '1.0.0', false);
      const requests = buildRequests([makeBid()], baseBidderRequest);
      expect(requests[0].data.bidderTimeout).to.equal(3000);
    });

    it('should pass createUniqueRequestData through to buildRequestData', function () {
      const uniqueDataFn = sinon.stub().returns({ sessionId: 'sess-xyz' });
      const buildRequests = utilities.createBuildRequestsFn(createDomain, uniqueDataFn, storageMock, 'tagoras', '1.0.0', false);
      const requests = buildRequests([makeBid()], baseBidderRequest);
      expect(uniqueDataFn.calledOnce).to.be.true;
      expect(requests[0].data.sessionId).to.equal('sess-xyz');
    });

    it('should send banner bids as single batched request in singleRequest mode for vidazoo', function () {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'vidazoo.singleRequest') return true;
        return undefined;
      });
      const buildRequests = utilities.createBuildRequestsFn(createDomain, null, storageMock, 'vidazoo', '1.0.0', true);
      const bids = [
        makeBid({ bidId: 'bid-1' }),
        makeBid({ bidId: 'bid-2' }),
        makeBid({ bidId: 'bid-3' })
      ];
      const requests = buildRequests(bids, baseBidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.bids).to.be.an('array');
      expect(requests[0].data.bids).to.have.lengthOf(3);
    });

    it('should send video bids individually even in singleRequest mode', function () {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'vidazoo.singleRequest') return true;
        return undefined;
      });
      const buildRequests = utilities.createBuildRequestsFn(createDomain, null, storageMock, 'vidazoo', '1.0.0', true);
      const bids = [
        makeBid({ bidId: 'banner-1', mediaTypes: { banner: { sizes: [[300, 250]] } } }),
        makeBid({ bidId: 'video-1', mediaTypes: { video: { playerSize: [[640, 480]] } } }),
        makeBid({ bidId: 'video-2', mediaTypes: { video: { playerSize: [[640, 480]] } } })
      ];
      const requests = buildRequests(bids, baseBidderRequest);
      const bannerRequests = requests.filter(r => Array.isArray(r.data?.bids));
      const videoRequests = requests.filter(r => !Array.isArray(r.data?.bids));
      expect(bannerRequests).to.have.lengthOf(1);
      expect(bannerRequests[0].data.bids).to.have.lengthOf(1);
      expect(videoRequests).to.have.lengthOf(2);
    });

    it('should not use singleRequest mode for non-allowed bidders', function () {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'tagoras.singleRequest') return true;
        return undefined;
      });
      const buildRequests = utilities.createBuildRequestsFn(createDomain, null, storageMock, 'tagoras', '1.0.0', true);
      const bids = [makeBid({ bidId: 'bid-1' }), makeBid({ bidId: 'bid-2' })];
      const requests = buildRequests(bids, baseBidderRequest);
      expect(requests).to.have.lengthOf(2);
      requests.forEach(r => expect(Array.isArray(r.data)).to.be.false);
    });

    it('should not use singleRequest mode when allowSingleRequest is false', function () {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'vidazoo.singleRequest') return true;
        return undefined;
      });
      const buildRequests = utilities.createBuildRequestsFn(createDomain, null, storageMock, 'vidazoo', '1.0.0', false);
      const bids = [makeBid({ bidId: 'bid-1' }), makeBid({ bidId: 'bid-2' })];
      const requests = buildRequests(bids, baseBidderRequest);
      expect(requests).to.have.lengthOf(2);
      requests.forEach(r => expect(Array.isArray(r.data)).to.be.false);
    });

    it('should chunk banner bids according to chunkSize config', function () {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'vidazoo.singleRequest') return true;
        if (key === 'vidazoo.chunkSize') return 2;
        return undefined;
      });
      const buildRequests = utilities.createBuildRequestsFn(createDomain, null, storageMock, 'vidazoo', '1.0.0', true);
      const bids = [
        makeBid({ bidId: 'bid-1' }),
        makeBid({ bidId: 'bid-2' }),
        makeBid({ bidId: 'bid-3' }),
        makeBid({ bidId: 'bid-4' }),
        makeBid({ bidId: 'bid-5' })
      ];
      const requests = buildRequests(bids, baseBidderRequest);
      expect(requests).to.have.lengthOf(3);
      expect(requests[0].data.bids).to.have.lengthOf(2);
      expect(requests[1].data.bids).to.have.lengthOf(2);
      expect(requests[2].data.bids).to.have.lengthOf(1);
    });

    it('should cap chunkSize at 20', function () {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'vidazoo.singleRequest') return true;
        if (key === 'vidazoo.chunkSize') return 50;
        return undefined;
      });
      const buildRequests = utilities.createBuildRequestsFn(createDomain, null, storageMock, 'vidazoo', '1.0.0', true);
      const bids = Array.from({ length: 25 }, (_, i) => makeBid({ bidId: `bid-${i}` }));
      const requests = buildRequests(bids, baseBidderRequest);
      expect(requests).to.have.lengthOf(2);
      expect(requests[0].data.bids).to.have.lengthOf(20);
      expect(requests[1].data.bids).to.have.lengthOf(5);
    });

    it('should include host in URL when params.host is a valid two-part domain', function () {
      const createDomainWithHost = (subDomain, host) => {
        if (host) return `https://${subDomain || 'exchange'}.${host}`;
        return `https://${subDomain || 'exchange'}.example.com`;
      };
      const buildRequests = utilities.createBuildRequestsFn(createDomainWithHost, null, storageMock, 'tagoras', '1.0.0', false);
      const bid = makeBid({ params: { cId: 'my-cid', pId: 'my-pid', host: 'twist.win' } });
      const requests = buildRequests([bid], baseBidderRequest);
      expect(requests[0].url).to.equal('https://exchange.twist.win/prebid/multi/my-cid');
    });

    it('should not pass host to createRequestDomain when host is invalid', function () {
      const createDomainSpy = sinon.spy((subDomain, host) => {
        if (host) return `https://${subDomain || 'exchange'}.${host}`;
        return `https://${subDomain || 'exchange'}.example.com`;
      });
      const buildRequests = utilities.createBuildRequestsFn(createDomainSpy, null, storageMock, 'tagoras', '1.0.0', false);
      const bid = makeBid({ params: { cId: 'my-cid', pId: 'my-pid', host: 'invalid' } });
      buildRequests([bid], baseBidderRequest);
      expect(createDomainSpy.calledOnce).to.be.true;
      expect(createDomainSpy.firstCall.args.length).to.equal(1);
    });

    it('should fall back to config bidderTimeout when bidderRequest.timeout is not set', function () {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'bidderTimeout') return 5000;
        return undefined;
      });
      const buildRequests = utilities.createBuildRequestsFn(createDomain, null, storageMock, 'tagoras', '1.0.0', false);
      const bidderReq = {
        ...baseBidderRequest,
        timeout: undefined
      };
      const requests = buildRequests([makeBid()], bidderReq);
      expect(requests[0].data.bidderTimeout).to.equal(5000);
    });

    it('should include host in URL for singleRequest mode with valid host param', function () {
      const createDomainWithHost = (subDomain, host) => {
        if (host) return `https://${subDomain || 'exchange'}.${host}`;
        return `https://${subDomain || 'exchange'}.example.com`;
      };
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'vidazoo.singleRequest') return true;
        return undefined;
      });
      const buildRequests = utilities.createBuildRequestsFn(createDomainWithHost, null, storageMock, 'vidazoo', '1.0.0', true);
      const bids = [
        makeBid({ bidId: 'bid-1', params: { cId: 'my-cid', pId: 'my-pid', host: 'twist.win' } }),
        makeBid({ bidId: 'bid-2', params: { cId: 'my-cid', pId: 'my-pid', host: 'twist.win' } })
      ];
      const requests = buildRequests(bids, baseBidderRequest);
      expect(requests[0].url).to.include('twist.win');
    });
  });
})
