import {expect} from 'chai';
import {newBidder} from '../../../src/adapters/bidderFactory';
import {ENDPOINT_URL, spec} from '../../../modules/cwireBidAdapter';
import {deepClone, logInfo} from '../../../src/utils';
import * as utils from 'src/utils.js';
import {sandbox, stub} from 'sinon';
import {config} from '../../../src/config';

describe('C-WIRE bid adapter', () => {
  config.setConfig({debug: true});
  const adapter = newBidder(spec);
  let bidRequests = [
    {
      'bidder': 'cwire',
      'params': {
        'placementId': '4057'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'transactionId': '04f2659e-c005-4eb1-a57c-fa93145e3843'
    }
  ];
  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
      expect(spec.isBidRequestValid).to.exist.and.to.be.a('function');
      expect(spec.buildRequests).to.exist.and.to.be.a('function');
      expect(spec.interpretResponse).to.exist.and.to.be.a('function');
    });
  });
  describe('buildRequests', function () {
    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(ENDPOINT_URL);
      expect(request.method).to.equal('POST');
    });
  });
  describe('buildRequests with given creative', function () {
    let utilsStub;

    before(function () {
      utilsStub = stub(utils, 'getParameterByName').callsFake(function () {
        return 'str-str'
      });
    });

    after(function () {
      utilsStub.restore();
    });

    it('should add creativeId if url parameter given', function () {
      // set from bid.params
      let bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);
      expect(payload.creativeId).to.exist;
      expect(payload.creativeId).to.deep.equal('str-str');
    });
  })

  describe('buildRequests reads adUnit offsetWidth and offsetHeight', function () {
    before(function () {
      const documentStub = sandbox.stub(document, 'getElementById');
      documentStub.withArgs(`${bidRequests[0].adUnitCode}`).returns({
        offsetWidth: 200,
        offsetHeight: 250
      });
    });
    it('width and height should be set', function () {
      let bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);
      const el = document.getElementById(`${bidRequest.adUnitCode}`)

      logInfo(JSON.stringify(payload))

      expect(el).to.exist;
      expect(payload.slots[0].cwExt.dimensions.width).to.equal(200);
      expect(payload.slots[0].cwExt.dimensions.height).to.equal(250);
      expect(payload.slots[0].cwExt.style).to.not.exist
    });
    after(function () {
      sandbox.restore()
    });
  });
  describe('buildRequests reads style attributes', function () {
    before(function () {
      const documentStub = sandbox.stub(document, 'getElementById');
      documentStub.withArgs(`${bidRequests[0].adUnitCode}`).returns({
        style: {
          maxWidth: '400px',
        }
      });
    });
    it('css maxWidth should be set', function () {
      let bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);
      const el = document.getElementById(`${bidRequest.adUnitCode}`)

      logInfo(JSON.stringify(payload))

      expect(el).to.exist;
      expect(payload.slots[0].cwExt.style.maxWidth).to.eq('400px');
    });
    after(function () {
      sandbox.restore()
    });
  });

  describe('buildRequests reads feature flags', function () {
    before(function () {
      sandbox.stub(utils, 'getParameterByName').callsFake(function () {
        return 'feature1,feature2'
      });
    });

    it('read from url parameter', function () {
      let bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      logInfo(JSON.stringify(payload))

      expect(payload.featureFlags).to.exist;
      expect(payload.featureFlags).to.include.members(['feature1', 'feature2']);
    });
    after(function () {
      sandbox.restore()
    });
  });
});
