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
        <VASTAdTagURI><![CDATA[http://lifestreet.com]]></VASTAdTagURI>
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

describe('LifestreetAdapter', () => {
  const LIFESTREET_URL = '//ads.lfstmedia.com/gate/';
  const ADAPTER_VERSION = 'prebidJS-2.0';

  describe('buildRequests()', () => {
    it('method exists and is a function', () => {
      expect(spec.buildRequests).to.exist.and.to.be.a('function');
    });

    it('should not return request when no bids are present', () => {
      let [request] = spec.buildRequests([]);
      expect(request).to.be.empty;
    });

    let bidRequest = getDefaultBidRequest();
    let [request] = spec.buildRequests(bidRequest.bids);
    it('should return request for Lifestreet endpoint', () => {
      expect(request.url).to.contain(LIFESTREET_URL);
    });

    it('should use json adapter', () => {
      expect(request.url).to.contain('/prebid/');
    });

    it('should contain slot', () => {
      expect(request.url).to.contain('slot166704');
    });
    it('should contain adkey', () => {
      expect(request.url).to.contain('adkey=78c');
    });
    it('should contain ad_size', () => {
      expect(request.url).to.contain('ad_size=160x600');
    });

    it('should contain location and rferrer paramters', () => {
      expect(request.url).to.contain('__location=');
      expect(request.url).to.contain('__referrer=');
    });
    it('should contain info parameters', () => {
      expect(request.url).to.contain('__wn=');
      expect(request.url).to.contain('__sf=');
      expect(request.url).to.contain('__fif=');
      expect(request.url).to.contain('__if=');
      expect(request.url).to.contain('__stamp=');
      expect(request.url).to.contain('__pp=');
    });

    it('should contain HB enabled', () => {
      expect(request.url).to.contain('__hb=1');
    });
    it('should include gzip', () => {
      expect(request.url).to.contain('__gz=1');
    });

    it('should contain the right version of adapter', () => {
      expect(request.url).to.contain('__hbver=' + ADAPTER_VERSION);
    });
  });
  describe('interpretResponse()', () => {
    it('should return formatted bid response with required properties', () => {
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
    it('should return formatted VAST bid response with required properties', () => {
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
    it('should return formatted VAST bid response with vastUrl', () => {
      let bidRequest = getDefaultBidRequest().bids[0];
      let bidResponse = { body: getDefaultBidResponse(false) };
      bidResponse.body.vastUrl = 'http://lifestreet.com'; // set vastUrl
      let formattedBidResponse = spec.interpretResponse(bidResponse, bidRequest);
      expect(formattedBidResponse).to.deep.equal([{
        requestId: bidRequest.bidId,
        cpm: 1.0,
        width: 160,
        height: 600,
        vastUrl: 'http://lifestreet.com',
        creativeId: 'test',
        currency: 'USD',
        dealId: 'test',
        netRevenue: true,
        ttl: 86400,
        mediaType: 'video'
      }]);
    });

    it('should return no-bid', () => {
      let bidRequest = getDefaultBidRequest().bids[0];
      let bidResponse = { body: getDefaultBidResponse(true, true) };
      let formattedBidResponse = spec.interpretResponse(bidResponse, bidRequest);
      expect(formattedBidResponse).to.be.empty;
    });
  });
});
