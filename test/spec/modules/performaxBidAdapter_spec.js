import { expect } from 'chai';
import { spec, converter, storeData, readData, storage, resetUserSyncsInit } from 'modules/performaxBidAdapter.js';
import * as utils from '../../../src/utils.js';
import * as ajax from 'src/ajax.js';
import sinon from 'sinon';

describe('Performax adapter', function () {
  const bids = [{
    bidder: 'performax',
    params: {
      tagid: 'sample'
    },
    ortb2Imp: {
      ext: {}
    },
    mediaTypes: {
      banner: {
        sizes: [
          [300, 300],
        ]}},
    adUnitCode: 'postbid_iframe',
    transactionId: '84deda92-e9ba-4b0d-a797-43be5e522430',
    adUnitId: '4ee4643b-931f-4a17-a571-ccba57886dc8',
    sizes: [
      [300, 300],
    ],
    bidId: '2bc545c347dbbe',
    bidderRequestId: '1534dec005b9a',
    auctionId: 'acd97e55-01e1-45ad-813c-67fa27fc5c1b',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0,
    ortb2: {
      source: {},
      site: {},
      device: {}
    },
  },

  {
    bidder: 'performax',
    params: {
      tagid: '1545'
    },
    ortb2Imp: {
      ext: {}
    },
    mediaTypes: {
      banner: {
        sizes: [
          [300, 600],
        ]}},
    adUnitCode: 'postbid_halfpage_iframe',
    transactionId: '84deda92-e9ba-4b0d-a797-43be5e522430',
    adUnitId: '4ee4643b-931f-4a17-a571-ccba57886dc8',
    sizes: [
      [300, 600],
    ],
    bidId: '3dd53d30c691fe',
    bidderRequestId: '1534dec005b9a',
    auctionId: 'acd97e55-01e1-45ad-813c-67fa27fc5c1b',
    src: 'client',
    bidRequestsCount: 1,
    bidderRequestsCount: 1,
    bidderWinsCount: 0,
    ortb2: {
      source: {},
      site: {},
      device: {}
    }}];

  const bidderRequest = {
    bidderCode: 'performax2',
    auctionId: 'acd97e55-01e1-45ad-813c-67fa27fc5c1b',
    id: 'acd97e55-01e1-45ad-813c-67fa27fc5c1b',
    bidderRequestId: '1534dec005b9a',
    bids: bids,
    ortb2: {
      regs: {
        ext: {
          gdpr: 1
        }},
      user: {
        ext: {
          consent: 'consent-string'
        }
      },
      site: {},
      device: {}
    }};

  const serverResponse = {
    body: {
      cur: 'CZK',
      seatbid: [
        {
          seat: 'performax',
          bid: [
            {
              id: 'sample',
              price: 20,
              w: 300,
              h: 300,
              adm: 'My ad'
            }
          ]}]},
  }

  describe('isBidRequestValid', function () {
    const bid = {};
    it('should return false when missing "tagid" param', function() {
      bid.params = {slotId: 'param'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when tagid is correct', function() {
      bid.params = {tagid: 'sample'};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  })

  describe('buildRequests', function () {
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should inject stored UIDs into user.ext.uids if they exist', function() {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'getDataFromLocalStorage')
        .withArgs('px_uids') // BIDDER_SHORT_CODE + '_uids'
        .returns(JSON.stringify({ someVendor: '12345' }));

      const requests = spec.buildRequests(bids, bidderRequest);
      const data = requests[0].data;

      expect(data.user).to.exist;
      expect(data.user.ext).to.exist;
      expect(data.user.ext.uids).to.deep.equal({ someVendor: '12345' });
    });

    it('should set correct request method and url', function () {
      const requests = spec.buildRequests([bids[0]], bidderRequest);
      expect(requests).to.be.an('array').that.has.lengthOf(1);
      const request = requests[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://dale.performax.cz/ortb');
      expect(request.data).to.be.an('object');
    });

    it('should pass correct imp', function () {
      const requests = spec.buildRequests([bids[0]], bidderRequest);
      const {data} = requests[0];
      const {imp} = data;
      expect(imp).to.be.an('array').that.has.lengthOf(1);
      expect(imp[0]).to.be.an('object');
      const bid = imp[0];
      expect(bid.id).to.equal('2bc545c347dbbe');
      expect(bid.banner).to.deep.equal({topframe: 0, format: [{w: 300, h: 300}]});
    });

    it('should process multiple bids', function () {
      const requests = spec.buildRequests(bids, bidderRequest);
      expect(requests).to.be.an('array').that.has.lengthOf(1);
      const {data} = requests[0];
      const {imp} = data;
      expect(imp).to.be.an('array').that.has.lengthOf(bids.length);
      const bid1 = imp[0];
      expect(bid1.banner).to.deep.equal({topframe: 0, format: [{w: 300, h: 300}]});
      const bid2 = imp[1];
      expect(bid2.banner).to.deep.equal({topframe: 0, format: [{w: 300, h: 600}]});
    });
  });

  describe('interpretResponse', function () {
    it('should return an empty array if the response body is missing', function () {
      const result = spec.interpretResponse({}, {});
      expect(result).to.deep.equal([]);
    });

    it('should map params correctly', function () {
      const ortbRequest = {data: converter.toORTB({bidderRequest, bids})};
      serverResponse.body.id = ortbRequest.data.id;
      serverResponse.body.seatbid[0].bid[0].imp_id = ortbRequest.data.imp[0].id;

      const result = spec.interpretResponse(serverResponse, ortbRequest);
      expect(result).to.be.an('array').that.has.lengthOf(1);
      const bid = result[0];

      expect(bid.cpm).to.equal(20);
      expect(bid.ad).to.equal('My ad');
      expect(bid.currency).to.equal('CZK');
      expect(bid.mediaType).to.equal('banner');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(360);
      expect(bid.creativeId).to.equal('sample');
    });
  });

  describe('Storage Helpers', () => {
    let sandbox;
    let logWarnSpy;
    let logErrorSpy;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(storage, 'localStorageIsEnabled');
      sandbox.stub(storage, 'setDataInLocalStorage');
      sandbox.stub(storage, 'getDataFromLocalStorage');

      logWarnSpy = sandbox.stub(utils, 'logWarn');
      logErrorSpy = sandbox.stub(utils, 'logError');
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('storeData', () => {
      it('should store serialized data when local storage is enabled', () => {
        storage.localStorageIsEnabled.returns(true);
        const testData = { foo: 'bar' };

        storeData('testKey', testData);

        sandbox.assert.calledWithExactly(
          storage.setDataInLocalStorage,
          'testKey',
          JSON.stringify(testData)
        );
      });

      it('should log a warning and exit if local storage is disabled', () => {
        storage.localStorageIsEnabled.returns(false);

        storeData('testKey', { foo: 'bar' });

        expect(storage.setDataInLocalStorage.called).to.be.false;
        sandbox.assert.calledOnce(logWarnSpy);
      });

      it('should log an error if setDataInLocalStorage throws', () => {
        storage.localStorageIsEnabled.returns(true);
        storage.setDataInLocalStorage.throws(new Error('QuotaExceeded'));

        storeData('testKey', 'someValue');

        sandbox.assert.calledOnce(logErrorSpy);
      });
    });

    describe('readData', () => {
      it('should return parsed data when it exists in storage', () => {
        storage.localStorageIsEnabled.returns(true);
        const mockValue = { id: 123 };
        storage.getDataFromLocalStorage.withArgs('myKey').returns(JSON.stringify(mockValue));

        const result = readData('myKey', {});

        expect(result).to.deep.equal(mockValue);
      });

      it('should return defaultValue if local storage is disabled', () => {
        storage.localStorageIsEnabled.returns(false);
        const defaultValue = { status: 'default' };

        const result = readData('myKey', defaultValue);

        expect(result).to.equal(defaultValue);
        sandbox.assert.calledOnce(logWarnSpy);
      });

      it('should return defaultValue if the key does not exist (returns null)', () => {
        storage.localStorageIsEnabled.returns(true);
        storage.getDataFromLocalStorage.returns(null);

        const result = readData('missingKey', 'fallback');

        expect(result).to.equal('fallback');
      });

      it('should return defaultValue and log an error if JSON is malformed', () => {
        storage.localStorageIsEnabled.returns(true);
        storage.getDataFromLocalStorage.returns('not-valid-json{');

        const result = readData('badKey', { error: true });

        expect(result).to.deep.equal({ error: true });
        sandbox.assert.calledOnce(logErrorSpy);
      });
    });
  });

  describe('logging', function () {
    let ajaxStub;
    let randomStub;

    beforeEach(() => {
      ajaxStub = sinon.stub(ajax, 'ajax');
      randomStub = sinon.stub(Math, 'random').returns(0);
    });

    afterEach(() => {
      ajaxStub.restore();
      randomStub.restore();
    });

    it('should call ajax when onTimeout is triggered', function () {
      const timeoutData = [{ bidId: '123' }];
      spec.onTimeout(timeoutData);

      expect(ajaxStub.calledOnce).to.be.true;

      const [url, callback, data, options] = ajaxStub.firstCall.args;
      const parsedData = JSON.parse(data);

      expect(parsedData.type).to.equal('timeout');
      expect(parsedData.payload).to.deep.equal(timeoutData);
      expect(options.method).to.equal('POST');
    });

    it('should call ajax when onBidderError is triggered', function () {
      const errorData = { bidderRequest: { some: 'data' } };
      spec.onBidderError(errorData);

      expect(ajaxStub.calledOnce).to.be.true;

      const [url, callback, data] = ajaxStub.firstCall.args;
      const parsedData = JSON.parse(data);

      expect(parsedData.type).to.equal('bidderError');
      expect(parsedData.payload).to.deep.equal(errorData.bidderRequest);
    });

    it('should NOT call ajax if sampling logic fails', function () {
      randomStub.returns(1.1);

      spec.onTimeout({});
      expect(ajaxStub.called).to.be.false;
    });

    it('should call ajax with correct type "intervention"', function () {
      const bidData = { bidId: 'abc' };
      spec.onIntervention({ bid: bidData });

      expect(ajaxStub.calledOnce).to.be.true;
      const [url, callback, data] = ajaxStub.firstCall.args;
      const parsed = JSON.parse(data);

      expect(parsed.type).to.equal('intervention');
      expect(parsed.payload).to.deep.equal(bidData);
    });
  });

  describe('getUserSyncs', function () {
    let sandbox;
    let logWarnSpy;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      logWarnSpy = sandbox.stub(utils, 'logWarn');
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'setDataInLocalStorage');
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
      resetUserSyncsInit();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return empty array and log warning if iframeEnabled is false', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: false });
      expect(syncs).to.deep.equal([]);
      expect(logWarnSpy.calledOnce).to.be.true;
    });

    it('should return correct iframe sync url without GDPR', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true });
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal('https://cdn.performax.cz/px2/cookie_sync_bundle.html');
    });

    it('should append GDPR params when gdprApplies is a boolean', function () {
      const consent = { gdprApplies: true, consentString: 'abc' };
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], consent);

      expect(syncs[0].url).to.include('?gdpr=1&gdpr_consent=abc');
    });

    it('should append GDPR params when gdprApplies is undefined/non-boolean', function () {
      const consent = { gdprApplies: undefined, consentString: 'abc' };
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], consent);

      expect(syncs[0].url).to.include('?gdpr_consent=abc');
    });

    describe('PostMessage Listener', function () {
      it('should store data when valid message is received', function () {
        const addEventListenerStub = sandbox.stub(window, 'addEventListener');
        spec.getUserSyncs({ iframeEnabled: true });
        expect(addEventListenerStub.calledWith('message')).to.be.true;
        const callback = addEventListenerStub.args.find(arg => arg[0] === 'message')[1];

        const mockEvent = {
          origin: 'https://cdn.performax.cz',
          data: {
            flexo_sync_cookie: {
              uid: 'user123',
              vendor: 'vendorXYZ'
            }
          }
        };

        callback(mockEvent);

        expect(storage.setDataInLocalStorage.calledOnce).to.be.true;

        const [key, value] = storage.setDataInLocalStorage.firstCall.args;
        expect(key).to.equal('px_uids');
        expect(JSON.parse(value)).to.deep.equal({
          vendorXYZ: 'user123'
        });
      });

      it('should ignore messages from invalid origins', function () {
        const addEventListenerStub = sandbox.stub(window, 'addEventListener');
        spec.getUserSyncs({ iframeEnabled: true });

        const callback = addEventListenerStub.args.find(arg => arg[0] === 'message')[1];

        const mockEvent = {
          origin: 'https://not.cdn.performax.cz',
          data: { flexo_sync_cookie: { uid: '1', vendor: '2' } }
        };

        callback(mockEvent);

        expect(storage.setDataInLocalStorage.called).to.be.false;
      });

      it('should ignore messages with missing structure', function () {
        const addEventListenerStub = sandbox.stub(window, 'addEventListener');
        spec.getUserSyncs({ iframeEnabled: true });

        const callback = addEventListenerStub.args.find(arg => arg[0] === 'message')[1];

        const mockEvent = {
          origin: 'https://cdn.performax.cz',
          data: { wrong_key: 123 } // Missing flexo_sync_cookie
        };

        callback(mockEvent);

        expect(storage.setDataInLocalStorage.called).to.be.false;
      });

      it('should not register duplicate listeners on multiple calls', function () {
        const addEventListenerStub = sandbox.stub(window, 'addEventListener');

        spec.getUserSyncs({ iframeEnabled: true });
        expect(addEventListenerStub.calledOnce).to.be.true;

        spec.getUserSyncs({ iframeEnabled: true });
        expect(addEventListenerStub.calledOnce).to.be.true;
      });
    });
  });
});
