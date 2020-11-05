import { expect } from 'chai';

import parse from 'url-parse';
import { buildDfpVideoUrl, buildAdpodVideoUrl } from 'modules/dfpAdServerVideo.js';
import adUnit from 'test/fixtures/video/adUnit.json';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { targeting } from 'src/targeting.js';
import { auctionManager } from 'src/auctionManager.js';
import * as adpod from 'modules/adpod.js';
import { server } from 'test/mocks/xhr.js';

const bid = {
  videoCacheKey: 'abc',
  adserverTargeting: {
    hb_uuid: 'abc',
    hb_cache_id: 'abc',
  },
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
    expect(url.host).to.equal('securepubads.g.doubleclick.net');

    const queryParams = utils.parseQS(url.query);
    expect(queryParams).to.have.property('correlator');
    expect(queryParams).to.have.property('description_url', 'someUrl.com');
    expect(queryParams).to.have.property('env', 'vp');
    expect(queryParams).to.have.property('gdfp_req', '1');
    expect(queryParams).to.have.property('iu', 'my/adUnit');
    expect(queryParams).to.have.property('output', 'vast');
    expect(queryParams).to.have.property('sz', '640x480');
    expect(queryParams).to.have.property('unviewed_position_start', '1');
    expect(queryParams).to.have.property('url');
  });

  it('can take an adserver url as a parameter', function () {
    const bidCopy = utils.deepClone(bid);
    bidCopy.vastUrl = 'vastUrl.example';

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      url: 'https://video.adserver.example/',
    }));

    expect(url.host).to.equal('video.adserver.example');

    const queryObject = utils.parseQS(url.query);
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

    const queryObject = utils.parseQS(url.query);
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

    expect(utils.parseQS(url.query)).to.have.property('output', 'vast');
  });

  it('should include the cache key and adserver targeting in cust_params', function () {
    const bidCopy = utils.deepClone(bid);
    bidCopy.adserverTargeting = Object.assign(bidCopy.adserverTargeting, {
      hb_adid: 'ad_id',
    });

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      params: {
        'iu': 'my/adUnit'
      }
    }));
    const queryObject = utils.parseQS(url.query);
    const customParams = utils.parseQS('?' + decodeURIComponent(queryObject.cust_params));

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

      const bidCopy = utils.deepClone(bid);
      bidCopy.adserverTargeting = Object.assign(bidCopy.adserverTargeting, {
        hb_adid: 'ad_id',
      });

      const url = parse(buildDfpVideoUrl({
        adUnit: adUnitsCopy,
        bid: bidCopy,
        params: {
          'iu': 'my/adUnit'
        }
      }));
      const queryObject = utils.parseQS(url.query);
      const customParams = utils.parseQS('?' + decodeURIComponent(queryObject.cust_params));

      expect(customParams).to.have.property('hb_adid', 'ad_id');
      expect(customParams).to.have.property('hb_uuid', bid.videoCacheKey);
      expect(customParams).to.have.property('hb_cache_id', bid.videoCacheKey);
      expect(customParams).to.have.property('hb_bidder_appnexus', 'appnexus');
      expect(customParams).to.have.property('hb_bidder_testBidder2', 'testBidder2');
    });
  });

  it('should merge the user-provided cust_params with the default ones', function () {
    const bidCopy = utils.deepClone(bid);
    bidCopy.adserverTargeting = Object.assign(bidCopy.adserverTargeting, {
      hb_adid: 'ad_id',
    });

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
    const queryObject = utils.parseQS(url.query);
    const customParams = utils.parseQS('?' + decodeURIComponent(queryObject.cust_params));

    expect(customParams).to.have.property('hb_adid', 'ad_id');
    expect(customParams).to.have.property('my_targeting', 'foo');
  });

  it('should merge the user-provided cust-params with the default ones when using url object', function () {
    const bidCopy = utils.deepClone(bid);
    bidCopy.adserverTargeting = Object.assign(bidCopy.adserverTargeting, {
      hb_adid: 'ad_id',
    });

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      url: 'https://video.adserver.example/ads?sz=640x480&iu=/123/aduniturl&impl=s&cust_params=section%3dblog%26mykey%3dmyvalue'
    }));

    const queryObject = utils.parseQS(url.query);
    const customParams = utils.parseQS('?' + decodeURIComponent(queryObject.cust_params));

    expect(customParams).to.have.property('hb_adid', 'ad_id');
    expect(customParams).to.have.property('section', 'blog');
    expect(customParams).to.have.property('mykey', 'myvalue');
    expect(customParams).to.have.property('hb_uuid', 'abc');
    expect(customParams).to.have.property('hb_cache_id', 'abc');
  });

  it('should not overwrite an existing description_url for object input and cache disabled', function () {
    const bidCopy = utils.deepClone(bid);
    bidCopy.vastUrl = 'vastUrl.example';

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      params: {
        iu: 'my/adUnit',
        description_url: 'descriptionurl.example'
      }
    }));

    const queryObject = utils.parseQS(url.query);
    expect(queryObject.description_url).to.equal('descriptionurl.example');
  });

  it('should work with nobid responses', function () {
    const url = buildDfpVideoUrl({
      adUnit: adUnit,
      params: { 'iu': 'my/adUnit' }
    });

    expect(url).to.be.a('string');
  });

  it('should include hb_uuid and hb_cache_id in cust_params when both keys are exluded from overwritten bidderSettings', function () {
    const bidCopy = utils.deepClone(bid);
    delete bidCopy.adserverTargeting.hb_uuid;
    delete bidCopy.adserverTargeting.hb_cache_id;

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      params: {
        'iu': 'my/adUnit'
      }
    }));
    const queryObject = utils.parseQS(url.query);
    const customParams = utils.parseQS('?' + decodeURIComponent(queryObject.cust_params));

    expect(customParams).to.have.property('hb_uuid', bid.videoCacheKey);
    expect(customParams).to.have.property('hb_cache_id', bid.videoCacheKey);
  });

  it('should include hb_uuid and hb_cache_id in cust params from overwritten standard bidderSettings', function () {
    const bidCopy = utils.deepClone(bid);
    bidCopy.adserverTargeting = Object.assign(bidCopy.adserverTargeting, {
      hb_uuid: 'def',
      hb_cache_id: 'def'
    });

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      params: {
        'iu': 'my/adUnit'
      }
    }));
    const queryObject = utils.parseQS(url.query);
    const customParams = utils.parseQS('?' + decodeURIComponent(queryObject.cust_params));

    expect(customParams).to.have.property('hb_uuid', 'def');
    expect(customParams).to.have.property('hb_cache_id', 'def');
  });

  describe('adpod unit tests', function () {
    let amStub;
    let amGetAdUnitsStub;

    before(function () {
      let adUnits = [{
        code: 'adUnitCode-1',
        mediaTypes: {
          video: {
            context: 'adpod',
            playerSize: [640, 480],
            adPodDurationSec: 60,
            durationRangeSec: [15, 30],
            requireExactDuration: true
          }
        },
        bids: [
          {
            bidder: 'appnexus',
            params: {
              placementId: 14542875,
            }
          }
        ]
      }];

      amGetAdUnitsStub = sinon.stub(auctionManager, 'getAdUnits');
      amGetAdUnitsStub.returns(adUnits);
      amStub = sinon.stub(auctionManager, 'getBidsReceived');
    });

    beforeEach(function () {
      config.setConfig({
        adpod: {
          brandCategoryExclusion: true,
          deferCaching: false
        }
      });
    })

    afterEach(function() {
      config.resetConfig();
    });

    after(function () {
      amGetAdUnitsStub.restore();
      amStub.restore();
    });

    it('should return masterTag url', function() {
      amStub.returns(getBidsReceived());
      let url;
      parse(buildAdpodVideoUrl({
        code: 'adUnitCode-1',
        callback: handleResponse,
        params: {
          'iu': 'my/adUnit',
          'description_url': 'someUrl.com',
        }
      }));

      function handleResponse(err, masterTag) {
        if (err) {
          return;
        }
        url = parse(masterTag);

        expect(url.protocol).to.equal('https:');
        expect(url.host).to.equal('securepubads.g.doubleclick.net');

        const queryParams = utils.parseQS(url.query);
        expect(queryParams).to.have.property('correlator');
        expect(queryParams).to.have.property('description_url', 'someUrl.com');
        expect(queryParams).to.have.property('env', 'vp');
        expect(queryParams).to.have.property('gdfp_req', '1');
        expect(queryParams).to.have.property('iu', 'my/adUnit');
        expect(queryParams).to.have.property('output', 'vast');
        expect(queryParams).to.have.property('sz', '640x480');
        expect(queryParams).to.have.property('unviewed_position_start', '1');
        expect(queryParams).to.have.property('url');
        expect(queryParams).to.have.property('cust_params');

        const custParams = utils.parseQS(decodeURIComponent(queryParams.cust_params));
        expect(custParams).to.have.property('hb_cache_id', '123');
        expect(custParams).to.have.property('hb_pb_cat_dur', '15.00_395_15s,15.00_406_30s,10.00_395_15s');
      }
    });

    it('should return masterTag url with correct custom params when brandCategoryExclusion is false', function() {
      config.setConfig({
        adpod: {
          brandCategoryExclusion: false,
        }
      });
      function getBids() {
        let bids = [
          createBid(10, 'adUnitCode-1', 15, '10.00_15s', '123', '395', '10.00'),
          createBid(15, 'adUnitCode-1', 15, '15.00_15s', '123', '395', '15.00'),
          createBid(25, 'adUnitCode-1', 30, '15.00_30s', '123', '406', '25.00'),
        ];
        bids.forEach((bid) => {
          delete bid.meta;
        });
        return bids;
      }
      amStub.returns(getBids());
      let url;
      parse(buildAdpodVideoUrl({
        code: 'adUnitCode-1',
        callback: handleResponse,
        params: {
          'iu': 'my/adUnit',
          'description_url': 'someUrl.com',
        }
      }));

      function handleResponse(err, masterTag) {
        if (err) {
          return;
        }
        url = parse(masterTag);
        expect(url.protocol).to.equal('https:');
        expect(url.host).to.equal('securepubads.g.doubleclick.net');

        const queryParams = utils.parseQS(url.query);
        expect(queryParams).to.have.property('correlator');
        expect(queryParams).to.have.property('description_url', 'someUrl.com');
        expect(queryParams).to.have.property('env', 'vp');
        expect(queryParams).to.have.property('gdfp_req', '1');
        expect(queryParams).to.have.property('iu', 'my/adUnit');
        expect(queryParams).to.have.property('output', 'xml_vast3');
        expect(queryParams).to.have.property('sz', '640x480');
        expect(queryParams).to.have.property('unviewed_position_start', '1');
        expect(queryParams).to.have.property('url');
        expect(queryParams).to.have.property('cust_params');

        const custParams = utils.parseQS(decodeURIComponent(queryParams.cust_params));
        expect(custParams).to.have.property('hb_cache_id', '123');
        expect(custParams).to.have.property('hb_pb_cat_dur', '10.00_15s,15.00_15s,15.00_30s');
      }
    });

    it('should handle error when cache fails', function() {
      config.setConfig({
        adpod: {
          brandCategoryExclusion: true,
          deferCaching: true
        }
      });
      amStub.returns(getBidsReceived());

      parse(buildAdpodVideoUrl({
        code: 'adUnitCode-1',
        callback: handleResponse,
        params: {
          'iu': 'my/adUnit',
          'description_url': 'someUrl.com',
        }
      }));

      server.requests[0].respond(503, {
        'Content-Type': 'plain/text',
      }, 'The server could not save anything at the moment.');

      function handleResponse(err, masterTag) {
        expect(masterTag).to.be.null;
        expect(err).to.be.an('error');
      }
    });
  })
});

function getBidsReceived() {
  return [
    createBid(10, 'adUnitCode-1', 15, '10.00_395_15s', '123', '395', '10.00'),
    createBid(15, 'adUnitCode-1', 15, '15.00_395_15s', '123', '395', '15.00'),
    createBid(25, 'adUnitCode-1', 30, '15.00_406_30s', '123', '406', '25.00'),
  ]
}

function createBid(cpm, adUnitCode, durationBucket, priceIndustryDuration, uuid, label, hbpb) {
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
      'hb_pb': hbpb,
      'hb_size': '640x360',
      'hb_source': 'client',
      'hb_format': 'video',
      'hb_pb_cat_dur': priceIndustryDuration,
      'hb_cache_id': uuid
    },
    'customCacheKey': `${priceIndustryDuration}_${uuid}`,
    'meta': {
      'primaryCatId': 'iab-1',
      'adServerCatId': label
    },
    'videoCacheKey': '4cf395af-8fee-4960-af0e-88d44e399f14'
  }
}
