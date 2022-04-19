import { expect } from 'chai';
import { spec } from 'modules/glimpseBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config';
import { BANNER } from '../../../src/mediaTypes';

const ENDPOINT = 'https://market.glimpsevault.io/public/v1/prebid';

const nonStringValues = [null, undefined, 123, true, {}, [], () => {}];
const nonArrayValues = [null, undefined, 123, true, {}, 'str', () => {}];

const mock = {
  bidRequest: {
    bidder: 'glimpse',
    bidId: '26a80b71cfd671',
    bidderRequestId: '133baeded6ac94',
    auctionId: '96692a73-307b-44b8-8e4f-ddfb40341570',
    adUnitCode: 'banner-div-a',
    sizes: [[300, 250]],
    params: {
      pid: 'glimpse-demo-300x250',
    },
  },
  bidderRequest: {
    bidderCode: 'glimpse',
    bidderRequestId: '133baeded6ac94',
    auctionId: '96692a73-307b-44b8-8e4f-ddfb40341570',
    timeout: 3000,
    gdprConsent: {
      consentString:
        'COzP517OzP517AcABBENAlCsAP_AAAAAAAwIF8NX-T5eL2vju2Zdt7JEaYwfZxyigOgThgQIsW8NwIeFbBoGP2EgHBG4JCQAGBAkkgCBAQMsHGBcCQAAgIgRiRKMYE2MjzNKBJJAigkbc0FACDVunsHS2ZCY70-8O__bPAviADAvUC-AAAAA.YAAAAAAAAAAA',
      vendorData: {},
      gdprApplies: true,
    },
    uspConsent: '1YYY',
    refererInfo: {
      numIframes: 0,
      reachedTop: true,
      referer: 'https://demo.glimpseprotocol.io/prebid/desktop',
      stack: ['https://demo.glimpseprotocol.io/prebid/desktop'],
    },
  },
  bidResponse: {
    auth: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJoZWxsbyI6IndvcmxkISJ9.1p6T0ORhJ6riLprhXBGdzRhG3Q1egM27uFhPGNapPxs',
    data: {
      bids: [
        {
          requestId: '133baeded6ac94',
          creativeId: 'glimpse-demo-300x250',
          adUnitCode: 'banner-div-a',
          currency: 'GBP',
          ad: '<div>Hello, World!</div>',
          width: 300,
          height: 250,
          cpm: 1.04,
          netRevenue: true,
          mediaType: 'banner',
          ttl: 300,
        },
      ],
    },
  },
};

const getBidRequest = () => getDeepCopy(mock.bidRequest);
const getBidderRequest = () => ({
  bids: [getBidRequest()],
  ...getDeepCopy(mock.bidderRequest),
});

const getBidResponse = () => ({
  body: getDeepCopy(mock.bidResponse),
});

function getDeepCopy(object) {
  return JSON.parse(JSON.stringify(object));
}

