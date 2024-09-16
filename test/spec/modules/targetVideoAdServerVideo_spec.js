import {expect} from 'chai';
import {buildVideoUrl} from 'modules/targetVideoAdServerVideo.js';
import {targeting} from 'src/targeting.js';
import * as utils from 'src/utils.js';
import {hook} from '../../../src/hook.js';
import AD_UNIT from 'test/fixtures/video/adUnit.json';

describe('TargetVideo Ad Server Video', function() {
  before(() => {
    hook.ready();
  });

  let sandbox, bid, adUnit;
  const unitUrl = { iu: 'https://example.com/ads/bid?iu=/video' };
  const unitId = { iu: '/video' };
  const allTargeting = {
    'hb_format': 'video',
    'hb_source': 'client',
    'hb_size': '640x480',
    'hb_pb': '5.00',
    'hb_adid': '2c4f6cc3ba128a',
    'hb_bidder': 'testBidder2',
    'hb_format_testBidder2': 'video',
    'hb_source_testBidder2': 'client',
    'hb_size_testBidder2': '640x480',
    'hb_pb_testBidder2': '5.00',
    'hb_adid_testBidder2': '2c4f6cc3ba128a',
    'hb_bidder_testBidder2': 'testBidder2',
    'hb_format_targetVideo': 'video',
    'hb_source_targetVideo': 'client',
    'hb_size_targetVideo': '640x480',
    'hb_pb_targetVideo': '5.00',
    'hb_adid_targetVideo': '44e0b5f2e5cace',
    'hb_bidder_targetVideo': 'targetVideo'
  };

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    bid = {
      videoCacheKey: '123',
      adserverTargeting: {
        hb_adid: 'ad_id',
        hb_cache_id: '123',
        hb_uuid: '123',
      },
    };
    adUnit = utils.deepClone(AD_UNIT);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should return undefined if required properties are missing', () => {
    const url1 = buildVideoUrl({ params: {} });
    const url2 = buildVideoUrl({ adUnit: {} });
    const url3 = buildVideoUrl({ bid: {} });

    expect(url1).to.be.undefined;
    expect(url2).to.be.undefined;
    expect(url3).to.be.undefined;
  });

  it('should require options.adUnit or options.bid', () => {
    const options = {
      params: { ...unitUrl }
    };

    const getWinningBidsStub = sandbox.stub(targeting, 'getWinningBids').returns([bid]);
    const getAllTargetingDataStub = sandbox.stub(targeting, 'getAllTargeting').returns(allTargeting);

    const url1 = buildVideoUrl(options);
    expect(url1).to.be.undefined;

    const url2 = buildVideoUrl(Object.assign(options, { adUnit }));
    expect(url2).to.be.string;

    const url3 = buildVideoUrl(Object.assign(options, { bid }));
    expect(url3).to.be.string;

    getWinningBidsStub.restore();
    getAllTargetingDataStub.restore();
  });

  it('should build URL correctly with valid parameters', () => {
    const optionsUrl = {
      params: { ...unitUrl }
    };

    const optionsId = {
      params: { ...unitId }
    };

    const getWinningBidsStub = sandbox.stub(targeting, 'getWinningBids').returns([bid]);
    const getAllTargetingDataStub = sandbox.stub(targeting, 'getAllTargeting').returns(allTargeting);

    const url1 = buildVideoUrl(Object.assign(optionsUrl, { bid, adUnit }));
    const url2 = buildVideoUrl(Object.assign(optionsId, { bid, adUnit }));

    expect(url1).to.include('https://example.com/ads/bid?iu=/video');
    expect(url1).to.include('hb_adid=ad_id');
    expect(url1).to.include('hb_cache_id=123');
    expect(url1).to.include('hb_uuid=123');

    expect(url2).to.include('https://vid.tvserve.io/ads/bid?iu=/video');
    expect(url2).to.include('hb_adid=ad_id');
    expect(url2).to.include('hb_cache_id=123');
    expect(url2).to.include('hb_uuid=123');

    getWinningBidsStub.restore();
    getAllTargetingDataStub.restore();
  });

  it('should include default query parameters', () => {
    const options = {
      params: { ...unitUrl }
    };

    const getWinningBidsStub = sandbox.stub(targeting, 'getWinningBids').returns([bid]);
    const getAllTargetingDataStub = sandbox.stub(targeting, 'getAllTargeting').returns(allTargeting);

    const url = buildVideoUrl(Object.assign(options, { bid, adUnit }));

    expect(url).to.include('autoplay=[autoplay]');
    expect(url).to.include('mute=[vpmute]');
    expect(url).to.include('page_url=[page_url]');
    expect(url).to.include('cachebuster=[timestamp]');
    expect(url).to.include('gdpr_consent=[consent]');

    getWinningBidsStub.restore();
    getAllTargetingDataStub.restore();
  });

  it('should add cust_params correctly', () => {
    const optionsUrl = {
      params: {
        ...unitUrl,
        cust_params: {
          targeting_1: 'foo',
          targeting_2: 'bar'
        }
      }
    };

    const optionsId = {
      params: {
        ...unitId,
        cust_params: {
          targeting_1: 'foo',
          targeting_2: 'bar'
        }
      }
    };

    const optionsToMergeCustParams = {
      params: {
        iu: 'https://example.com/ads/bid?iu=/video&cust_params=targeting_1%3Dbaz',
        cust_params: {
          targeting_1: 'foo',
          targeting_2: 'bar'
        }
      }
    };

    const getWinningBidsStub = sandbox.stub(targeting, 'getWinningBids').returns([bid]);
    const getAllTargetingDataStub = sandbox.stub(targeting, 'getAllTargeting').returns(allTargeting);

    const url1 = buildVideoUrl(Object.assign(optionsUrl, { bid, adUnit }));
    const url2 = buildVideoUrl(Object.assign(optionsId, { bid, adUnit }));
    const url3 = buildVideoUrl(Object.assign(optionsToMergeCustParams, { bid, adUnit }));

    expect(url1).to.include('cust_params=targeting_1%3Dfoo%26targeting_2%3Dbar');
    expect(url2).to.include('cust_params=targeting_1%3Dfoo%26targeting_2%3Dbar');
    expect(url3).to.include('cust_params=targeting_1%3Dbaz%26targeting_2%3Dbar');

    getWinningBidsStub.restore();
    getAllTargetingDataStub.restore();
  });
});
