import { expect } from 'chai';

import parse from 'url-parse';
import { buildVastUrl } from 'modules/konduitWrapper';
import { parseQS } from 'src/url';
import { config } from 'src/config';

describe('The Konduit vast wrapper module', function () {
  it('should make a wrapped request url when `bid` passed', function () {
    const bid = createBid(10, 'video1', 15, '10.00_15s', '123', '395');

    const url = parse(buildVastUrl({
      bid,
      params: { 'konduit_id': 'testId' },
    }));

    expect(url.protocol).to.equal('https:');
    expect(url.host).to.equal('p.konduit.me');

    const queryParams = parseQS(url.query);
    expect(queryParams).to.have.property('konduit_url', encodeURIComponent('http://some-vast-url.com'));
    expect(queryParams).to.have.property('konduit_header_bidding', '1');
    expect(queryParams).to.have.property('konduit_id', 'testId');
  });

  it('should return null when no `konduit_id` (required param) passed', function () {
    const bid = createBid(10, 'video1', 15, '10.00_15s', '123', '395');

    const url = buildVastUrl({ bid });

    expect(url).to.equal(null);
  });

  it('should return null when either bid or adUnit is not passed', function () {
    const url = buildVastUrl({ params: { 'konduit_id': 'testId' } });

    expect(url).to.equal(null);
  });

  it('should return null when bid does not contain vastUrl', function () {
    const bid = createBid(10, 'video1', 15, '10.00_15s', '123', '395');

    delete bid.vastUrl;

    const url = buildVastUrl({
      bid,
      params: { 'konduit_id': 'testId' },
    });

    expect(url).to.equal(null);
  });

  it('should return wrapped vastUrl based on cached url in params', function () {
    config.setConfig({ cache: { url: 'https://cached.url.com' } });
    const bid = createBid(10, 'video1', 15, '10.00_15s', '123', '395');

    delete bid.vastUrl;

    const expectedUrl = encodeURIComponent(`https://cached.url.com?uuid=${bid.videoCacheKey}`);

    const url = parse(buildVastUrl({
      bid,
      params: { 'konduit_id': 'testId' },
    }));
    const queryParams = parseQS(url.query);

    expect(queryParams).to.have.property('konduit_url', expectedUrl);

    config.resetConfig();
  });
});

function createBid(cpm, adUnitCode, durationBucket, priceIndustryDuration, uuid, label) {
  return {
    'bidderCode': 'appnexus',
    'width': 640,
    'height': 360,
    'statusMessage': 'Bid available',
    'adId': '28f24ced14586c',
    'mediaType': 'video',
    'source': 'client',
    'requestId': '28f24ced14586c',
    'cpm': cpm,
    'creativeId': 97517771,
    'currency': 'USD',
    'netRevenue': true,
    'ttl': 3600,
    'adUnitCode': adUnitCode,
    'video': {
      'context': 'adpod',
      'durationBucket': durationBucket
    },
    'appnexus': {
      'buyerMemberId': 9325
    },
    'vastUrl': 'http://some-vast-url.com',
    'vastImpUrl': 'http://some-vast-imp-url.com',
    'auctionId': 'ec266b31-d652-49c5-8295-e83fafe5532b',
    'responseTimestamp': 1548442460888,
    'requestTimestamp': 1548442460827,
    'bidder': 'appnexus',
    'timeToRespond': 61,
    'pbLg': '5.00',
    'pbMg': '5.00',
    'pbHg': '5.00',
    'pbAg': '5.00',
    'pbDg': '5.00',
    'pbCg': '',
    'size': '640x360',
    'adserverTargeting': {
      'hb_bidder': 'appnexus',
      'hb_adid': '28f24ced14586c',
      'hb_pb': '5.00',
      'hb_size': '640x360',
      'hb_source': 'client',
      'hb_format': 'video',
      'hb_pb_cat_dur': priceIndustryDuration,
      'hb_cache_id': uuid
    },
    'customCacheKey': `${priceIndustryDuration}_${uuid}`,
    'meta': {
      'iabSubCatId': 'iab-1',
      'adServerCatId': label
    },
    'videoCacheKey': '4cf395af-8fee-4960-af0e-88d44e399f14'
  }
}
