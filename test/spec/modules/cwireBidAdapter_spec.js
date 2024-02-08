import {expect} from 'chai';
import {newBidder} from '../../../src/adapters/bidderFactory';
import {BID_ENDPOINT, spec, storage} from '../../../modules/cwireBidAdapter';
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
        'pageId': '4057',
        'placementId': 'ad-slot-bla'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'transactionId': '04f2659e-c005-4eb1-a57c-fa93145e3843'
    }
  ];
  const response = {
    body: {
      'cwid': '2ef90743-7936-4a82-8acf-e73382a64e94',
      'hash': '17112D98BBF55D3A',
      'bids': [{
        'html': '<h1>Hello world</h1>',
        'cpm': 100,
        'currency': 'CHF',
        'dimensions': [1, 1],
        'netRevenue': true,
        'creativeId': '3454',
        'requestId': '2c634d4ca5ccfb',
        'placementId': 177,
        'transactionId': 'b4b32618-1350-4828-b6f0-fbb5c329e9a4',
        'ttl': 360
      }]
    }
  }
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
      expect(request.url).to.equal(BID_ENDPOINT);
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
      expect(payload.cwcreative).to.exist;
      expect(payload.cwcreative).to.deep.equal('str-str');
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
      expect(payload.slots[0].cwExt.style.maxHeight).to.not.exist;
      expect(payload.slots[0].cwExt.style.maxWidth).to.not.exist;
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
          maxHeight: '350px',
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
      !expect(payload.slots[0].cwExt.style.maxHeight).to.eq('350px');
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

  describe('buildRequests reads cwgroups flag', function () {
    before(function () {
      sandbox.stub(utils, 'getParameterByName').callsFake(function () {
        return 'group1,group2'
      });
    });

    it('read from url parameter', function () {
      let bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      logInfo(JSON.stringify(payload))

      expect(payload.refgroups).to.exist;
      expect(payload.refgroups).to.include.members(['group1', 'group2']);
    });
    after(function () {
      sandbox.restore()
    });
  })

  describe('buildRequests reads debug flag', function () {
    before(function () {
      sandbox.stub(utils, 'getParameterByName').callsFake(function () {
        return 'true'
      });
    });

    it('read from url parameter', function () {
      let bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      logInfo(JSON.stringify(payload))

      expect(payload.debug).to.exist;
      expect(payload.debug).to.equal(true);
    });
    after(function () {
      sandbox.restore()
    });
  })

  describe('buildRequests reads cw_id from Localstorage', function () {
    before(function () {
      sandbox.stub(storage, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(storage, 'setDataInLocalStorage');
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake((key) => 'taerfagerg');
    });

    it('cw_id is set', function () {
      let bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      logInfo(JSON.stringify(payload))

      expect(payload.cwid).to.exist;
      expect(payload.cwid).to.equal('taerfagerg');
    });
    after(function () {
      sandbox.restore()
    });
  })

  describe('buildRequests maps flattens params for legacy compat', function () {
    before(function () {
      const documentStub = sandbox.stub(document, 'getElementById');
      documentStub.withArgs(`${bidRequests[0].adUnitCode}`).returns({});
    });
    it('pageId flattened', function () {
      let bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      logInfo(JSON.stringify(payload))

      expect(payload.slots[0].pageId).to.exist;
    });
    after(function () {
      sandbox.restore()
    });
  })

  describe('pageId and placementId are required params', function () {
    it('invalid request', function () {
      let bidRequest = deepClone(bidRequests[0]);
      delete bidRequest.params

      const valid = spec.isBidRequestValid(bidRequest);
      expect(valid).to.be.false;
    })

    it('valid request', function () {
      let bidRequest = deepClone(bidRequests[0]);
      bidRequest.params.pageId = 42
      bidRequest.params.placementId = 42

      const valid = spec.isBidRequestValid(bidRequest);
      expect(valid).to.be.true;
    })

    it('cwcreative must be of type string', function () {
      let bidRequest = deepClone(bidRequests[0]);
      bidRequest.params.pageId = 42
      bidRequest.params.placementId = 42

      const valid = spec.isBidRequestValid(bidRequest);
      expect(valid).to.be.true;
    })

    it('build request adds pageId', function () {
      let bidRequest = deepClone(bidRequests[0]);

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.slots[0].pageId).to.exist;
    })
  });

  describe('process serverResponse', function () {
    it('html to ad mapping', function () {
      let bidResponse = deepClone(response);
      const bids = spec.interpretResponse(bidResponse, {});

      expect(bids[0].ad).to.exist;
    })
  });

  describe('add user-syncs', function () {
    it('empty user-syncs if no consent given', function () {
      const userSyncs = spec.getUserSyncs({}, {}, {}, {});

      expect(userSyncs).to.be.empty
    })
    it('empty user-syncs if no syncOption enabled', function () {
      let gdprConsent = {
        vendorData: {
          purpose: {
            consents: 1
          }
        }};
      const userSyncs = spec.getUserSyncs({}, {}, gdprConsent, {});

      expect(userSyncs).to.be.empty
    })

    it('user-syncs with enabled pixel option', function () {
      let gdprConsent = {
        vendorData: {
          purpose: {
            consents: 1
          }
        }};
      let synOptions = {pixelEnabled: true, iframeEnabled: true};
      const userSyncs = spec.getUserSyncs(synOptions, {}, gdprConsent, {});

      expect(userSyncs[0].type).to.equal('image');
      expect(userSyncs[0].url).to.equal('https://ib.adnxs.com/getuid?https://prebid.cwi.re/v1/cookiesync?xandrId=$UID');
    })

    it('user-syncs with enabled iframe option', function () {
      let gdprConsent = {
        vendorData: {
          purpose: {
            consents: 1
          }
        }};
      let synOptions = {iframeEnabled: true};
      const userSyncs = spec.getUserSyncs(synOptions, {}, gdprConsent, {});

      expect(userSyncs[0].type).to.equal('iframe');
      expect(userSyncs[0].url).to.equal('https://ib.adnxs.com/getuid?https://prebid.cwi.re/v1/cookiesync?xandrId=$UID');
    })
  })
});
