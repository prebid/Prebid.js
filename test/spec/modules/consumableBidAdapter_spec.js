import {expect} from 'chai';
import * as utils from 'src/utils';
import {spec} from 'modules/consumableBidAdapter';
import {config} from 'src/config';

const DEFAULT_OAD_CONTENT = '<script>logInfo(\'ad\');</script>';
const DEFAULT_AD_CONTENT = '<script type=\'text/javascript\'>document.write(\'<div id="unitname-987654">\');</script><script>logInfo(\'ad\');</script><script type=\'text/javascript\'>document.write(\'</div>\');</script><script type=\'text/javascript\'>document.write(\'<div class="unitname"></div>\');</script><script type=\'text/javascript\'>document.write(\'<scr\'+\'ipt type="text/javascript" src="https://yummy.consumable.com/987654/unitname/widget/unit.js?cb=7654321" charset="utf-8" async></scr\'+\'ipt>\');</script>'

let getDefaultBidResponse = () => {
  return {
    id: '245730051428950632',
    cur: 'USD',
    seatbid: [{
      bid: [{
        id: 1,
        impid: '245730051428950632',
        price: 0.09,
        adm: DEFAULT_OAD_CONTENT,
        crid: 'creative-id',
        h: 90,
        w: 728,
        dealid: 'deal-id',
        ext: {sizeid: 225}
      }]
    }]
  };
};

let getBidParams = () => {
  return {
    placement: 1234567,
    network: '9599.1',
    unitId: '987654',
    unitName: 'unitname',
    zoneId: '9599.1'
  };
};

let getDefaultBidRequest = () => {
  return {
    bidderCode: 'consumable',
    auctionId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
    bidderRequestId: '7101db09af0db2',
    start: new Date().getTime(),
    bids: [{
      bidder: 'consumable',
      bidId: '84ab500420319d',
      bidderRequestId: '7101db09af0db2',
      auctionId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
      placementCode: 'foo',
      params: getBidParams()
    }]
  };
};

let getPixels = () => {
  return '<script>document.write(\'<img src="img.org"></iframe>' +
    '<iframe src="pixels1.org"></iframe>\');</script>';
};

describe('ConsumableAdapter', () => {
  const CONSUMABLE_URL = '//adserver-us.adtech.advertising.com/pubapi/3.0/';
  const CONSUMABLE_TTL = 60;

  function createCustomBidRequest({bids, params} = {}) {
    var bidderRequest = getDefaultBidRequest();
    if (bids && Array.isArray(bids)) {
      bidderRequest.bids = bids;
    }
    if (params) {
      bidderRequest.bids.forEach(bid => bid.params = params);
    }
    return bidderRequest;
  }

  describe('interpretResponse()', () => {
    let bidderSettingsBackup;
    let bidResponse;
    let bidRequest;
    let logWarnSpy;

    beforeEach(() => {
      bidderSettingsBackup = $$PREBID_GLOBAL$$.bidderSettings;
      bidRequest = {
        bidderCode: 'test-bidder-code',
        bidId: 'bid-id',
        unitName: 'unitname',
        unitId: '987654',
        zoneId: '9599.1',
        network: '9599.1'
      };
      bidResponse = {
        body: getDefaultBidResponse()
      };
      logWarnSpy = sinon.spy(utils, 'logWarn');
    });

    afterEach(() => {
      $$PREBID_GLOBAL$$.bidderSettings = bidderSettingsBackup;
      logWarnSpy.restore();
    });

    it('should return formatted bid response with required properties', () => {
      let formattedBidResponse = spec.interpretResponse(bidResponse, bidRequest);
      expect(formattedBidResponse).to.deep.equal({
        bidderCode: bidRequest.bidderCode,
        requestId: 'bid-id',
        ad: DEFAULT_AD_CONTENT,
        cpm: 0.09,
        width: 728,
        height: 90,
        creativeId: 'creative-id',
        pubapiId: '245730051428950632',
        currency: 'USD',
        dealId: 'deal-id',
        netRevenue: true,
        ttl: 60
      });
    });

    it('should add formatted pixels to ad content when pixels are present in the response', () => {
      bidResponse.body.ext = {
        pixels: 'pixels-content'
      };

      let formattedBidResponse = spec.interpretResponse(bidResponse, bidRequest);

      expect(formattedBidResponse.ad).to.equal(DEFAULT_AD_CONTENT + '<script>var w=window,prebid;for(var i=0;i<10;i++){w = w.parent;prebid=w.pbjs;if(prebid && prebid.consumableGlobals && !prebid.consumableGlobals.pixelsDropped){try{prebid.consumableGlobals.pixelsDropped=true;pixels-contentbreak;}catch(e){continue;}}}</script>');
      return true;
    });
  });

  describe('buildRequests()', () => {
    it('method exists and is a function', () => {
      expect(spec.buildRequests).to.exist.and.to.be.a('function');
    });

    describe('Consumable', () => {
      it('should not return request when no bids are present', () => {
        let [request] = spec.buildRequests([]);
        expect(request).to.be.empty;
      });

      it('should return request for endpoint', () => {
        let bidRequest = getDefaultBidRequest();
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain(CONSUMABLE_URL);
      });

      it('should return url with pubapi bid option', () => {
        let bidRequest = getDefaultBidRequest();
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain('cmd=bid;');
      });

      it('should return url with version 2 of pubapi', () => {
        let bidRequest = getDefaultBidRequest();
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.contain('v=2;');
      });

      it('should return url with cache busting option', () => {
        let bidRequest = getDefaultBidRequest();
        let [request] = spec.buildRequests(bidRequest.bids);
        expect(request.url).to.match(/misc=\d+/);
      });
    });
  });

  describe('getUserSyncs()', () => {
    let bidResponse;
    let bidRequest;

    beforeEach(() => {
      $$PREBID_GLOBAL$$.consumableGlobals.pixelsDropped = false;
      config.setConfig({
        consumable: {
          userSyncOn: 'bidResponse'
        },
      });
      bidResponse = getDefaultBidResponse();
      bidResponse.ext = {
        pixels: getPixels()
      };
    });

    it('should return user syncs only if userSyncOn equals to "bidResponse"', () => {
      let userSyncs = spec.getUserSyncs({}, [bidResponse], bidRequest);

      expect($$PREBID_GLOBAL$$.consumableGlobals.pixelsDropped).to.be.true;
      expect(userSyncs).to.deep.equal([
        {type: 'image', url: 'img.org'},
        {type: 'iframe', url: 'pixels1.org'}
      ]);
    });

    it('should not return user syncs if it has already been returned', () => {
      $$PREBID_GLOBAL$$.consumableGlobals.pixelsDropped = true;

      let userSyncs = spec.getUserSyncs({}, [bidResponse], bidRequest);

      expect($$PREBID_GLOBAL$$.consumableGlobals.pixelsDropped).to.be.true;
      expect(userSyncs).to.deep.equal([]);
    });

    it('should not return user syncs if pixels are not present', () => {
      bidResponse.ext.pixels = null;

      let userSyncs = spec.getUserSyncs({}, [bidResponse], bidRequest);

      expect($$PREBID_GLOBAL$$.consumableGlobals.pixelsDropped).to.be.false;
      expect(userSyncs).to.deep.equal([]);
    });
  });
});
