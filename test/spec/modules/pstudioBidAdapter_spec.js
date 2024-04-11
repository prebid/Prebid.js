import { assert } from 'chai';
import sinon from 'sinon';
import { spec, storage } from 'modules/pstudioBidAdapter.js';
import { deepClone } from '../../../src/utils.js';

describe('PStudioAdapter', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  const bannerBid = {
    bidder: 'pstudio',
    params: {
      pubid: '258c2a8d-d2ad-4c31-a2a5-e63001186456',
      floorPrice: 1.15,
    },
    adUnitCode: 'test-div-1',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 600],
        ],
        pos: 0,
        name: 'some-name',
      },
    },
    bidId: '30b31c1838de1e',
  };

  const videoBid = {
    bidder: 'pstudio',
    params: {
      pubid: '258c2a8d-d2ad-4c31-a2a5-e63001186456',
      floorPrice: 1.15,
    },
    adUnitCode: 'test-div-1',
    mediaTypes: {
      video: {
        playerSize: [[300, 250]],
        mimes: ['video/mp4'],
        minduration: 5,
        maxduration: 30,
        protocols: [2, 3],
        startdelay: 5,
        placement: 2,
        skip: 1,
        skipafter: 1,
        minbitrate: 10,
        maxbitrate: 10,
        delivery: 1,
        playbackmethod: [1, 3],
        api: [2],
        linearity: 1,
      },
    },
    bidId: '30b31c1838de1e',
  };

  const bidWithOptionalParams = deepClone(bannerBid);
  bidWithOptionalParams.params['bcat'] = ['IAB17-18', 'IAB7-42'];
  bidWithOptionalParams.params['badv'] = ['ford.com'];
  bidWithOptionalParams.params['bapp'] = ['com.foo.mygame'];
  bidWithOptionalParams.params['regs'] = {
    coppa: 1,
  };

  bidWithOptionalParams.userId = {
    uid2: {
      id: '7505e78e-4a9b-4011-8901-0e00c3f55ea9',
    },
  };

  const emptyOrtb2BidderRequest = { ortb2: {} };

  const baseBidderRequest = {
    ortb2: {
      device: {
        w: 1680,
        h: 342,
      },
    },
  };

  const extendedBidderRequest = deepClone(baseBidderRequest);
  extendedBidderRequest.ortb2['device'] = {
    dnt: 0,
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    lmt: 0,
    ip: '192.0.0.1',
    ipv6: '2001:0000:130F:0000:0000:09C0:876A:130B',
    devicetype: 2,
    make: 'some_producer',
    model: 'some_model',
    os: 'some_os',
    osv: 'some_version',
    js: 1,
    language: 'en',
    carrier: 'WiFi',
    connectiontype: 0,
    ifa: 'some_ifa',
    geo: {
      lat: 50.4,
      lon: 40.2,
      country: 'some_country_code',
      region: 'some_region_code',
      regionfips104: 'some_fips_code',
      metro: 'metro_code',
      city: 'city_code',
      zip: 'zip_code',
      type: 2,
    },
    ext: {
      ifatype: 'dpid',
    },
  };
  extendedBidderRequest.ortb2['site'] = {
    id: 'some_id',
    name: 'example',
    domain: 'page.example.com',
    cat: ['IAB2'],
    sectioncat: ['IAB2-2'],
    pagecat: ['IAB2-2'],
    page: 'https://page.example.com/here.html',
    ref: 'https://ref.example.com',
    publisher: {
      name: 'some_name',
      cat: ['IAB2'],
      domain: 'https://page.example.com/here.html',
    },
    content: {
      id: 'some_id',
      episode: 22,
      title: 'New episode.',
      series: 'New series.',
      artist: 'New artist',
      genre: 'some genre',
      album: 'New album',
      isrc: 'AA-6Q7-20-00047',
      season: 'New season',
    },
    mobile: 0,
  };
  extendedBidderRequest.ortb2['app'] = {
    id: 'some_id',
    name: 'example',
    bundle: 'some_bundle',
    domain: 'page.example.com',
    storeurl: 'https://store.example.com',
    cat: ['IAB2'],
    sectioncat: ['IAB2-2'],
    pagecat: ['IAB2-2'],
    ver: 'some_version',
    privacypolicy: 0,
    paid: 0,
    keywords: 'some, example, keywords',
    publisher: {
      name: 'some_name',
      cat: ['IAB2'],
      domain: 'https://page.example.com/here.html',
    },
    content: {
      id: 'some_id',
      episode: 22,
      title: 'New episode.',
      series: 'New series.',
      artist: 'New artist',
      genre: 'some genre',
      album: 'New album',
      isrc: 'AA-6Q7-20-00047',
      season: 'New season',
    },
  };
  extendedBidderRequest.ortb2['user'] = {
    yob: 1992,
    gender: 'M',
  };
  extendedBidderRequest.ortb2['regs'] = {
    coppa: 0,
  };

  describe('isBidRequestValid', function () {
    it('should return true when publisher id found', function () {
      expect(spec.isBidRequestValid(bannerBid)).to.equal(true);
    });

    it('should return true for video bid', () => {
      expect(spec.isBidRequestValid(videoBid)).to.equal(true);
    });

    it('should return false when publisher id not found', function () {
      const localBid = deepClone(bannerBid);
      delete localBid.params.pubid;
      delete localBid.params.floorPrice;

      expect(spec.isBidRequestValid(localBid)).to.equal(false);
    });

    it('should return false when playerSize in video not found', () => {
      const localBid = deepClone(videoBid);
      delete localBid.mediaTypes.video.playerSize;

      expect(spec.isBidRequestValid(localBid)).to.equal(false);
    });

    it('should return false when mimes in video not found', () => {
      const localBid = deepClone(videoBid);
      delete localBid.mediaTypes.video.mimes;

      expect(spec.isBidRequestValid(localBid)).to.equal(false);
    });

    it('should return false when protocols in video not found', () => {
      const localBid = deepClone(videoBid);
      delete localBid.mediaTypes.video.protocols;

      expect(spec.isBidRequestValid(localBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bannerRequest = spec.buildRequests([bannerBid], baseBidderRequest);
    const bannerPayload = JSON.parse(bannerRequest[0].data);
    const videoRequest = spec.buildRequests([videoBid], baseBidderRequest);
    const videoPayload = JSON.parse(videoRequest[0].data);

    it('should properly map ids in request payload', function () {
      expect(bannerPayload.id).to.equal(bannerBid.bidId);
      expect(bannerPayload.adtagid).to.equal(bannerBid.adUnitCode);
    });

    it('should properly map banner mediaType in request payload', function () {
      expect(bannerPayload.banner_properties).to.deep.equal({
        name: bannerBid.mediaTypes.banner.name,
        sizes: bannerBid.mediaTypes.banner.sizes,
        pos: bannerBid.mediaTypes.banner.pos,
      });
    });

    it('should properly map video mediaType in request payload', () => {
      expect(videoPayload.video_properties).to.deep.equal({
        w: videoBid.mediaTypes.video.playerSize[0][0],
        h: videoBid.mediaTypes.video.playerSize[0][1],
        mimes: videoBid.mediaTypes.video.mimes,
        minduration: videoBid.mediaTypes.video.minduration,
        maxduration: videoBid.mediaTypes.video.maxduration,
        protocols: videoBid.mediaTypes.video.protocols,
        startdelay: videoBid.mediaTypes.video.startdelay,
        placement: videoBid.mediaTypes.video.placement,
        skip: videoBid.mediaTypes.video.skip,
        skipafter: videoBid.mediaTypes.video.skipafter,
        minbitrate: videoBid.mediaTypes.video.minbitrate,
        maxbitrate: videoBid.mediaTypes.video.maxbitrate,
        delivery: videoBid.mediaTypes.video.delivery,
        playbackmethod: videoBid.mediaTypes.video.playbackmethod,
        api: videoBid.mediaTypes.video.api,
        linearity: videoBid.mediaTypes.video.linearity,
      });
    });

    it('should properly set required bidder params in request payload', function () {
      expect(bannerPayload.pubid).to.equal(bannerBid.params.pubid);
      expect(bannerPayload.floor_price).to.equal(bannerBid.params.floorPrice);
    });

    it('should omit optional bidder params or first-party data from bid request if they are not provided', function () {
      assert.isUndefined(bannerPayload.bcat);
      assert.isUndefined(bannerPayload.badv);
      assert.isUndefined(bannerPayload.bapp);
      assert.isUndefined(bannerPayload.user);
      assert.isUndefined(bannerPayload.device);
      assert.isUndefined(bannerPayload.site);
      assert.isUndefined(bannerPayload.app);
      assert.isUndefined(bannerPayload.user_ids);
      assert.isUndefined(bannerPayload.regs);
    });

    it('should properly set optional bidder parameters', function () {
      const request = spec.buildRequests(
        [bidWithOptionalParams],
        baseBidderRequest
      );
      const payload = JSON.parse(request[0].data);

      expect(payload.bcat).to.deep.equal(['IAB17-18', 'IAB7-42']);
      expect(payload.badv).to.deep.equal(['ford.com']);
      expect(payload.bapp).to.deep.equal(['com.foo.mygame']);
    });

    it('should properly set optional user_ids', function () {
      const request = spec.buildRequests(
        [bidWithOptionalParams],
        baseBidderRequest
      );
      const {
        user: { uid2_token },
      } = JSON.parse(request[0].data);
      const expectedUID = '7505e78e-4a9b-4011-8901-0e00c3f55ea9';

      expect(uid2_token).to.equal(expectedUID);
    });

    it('should properly set optional user_ids when no first party data is provided', function () {
      const request = spec.buildRequests(
        [bidWithOptionalParams],
        emptyOrtb2BidderRequest
      );
      const {
        user: { uid2_token },
      } = JSON.parse(request[0].data);
      const expectedUID = '7505e78e-4a9b-4011-8901-0e00c3f55ea9';

      expect(uid2_token).to.equal(expectedUID);
    });

    it('should properly handle first-party data', function () {
      const request = spec.buildRequests([bannerBid], extendedBidderRequest);
      const payload = JSON.parse(request[0].data);

      expect(payload.user).to.deep.equal(extendedBidderRequest.ortb2.user);
      expect(payload.device).to.deep.equal(extendedBidderRequest.ortb2.device);
      expect(payload.site).to.deep.equal(extendedBidderRequest.ortb2.site);
      expect(payload.app).to.deep.equal(extendedBidderRequest.ortb2.app);
      expect(payload.regs).to.deep.equal(extendedBidderRequest.ortb2.regs);
    });

    it('should not set first-party data if nothing is provided in ORTB2 param', function () {
      const request = spec.buildRequests([bannerBid], emptyOrtb2BidderRequest);
      const payload = JSON.parse(request[0].data);

      expect(payload).not.to.haveOwnProperty('user');
      expect(payload).not.to.haveOwnProperty('device');
      expect(payload).not.to.haveOwnProperty('site');
      expect(payload).not.to.haveOwnProperty('app');
      expect(payload).not.to.haveOwnProperty('regs');
    });

    it('should set user id if proper cookie is present', function () {
      const cookie = '157bc918-b961-4216-ac72-29fc6363edcb';
      sandbox.stub(storage, 'getCookie').returns(cookie);

      const request = spec.buildRequests([bannerBid], emptyOrtb2BidderRequest);
      const payload = JSON.parse(request[0].data);

      expect(payload.user.id).to.equal(cookie);
    });

    it('should not set user id if proper cookie not present', function () {
      const request = spec.buildRequests([bannerBid], emptyOrtb2BidderRequest);
      const payload = JSON.parse(request[0].data);

      expect(payload).not.to.haveOwnProperty('user');
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      body: {
        id: '123141241231',
        bids: [
          {
            cpm: 1.02,
            width: 300,
            height: 600,
            currency: 'USD',
            ad: '<h1>Hello ad</h1>',
            creative_id: 'crid12345',
            net_revenue: true,
            meta: {
              advertiser_domains: ['https://advertiser.com'],
            },
          },
        ],
      },
    };

    const serverVideoResponse = {
      body: {
        id: '123141241231',
        bids: [
          {
            vast_url: 'https://v.a/st.xml',
            cpm: 5,
            width: 640,
            height: 480,
            currency: 'USD',
            creative_id: 'crid12345',
            net_revenue: true,
            meta: {
              advertiser_domains: ['https://advertiser.com'],
            },
          },
        ],
      },
    };

    const bidRequest = {
      method: 'POST',
      url: 'test-url',
      data: JSON.stringify({
        id: '12345',
        pubid: 'somepubid',
      }),
    };

    it('should properly parse response from server', function () {
      const expectedResponse = {
        requestId: JSON.parse(bidRequest.data).id,
        cpm: serverResponse.body.bids[0].cpm,
        width: serverResponse.body.bids[0].width,
        height: serverResponse.body.bids[0].height,
        ad: serverResponse.body.bids[0].ad,
        currency: serverResponse.body.bids[0].currency,
        creativeId: serverResponse.body.bids[0].creative_id,
        netRevenue: serverResponse.body.bids[0].net_revenue,
        meta: {
          advertiserDomains:
            serverResponse.body.bids[0].meta.advertiser_domains,
        },
        ttl: 300,
      };
      const parsedResponse = spec.interpretResponse(serverResponse, bidRequest);

      expect(parsedResponse[0]).to.deep.equal(expectedResponse);
    });

    it('should properly parse video response from server', function () {
      const expectedResponse = {
        requestId: JSON.parse(bidRequest.data).id,
        cpm: serverVideoResponse.body.bids[0].cpm,
        width: serverVideoResponse.body.bids[0].width,
        height: serverVideoResponse.body.bids[0].height,
        currency: serverVideoResponse.body.bids[0].currency,
        creativeId: serverVideoResponse.body.bids[0].creative_id,
        netRevenue: serverVideoResponse.body.bids[0].net_revenue,
        mediaType: 'video',
        vastUrl: serverVideoResponse.body.bids[0].vast_url,
        vastXml: undefined,
        meta: {
          advertiserDomains:
            serverVideoResponse.body.bids[0].meta.advertiser_domains,
        },
        ttl: 300,
      };
      const parsedResponse = spec.interpretResponse(
        serverVideoResponse,
        bidRequest
      );

      expect(parsedResponse[0]).to.deep.equal(expectedResponse);
    });

    it('should return empty array if no bids are returned', function () {
      const emptyResponse = deepClone(serverResponse);
      emptyResponse.body.bids = undefined;

      const parsedResponse = spec.interpretResponse(emptyResponse, bidRequest);

      expect(parsedResponse).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    it('should return sync object with correctly injected user id', function () {
      sandbox.stub(storage, 'getCookie').returns('testid');

      const result = spec.getUserSyncs({}, {}, {}, {});

      expect(result).to.deep.equal([
        {
          type: 'image',
          url: 'https://match.adsrvr.org/track/cmf/generic?ttd_pid=k1on5ig&ttd_tpi=1&ttd_puid=testid&dsp=ttd',
        },
        {
          type: 'image',
          url: 'https://dsp.myads.telkomsel.com/api/v1/pixel?uid=testid',
        },
      ]);
    });

    it('should generate user id and put the same uuid it into sync object', function () {
      sandbox.stub(storage, 'getCookie').returns(undefined);

      const result = spec.getUserSyncs({}, {}, {}, {});
      const url1 = result[0].url;
      const url2 = result[1].url;

      const expectedUID1 = extractValueFromURL(url1, 'ttd_puid');
      const expectedUID2 = extractValueFromURL(url2, 'uid');

      expect(expectedUID1).to.equal(expectedUID2);

      expect(result[0]).deep.equal({
        type: 'image',
        url: `https://match.adsrvr.org/track/cmf/generic?ttd_pid=k1on5ig&ttd_tpi=1&ttd_puid=${expectedUID1}&dsp=ttd`,
      });
      expect(result[1]).deep.equal({
        type: 'image',
        url: `https://dsp.myads.telkomsel.com/api/v1/pixel?uid=${expectedUID2}`,
      });
      // Helper function to extract UUID from URL
      function extractValueFromURL(url, key) {
        const match = url.match(new RegExp(`[?&]${key}=([^&]*)`));
        return match ? match[1] : null;
      }
    });
  });
});
