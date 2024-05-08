import { expect } from 'chai';
import {
  spec, storage, getNexx360LocalStorage,
} from 'modules/nexx360BidAdapter.js';
import { sandbox } from 'sinon';
import { getAmxId } from '../../../modules/nexx360BidAdapter';

const instreamResponse = {
  'id': '2be64380-ba0c-405a-ab53-51f51c7bde51',
  'cur': 'USD',
  'seatbid': [
    {
      'bid': [
        {
          'id': '8275140264321181514',
          'impid': '263cba3b8bfb72',
          'price': 5,
          'adomain': [
            'appnexus.com'
          ],
          'crid': '97517771',
          'h': 1,
          'w': 1,
          'adm': '<VAST version="3.0">\n    <Ad>\n      <Wrapper>\n        <AdSystem>Nexx360 Wrapper</AdSystem>\n        <VASTAdTagURI><![CDATA[https://fast.nexx360.io/cache?uuid=f093f759-3143-4ad4-a52d-d2c6de420564]]></VASTAdTagURI>\n        <Impression><![CDATA[https://fast.nexx360.io/track-imp?ssp=appnexus&type=booster&price=4.710315591144606&cur=EUR&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&consent=1&abtest_id=0&tag_id=29h5tilm&uuid=8ffb1d9e-3081-4855-87e9-8a9f5c251641&seat=9325&adomain=appnexus.com&mediatype=video]]></Impression>\n        <Impression><![CDATA[https://fast.nexx360.io/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=29h5tilm&uuid=c29446b7-3f15-4354-9ad2-9b7acea4b4b3&seat=9325&adomain=appnexus.com&event=impression]]></Impression>\n        <Creatives>\n          <Creative>\n            <Linear>\n              <TrackingEvents>\n                <Tracking event="start"><![CDATA[https://fast.nexx360.io/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=29h5tilm&uuid=c29446b7-3f15-4354-9ad2-9b7acea4b4b3&seat=9325&adomain=appnexus.com&event=start]]></Tracking>\n                <Tracking event="firstQuartile"><![CDATA[https://fast.nexx360.io/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=29h5tilm&uuid=c29446b7-3f15-4354-9ad2-9b7acea4b4b3&seat=9325&adomain=appnexus.com&event=firstQuartile]]></Tracking>\n                <Tracking event="midpoint"><![CDATA[https://fast.nexx360.io/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=29h5tilm&uuid=c29446b7-3f15-4354-9ad2-9b7acea4b4b3&seat=9325&adomain=appnexus.com&event=midpoint]]></Tracking>\n                <Tracking event="thirdQuartile"><![CDATA[https://fast.nexx360.io/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=29h5tilm&uuid=c29446b7-3f15-4354-9ad2-9b7acea4b4b3&seat=9325&adomain=appnexus.com&event=thirdQuartile]]></Tracking>\n                <Tracking event="complete"><![CDATA[https://fast.nexx360.io/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=29h5tilm&uuid=c29446b7-3f15-4354-9ad2-9b7acea4b4b3&seat=9325&adomain=appnexus.com&event=complete]]></Tracking>\n                <Tracking event="creativeView"><![CDATA[https://fast.nexx360.io/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=29h5tilm&uuid=c29446b7-3f15-4354-9ad2-9b7acea4b4b3&seat=9325&adomain=appnexus.com&event=creativeView]]></Tracking>\n              </TrackingEvents>\n            </Linear>\n          </Creative>\n        </Creatives>\n      </Wrapper>\n    </Ad>\n  </VAST>',
          'ext': {
            'mediaType': 'instream',
            'ssp': 'appnexus',
            'divId': 'video1',
            'adUnitCode': 'video1',
          }
        }
      ],
      'seat': 'appnexus'
    }
  ],
  'ext': {
    'cookies': []
  }
};

