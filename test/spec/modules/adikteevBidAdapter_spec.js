import {expect} from 'chai';
import {
  ENDPOINT_URL,
  ENDPOINT_URL_STAGING,
  setstagingEnvironmentSwitch,
  spec,
  stagingEnvironmentSwitch,
  USER_SYNC_IFRAME_URL,
  USER_SYNC_IFRAME_URL_STAGING,
  USER_SYNC_IMAGE_URL,
  USER_SYNC_IMAGE_URL_STAGING,
} from 'modules/adikteevBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';
import * as utils from '../../../src/utils';

describe('adikteevBidAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
    it('exists and is a function', () => {
      expect(setstagingEnvironmentSwitch).to.exist.and.to.be.a('function');
    });
    it('exists and is correctly set', () => {
      expect(stagingEnvironmentSwitch).to.exist.and.to.equal(false);
    });
  });

  describe('isBidRequestValid', () => {
    it('should return true when required params found', () => {
      const validBid = {
        bidder: 'adikteev',
        params: {
          placementId: 12345,
          bidFloorPrice: 0.1,
        },
        mediaTypes: {
          banner: {
            sizes: [[750, 200]]
          }
        },
      };
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should mutate stagingEnvironmentSwitch when required params found', () => {
      const withstagingEnvironmentSwitch = {
        params: {
          stagingEnvironment: true,
        },
      };
      spec.isBidRequestValid(withstagingEnvironmentSwitch);
      expect(stagingEnvironmentSwitch).to.equal(true);
      setstagingEnvironmentSwitch(false);
    });

    it('should return false when required params are invalid', () => {
      expect(spec.isBidRequestValid({
        bidder: '', // invalid bidder
        params: {
          placementId: 12345,
          bidFloorPrice: 0.1,
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
          placementId: '', // invalid placementId
          bidFloorPrice: 0.1,
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
          placementId: 12345,
          bidFloorPrice: 0.1,
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
    const validBidRequests = [];
    const bidderRequest = {};
    const serverRequest = spec.buildRequests(validBidRequests, bidderRequest);
    it('creates a request object with correct method, url and data', () => {
      expect(serverRequest).to.exist.and.have.all.keys(
        'method',
        'url',
        'data',
      );
      expect(serverRequest.method).to.equal('POST');
      expect(serverRequest.url).to.equal(ENDPOINT_URL);

      let requestData = JSON.parse(serverRequest.data);
      expect(requestData).to.exist.and.have.all.keys(
        'validBidRequests',
        'bidderRequest',
        'userAgent',
        'screen',
        'language',
        'cookies',
        // 'refererInfo',
        // 'currency',
        'prebidUpdateVersion',
      );
      expect(requestData.validBidRequests).to.deep.equal(validBidRequests);
      expect(requestData.bidderRequest).to.deep.equal(bidderRequest);
      expect(requestData.userAgent).to.deep.equal(navigator.userAgent);
      expect(requestData.screen.width).to.deep.equal(window.screen.width);
      expect(requestData.screen.height).to.deep.equal(window.screen.height);
      expect(requestData.language).to.deep.equal(navigator.language);
      expect(requestData.prebidUpdateVersion).to.deep.equal('1.29.0');
    });

    describe('staging environment', () => {
      setstagingEnvironmentSwitch(true);
      const serverRequest = spec.buildRequests(validBidRequests, bidderRequest);
      expect(serverRequest.url).to.equal(ENDPOINT_URL_STAGING);
      setstagingEnvironmentSwitch(false);
    });
  });

  describe('interpretResponse', () => {
    it('bid objects from response', () => {
      const serverResponse =
        {
          body: [
            {
              cpm: 1,
              width: 300,
              height: 250,
              ad: '<div><script>var AK_CLICK_URL=\"http://www.bosch.com\";</script><script src=\"https://cdn-ww.adikteev.com/creatives/b4d4164d8f804d0ca6a4afa9cb3048fb.js\"></script></div>',
              ttl: 360,
              creativeId: 123,
              netRevenue: false,
              currency: 'EUR',
            }
          ]
        };
      const payload = {
        validBidRequests: [{
          bidId: '2ef7bb021ac847'
        }],
      };
      const bidRequests = {
        method: 'POST',
        url: stagingEnvironmentSwitch ? ENDPOINT_URL_STAGING : ENDPOINT_URL,
        data: JSON.stringify(payload),
      };
      const bidResponses = spec.interpretResponse(serverResponse, bidRequests);
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

      expect(bidResponses[0].requestId).to.equal(payload.validBidRequests[0].bidId);
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
    expect(spec.getUserSyncs({
      iframeEnabled: true
    }, [{}])).to.deep.equal([{
      type: 'iframe',
      url: USER_SYNC_IFRAME_URL
    }]);

    expect(spec.getUserSyncs({
      pixelEnabled: true
    }, [{}])).to.deep.equal([{
      type: 'image',
      url: USER_SYNC_IMAGE_URL
    }]);

    expect(spec.getUserSyncs({
      iframeEnabled: true,
      pixelEnabled: true
    }, [{}])).to.deep.equal([{
      type: 'iframe',
      url: USER_SYNC_IFRAME_URL
    }, {
      type: 'image',
      url: USER_SYNC_IMAGE_URL
    }]);

    describe('staging environment', () => {
      setstagingEnvironmentSwitch(true);
      expect(spec.getUserSyncs({
        iframeEnabled: true,
        pixelEnabled: true
      }, [{}])).to.deep.equal([{
        type: 'iframe',
        url: USER_SYNC_IFRAME_URL_STAGING
      }, {
        type: 'image',
        url: USER_SYNC_IMAGE_URL_STAGING
      }]);
      setstagingEnvironmentSwitch(false);
    });
  });
});
