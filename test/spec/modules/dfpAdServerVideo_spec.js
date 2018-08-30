import { expect } from 'chai';

import parse from 'url-parse';
import buildDfpVideoUrl from 'modules/dfpAdServerVideo';
import { parseQS } from 'src/url';
import adUnit from 'test/fixtures/video/adUnit';
import * as utils from 'src/utils';
import { config } from 'src/config';
import { targeting } from 'src/targeting';

const bid = {
  videoCacheKey: 'abc',
  adserverTargeting: { },
};

describe('The DFP video support module', function () {
  it('should make a legal request URL when given the required params', function () {
    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bid,
      params: {
        'iu': 'my/adUnit',
        'description_url': 'someUrl.com',
      }
    }));

    expect(url.protocol).to.equal('https:');
    expect(url.host).to.equal('pubads.g.doubleclick.net');

    const queryParams = parseQS(url.query);
    expect(queryParams).to.have.property('correlator');
    expect(queryParams).to.have.property('description_url', 'someUrl.com');
    expect(queryParams).to.have.property('env', 'vp');
    expect(queryParams).to.have.property('gdfp_req', '1');
    expect(queryParams).to.have.property('iu', 'my/adUnit');
    expect(queryParams).to.have.property('output', 'xml_vast3');
    expect(queryParams).to.have.property('sz', '640x480');
    expect(queryParams).to.have.property('unviewed_position_start', '1');
    expect(queryParams).to.have.property('url');
  });

  it('can take an adserver url as a parameter', function () {
    const bidCopy = Object.assign({ }, bid);
    bidCopy.vastUrl = 'vastUrl.example';

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      url: 'https://video.adserver.example/',
    }));

    expect(url.host).to.equal('video.adserver.example');

    const queryObject = parseQS(url.query);
    expect(queryObject.description_url).to.equal('vastUrl.example');
  });

  it('requires a params object or url', function () {
    const url = buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bid,
    });

    expect(url).to.be.undefined;
  });

  it('overwrites url params when both url and params object are given', function () {
    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bid,
      url: 'https://video.adserver.example/ads?sz=640x480&iu=/123/aduniturl&impl=s',
      params: { iu: 'my/adUnit' }
    }));

    const queryObject = parseQS(url.query);
    expect(queryObject.iu).to.equal('my/adUnit');
  });

  it('should override param defaults with user-provided ones', function () {
    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bid,
      params: {
        'iu': 'my/adUnit',
        'output': 'vast',
      }
    }));

    expect(parseQS(url.query)).to.have.property('output', 'vast');
  });

  it('should include the cache key and adserver targeting in cust_params', function () {
    const bidCopy = Object.assign({ }, bid);
    bidCopy.adserverTargeting = {
      hb_adid: 'ad_id',
    };

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      params: {
        'iu': 'my/adUnit'
      }
    }));
    const queryObject = parseQS(url.query);
    const customParams = parseQS('?' + decodeURIComponent(queryObject.cust_params));

    expect(customParams).to.have.property('hb_adid', 'ad_id');
    expect(customParams).to.have.property('hb_uuid', bid.videoCacheKey);
    expect(customParams).to.have.property('hb_cache_id', bid.videoCacheKey);
  });

  describe('special targeting unit test', function () {
    const allTargetingData = {
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
      'hb_format_appnexus': 'video',
      'hb_source_appnexus': 'client',
      'hb_size_appnexus': '640x480',
      'hb_pb_appnexus': '5.00',
      'hb_adid_appnexus': '44e0b5f2e5cace',
      'hb_bidder_appnexus': 'appnexus'
    };
    let targetingStub;

    before(function () {
      targetingStub = sinon.stub(targeting, 'getAllTargeting');
      targetingStub.returns({'video1': allTargetingData});

      config.setConfig({
        enableSendAllBids: true
      });
    });

    after(function () {
      config.resetConfig();
      targetingStub.restore();
    });

    it('should include all adserver targeting in cust_params if pbjs.enableSendAllBids is true', function () {
      const adUnitsCopy = utils.deepClone(adUnit);
      adUnitsCopy.bids.push({
        'bidder': 'testBidder2',
        'params': {
          'placementId': '9333431',
          'video': {
            'skipppable': false,
            'playback_methods': ['auto_play_sound_off']
          }
        }
      });

      const bidCopy = Object.assign({ }, bid);
      bidCopy.adserverTargeting = {
        hb_adid: 'ad_id',
      };

      const url = parse(buildDfpVideoUrl({
        adUnit: adUnitsCopy,
        bid: bidCopy,
        params: {
          'iu': 'my/adUnit'
        }
      }));
      const queryObject = parseQS(url.query);
      const customParams = parseQS('?' + decodeURIComponent(queryObject.cust_params));

      expect(customParams).to.have.property('hb_adid', 'ad_id');
      expect(customParams).to.have.property('hb_uuid', bid.videoCacheKey);
      expect(customParams).to.have.property('hb_cache_id', bid.videoCacheKey);
      expect(customParams).to.have.property('hb_bidder_appnexus', 'appnexus');
      expect(customParams).to.have.property('hb_bidder_testBidder2', 'testBidder2');
    });
  });

  it('should merge the user-provided cust_params with the default ones', function () {
    const bidCopy = Object.assign({ }, bid);
    bidCopy.adserverTargeting = {
      hb_adid: 'ad_id',
    };

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      params: {
        'iu': 'my/adUnit',
        cust_params: {
          'my_targeting': 'foo',
        },
      },
    }));
    const queryObject = parseQS(url.query);
    const customParams = parseQS('?' + decodeURIComponent(queryObject.cust_params));

    expect(customParams).to.have.property('hb_adid', 'ad_id');
    expect(customParams).to.have.property('my_targeting', 'foo');
  });

  it('should merge the user-provided cust-params with the default ones when using url object', function () {
    const bidCopy = Object.assign({ }, bid);
    bidCopy.adserverTargeting = {
      hb_adid: 'ad_id',
    };

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      url: 'https://video.adserver.example/ads?sz=640x480&iu=/123/aduniturl&impl=s&cust_params=section%3dblog%26mykey%3dmyvalue'
    }));

    const queryObject = parseQS(url.query);
    const customParams = parseQS('?' + decodeURIComponent(queryObject.cust_params));

    expect(customParams).to.have.property('hb_adid', 'ad_id');
    expect(customParams).to.have.property('section', 'blog');
    expect(customParams).to.have.property('mykey', 'myvalue');
    expect(customParams).to.have.property('hb_uuid', 'abc');
    expect(customParams).to.have.property('hb_cache_id', 'abc');
  });

  it('should not overwrite an existing description_url for object input and cache disabled', function () {
    const bidCopy = Object.assign({}, bid);
    bidCopy.vastUrl = 'vastUrl.example';

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      params: {
        iu: 'my/adUnit',
        description_url: 'descriptionurl.example'
      }
    }));

    const queryObject = parseQS(url.query);
    expect(queryObject.description_url).to.equal('descriptionurl.example');
  });

  it('should work with nobid responses', function () {
    const url = buildDfpVideoUrl({
      adUnit: adUnit,
      params: { 'iu': 'my/adUnit' }
    });

    expect(url).to.be.a('string');
  });
});