describe('GlimpseProtocolAdapter', () => {
  const glimpseAdapter = newBidder(spec);

  describe('spec', () => {
    it('Has defined the glimpse gvlid', () => {
      expect(spec.gvlid).to.equal(1012);
    });

    it('Has defined glimpse as the bidder', () => {
      expect(spec.code).to.equal('glimpse');
    });

    it('Has defined valid mediaTypes', () => {
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER]);
    });
  });

  describe('Inherited functions', () => {
    it('Functions exist and are valid types', () => {
      expect(glimpseAdapter.callBids).to.exist.and.to.be.a('function');
      expect(glimpseAdapter.getSpec).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('Returns true if placement id is non-empty string', () => {
      const bidRequest = getBidRequest();

      const isValidBidRequest = spec.isBidRequestValid(bidRequest);
      expect(isValidBidRequest).to.be.true;
    });

    it('Returns false if no pid is provided', () => {
      const bidRequest = getBidRequest();
      delete bidRequest.params.pid;

      const isValidBidRequest = spec.isBidRequestValid(bidRequest);
      expect(isValidBidRequest).to.be.false;
    });

    it('Returns false if pid is empty string', () => {
      const bidRequest = getBidRequest();
      bidRequest.params.pid = '';

      const isValidBidRequest = spec.isBidRequestValid(bidRequest);
      expect(isValidBidRequest).to.be.false;
    });

    it('Returns false if pid is not string', () => {
      const bidRequest = getBidRequest();
      const invalidPids = nonStringValues;

      invalidPids.forEach((invalidPid) => {
        bidRequest.params.pid = invalidPid;
        const isValidBidRequest = spec.isBidRequestValid(bidRequest);
        expect(isValidBidRequest).to.be.false;
      });
    });
  });

  describe('buildRequests', () => {
    const bidRequests = [getBidRequest()];
    const bidderRequest = getBidderRequest();

    it('Adds additional info to api request query', () => {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const url = new URL(request.url);
      const queries = new URLSearchParams(url.search);

      expect(queries.get('ver')).to.exist;
      expect(queries.get('tmax')).to.exist;
      expect(queries.get('gdpr')).to.equal(
        bidderRequest.gdprConsent.consentString
      );
      expect(queries.get('ccpa')).to.equal(bidderRequest.uspConsent);
    });

    it('Has correct payload shape', () => {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.auth).to.be.a('string');
      expect(payload.data).to.be.an('object');
      expect(payload.data.referer).to.be.a('string');
      expect(payload.data.imp).to.be.an('array');
      expect(payload.data.fpd).to.be.an('object');
    });

    it('Has referer information', () => {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      const expected = mock.bidderRequest.refererInfo.referer;

      expect(payload.data.referer).to.equal(expected);
    });

    it('Has correct bids (imp) shape', () => {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      const imp = payload.data.imp;

      imp.forEach((i) => {
        expect(i.bid).to.be.a('string');
        expect(i.pid).to.be.a('string');
        expect(i.sizes).to.be.an('array').that.deep.include([300, 250]);
      });
    });
  });

  describe('interpretResponse', () => {
    it('Returns valid bids', () => {
      const bidResponse = getBidResponse();
      const bids = spec.interpretResponse(bidResponse);

      expect(bids).to.have.lengthOf(1);
      expect(bids[0].adUnitCode).to.equal(mock.bidRequest.adUnitCode);
    });

    it('Returns no bids if auth is not string', () => {
      const bidResponse = getBidResponse();
      const invalidAuths = nonStringValues;

      invalidAuths.forEach((invalidAuth) => {
        bidResponse.body.auth = invalidAuth;

        const bids = spec.interpretResponse(bidResponse);
        expect(bids).to.have.lengthOf(0);
      });
    });

    it('Returns no bids if bids is empty', () => {
      const bidResponse = getBidResponse();
      bidResponse.body.data.bids = [];

      const bids = spec.interpretResponse(bidResponse);
      expect(bids).to.have.lengthOf(0);
    });

    it('Returns no bids if bids is not array', () => {
      const bidResponse = getBidResponse();
      const invalidBids = nonArrayValues;

      invalidBids.forEach((invalidBid) => {
        bidResponse.body.data.bids = invalidBid;

        const bids = spec.interpretResponse(bidResponse);
        expect(bids).to.have.lengthOf(0);
      });
    });

    it('Contains advertiserDomains', () => {
      const bidResponse = getBidResponse();

      const bids = spec.interpretResponse(bidResponse);
      bids.forEach((bid) => {
        expect(bid.meta.advertiserDomains).to.be.an('array');
      });
    });
  });

  describe('optimize request fpd data', () => {
    const bidRequests = [getBidRequest()];
    const bidderRequest = getBidderRequest();

    const fpdMockBase = {
      site: {
        keywords: 'site,keywords',
        ext: {
          data: {
            fpdProvider: {
              dataArray: ['data1', 'data2'],
              dataObject: {
                data1: 'data1',
                data2: 'data2',
              },
              dataString: 'data1,data2',
            },
          },
        },
      },
      user: {
        keywords: 'user,keywords',
        ext: {
          data: {
            fpdProvider: {
              dataArray: ['data1', 'data2'],
              dataObject: {
                data1: 'data1',
                data2: 'data2',
              },
              dataString: 'data1,data2',
            },
          },
        },
      },
    };

    afterEach(() => {
      config.getConfig.restore();
    });

    it('should keep all non-empty fields', () => {
      const fpdMock = fpdMockBase;
      sinon.stub(config, 'getConfig').withArgs('ortb2').returns(fpdMock);
      const expected = fpdMockBase;

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      const fpd = payload.data.fpd;

      expect(fpd).to.deep.equal(expected);
    });

    it('should remove all empty objects', () => {
      const fpdMock = getDeepCopy(fpdMockBase);
      fpdMock.site.ext.data.fpdProvider.dataObject = {};
      fpdMock.user.ext.data.fpdProvider = {};
      sinon.stub(config, 'getConfig').withArgs('ortb2').returns(fpdMock);

      const expected = {
        site: {
          keywords: 'site,keywords',
          ext: {
            data: {
              fpdProvider: {
                dataArray: ['data1', 'data2'],
                dataString: 'data1,data2',
              },
            },
          },
        },
        user: {
          keywords: 'user,keywords',
        },
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      const fpd = payload.data.fpd;

      expect(fpd).to.deep.equal(expected);
    });

    it('should remove all empty arrays', () => {
      const fpdMock = getDeepCopy(fpdMockBase);
      fpdMock.site.ext.data.fpdProvider.dataArray = [];
      fpdMock.user.ext.data.fpdProvider.dataArray = [];
      sinon.stub(config, 'getConfig').withArgs('ortb2').returns(fpdMock);

      const expected = {
        site: {
          keywords: 'site,keywords',
          ext: {
            data: {
              fpdProvider: {
                dataObject: {
                  data1: 'data1',
                  data2: 'data2',
                },
                dataString: 'data1,data2',
              },
            },
          },
        },
        user: {
          keywords: 'user,keywords',
          ext: {
            data: {
              fpdProvider: {
                dataObject: {
                  data1: 'data1',
                  data2: 'data2',
                },
                dataString: 'data1,data2',
              },
            },
          },
        },
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      const fpd = payload.data.fpd;

      expect(fpd).to.deep.equal(expected);
    });

    it('should remove all empty strings', () => {
      const fpdMock = getDeepCopy(fpdMockBase);
      fpdMock.site.keywords = '';
      fpdMock.site.ext.data.fpdProvider.dataString = '';
      fpdMock.user.keywords = '';
      fpdMock.user.ext.data.fpdProvider.dataString = '';
      sinon.stub(config, 'getConfig').withArgs('ortb2').returns(fpdMock);

      const expected = {
        site: {
          ext: {
            data: {
              fpdProvider: {
                dataArray: ['data1', 'data2'],
                dataObject: {
                  data1: 'data1',
                  data2: 'data2',
                },
              },
            },
          },
        },
        user: {
          ext: {
            data: {
              fpdProvider: {
                dataArray: ['data1', 'data2'],
                dataObject: {
                  data1: 'data1',
                  data2: 'data2',
                },
              },
            },
          },
        },
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      const fpd = payload.data.fpd;

      expect(fpd).to.deep.equal(expected);
    });

    it('should remove all empty fields', () => {
      const fpdMock = getDeepCopy(fpdMockBase);
      fpdMock.site.keywords = '';
      fpdMock.site.ext.data.fpdProvider.dataArray = [];
      fpdMock.site.ext.data.fpdProvider.dataObject = {};
      fpdMock.site.ext.data.fpdProvider.dataString = '';
      fpdMock.user.keywords = '';
      fpdMock.user.ext.data.fpdProvider.dataArray = [];
      fpdMock.user.ext.data.fpdProvider.dataObject = {};
      fpdMock.user.ext.data.fpdProvider.dataString = '';
      sinon.stub(config, 'getConfig').withArgs('ortb2').returns(fpdMock);

      const expected = {};

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      const fpd = payload.data.fpd;

      expect(fpd).to.deep.equal(expected);
    });
  });
});
