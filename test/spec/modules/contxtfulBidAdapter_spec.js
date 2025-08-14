import { spec } from 'modules/contxtfulBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import * as ajax from 'src/ajax.js';
const VERSION = 'v1';
const CUSTOMER = 'CUSTOMER';
const BIDDER_ENDPOINT = 'prebid.receptivity.io';
const RX_FROM_API = { ReceptivityState: 'Receptive', test_info: 'rx_from_engine' };

describe('contxtful bid adapter', function () {
  const adapter = newBidder(spec);
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('is a functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('valid code', function () {
    it('should return the bidder code of contxtful', function () {
      expect(spec.code).to.eql('contxtful');
    });
  });

  let bidRequests =
  [
    {
      bidder: 'contxtful',
      bidId: 'bId1',
      custom_param_1: 'value_1',
      transactionId: 'tId1',
      params: {
        bcat: ['cat1', 'cat2'],
        badv: ['adv1', 'adv2'],
      },
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [300, 600]
          ]
        },
      },
      ortb2Imp: {
        ext: {
          tid: 't-id-test-1',
          gpid: 'gpid-id-unitest-1'
        },
      },
      schain: {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'schain-seller-1.com',
            sid: '00001',
            hp: 1,
          },
        ],
      },
      getFloor: () => ({ currency: 'CAD', floor: 10 }),
    }
  ];

  let expectedReceptivityData = {
    rx: RX_FROM_API,
    params: {
      ev: VERSION,
      ci: CUSTOMER,
    },
  };

  let bidderRequest = {
    refererInfo: {
      ref: 'https://my-referer-custom.com',
    },
    ortb2: {
      source: {
        tid: 'auction-id',
      },
      property_1: 'string_val_1',
      regs: {
        coppa: 1,
        ext: {
          us_privacy: '12345'
        }
      },
      user: {
        data: [
          {
            name: 'contxtful',
            ext: expectedReceptivityData
          }
        ],
        ext: {
          eids: [
            {
              source: 'id5-sync.com',
              uids: [
                {
                  atype: 1,
                  id: 'fake-id5id',
                },
              ]
            }
          ]
        }
      }

    },
    timeout: 1234,
    uspConsent: '12345'
  };

  describe('valid configuration', function() {
    const theories = [
      [
        null,
        'contxfulBidAdapter: contxtful.version should be a non-empty string',
        'null object for config',
      ],
      [
        {},
        'contxfulBidAdapter: contxtful.version should be a non-empty string',
        'empty object for config',
      ],
      [
        { customer: CUSTOMER },
        'contxfulBidAdapter: contxtful.version should be a non-empty string',
        'customer only in config',
      ],
      [
        { version: VERSION },
        'contxfulBidAdapter: contxtful.customer should be a non-empty string',
        'version only in config',
      ],
      [
        { customer: CUSTOMER, version: '' },
        'contxfulBidAdapter: contxtful.version should be a non-empty string',
        'empty string for version',
      ],
      [
        { customer: '', version: VERSION },
        'contxfulBidAdapter: contxtful.customer should be a non-empty string',
        'empty string for customer',
      ],
      [
        { customer: '', version: '' },
        'contxfulBidAdapter: contxtful.version should be a non-empty string',
        'empty string for version & customer',
      ],
    ];

    theories.forEach(([params, expectedErrorMessage, description]) => {
      it('detects invalid configuration and throws the expected error (' + description + ')', () => {
        config.setConfig({
          contxtful: params
        });
        expect(() => spec.buildRequests(bidRequests, {
          auctionId: 'new-auction-id'
        })).to.throw(
          expectedErrorMessage
        );
      });
    });

    it('uses a valid configuration and returns the right url', () => {
      config.setConfig({
        contxtful: {customer: CUSTOMER, version: VERSION}
      });
      const bidRequest = spec.buildRequests(bidRequests);
      expect(bidRequest.url).to.eq('https://' + BIDDER_ENDPOINT + `/${VERSION}/prebid/${CUSTOMER}/bid`)
    });

    it('will take specific ortb2 configuration parameters and returns it in ortb2 object', () => {
      config.setConfig({
        contxtful: {customer: CUSTOMER, version: VERSION},
      });
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest);
      expect(bidRequest.data.ortb2.property_1).to.equal('string_val_1');
    });
  });

  describe('valid bid request', function () {
    config.setConfig({
      contxtful: {customer: CUSTOMER, version: VERSION},
    });
    const bidRequest = spec.buildRequests(bidRequests, bidderRequest);

    it('will return a data property containing properties ortb2, bidRequests, bidderRequest and config', () => {
      expect(bidRequest.data).not.to.be.undefined;
      expect(bidRequest.data.ortb2).not.to.be.undefined;
      expect(bidRequest.data.bidRequests).not.to.be.undefined;
      expect(bidRequest.data.bidderRequest).not.to.be.undefined;
      expect(bidRequest.data.config).not.to.be.undefined;
    });

    it('will take custom parameters in the bid request and within the bidRequests array', () => {
      expect(bidRequest.data.bidRequests[0].custom_param_1).to.equal('value_1')
    });

    it('will return any supply chain parameters within the bidRequests array', () => {
      expect(bidRequest.data.bidRequests[0].schain.ver).to.equal('1.0');
    });

    it('will return floor request within the bidFloor parameter in the bidRequests array', () => {
      expect(bidRequest.data.bidRequests[0].bidFloor.currency).to.equal('CAD');
      expect(bidRequest.data.bidRequests[0].bidFloor.floor).to.equal(10);
    });

    it('will return the usp string in the uspConsent parameter within the bidderRequest property', () => {
      expect(bidRequest.data.bidderRequest.uspConsent).to.equal('12345');
    });

    it('will contains impressions array on ortb2.imp object for all ad units', () => {
      expect(bidRequest.data.ortb2.imp.length).to.equal(1);
      expect(bidRequest.data.ortb2.imp[0].id).to.equal('bId1');
    });

    it('will contains the registration on ortb2.regs object', () => {
      expect(bidRequest.data.ortb2.regs).not.to.be.undefined;
      expect(bidRequest.data.ortb2.regs.coppa).to.equal(1);
      expect(bidRequest.data.ortb2.regs.ext.us_privacy).to.equal('12345')
    })

    it('will contains the eids modules within the ortb2.user.ext.eids', () => {
      expect(bidRequest.data.ortb2.user.ext.eids).not.to.be.undefined;
      expect(bidRequest.data.ortb2.user.ext.eids[0].source).to.equal('id5-sync.com');
      expect(bidRequest.data.ortb2.user.ext.eids[0].uids[0].id).to.equal('fake-id5id');
    });

    it('will contains the receptivity value within the ortb2.user.data with contxtful name', () => {
      let obtained_receptivity_data = bidRequest.data.ortb2.user.data.filter(function(userData) {
        return userData.name == 'contxtful';
      });
      expect(obtained_receptivity_data.length).to.equal(1);
      expect(obtained_receptivity_data[0].ext).to.deep.equal(expectedReceptivityData);
    });

    it('will contains ortb2Imp of the bid request within the ortb2.imp.ext', () => {
      let first_imp = bidRequest.data.ortb2.imp[0];
      expect(first_imp.ext).not.to.be.undefined;
      expect(first_imp.ext.tid).to.equal('t-id-test-1');
      expect(first_imp.ext.gpid).to.equal('gpid-id-unitest-1');
    });
  });

  describe('valid bid request with no floor module', () => {
    let noFloorsBidRequests =
    [
      {
        bidder: 'contxtful',
        bidId: 'bId1',
        transactionId: 'tId1',
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600]
            ]
          },
        },
      },
      {
        bidder: 'contxtful',
        bidId: 'bId2',
        transactionId: 'tId2',
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600]
            ]
          },
        },
        params: {
          bidfloor: 54
        }
      },
    ];

    config.setConfig({
      contxtful: {customer: CUSTOMER, version: VERSION},
    });

    const bidRequest = spec.buildRequests(noFloorsBidRequests, bidderRequest);
    it('will contains default value of floor if the bid request do not contains floor function', () => {
      expect(bidRequest.data.bidRequests[0].bidFloor.currency).to.equal('USD');
      expect(bidRequest.data.bidRequests[0].bidFloor.floor).to.equal(0);
    });

    it('will take the param.bidfloor as floor value if possible', () => {
      expect(bidRequest.data.bidRequests[1].bidFloor.currency).to.equal('USD');
      expect(bidRequest.data.bidRequests[1].bidFloor.floor).to.equal(54);
    });
  });

  describe('valid bid response', () => {
    const bidResponse = [
      {
        'requestId': 'arequestId',
        'originalCpm': 1.5,
        'cpm': 1.35,
        'currency': 'CAD',
        'width': 300,
        'height': 600,
        'creativeId': 'creativeid',
        'netRevenue': true,
        'ttl': 300,
        'ad': '<script src="www.anadscript.com"></script>',
        'mediaType': 'banner',
        'syncs': [
          {
            'url': 'mysyncurl.com?qparam1=qparamv1&qparam2=qparamv2'
          }
        ]
      }
    ];
    config.setConfig({
      contxtful: {customer: CUSTOMER, version: VERSION},
    });

    const bidRequest = spec.buildRequests(bidRequests, bidderRequest);

    it('will interpret response correcly', () => {
      const bids = spec.interpretResponse({ body: bidResponse }, bidRequest);
      expect(bids).not.to.be.undefined;
      expect(bids).to.have.lengthOf(1);
      expect(bids).to.deep.equal(bidResponse);
    });

    it('will return empty response if bid response is empty', () => {
      const bids = spec.interpretResponse({ body: [] }, bidRequest);
      expect(bids).to.have.lengthOf(0);
    })

    it('will trigger user sync if enable pixel mode', () => {
      const syncOptions = {
        pixelEnabled: true
      };

      const userSyncs = spec.getUserSyncs(syncOptions, [{ body: bidResponse }]);
      expect(userSyncs).to.deep.equal([
        {
          'url': 'mysyncurl.com/image?pbjs=1&coppa=0&qparam1=qparamv1&qparam2=qparamv2',
          'type': 'image'
        }
      ]);
    });

    it('will trigger user sync if enable iframe mode', () => {
      const syncOptions = {
        iframeEnabled: true
      };

      const userSyncs = spec.getUserSyncs(syncOptions, [{ body: bidResponse }]);
      expect(userSyncs).to.deep.equal([
        {
          'url': 'mysyncurl.com/iframe?pbjs=1&coppa=0&qparam1=qparamv1&qparam2=qparamv2',
          'type': 'iframe'
        }
      ]);
    });

    describe('no sync option', () => {
      it('will return image sync if no sync options', () => {
        const userSyncs = spec.getUserSyncs({}, [{ body: bidResponse }]);
        expect(userSyncs).to.deep.equal([
          {
            'url': 'mysyncurl.com/image?pbjs=1&coppa=0&qparam1=qparamv1&qparam2=qparamv2',
            'type': 'image'
          }
        ]);
      });
      it('will return empty value if no server response', () => {
        const userSyncs = spec.getUserSyncs({}, []);
        expect(userSyncs).to.have.lengthOf(0);
        const userSyncs2 = spec.getUserSyncs({}, null);
        expect(userSyncs2).to.have.lengthOf(0);
      });
    });

    it('will return empty value if no server response', () => {
      const syncOptions = {
        iframeEnabled: true
      };

      const userSyncs = spec.getUserSyncs(syncOptions, []);
      expect(userSyncs).to.have.lengthOf(0);
      const userSyncs2 = spec.getUserSyncs(syncOptions, null);
      expect(userSyncs2).to.have.lengthOf(0);
    });

    describe('onTimeout callback', () => {
      it('will always call server with sendBeacon available', () => {
        config.setConfig({
          contxtful: {customer: CUSTOMER, version: VERSION},
        });

        const beaconStub = sandbox.stub(ajax, 'sendBeacon').returns(true);
        const ajaxStub = sandbox.stub(ajax, 'ajax');
        expect(spec.onTimeout({'customData': 'customvalue'})).to.not.throw;
        expect(beaconStub.called).to.be.true;
        expect(ajaxStub.called).to.be.false;
      });

      it('will always call server with sendBeacon not available', () => {
        config.setConfig({
          contxtful: {customer: CUSTOMER, version: VERSION},
        });

        const ajaxStub = sandbox.stub(ajax, 'ajax');
        const beaconStub = sandbox.stub(ajax, 'sendBeacon').returns(false);
        expect(spec.onTimeout({'customData': 'customvalue'})).to.not.throw;
        expect(beaconStub.called).to.be.true;
        expect(beaconStub.returned(false)).to.be.true;
        expect(ajaxStub.calledOnce).to.be.true;
      });
    });

    describe('on onBidderError callback', () => {
      it('will always call server', () => {
        config.setConfig({
          contxtful: {customer: CUSTOMER, version: VERSION},
        });

        const ajaxStub = sandbox.stub(ajax, 'ajax');
        const beaconStub = sandbox.stub(ajax, 'sendBeacon').returns(false);
        spec.onBidderError({'customData': 'customvalue'});
        expect(ajaxStub.calledOnce).to.be.true;
        expect(beaconStub.returned(false)).to.be.true;
      });
    });

    describe('on onBidWon callback', () => {
      it('will always call server', () => {
        config.setConfig({
          contxtful: {customer: CUSTOMER, version: VERSION},
        });

        const ajaxStub = sandbox.stub(ajax, 'ajax');
        const beaconStub = sandbox.stub(ajax, 'sendBeacon').returns(false);
        spec.onBidWon({'customData': 'customvalue'});
        expect(ajaxStub.calledOnce).to.be.true;
        expect(beaconStub.returned(false)).to.be.true;
      });
    });

    describe('on onBidBillable callback', () => {
      it('will always call server when sampling rate is configured to be 1.0', () => {
        config.setConfig({
          contxtful: {customer: CUSTOMER, version: VERSION, sampling: {onBidBillable: 1.0}},
        });
        const ajaxStub = sandbox.stub(ajax, 'ajax');
        const beaconStub = sandbox.stub(ajax, 'sendBeacon').returns(false);
        spec.onBidBillable({'customData': 'customvalue'});
        expect(ajaxStub.calledOnce).to.be.true;
        expect(beaconStub.returned(false)).to.be.true;
      });
    });

    describe('on onAdRenderSucceeded callback', () => {
      it('will always call server when sampling rate is configured to be 1.0', () => {
        config.setConfig({
          contxtful: {customer: CUSTOMER, version: VERSION, sampling: {onAdRenderSucceeded: 1.0}},
        });
        const ajaxStub = sandbox.stub(ajax, 'ajax');
        const beaconStub = sandbox.stub(ajax, 'sendBeacon').returns(false);
        spec.onAdRenderSucceeded({'customData': 'customvalue'});
        expect(ajaxStub.calledOnce).to.be.true;
        expect(beaconStub.returned(false)).to.be.true;
      });
    });
  });
});
