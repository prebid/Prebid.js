import {expect} from 'chai';
import {
  AK_PBJS_VERSION,
  AK_BASE_URL,
  AK_BASE_URL_STAGING,
  akDebug,
  akEnv,
  akOverrides,
  akUrl,
  conformBidRequest,
  DEFAULT_ENV,
  ENDPOINT_PATH,
  endpointUrl,
  PRODUCTION,
  spec,
  STAGING,
  USER_SYNC_IFRAME_URL_PATH,
  USER_SYNC_IMAGE_URL_PATH,
  userSyncIframeUrl,
  userSyncImageUrl,
} from 'modules/adikteevBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';
import {config} from '../../../src/config';

const cannedValidBidRequests = [{
  adUnitCode: '/19968336/header-bid-tag-1',
  auctionId: 'fcbf2b27-a951-496f-b5bb-1324ce7c0558',
  bidId: '2b8de6572e8193',
  bidRequestsCount: 1,
  bidder: 'adikteev',
  bidderRequestId: '1203b39fecc6a5',
  crumbs: {pubcid: 'f3371d16-4e8b-42b5-a770-7e5be1fdf03d'},
  params: {adSpaceId: 5084},
  sizes: [[300, 250], [250, 300], [300, 600]],
  transactionId: '58dbd732-7a39-45f1-b23e-1c24051a941c',
}];
const cannedBidderRequest = {
  auctionId: 'fcbf2b27-a951-496f-b5bb-1324ce7c0558',
  auctionStart: 1544200122837,
  bidderCode: 'adikteev',
  bidderRequestId: '1203b39fecc6a5',
  doneCbCallCount: 0,
  refererInfo: {
    canonicalUrl: undefined,
    numIframes: 0,
    reachedTop: true,
    referer: 'http://localhost:9999/integrationExamples/gpt/hello_world_adikteev.html',
    stack: ['http://localhost:9999/integrationExamples/gpt/hello_world_adikteev.html']
  },
  start: 1544200012839,
  timeout: 3000
};
const serverResponse =
  {
    body: [
      {
        requestId: cannedValidBidRequests[0].bidId,
        cpm: 1,
        width: cannedValidBidRequests[0].sizes[0][0],
        height: cannedValidBidRequests[0].sizes[0][1],
        ad: '<div><script src="https://some.sources"></script></div>',
        ttl: 360,
        creativeId: 123,
        netRevenue: false,
        currency: 'EUR',
      }
    ]
  };

