// import or require modules necessary for the test, e.g.:
import {expect} from 'chai'; // may prefer 'assert' in place of 'expect'
import {
  spec
} from 'modules/inmarBidAdapter.js';
import {config} from 'src/config.js';

describe('Inmar adapter tests', function () {
  var DEFAULT_PARAMS_NEW_SIZES = [{
    adUnitCode: 'test-div',
    bidId: '2c7c8e9c900244',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250], [300, 600], [728, 90], [970, 250]]
      }
    },
    bidder: 'inmar',
    params: {
      partnerId: 12345
    },
    auctionId: '0cb3144c-d084-4686-b0d6-f5dbe917c563',
    bidRequestsCount: 1,
    bidderRequestId: '1858b7382993ca',
    transactionId: '29df2112-348b-4961-8863-1b33684d95e6',
    user: {}
  }];

  var DEFAULT_PARAMS_VIDEO = [{
    adUnitCode: 'test-div',
    bidId: '2c7c8e9c900244',
    mediaTypes: {
      video: {
        context: 'instream', // or 'outstream'
        playerSize: [640, 480],
        mimes: ['video/mp4']
      }
    },
    bidder: 'inmar',
    params: {
      partnerId: 12345
    },
    auctionId: '0cb3144c-d084-4686-b0d6-f5dbe917c563',
    bidRequestsCount: 1,
    bidderRequestId: '1858b7382993ca',
    transactionId: '29df2112-348b-4961-8863-1b33684d95e6',
    user: {}
  }];

  var DEFAULT_PARAMS_WO_OPTIONAL = [{
    adUnitCode: 'test-div',
    bidId: '2c7c8e9c900244',
    sizes: [
      [300, 250],
      [300, 600],
      [728, 90],
      [970, 250]
    ],
    bidder: 'inmar',
    params: {
      partnerId: 12345,
    },
    auctionId: '851adee7-d843-48f9-a7e9-9ff00573fcbf',
    bidRequestsCount: 1,
    bidderRequestId: '1858b7382993ca',
    transactionId: '29df2112-348b-4961-8863-1b33684d95e6'
  }];

  var BID_RESPONSE = {
    body: {
      cpm: 1.50,
      ad: '<!-- script -->',
      meta: {
        mediaType: 'banner',
      },
      width: 300,
      height: 250,
      creativeId: '189198063',
      netRevenue: true,
      currency: 'USD',
      ttl: 300,
      dealId: 'dealId'

    }
  };

  var BID_RESPONSE_VIDEO = {
    body: {
      cpm: 1.50,
      meta: {
        mediaType: 'video',
      },
      width: 1,
      height: 1,
      creativeId: '189198063',
      netRevenue: true,
      currency: 'USD',
      ttl: 300,
      vastUrl: 'https://vast.com/vast.xml',
      dealId: 'dealId'
    }
  };

  it('Verify build request to prebid 3.0 display test', function() {
    const request = spec.buildRequests(DEFAULT_PARAMS_NEW_SIZES, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {
        legacy: {
          referer: 'https://domain.com',
          numIframes: 0
        }
      }
    });

    expect(request).to.have.property('method').and.to.equal('POST');
    const requestContent = JSON.parse(request.data);
    expect(requestContent.bidRequests[0].params).to.have.property('partnerId').and.to.equal(12345);
    expect(requestContent.bidRequests[0]).to.have.property('auctionId').and.to.equal('0cb3144c-d084-4686-b0d6-f5dbe917c563');
    expect(requestContent.bidRequests[0]).to.have.property('bidId').and.to.equal('2c7c8e9c900244');
    expect(requestContent.bidRequests[0]).to.have.property('bidRequestsCount').and.to.equal(1);
    expect(requestContent.bidRequests[0]).to.have.property('bidder').and.to.equal('inmar');
    expect(requestContent.bidRequests[0]).to.have.property('bidderRequestId').and.to.equal('1858b7382993ca');
    expect(requestContent.bidRequests[0]).to.have.property('adUnitCode').and.to.equal('test-div');
    expect(requestContent.refererInfo).to.have.property('referer').and.to.equal('https://domain.com');
    expect(requestContent.bidRequests[0].mediaTypes.banner).to.have.property('sizes');
    expect(requestContent.bidRequests[0].mediaTypes.banner.sizes[0]).to.have.ordered.members([300, 250]);
    expect(requestContent.bidRequests[0].mediaTypes.banner.sizes[1]).to.have.ordered.members([300, 600]);
    expect(requestContent.bidRequests[0].mediaTypes.banner.sizes[2]).to.have.ordered.members([728, 90]);
    expect(requestContent.bidRequests[0].mediaTypes.banner.sizes[3]).to.have.ordered.members([970, 250]);
    expect(requestContent.bidRequests[0]).to.have.property('transactionId').and.to.equal('29df2112-348b-4961-8863-1b33684d95e6');
    expect(requestContent.refererInfo).to.have.property('numIframes').and.to.equal(0);
  })

  it('Verify interprete response', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS_NEW_SIZES, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {
        referer: 'https://domain.com',
        numIframes: 0
      }
    });

    const bids = spec.interpretResponse(BID_RESPONSE, request);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(1.50);
    expect(bid.ad).to.equal('<!-- script -->');
    expect(bid.meta.mediaType).to.equal('banner');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.creativeId).to.equal('189198063');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.currency).to.equal('USD');
    expect(bid.ttl).to.equal(300);
    expect(bid.dealId).to.equal('dealId');
  });

  it('no banner media response', function () {
    const request = spec.buildRequests(DEFAULT_PARAMS_NEW_SIZES, {
      gdprConsent: {
        consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
        gdprApplies: true
      },
      refererInfo: {
        referer: 'https://domain.com',
        numIframes: 0
      }
    });

    const bids = spec.interpretResponse(BID_RESPONSE_VIDEO, request);
    const bid = bids[0];
    expect(bid.vastUrl).to.equal('https://vast.com/vast.xml');
  });

  it('Verifies bidder_code', function () {
    expect(spec.code).to.equal('inmar');
  });

  it('Verifies bidder aliases', function () {
    expect(spec.aliases).to.have.lengthOf(1);
    expect(spec.aliases[0]).to.equal('inm');
  });

  it('Verifies if bid request is valid', function () {
    expect(spec.isBidRequestValid(DEFAULT_PARAMS_NEW_SIZES[0])).to.equal(true);
    expect(spec.isBidRequestValid(DEFAULT_PARAMS_WO_OPTIONAL[0])).to.equal(true);
    expect(spec.isBidRequestValid({})).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {}
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
      }
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      params: {
        partnerId: 12345
      }
    })).to.equal(true);
  });

  it('Verifies user syncs image', function () {
    var syncs = spec.getUserSyncs({
      iframeEnabled: false,
      pixelEnabled: true
    }, [BID_RESPONSE], {
      consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
      referer: 'http://domain.com',
      gdprApplies: true
    })
    expect(syncs).to.have.lengthOf(1);
    expect(syncs[0].type).to.equal('image');

    syncs = spec.getUserSyncs({
      iframeEnabled: false,
      pixelEnabled: true
    }, [BID_RESPONSE], {
      consentString: '',
      referer: 'http://domain.com',
      gdprApplies: true
    })
    expect(syncs).to.have.lengthOf(1);
    expect(syncs[0].type).to.equal('image');

    syncs = spec.getUserSyncs({
      iframeEnabled: false,
      pixelEnabled: true
    }, [], {
      consentString: null,
      referer: 'http://domain.com',
      gdprApplies: true
    })
    expect(syncs).to.have.lengthOf(1);
    expect(syncs[0].type).to.equal('image');
  });
});
