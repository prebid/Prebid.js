import {expect} from 'chai';
import * as utils from 'src/utils';
import {spec} from 'modules/lifestreetBidAdapter';
import {config} from 'src/config';

let getDefaultBidRequest = () => {
  return {
    bidderCode: 'lifestreet',
    auctionId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
    bidderRequestId: '7101db09af0dg2',
    start: new Date().getTime(),
    bids: [{
      bidder: 'lifestreet',
      bidId: '84ab500420329d',
      bidderRequestId: '7101db09af0dg2',
      auctionId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
      placementCode: 'foo',
      params: getBidParams()
    }]
  };
};

let getVASTAd = () => {
  return `<VAST version="3.0">
    <Ad>
      <Wrapper>
        <AdSystem>Lifestreet wrapper</AdSystem>
        <VASTAdTagURI><![CDATA[https//lifestreet.com]]></VASTAdTagURI>
        <Impression></Impression>
        <Creatives></Creatives>
      </Wrapper>
    </Ad>
  </VAST>`;
};

let getBidParams = () => {
  return {
    slot: 'slot166704',
    adkey: '78c',
    ad_size: '160x600'
  };
};

let getDefaultBidResponse = (isBanner, noBid = 0) => {
  let noBidContent = isBanner ? '{"advertisementAvailable": false}' : '<VAST version="2.0"></VAST>';
  let content = isBanner ? '<script>logConsole(\'hello\')</script>' : getVASTAd();
  return {
    status: noBid ? 0 : 1,
    cpm: 1.0,
    width: 160,
    height: 600,
    creativeId: 'test',
    dealId: 'test',
    content: noBid ? noBidContent : content,
    content_type: isBanner ? 'display' : 'vast_2_0'
  };
};

describe('LifestreetAdapter', function () {
  const LIFESTREET_URL = 'https://ads.lfstmedia.com/gate/';
  const ADAPTER_VERSION = 'prebidJS-2.0';

  describe('buildRequests()', function () {
    it('method exists and is a function', function () {
      expect(spec.buildRequests).to.exist.and.to.be.a('function');
    });

    it('should not return request when no bids are present', function () {
      let [request] = spec.buildRequests([]);
      expect(request).to.be.undefined;
    });

    let bidRequest = getDefaultBidRequest();
    let [request] = spec.buildRequests(bidRequest.bids);
    it('should return request for Lifestreet endpoint', function () {
      expect(request.url).to.contain(LIFESTREET_URL);
    });

    it('should use json adapter', function () {
      expect(request.url).to.contain('/prebid/');
    });

    it('should contain slot', function () {
      expect(request.url).to.contain('slot166704');
    });
    it('should contain adkey', function () {
      expect(request.url).to.contain('adkey=78c');
    });
    it('should contain ad_size', function () {
      expect(request.url).to.contain('ad_size=160x600');
    });

    it('should contain location and rferrer paramters', function () {
      expect(request.url).to.contain('__location=');
      expect(request.url).to.contain('__referrer=');
    });
    it('should contain info parameters', function () {
      expect(request.url).to.contain('__wn=');
      expect(request.url).to.contain('__sf=');
      expect(request.url).to.contain('__fif=');
      expect(request.url).to.contain('__if=');
      expect(request.url).to.contain('__stamp=');
      expect(request.url).to.contain('__pp=');
    });

    it('should contain HB enabled', function () {
      expect(request.url).to.contain('__hb=1');
    });
    it('should include gzip', function () {
      expect(request.url).to.contain('__gz=1');
    });
    it('should not contain __gdpr parameter', function () {
      expect(request.url).to.not.contain('__gdpr');
    });
    it('should not contain __concent parameter', function () {
      expect(request.url).to.not.contain('__consent');
    });

    it('should contain the right version of adapter', function () {
      expect(request.url).to.contain('__hbver=' + ADAPTER_VERSION);
    });

    it('should contain __gdpr and __consent parameters', function () {
      const options = {
        gdprConsent: {
          gdprApplies: true,
          consentString: 'test',
          vendorData: {}
        }
      };
      let [request] = spec.buildRequests(bidRequest.bids, options);
      expect(request.url).to.contain('__gdpr=1');
      expect(request.url).to.contain('__consent=test');
    });
    it('should contain __gdpr parameters', function () {
      const options = {
        gdprConsent: {
          gdprApplies: true,
          vendorData: {}
        }
      };
      let [request] = spec.buildRequests(bidRequest.bids, options);
      expect(request.url).to.contain('__gdpr=1');
      expect(request.url).to.not.contain('__consent');
    });
    it('should contain __consent parameters', function () {
      const options = {
        gdprConsent: {
          consentString: 'test',
          vendorData: {}
        }
      };
      let [request] = spec.buildRequests(bidRequest.bids, options);
      expect(request.url).to.not.contain('__gdpr');
      expect(request.url).to.contain('__consent=test');
    });
  });
  describe('interpretResponse()', function () {
    it('should return formatted bid response with required properties', function () {
      let bidRequest = getDefaultBidRequest().bids[0];
      let bidResponse = { body: getDefaultBidResponse(true) };
      let formattedBidResponse = spec.interpretResponse(bidResponse, bidRequest);
      expect(formattedBidResponse).to.deep.equal([{
        requestId: bidRequest.bidId,
        cpm: 1.0,
        width: 160,
        height: 600,
        ad: '<script>logConsole(\'hello\')</script>',
        creativeId: 'test',
        currency: 'USD',
        dealId: 'test',
        netRevenue: true,
        ttl: 86400,
        mediaType: 'banner'
      }]);
    });
    it('should return formatted VAST bid response with required properties', function () {
      let bidRequest = getDefaultBidRequest().bids[0];
      let bidResponse = { body: getDefaultBidResponse(false) };
      let formattedBidResponse = spec.interpretResponse(bidResponse, bidRequest);
      expect(formattedBidResponse).to.deep.equal([{
        requestId: bidRequest.bidId,
        cpm: 1.0,
        width: 160,
        height: 600,
        vastXml: getVASTAd(),
        creativeId: 'test',
        currency: 'USD',
        dealId: 'test',
        netRevenue: true,
        ttl: 86400,
        mediaType: 'video'
      }]);
    });
    it('should return formatted VAST bid response with vastUrl', function () {
      let bidRequest = getDefaultBidRequest().bids[0];
      let bidResponse = { body: getDefaultBidResponse(false) };
      bidResponse.body.vastUrl = 'https://lifestreet.com'; // set vastUrl
      let formattedBidResponse = spec.interpretResponse(bidResponse, bidRequest);
      expect(formattedBidResponse).to.deep.equal([{
        requestId: bidRequest.bidId,
        cpm: 1.0,
        width: 160,
        height: 600,
        vastUrl: 'https://lifestreet.com',
        creativeId: 'test',
        currency: 'USD',
        dealId: 'test',
        netRevenue: true,
        ttl: 86400,
        mediaType: 'video'
      }]);
    });

    it('should return no-bid', function () {
      let bidRequest = getDefaultBidRequest().bids[0];
      let bidResponse = { body: getDefaultBidResponse(true, true) };
      let formattedBidResponse = spec.interpretResponse(bidResponse, bidRequest);
      expect(formattedBidResponse).to.be.empty;
    });
  });
});