describe('adikteevBidAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('conformBidRequest', () => {
    it('returns a bid-request', () => {
      expect(conformBidRequest(cannedValidBidRequests[0])).to.deep.equal({
        params: cannedValidBidRequests[0].params,
        crumbs: cannedValidBidRequests[0].crumbs,
        sizes: cannedValidBidRequests[0].sizes,
        bidId: cannedValidBidRequests[0].bidId,
        bidderRequestId: cannedValidBidRequests[0].bidderRequestId,
      });
    })
  });

  describe('akDebug', () => expect(akDebug(null, null)).to.deep.equal(false));
  describe('akDebug', () => expect(akDebug(null, true)).to.deep.equal(true));
  describe('akDebug', () => expect(akDebug(JSON.stringify(true), null)).to.deep.equal(true));

  describe('akEnv', () => expect(akEnv(null, null)).to.deep.equal(DEFAULT_ENV));
  describe('akEnv', () => expect(akEnv(null, 'staging')).to.deep.equal(STAGING));
  describe('akEnv', () => expect(akEnv('staging', null)).to.deep.equal(STAGING));

  describe('akOverrides', () => expect(akOverrides(null, null)).to.deep.equal({}));
  describe('akOverrides', () => expect(akOverrides(JSON.stringify({a: 1}), null)).to.deep.equal({a: 1}));
  describe('akOverrides', () => expect(akOverrides('incorrect', null)).to.deep.equal({})); // expect no exception
  describe('akOverrides', () => expect(akOverrides(null, {a: 1})).to.deep.equal({a: 1}));

  describe('akUrl', () => expect(akUrl(null)).to.deep.equal(AK_BASE_URL));
  describe('akUrl', () => expect(akUrl('anything')).to.deep.equal(AK_BASE_URL));
  describe('akUrl', () => expect(akUrl('staging')).to.deep.equal(AK_BASE_URL_STAGING));
  describe('akUrl', () => expect(akUrl('production')).to.deep.equal(AK_BASE_URL));

  describe('endpointUrl', () => expect(endpointUrl(null, null)).to.deep.equal(AK_BASE_URL.concat(ENDPOINT_PATH)));
  describe('endpointUrl', () => expect(endpointUrl(null, 'staging')).to.deep.equal(AK_BASE_URL_STAGING.concat(ENDPOINT_PATH)));
  describe('endpointUrl', () => expect(endpointUrl('staging', null)).to.deep.equal(AK_BASE_URL_STAGING.concat(ENDPOINT_PATH)));

  describe('userSyncIframeUrl', () => expect(userSyncIframeUrl(null, null)).to.deep.equal(AK_BASE_URL.concat(USER_SYNC_IFRAME_URL_PATH)));
  describe('userSyncIframeUrl', () => expect(userSyncIframeUrl(null, 'staging')).to.deep.equal(AK_BASE_URL_STAGING.concat(USER_SYNC_IFRAME_URL_PATH)));
  describe('userSyncIframeUrl', () => expect(userSyncIframeUrl('staging', null)).to.deep.equal(AK_BASE_URL_STAGING.concat(USER_SYNC_IFRAME_URL_PATH)));

  describe('userSyncImageUrl', () => expect(userSyncImageUrl(null, null)).to.deep.equal(AK_BASE_URL.concat(USER_SYNC_IMAGE_URL_PATH)));
  describe('userSyncImageUrl', () => expect(userSyncImageUrl(null, 'staging')).to.deep.equal(AK_BASE_URL_STAGING.concat(USER_SYNC_IMAGE_URL_PATH)));
  describe('userSyncImageUrl', () => expect(userSyncImageUrl('staging', null)).to.deep.equal(AK_BASE_URL_STAGING.concat(USER_SYNC_IMAGE_URL_PATH)));

  describe('isBidRequestValid', () => {
    it('should return true when required params found', () => {
      const validBid = {
        bidder: 'adikteev',
        params: {
          adSpaceId: 12345,
        },
        mediaTypes: {
          banner: {
            sizes: [[750, 200]]
          }
        },
      };
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should return false when required params are invalid', () => {
      expect(spec.isBidRequestValid({
        bidder: '', // invalid bidder
        params: {
          adSpaceId: 12345,
        },
        mediaTypes: {
          banner: {
            sizes: [[750, 200]]
          }
        },
      })).to.equal(false);
      expect(spec.isBidRequestValid({
        bidder: 'adikteev',
        params: {
          adSpaceId: '', // invalid adSpaceId
        },
        mediaTypes: {
          banner: {
            sizes: [[750, 200]]
          }
        },
      })).to.equal(false);
      expect(spec.isBidRequestValid({
        bidder: 'adikteev',
        params: {
          adSpaceId: 12345,
        },
        mediaTypes: {
          banner: {
            sizes: [[750]] // invalid size
          }
        },
      })).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    const
      currency = 'EUR',
      akEnv = 'staging',
      akDebug = true,
      akOverrides = {
        iAmOverride: 'iAmOverride'
      };
    config.setConfig({
      currency,
      akEnv,
      akDebug,
      akOverrides
    });

    const request = spec.buildRequests(cannedValidBidRequests, cannedBidderRequest);

    it('creates a request object with correct method, url and data', () => {
      expect(request).to.exist.and.have.all.keys(
        'method',
        'url',
        'data',
      );
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(endpointUrl('staging', 'staging'));

      let requestData = JSON.parse(request.data);
      expect(requestData).to.exist.and.have.all.keys(
        'akPbjsVersion',
        'bidRequests',
        'currency',
        'debug',
        'iAmOverride',
        'language',
        'refererInfo',
        'deviceInfo',
        'userAgent',
      );

      expect(requestData.bidRequests[0]).to.exist.and.have.all.keys(
        'params',
        'crumbs',
        'sizes',
        'bidId',
        'bidderRequestId',
      );

      expect(requestData.akPbjsVersion).to.deep.equal(AK_PBJS_VERSION);
      expect(requestData.bidRequests[0].params).to.deep.equal(cannedValidBidRequests[0].params);
      expect(requestData.bidRequests[0].crumbs).to.deep.equal(cannedValidBidRequests[0].crumbs);
      expect(requestData.bidRequests[0].mediaTypes).to.deep.equal(cannedValidBidRequests[0].mediaTypes);
      expect(requestData.bidRequests[0].bidId).to.deep.equal(cannedValidBidRequests[0].bidId);
      expect(requestData.bidRequests[0].bidderRequestId).to.deep.equal(cannedValidBidRequests[0].bidderRequestId);
      expect(requestData.currency).to.deep.equal(currency);
      expect(requestData.debug).to.deep.equal(akDebug);
      expect(requestData.iAmOverride).to.deep.equal('iAmOverride');
      expect(requestData.language).to.deep.equal(navigator.language);
      expect(requestData.deviceInfo).to.exist.and.have.all.keys(
        'browserWidth',
        'browserHeight',
        'deviceWidth',
        'deviceHeight',
        'documentWidth',
        'documentHeight',
        'webGL',
      );
      expect(requestData.userAgent).to.deep.equal(navigator.userAgent);
    });
  });

  describe('interpretResponse', () => {
    it('bid objects from response', () => {
      const bidResponses = spec.interpretResponse(serverResponse);
      expect(bidResponses).to.be.an('array').that.is.not.empty; // yes, syntax is correct
      expect(bidResponses[0]).to.have.all.keys(
        'requestId',
        'cpm',
        'width',
        'height',
        'ad',
        'ttl',
        'creativeId',
        'netRevenue',
        'currency',
      );

      expect(bidResponses[0].requestId).to.equal(cannedValidBidRequests[0].bidId);
      expect(bidResponses[0].cpm).to.equal(serverResponse.body[0].cpm);
      expect(bidResponses[0].width).to.equal(serverResponse.body[0].width);
      expect(bidResponses[0].height).to.equal(serverResponse.body[0].height);
      expect(bidResponses[0].ad).to.equal(serverResponse.body[0].ad);
      expect(bidResponses[0].ttl).to.equal(serverResponse.body[0].ttl);
      expect(bidResponses[0].creativeId).to.equal(serverResponse.body[0].creativeId);
      expect(bidResponses[0].netRevenue).to.equal(serverResponse.body[0].netRevenue);
      expect(bidResponses[0].currency).to.equal(serverResponse.body[0].currency);
    });
  });

  describe('getUserSyncs', () => {
    config.setConfig({akEnv: PRODUCTION});
    expect(spec.getUserSyncs({
      iframeEnabled: true
    }, [{}])).to.deep.equal([{
      type: 'iframe',
      url: AK_BASE_URL.concat(USER_SYNC_IFRAME_URL_PATH)
    }]);

    expect(spec.getUserSyncs({
      pixelEnabled: true
    }, [{}])).to.deep.equal([{
      type: 'image',
      url: AK_BASE_URL.concat(USER_SYNC_IMAGE_URL_PATH)
    }]);

    expect(spec.getUserSyncs({
      iframeEnabled: true,
      pixelEnabled: true
    }, [{}])).to.deep.equal([{
      type: 'iframe',
      url: AK_BASE_URL.concat(USER_SYNC_IFRAME_URL_PATH)
    }, {
      type: 'image',
      url: AK_BASE_URL.concat(USER_SYNC_IMAGE_URL_PATH)
    }]);
  });
});
