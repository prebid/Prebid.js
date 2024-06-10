import { buildVideoUrl } from 'modules/targetVideoAdServerVideo.js';
import { parseUrl } from 'src/utils.js';
import { targeting } from 'src/targeting.js';

describe('TargetVideo Ad Server Video', function() {
  it('should return undefined if required properties are missing', function() {
    const url1 = buildVideoUrl({ params: {} });
    const url2 = buildVideoUrl({ adUnit: {} });
    const url3 = buildVideoUrl({ bid: {} });

    expect(url1).to.be.undefined;
    expect(url2).to.be.undefined;
    expect(url3).to.be.undefined;
  });

  it('should require options.adUnit or options.bid', function() {
    const params = { iu: 'https://example.com/ads/bid?iu=video' };
    const adUnit = {
      code: 'ad-slot-1',
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [ 640, 480 ]
        }
      },
      bids: [
        {
          bidder: 'dummy'
        }
      ]
    };

    const BID = {
      bidder: adUnit.bids[0].bidder,
      adUnitCode: adUnit.code,
      mediaType: 'video',
      adserverTargeting: {
        hb_adid: 'value1',
        hb_cache: 'value2'
      },
    };

    const getWinningBidsStub = sinon.stub(targeting, 'getWinningBids');
    getWinningBidsStub.withArgs(adUnit.code).returns([ BID ]);

    const url1 = buildVideoUrl({ params });
    expect(url1).to.be.undefined;

    const url2 = buildVideoUrl({ params, adUnit });
    expect(url2).to.be.string;

    const url3 = buildVideoUrl({ params, bid: BID });
    expect(url3).to.be.string;

    getWinningBidsStub.restore();
  });

  it('should build URL correctly with valid parameters', function() {
    const params = { iu: 'https://example.com/ads/bid?iu=/video' };
    const adUnit = { code: 'ad_unit_1' };
    const adserverTargeting = {
      hb_adid: 'value1',
      hb_cache: 'value2'
    };
    const bid = { adserverTargeting };

    const url = buildVideoUrl({ params, bid, adUnit });

    expect(url).to.equal('https://example.com/ads/bid?iu=/video&hb_adid=value1&hb_cache=value2');
  });

  it('should build URL correctly with default parameters', function() {
    const params = { iu: '/video' };
    const adUnit = { code: 'ad_unit_1' };
    const adserverTargeting = { hb_adid: 'value1', hb_cache: 'value2' };
    const bid = { adserverTargeting };

    const url = buildVideoUrl({ params, bid, adUnit });

    expect(url).to.equal('https://tvserve.io/ads/bid?iu=/video&hb_adid=value1&hb_cache=value2');
  });

  it('should append only valid parameters', function() {
    const params = { iu: '/video' };
    const adUnit = { code: 'ad_unit_1' };
    const adserverTargeting = {
      hb_adid: 'ad_id',
      hb_cache_id: '123',
      hb_uuid: '123',
      invalidParam1: null,
      invalidParam2: undefined,
      invalidParam3: '',
      invalidParam4: [],
      invalidParam5: {},
    };
    const bid = { adserverTargeting };

    const url = buildVideoUrl({ params, bid, adUnit });
    const { search } = parseUrl(url);

    expect(search).to.have.property('hb_adid', 'ad_id');
    expect(search).to.have.property('hb_cache_id', '123');
    expect(search).to.have.property('hb_uuid', '123');
    expect(search).to.not.have.property('invalidParam1');
    expect(search).to.not.have.property('invalidParam2');
    expect(search).to.not.have.property('invalidParam3');
    expect(search).to.not.have.property('invalidParam4');
    expect(search).to.not.have.property('invalidParam5');
  });
});