describe('Nexx360 bid adapter tests', function () {
  const DISPLAY_BID_REQUEST = {
    'id': '77b3f21a-e0df-4495-8bce-4e8a1d2309c1',
    'imp': [
      {'id': '2b4d8fc1c1c7ea',
        'tagid': 'div-1',
        'ext': {'divId': 'div-1', 'nexx360': {'account': '1067', 'tag_id': 'luvxjvgn'}},
        'banner': {'format': [{'w': 300, 'h': 250}, {'w': 300, 'h': 600}], 'topframe': 1}}, {'id': '38fc428ab96638', 'tagid': 'div-2', 'ext': {'divId': 'div-2', 'nexx360': {'account': '1067', 'tag_id': 'luvxjvgn'}}, 'banner': {'format': [{'w': 728, 'h': 90}, {'w': 970, 'h': 250}], 'topframe': 1}}],
    'cur': ['USD'],
    'at': 1,
    'tmax': 3000,
    'site': {'page': 'https://test.nexx360.io/adapter/index.html?nexx360_test=1', 'domain': 'test.nexx360.io'},
    'regs': {'coppa': 0, 'ext': {'gdpr': 1}},
    'device': {
      'dnt': 0,
      'h': 844,
      'w': 390,
      'ua': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
      'language': 'fr'
    },
    'user': {
      'ext': {
        'consent': 'CPgocUAPgocUAAKAsAENCkCsAP_AAH_AAAqIJDtd_H__bW9r-f5_aft0eY1P9_r37uQzDhfNk-8F3L_W_LwX52E7NF36tq4KmR4ku1LBIUNlHMHUDUmwaokVryHsak2cpzNKJ7BEknMZOydYGF9vmxtj-QKY7_5_d3bx2D-t_9v239z3z81Xn3d53-_03LCdV5_9Dfn9fR_bc9KPt_58v8v8_____3_e__3_7994JEAEmGrcQBdmWODNoGEUCIEYVhIVQKACCgGFogMAHBwU7KwCfWECABAKAIwIgQ4AowIBAAAJAEhEAEgRYIAAARAIAAQAIhEIAGBgEFgBYGAQAAgGgYohQACBIQZEBEUpgQFQJBAa2VCCUF0hphAHWWAFBIjYqABEEgIrAAEBYOAYIkBKxYIEmKN8gBGCFAKJUK1EAAAA.YAAAAAAAAAAA',
        'ConsentedProvidersSettings': {'consented_providers': '1~39.43.46.55.61.70.83.89.93.108.117.122.124.131.135.136.143.144.147.149.159.162.167.171.192.196.202.211.218.228.230.239.241.259.266.272.286.291.311.317.322.323.326.327.338.367.371.385.389.394.397.407.413.415.424.430.436.445.449.453.482.486.491.494.495.501.503.505.522.523.540.550.559.560.568.574.576.584.587.591.733.737.745.787.802.803.817.820.821.829.839.864.867.874.899.904.922.931.938.979.981.985.1003.1024.1027.1031.1033.1040.1046.1051.1053.1067.1085.1092.1095.1097.1099.1107.1127.1135.1143.1149.1152.1162.1166.1186.1188.1201.1205.1211.1215.1226.1227.1230.1252.1268.1270.1276.1284.1286.1290.1301.1307.1312.1345.1356.1364.1365.1375.1403.1415.1416.1419.1440.1442.1449.1455.1456.1465.1495.1512.1516.1525.1540.1548.1555.1558.1564.1570.1577.1579.1583.1584.1591.1603.1616.1638.1651.1653.1665.1667.1677.1678.1682.1697.1699.1703.1712.1716.1721.1725.1732.1745.1750.1765.1769.1782.1786.1800.1808.1810.1825.1827.1832.1838.1840.1842.1843.1845.1859.1866.1870.1878.1880.1889.1899.1917.1929.1942.1944.1962.1963.1964.1967.1968.1969.1978.2003.2007.2008.2027.2035.2039.2044.2047.2052.2056.2064.2068.2070.2072.2074.2088.2090.2103.2107.2109.2115.2124.2130.2133.2137.2140.2145.2147.2150.2156.2166.2177.2183.2186.2202.2205.2216.2219.2220.2222.2225.2234.2253.2264.2279.2282.2292.2299.2305.2309.2312.2316.2322.2325.2328.2331.2334.2335.2336.2337.2343.2354.2357.2358.2359.2370.2376.2377.2387.2392.2394.2400.2403.2405.2407.2411.2414.2416.2418.2425.2440.2447.2459.2461.2462.2465.2468.2472.2477.2481.2484.2486.2488.2493.2496.2497.2498.2499.2501.2510.2511.2517.2526.2527.2532.2534.2535.2542.2552.2563.2564.2567.2568.2569.2571.2572.2575.2577.2583.2584.2596.2601.2604.2605.2608.2609.2610.2612.2614.2621.2628.2629.2633.2634.2636.2642.2643.2645.2646.2647.2650.2651.2652.2656.2657.2658.2660.2661.2669.2670.2677.2681.2684.2686.2687.2690.2695.2698.2707.2713.2714.2729.2739.2767.2768.2770.2772.2784.2787.2791.2792.2798.2801.2805.2812.2813.2816.2817.2818.2821.2822.2827.2830.2831.2834.2838.2839.2840.2844.2846.2847.2849.2850.2852.2854.2856.2860.2862.2863.2865.2867.2869.2873.2874.2875.2876.2878.2880.2881.2882.2883.2884.2886.2887.2888.2889.2891.2893.2894.2895.2897.2898.2900.2901.2908.2909.2911.2912.2913.2914.2916.2917.2918.2919.2920.2922.2923.2924.2927.2929.2930.2931.2939.2940.2941.2947.2949.2950.2956.2961.2962.2963.2964.2965.2966.2968.2970.2973.2974.2975.2979.2980.2981.2983.2985.2986.2987.2991.2994.2995.2997.2999.3000.3002.3003.3005.3008.3009.3010.3012.3016.3017.3018.3019.3024.3025.3028.3034.3037.3038.3043.3045.3048.3052.3053.3055.3058.3059.3063.3065.3066.3068.3070.3072.3073.3074.3075.3076.3077.3078.3089.3090.3093.3094.3095.3097.3099.3104.3106.3109.3112.3117.3118.3119.3120.3124.3126.3127.3128.3130.3135.3136.3145.3149.3150.3151.3154.3155.3162.3163.3167.3172.3173.3180.3182.3183.3184.3185.3187.3188.3189.3190.3194.3196.3197.3209.3210.3211.3214.3215.3217.3219.3222.3223.3225.3226.3227.3228.3230.3231.3232.3234.3235.3236.3237.3238.3240.3241.3244.3245.3250.3251.3253.3257.3260.3268.3270.3272.3281.3288.3290.3292.3293.3295.3296.3300.3306.3307.3308.3314.3315.3316.3318.3324.3327.3328.3330'},
        'eids': [{'source': 'id5-sync.com',
          'uids': [{'id': 'ID5*tdrSpYbccONIbxmulXFRLEil1aozZGGVMo9eEZgydgYoYFZQRYoae3wJyY0YtmXGKGJ7uXIQByQ6f7uzcpy9Oyhj1jGRzCf0BCoI4VkkKZIoZBubolUKUXXxOIdQOz7ZKGV0E3sqi9Zut0BbOuoJAihpLbgfNgDJ0xRmQw04rDooaxn7_TIPzEX5_L5ohNkUKG01Gnh2djvcrcPigKlk7ChwnauCwHIetHYI32yYAnAocYyqoM9XkoVOHtyOTC_UKHIR0qVBVIzJ1Nn_g7kLqyhzfosadKVvf7RQCsE6QrYodtpOJKg7i72-tnMXkzgmKHjh98aEDfTQrZOkKebmAyh6GlOHtYn_sZBFjJwtWp4oe9j2QTNbzK3G0jp1PlJqKHxiu4LawFEKJ3yi5-NFUyh-YkEalJUWyl1cDlWo5NQogAy2HM8N_w0qrVQgNbrTKIHK3KzTXztH7WzBgYrk8g',
            'atype': 1,
            'ext': {'linkType': 2}}]},
        {'source': 'domain.com', 'uids': [{'id': 'value read from cookie or local storage', 'atype': 1, 'ext': {'stype': 'ppuid'}}]}]}},
    'ext': {
      'source': 'prebid.js',
      'version': '7.20.0-pre',
      'pageViewId': '5b970aba-51e9-4e0a-8299-f3f5618c695e'
    }}

  const VIDEO_BID_REQUEST = [
    {
      'bidder': 'nexx360',
      'params': {
        'account': '1067',
        'tagId': 'yqsc1tfj'
      },
      'mediaTypes': {
        'video': {
          'context': 'instream',
          'playerSize': [[640, 480]],
          'mimes': ['video/mp4'],
          'protocols': [1, 2, 3, 4, 5, 6],
          'playbackmethod': [2],
          'skip': 1
        }
      },
      'adUnitCode': 'video1',
      'transactionId': '5434c81c-7210-44ae-9014-67c75dee48d0',
      'sizes': [[640, 480]],
      'bidId': '22f90541e576a3',
      'bidderRequestId': '1d4549243f3bfd',
      'auctionId': 'ed21b528-bcab-47e2-8605-ec9b71000c89',
      'src': 'client',
      'bidRequestsCount': 1,
      'bidderRequestsCount': 1,
      'bidderWinsCount': 0
    }
  ]

  const DEFAULT_OPTIONS = {
    gdprConsent: {
      gdprApplies: true,
      consentString: 'BOzZdA0OzZdA0AGABBENDJ-AAAAvh7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__79__3z3_9pxP78k89r7337Mw_v-_v-b7JCPN_Y3v-8Kg',
      vendorData: {}
    },
    refererInfo: {
      referer: 'https://www.prebid.org',
      canonicalUrl: 'https://www.prebid.org/the/link/to/the/page'
    },
    uspConsent: '111222333',
    userId: { 'id5id': { uid: '1111' } },
    schain: {
      'ver': '1.0',
      'complete': 1,
      'nodes': [{
        'asi': 'exchange1.com',
        'sid': '1234',
        'hp': 1,
        'rid': 'bid-request-1',
        'name': 'publisher',
        'domain': 'publisher.com'
      }]
    },
  };

  describe('isBidRequestValid()', function() {
    let bannerBid;
    beforeEach(function () {
      bannerBid = {
        'bidder': 'nexx360',
        'mediaTypes': {'banner': {'sizes': [[300, 250], [300, 600]]}},
        'adUnitCode': 'div-1',
        'transactionId': '70bdc37e-9475-4b27-8c74-4634bdc2ee66',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '4906582fc87d0c',
        'bidderRequestId': '332fda16002dbe',
        'auctionId': '98932591-c822-42e3-850e-4b3cf748d063',
      }
    });

    it('We verify isBidRequestValid with unvalid adUnitName', function() {
      bannerBid.params = { adUnitName: 1 };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid with empty adUnitName', function() {
      bannerBid.params = { adUnitName: '' };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid with unvalid adUnitPath', function() {
      bannerBid.params = { adUnitPath: 1 };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid with unvalid divId', function() {
      bannerBid.params = { divId: 1 };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid unvalid allBids', function() {
      bannerBid.params = { allBids: 1 };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid with uncorrect tagid', function() {
      bannerBid.params = { 'tagid': 'luvxjvgn' };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid with correct tagId', function() {
      bannerBid.params = { 'tagId': 'luvxjvgn' };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(true);
    });
  });

  describe('getNexx360LocalStorage disabled', function () {
    before(function () {
      sandbox.stub(storage, 'localStorageIsEnabled').callsFake(() => false);
    });
    it('We test if we get the nexx360Id', function() {
      const output = getNexx360LocalStorage();
      expect(output).to.be.eql(false);
    });
    after(function () {
      sandbox.restore()
    });
  })

  describe('getNexx360LocalStorage enabled but nothing', function () {
    before(function () {
      sandbox.stub(storage, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(storage, 'setDataInLocalStorage');
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake((key) => null);
    });
    it('We test if we get the nexx360Id', function() {
      const output = getNexx360LocalStorage();
      expect(typeof output.nexx360Id).to.be.eql('string');
    });
    after(function () {
      sandbox.restore()
    });
  })

  describe('getNexx360LocalStorage enabled but wrong payload', function () {
    before(function () {
      sandbox.stub(storage, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(storage, 'setDataInLocalStorage');
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake((key) => '{"nexx360Id":"5ad89a6e-7801-48e7-97bb-fe6f251f6cb4",}');
    });
    it('We test if we get the nexx360Id', function() {
      const output = getNexx360LocalStorage();
      expect(output).to.be.eql(false);
    });
    after(function () {
      sandbox.restore()
    });
  });

  describe('getNexx360LocalStorage enabled', function () {
    before(function () {
      sandbox.stub(storage, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(storage, 'setDataInLocalStorage');
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake((key) => '{"nexx360Id":"5ad89a6e-7801-48e7-97bb-fe6f251f6cb4"}');
    });
    it('We test if we get the nexx360Id', function() {
      const output = getNexx360LocalStorage();
      expect(output.nexx360Id).to.be.eql('5ad89a6e-7801-48e7-97bb-fe6f251f6cb4');
    });
    after(function () {
      sandbox.restore()
    });
  });

  describe('getAmxId() with localStorage enabled and data not set', function() {
    before(function () {
      sandbox.stub(storage, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(storage, 'setDataInLocalStorage');
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake((key) => null);
    });
    it('We test if we get the amxId', function() {
      const output = getAmxId();
      expect(output).to.be.eql(false);
    });
    after(function () {
      sandbox.restore()
    });
  });

  describe('getAmxId() with localStorage enabled and data set', function() {
    before(function () {
      sandbox.stub(storage, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(storage, 'setDataInLocalStorage');
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake((key) => 'abcdef');
    });
    it('We test if we get the amxId', function() {
      const output = getAmxId();
      expect(output).to.be.eql('abcdef');
    });
    after(function () {
      sandbox.restore()
    });
  });

  describe('buildRequests()', function() {
    before(function () {
      const documentStub = sandbox.stub(document, 'getElementById');
      documentStub.withArgs('div-1').returns({
        offsetWidth: 200,
        offsetHeight: 250,
        style: {
          maxWidth: '400px',
          maxHeight: '350px',
        }
      });
    });
    describe('We test with a multiple display bids', function() {
      const sampleBids = [
        {
          bidder: 'nexx360',
          params: {
            tagId: 'luvxjvgn',
            divId: 'div-1',
            adUnitName: 'header-ad',
            adUnitPath: '/12345/nexx360/Homepage/HP/Header-Ad',
          },
          adUnitCode: 'header-ad-1234',
          transactionId: '469a570d-f187-488d-b1cb-48c1a2009be9',
          sizes: [[300, 250], [300, 600]],
          bidId: '44a2706ac3574',
          bidderRequestId: '359bf8a3c06b2e',
          auctionId: '2e684815-b44e-4e04-b812-56da54adbe74',
          userIdAsEids: [
            {
              source: 'id5-sync.com',
              uids: [
                {
                  id: 'ID5*xe3R0Pbrc5Y4WBrb5UZSWTiS1t9DU2LgQrhdZOgFdXMoglhqmjs_SfBbyHfSYGZKKIT4Gf-XOQ_anA3iqi0hJSiFyD3aICGHDJFxNS8LO84ohwTQ0EiwOexZAbBlH0chKIhbvdGBfuouNuVF_YHCoyiLQJDp3WQiH96lE9MH2T0ojRqoyR623gxAWlBCBPh7KI4bYtZlet3Vtr-gH5_xqCiSEd7aYV37wHxUTSN38Isok_0qDCHg4pKXCcVM2h6FKJSGmvw-xPm9HkfkIcbh1CiVVG4nREP142XrBecdzhQomNlcalmwdzGHsuHPjTP-KJraa15yvvZDceq-f_YfECicDllYBLEsg24oPRM-ibMonWtT9qOm5dSfWS5G_r09KJ4HMB6REICq1wleDD1mwSigXkM_nxIKa4TxRaRqEekoooWRwuKA5-euHN3xxNfIKKP19EtGhuNTs0YdCSe8_w',
                  atype: 1,
                  ext: {
                    linkType: 2
                  }
                }
              ]
            },
            {
              source: 'domain.com',
              uids: [
                {
                  id: 'value read from cookie or local storage',
                  atype: 1,
                  ext: {
                    stype: 'ppuid'
                  }
                }
              ]
            }
          ],
        },
        {
          bidder: 'nexx360',
          params: {
            tagId: 'luvxjvgn',
            allBids: true,
          },
          mediaTypes: {
            banner: {
              sizes: [[728, 90], [970, 250]]
            }
          },
          adUnitCode: 'div-2-abcd',
          transactionId: '6196885d-4e76-40dc-a09c-906ed232626b',
          sizes: [[728, 90], [970, 250]],
          bidId: '5ba94555219a03',
          bidderRequestId: '359bf8a3c06b2e',
          auctionId: '2e684815-b44e-4e04-b812-56da54adbe74',
        }
      ]
      const bidderRequest = {
        bidderCode: 'nexx360',
        auctionId: '2e684815-b44e-4e04-b812-56da54adbe74',
        bidderRequestId: '359bf8a3c06b2e',
        refererInfo: {
          reachedTop: true,
          isAmp: false,
          numIframes: 0,
          stack: [
            'https://test.nexx360.io/adapter/index.html'
          ],
          topmostLocation: 'https://test.nexx360.io/adapter/index.html',
          location: 'https://test.nexx360.io/adapter/index.html',
          canonicalUrl: null,
          page: 'https://test.nexx360.io/adapter/index.html',
          domain: 'test.nexx360.io',
          ref: null,
          legacy: {
            reachedTop: true,
            isAmp: false,
            numIframes: 0,
            stack: [
              'https://test.nexx360.io/adapter/index.html'
            ],
            referer: 'https://test.nexx360.io/adapter/index.html',
            canonicalUrl: null
          },
        },
        gdprConsent: {
          gdprApplies: true,
          consentString: 'CPhdLUAPhdLUAAKAsAENCmCsAP_AAE7AAAqIJFNd_H__bW9r-f5_aft0eY1P9_r37uQzDhfNk-8F3L_W_LwX52E7NF36tq4KmR4ku1LBIUNlHMHUDUmwaokVryHsak2cpzNKJ7BEknMZOydYGF9vmxtj-QKY7_5_d3bx2D-t_9v239z3z81Xn3d53-_03LCdV5_9Dfn9fR_bc9KPt_58v8v8_____3_e__3_7997BIiAaADgAJYBnwEeAJXAXmAwQBj4DtgHcgPBAeKBIgAA.YAAAAAAAAAAA',
        }
      };
      it('We perform a test with 2 display adunits', function() {
        const displayBids = [...sampleBids];
        displayBids[0].mediaTypes = {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        };
        const request = spec.buildRequests(displayBids, bidderRequest);
        const requestContent = request.data;
        expect(request).to.have.property('method').and.to.equal('POST');
        expect(requestContent.cur[0]).to.be.eql('USD');
        expect(requestContent.imp.length).to.be.eql(2);
        expect(requestContent.imp[0].id).to.be.eql('44a2706ac3574');
        expect(requestContent.imp[0].tagid).to.be.eql('header-ad');
        expect(requestContent.imp[0].ext.divId).to.be.eql('div-1');
        expect(requestContent.imp[0].ext.adUnitCode).to.be.eql('header-ad-1234');
        expect(requestContent.imp[0].ext.adUnitName).to.be.eql('header-ad');
        expect(requestContent.imp[0].ext.adUnitPath).to.be.eql('/12345/nexx360/Homepage/HP/Header-Ad');
        expect(requestContent.imp[0].ext.dimensions.slotW).to.be.eql(200);
        expect(requestContent.imp[0].ext.dimensions.slotH).to.be.eql(250);
        expect(requestContent.imp[0].ext.dimensions.cssMaxW).to.be.eql('400px');
        expect(requestContent.imp[0].ext.dimensions.cssMaxH).to.be.eql('350px');
        expect(requestContent.imp[0].ext.nexx360.tagId).to.be.eql('luvxjvgn');
        expect(requestContent.imp[0].banner.format.length).to.be.eql(2);
        expect(requestContent.imp[0].banner.format[0].w).to.be.eql(300);
        expect(requestContent.imp[0].banner.format[0].h).to.be.eql(250);
        expect(requestContent.imp[1].ext.nexx360.allBids).to.be.eql(true);
        expect(requestContent.imp[1].tagid).to.be.eql('div-2-abcd');
        expect(requestContent.imp[1].ext.adUnitCode).to.be.eql('div-2-abcd');
        expect(requestContent.imp[1].ext.divId).to.be.eql('div-2-abcd');
        expect(requestContent.ext.bidderVersion).to.be.eql('4.1');
        expect(requestContent.ext.source).to.be.eql('prebid.js');
      });

      if (FEATURES.VIDEO) {
        it('We perform a test with a multiformat adunit', function() {
          const multiformatBids = [...sampleBids];
          multiformatBids[0].mediaTypes = {
            banner: {
              sizes: [[300, 250], [300, 600]]
            },
            video: {
              context: 'outstream',
              playerSize: [640, 480],
              mimes: ['video/mp4'],
              protocols: [1, 2, 3, 4, 5, 6, 7, 8],
              playbackmethod: [2],
              skip: 1,
              playback_method: ['auto_play_sound_off']
            }
          };
          const request = spec.buildRequests(multiformatBids, bidderRequest);
          const requestContent = request.data;
          expect(requestContent.imp[0].video.ext.context).to.be.eql('outstream');
          expect(requestContent.imp[0].video.playbackmethod[0]).to.be.eql(2);
        });

        it('We perform a test with a instream adunit', function() {
          const videoBids = [sampleBids[0]];
          videoBids[0].mediaTypes = {
            video: {
              context: 'instream',
              playerSize: [640, 480],
              mimes: ['video/mp4'],
              protocols: [1, 2, 3, 4, 5, 6],
              playbackmethod: [2],
              skip: 1
            }
          };
          const request = spec.buildRequests(videoBids, bidderRequest);
          const requestContent = request.data;
          expect(request).to.have.property('method').and.to.equal('POST');
          expect(requestContent.imp[0].video.ext.context).to.be.eql('instream');
          expect(requestContent.imp[0].video.playbackmethod[0]).to.be.eql(2);
        })
      }
    });
    after(function () {
      sandbox.restore()
    });
  });

  describe('interpretResponse()', function() {
    it('empty response', function() {
      const response = {
        body: ''
      };
      const output = spec.interpretResponse(response);
      expect(output.length).to.be.eql(0);
    });
    it('banner responses with adUrl only', function() {
      const response = {
        body: {
          'id': 'a8d3a675-a4ba-4d26-807f-c8f2fad821e0',
          'cur': 'USD',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '4427551302944024629',
                  'impid': '226175918ebeda',
                  'price': 1.5,
                  'adomain': [
                    'http://prebid.org'
                  ],
                  'crid': '98493581',
                  'ssp': 'appnexus',
                  'h': 600,
                  'w': 300,
                  'cat': [
                    'IAB3-1'
                  ],
                  'ext': {
                    'adUnitCode': 'div-1',
                    'mediaType': 'banner',
                    'adUrl': 'https://fast.nexx360.io/cache?uuid=fdddcebc-1edf-489d-880d-1418d8bdc493',
                    'ssp': 'appnexus',
                  }
                }
              ],
              'seat': 'appnexus'
            }
          ],
          'ext': {
            'id': 'de3de7c7-e1cf-4712-80a9-94eb26bfc718',
            'cookies': []
          },
        }
      };
      const output = spec.interpretResponse(response);
      expect(output[0].adUrl).to.be.eql(response.body.seatbid[0].bid[0].ext.adUrl);
      expect(output[0].mediaType).to.be.eql(response.body.seatbid[0].bid[0].ext.mediaType);
      expect(output[0].currency).to.be.eql(response.body.cur);
      expect(output[0].cpm).to.be.eql(response.body.seatbid[0].bid[0].price);
    });
    it('banner responses with adm', function() {
      const response = {
        body: {
          'id': 'a8d3a675-a4ba-4d26-807f-c8f2fad821e0',
          'cur': 'USD',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '4427551302944024629',
                  'impid': '226175918ebeda',
                  'price': 1.5,
                  'adomain': [
                    'http://prebid.org'
                  ],
                  'crid': '98493581',
                  'ssp': 'appnexus',
                  'h': 600,
                  'w': 300,
                  'adm': '<div>TestAd</div>',
                  'cat': [
                    'IAB3-1'
                  ],
                  'ext': {
                    'adUnitCode': 'div-1',
                    'mediaType': 'banner',
                    'adUrl': 'https://fast.nexx360.io/cache?uuid=fdddcebc-1edf-489d-880d-1418d8bdc493',
                    'ssp': 'appnexus',
                  }
                }
              ],
              'seat': 'appnexus'
            }
          ],
          'ext': {
            'id': 'de3de7c7-e1cf-4712-80a9-94eb26bfc718',
            'cookies': []
          },
        }
      };
      const output = spec.interpretResponse(response);
      expect(output[0].ad).to.be.eql(response.body.seatbid[0].bid[0].adm);
      expect(output[0].adUrl).to.be.eql(undefined);
      expect(output[0].mediaType).to.be.eql(response.body.seatbid[0].bid[0].ext.mediaType);
      expect(output[0].currency).to.be.eql(response.body.cur);
      expect(output[0].cpm).to.be.eql(response.body.seatbid[0].bid[0].price);
    });
    it('instream responses', function() {
      const response = {
        body: {
          'id': '2be64380-ba0c-405a-ab53-51f51c7bde51',
          'cur': 'USD',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '8275140264321181514',
                  'impid': '263cba3b8bfb72',
                  'price': 5,
                  'adomain': [
                    'appnexus.com'
                  ],
                  'crid': '97517771',
                  'h': 1,
                  'w': 1,
                  'ext': {
                    'mediaType': 'instream',
                    'ssp': 'appnexus',
                    'adUnitCode': 'video1',
                    'vastXml': '<VAST version="3.0">\n    <Ad>\n      <Wrapper>\n        <AdSystem>Nexx360 Wrapper</AdSystem>\n        <VASTAdTagURI><![CDATA[https://fast.nexx360.io/cache?uuid=f093f759-3143-4ad4-a52d-d2c6de420564]]></VASTAdTagURI>\n        <Impression><![CDATA[https://fast.nexx360.io/track-imp?ssp=appnexus&type=booster&price=4.710315591144606&cur=EUR&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&consent=1&abtest_id=0&tag_id=29h5tilm&uuid=8ffb1d9e-3081-4855-87e9-8a9f5c251641&seat=9325&adomain=appnexus.com&mediatype=video]]></Impression>\n        <Impression><![CDATA[https://fast.nexx360.io/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=29h5tilm&uuid=c29446b7-3f15-4354-9ad2-9b7acea4b4b3&seat=9325&adomain=appnexus.com&event=impression]]></Impression>\n        <Creatives>\n          <Creative>\n            <Linear>\n              <TrackingEvents>\n                <Tracking event="start"><![CDATA[https://fast.nexx360.io/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=29h5tilm&uuid=c29446b7-3f15-4354-9ad2-9b7acea4b4b3&seat=9325&adomain=appnexus.com&event=start]]></Tracking>\n                <Tracking event="firstQuartile"><![CDATA[https://fast.nexx360.io/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=29h5tilm&uuid=c29446b7-3f15-4354-9ad2-9b7acea4b4b3&seat=9325&adomain=appnexus.com&event=firstQuartile]]></Tracking>\n                <Tracking event="midpoint"><![CDATA[https://fast.nexx360.io/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=29h5tilm&uuid=c29446b7-3f15-4354-9ad2-9b7acea4b4b3&seat=9325&adomain=appnexus.com&event=midpoint]]></Tracking>\n                <Tracking event="thirdQuartile"><![CDATA[https://fast.nexx360.io/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=29h5tilm&uuid=c29446b7-3f15-4354-9ad2-9b7acea4b4b3&seat=9325&adomain=appnexus.com&event=thirdQuartile]]></Tracking>\n                <Tracking event="complete"><![CDATA[https://fast.nexx360.io/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=29h5tilm&uuid=c29446b7-3f15-4354-9ad2-9b7acea4b4b3&seat=9325&adomain=appnexus.com&event=complete]]></Tracking>\n                <Tracking event="creativeView"><![CDATA[https://fast.nexx360.io/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=29h5tilm&uuid=c29446b7-3f15-4354-9ad2-9b7acea4b4b3&seat=9325&adomain=appnexus.com&event=creativeView]]></Tracking>\n              </TrackingEvents>\n            </Linear>\n          </Creative>\n        </Creatives>\n      </Wrapper>\n    </Ad>\n  </VAST>'
                  }
                }
              ],
              'seat': 'appnexus'
            }
          ],
          'ext': {
            'cookies': []
          }
        }
      };
      const output = spec.interpretResponse(response);
      expect(output[0].vastXml).to.be.eql(response.body.seatbid[0].bid[0].adm);
      expect(output[0].mediaType).to.be.eql('video');
      expect(output[0].currency).to.be.eql(response.body.cur);
      expect(output[0].cpm).to.be.eql(response.body.seatbid[0].bid[0].price);
    });

    it('outstream responses', function() {
      const response = {
        body: {
          'id': '40c23932-135e-4602-9701-ca36f8d80c07',
          'cur': 'USD',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '1186971142548769361',
                  'impid': '4ce809b61a3928',
                  'price': 5,
                  'adomain': [
                    'appnexus.com'
                  ],
                  'crid': '97517771',
                  'h': 1,
                  'w': 1,
                  'adm': '<VAST version="3.0">\n    <Ad>\n      <Wrapper>\n        <AdSystem>Nexx360 Wrapper</AdSystem>\n        <VASTAdTagURI><![CDATA[http://localhost:8081/cache?uuid=7fcc7c63-3699-4544-a6d5-8ea33ee5bdcb]]></VASTAdTagURI>\n        <Impression><![CDATA[http://localhost:8085/track-imp?ssp=appnexus&type=booster&price=4.710315591144606&cur=EUR&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&consent=1&abtest_id=0&tag_id=yqsc1tfj&uuid=d8fbebb6-f5d7-4ebd-b86b-8b1584c9445e&seat=9325&adomain=appnexus.com&mediatype=video]]></Impression>\n        <Impression><![CDATA[http://localhost:8085/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=yqsc1tfj&uuid=415ad33f-3de1-4a30-bf9d-5751f3bed64d&seat=9325&adomain=appnexus.com&event=impression]]></Impression>\n        <Creatives>\n          <Creative>\n            <Linear>\n              <TrackingEvents>\n                <Tracking event="start"><![CDATA[http://localhost:8085/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=yqsc1tfj&uuid=415ad33f-3de1-4a30-bf9d-5751f3bed64d&seat=9325&adomain=appnexus.com&event=start]]></Tracking>\n                <Tracking event="firstQuartile"><![CDATA[http://localhost:8085/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=yqsc1tfj&uuid=415ad33f-3de1-4a30-bf9d-5751f3bed64d&seat=9325&adomain=appnexus.com&event=firstQuartile]]></Tracking>\n                <Tracking event="midpoint"><![CDATA[http://localhost:8085/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=yqsc1tfj&uuid=415ad33f-3de1-4a30-bf9d-5751f3bed64d&seat=9325&adomain=appnexus.com&event=midpoint]]></Tracking>\n                <Tracking event="thirdQuartile"><![CDATA[http://localhost:8085/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=yqsc1tfj&uuid=415ad33f-3de1-4a30-bf9d-5751f3bed64d&seat=9325&adomain=appnexus.com&event=thirdQuartile]]></Tracking>\n                <Tracking event="complete"><![CDATA[http://localhost:8085/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=yqsc1tfj&uuid=415ad33f-3de1-4a30-bf9d-5751f3bed64d&seat=9325&adomain=appnexus.com&event=complete]]></Tracking>\n                <Tracking event="creativeView"><![CDATA[http://localhost:8085/track-vast?ssp=appnexus&type=booster&user_agent=Mozilla%2F5.0+%28Macintosh%3B+Intel+Mac+OS+X+10_15_7%29+AppleWebKit%2F537.36+%28KHTML%2C+like+Gecko%29+Chrome%2F110.0.0.0+Safari%2F537.36&abtest_id=0&tag_id=yqsc1tfj&uuid=415ad33f-3de1-4a30-bf9d-5751f3bed64d&seat=9325&adomain=appnexus.com&event=creativeView]]></Tracking>\n              </TrackingEvents>\n            </Linear>\n          </Creative>\n        </Creatives>\n      </Wrapper>\n    </Ad>\n  </VAST>',
                  'ext': {
                    'mediaType': 'outstream',
                    'ssp': 'appnexus',
                    'adUnitCode': 'div-1',
                  }
                }
              ],
              'seat': 'appnexus'
            }
          ],
          'ext': {
            'cookies': []
          }
        }
      };
      const output = spec.interpretResponse(response);
      expect(output[0].vastXml).to.be.eql(response.body.seatbid[0].bid[0].adm);
      expect(output[0].mediaType).to.be.eql('video');
      expect(output[0].currency).to.be.eql(response.body.cur);
      expect(typeof output[0].renderer).to.be.eql('object');
      expect(output[0].cpm).to.be.eql(response.body.seatbid[0].bid[0].price);
    });

    it('native responses', function() {
      const response = {
        body: {
          'id': '3c0290c1-6e75-4ef7-9e37-17f5ebf3bfa3',
          'cur': 'USD',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '6624930625245272225',
                  'impid': '23e11d845514bb',
                  'price': 10,
                  'adomain': [
                    'prebid.org'
                  ],
                  'crid': '97494204',
                  'h': 1,
                  'w': 1,
                  'cat': [
                    'IAB3-1'
                  ],
                  'ext': {
                    'mediaType': 'native',
                    'ssp': 'appnexus',
                    'adUnitCode': '/19968336/prebid_native_example_1'
                  },
                  'adm': '{"ver":"1.2","assets":[{"id":1,"img":{"url":"https:\\/\\/vcdn.adnxs.com\\/p\\/creative-image\\/f8\\/7f\\/0f\\/13\\/f87f0f13-230c-4f05-8087-db9216e393de.jpg","w":989,"h":742,"ext":{"appnexus":{"prevent_crop":0}}}},{"id":0,"title":{"text":"This is a Prebid Native Creative"}},{"id":2,"data":{"value":"Prebid.org"}}],"link":{"url":"https:\\/\\/ams3-ib.adnxs.com\\/click?AAAAAAAAJEAAAAAAAAAkQAAAAAAAACRAAAAAAAAAJEAAAAAAAAAkQKZS4ZZl5vVbR6p-A-MwnyTZ7QVkAAAAAOLoyQBtJAAAbSQAAAIAAAC8pM8FnPgWAAAAAABVU0QAVVNEAAEAAQBNXQAAAAABAgMCAAAAALoAURe69gAAAAA.\\/bcr=AAAAAAAA8D8=\\/pp=${AUCTION_PRICE}\\/cnd=%21JBC72Aj8-LwKELzJvi4YnPFbIAQoADEAAAAAAAAkQDoJQU1TMzo2MTM1QNAwSQAAAAAAAPA_UQAAAAAAAAAAWQAAAAAAAAAAYQAAAAAAAAAAaQAAAAAAAAAAcQAAAAAAAAAAeACJAQAAAAAAAAAA\\/cca=OTMyNSNBTVMzOjYxMzU=\\/bn=97062\\/clickenc=http%3A%2F%2Fprebid.org%2Fdev-docs%2Fshow-native-ads.html"},"eventtrackers":[{"event":1,"method":1,"url":"https:\\/\\/ams3-ib.adnxs.com\\/it?an_audit=0&referrer=https%3A%2F%2Ftest.nexx360.io%2Fadapter%2Fnative%2Ftest.html&e=wqT_3QKJCqAJBQAAAwDWAAUBCNnbl6AGEKalhbfZzPn6WxjH1PqbsJzMzyQqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlC8yb4uWJzxW2AAaM26dXim9gWAAQGKAQNVU0SSAQEG9F4BmAEBoAEBqAEBsAEAuAECwAEDyAEC0AEJ2AEA4AEA8AEAigIpdWYoJ2EnLCAyNTI5ODg1LCAwKTt1ZigncicsIDk3NDk0MjA0LCAwKTuSAvEDIS0xRDNJQWo4LUx3S0VMekp2aTRZQUNDYzhWc3dBRGdBUUFSSTdVaFE0dEduQmxnQVlQX19fXzhQYUFCd0FYZ0JnQUVCaUFFQmtBRUJtQUVCb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFYSUtWbWViSmZJXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFNQUNBY2dDQWRBQ0FkZ0NBZUFDQU9nQ0FQZ0NBSUFEQVpnREFib0RDVUZOVXpNNk5qRXpOZUFEMERDSUJBQ1FCQUNZQkFIQkJBQUFBQUFBQUFBQXlRUUFBCQscQUFOZ0VBUEURlSxBQUFDSUJmY3ZxUVUBDQRBQQGoCDdFRgEKCQEMREJCUQkKAQEAeRUoAUwyKAAAWi4oALg0QVhBaEQzd0JhTEQzd0w0QmQyMG1nR0NCZ05WVTBTSUJnQ1FCZ0dZQmdDaEJnQQFONEFBQ1JBcUFZQnNnWWtDHXQARR0MAEcdDABJHQw8dUFZS5oClQEhSkJDNzJBajL1ASRuUEZiSUFRb0FEFfhUa1FEb0pRVTFUTXpvMk1UTTFRTkF3UxFRDFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQwQZUFDSkEdEMjYAvfpA-ACrZhI6gIwaHR0cHM6Ly90ZXN0Lm5leHgzNjAuaW8vYWRhcHRlci9uYXRpdmUJH_CaaHRtbIADAIgDAZADAJgDFKADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMDgAQAkgQJL29wZW5ydGIymAQAqAQAsgQMCAAQABgAIAAwADgAuAQAwASA2rgiyAQA0gQOOTMyNSNBTVMzOjYxMzXaBAIIAeAEAPAEvMm-LvoEEgkAAABAPG1IQBEAAACgV8oCQIgFAZgFAKAF______8BBbABqgUkM2MwMjkwYzEtNmU3NS00ZWY3LTllMzctMTdmNWViZjNiZmEzwAUAyQWJFxTwP9IFCQkJDHgAANgFAeAFAfAFmfQh-gUECAAQAJAGAZgGALgGAMEGCSUo8D_QBvUv2gYWChAJERkBAdpg4AYM8gYCCACABwGIBwCgB0HIB6b2BdIHDRVkASYI2gcGAV1oGADgBwDqBwIIAPAHAIoIAhAAlQgAAIA_mAgB&s=ccf63f2e483a37091d2475d895e7cf7c911d1a78&pp=${AUCTION_PRICE}"}]}'
                }
              ],
              'seat': 'appnexus'
            }
          ],
          'ext': {
            'cookies': [],
          }
        }
      };
      const output = spec.interpretResponse(response);
      expect(output[0].native.ortb.ver).to.be.eql('1.2');
      expect(output[0].native.ortb.assets[0].id).to.be.eql(1);
      expect(output[0].mediaType).to.be.eql('native');
    });
  });

  describe('getUserSyncs()', function() {
    const response = { body: { cookies: [] } };
    it('Verifies user sync without cookie in bid response', function () {
      var syncs = spec.getUserSyncs({}, [response], DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
      expect(syncs).to.have.lengthOf(0);
    });
    it('Verifies user sync with cookies in bid response', function () {
      response.body.ext = {
        cookies: [{'type': 'image', 'url': 'http://www.cookie.sync.org/'}]
      };
      var syncs = spec.getUserSyncs({}, [response], DEFAULT_OPTIONS.gdprConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0]).to.have.property('type').and.to.equal('image');
      expect(syncs[0]).to.have.property('url').and.to.equal('http://www.cookie.sync.org/');
    });
    it('Verifies user sync with no bid response', function() {
      var syncs = spec.getUserSyncs({}, null, DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
      expect(syncs).to.have.lengthOf(0);
    });
    it('Verifies user sync with no bid body response', function() {
      var syncs = spec.getUserSyncs({}, [], DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
      expect(syncs).to.have.lengthOf(0);
      var syncs = spec.getUserSyncs({}, [{}], DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
      expect(syncs).to.have.lengthOf(0);
    });
  });
});
