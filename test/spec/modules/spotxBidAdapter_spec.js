import {expect} from 'chai';
import {spec} from 'modules/spotxBidAdapter';

describe('the spotx adapter', function () {
  function getValidBidObject() {
    return {
      bidId: 123,
      mediaTypes: {
        video: {
          playerSize: [['300', '200']]
        }
      },
      params: {
        channel_id: 12345,
      }
    };
  };

  describe('isBidRequestValid', function() {
    var bid;

    beforeEach(function() {
      bid = getValidBidObject();
    });

    it('should fail validation if the bid isn\'t defined or not an object', function() {
      var result = spec.isBidRequestValid();

      expect(result).to.equal(false);

      result = spec.isBidRequestValid('not an object');

      expect(result).to.equal(false);
    });

    it('should succeed validation with all the right parameters', function() {
      expect(spec.isBidRequestValid(getValidBidObject())).to.equal(true);
    });

    it('should succeed validation with mediaType and outstream_function or outstream_options', function() {
      bid.mediaType = 'video';
      bid.params.outstream_function = 'outstream_func';

      expect(spec.isBidRequestValid(bid)).to.equal(true);

      delete bid.params.outstream_function;
      bid.params.outstream_options = {
        slot: 'elemID'
      };

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should succeed with ad_unit outstream and outstream function set', function() {
      bid.params.ad_unit = 'outstream';
      bid.params.outstream_function = function() {};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should succeed with ad_unit outstream, options set for outstream and slot provided', function() {
      bid.params.ad_unit = 'outstream';
      bid.params.outstream_options = {slot: 'ad_container_id'};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should fail without a channel_id', function() {
      delete bid.params.channel_id;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail without playerSize', function() {
      delete bid.mediaTypes.video.playerSize;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail without video', function() {
      delete bid.mediaTypes.video;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail with ad_unit outstream but no options set for outstream', function() {
      bid.params.ad_unit = 'outstream';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail with ad_unit outstream, options set for outstream but no slot provided', function() {
      bid.params.ad_unit = 'outstream';
      bid.params.outstream_options = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });
  describe('buildRequests', function() {
    var bid, bidRequestObj;

    beforeEach(function() {
      bid = getValidBidObject();
      bidRequestObj = {refererInfo: {referer: 'prebid.js'}};
    });

    it('should build a very basic request', function() {
      var request = spec.buildRequests([bid], bidRequestObj)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('//search.spotxchange.com/openrtb/2.3/dados/12345');
      expect(request.bidRequest).to.equal(bidRequestObj);
      expect(request.data.id).to.equal(12345);
      expect(request.data.ext.wrap_response).to.equal(1);
      expect(request.data.imp.id).to.match(/\d+/);
      expect(request.data.imp.secure).to.equal(0);
      expect(request.data.imp.video).to.deep.equal({
        ext: {
          sdk_name: 'Prebid 1+',
          versionOrtb: '2.3'
        },
        h: '200',
        mimes: [
          'application/javascript',
          'video/mp4',
          'video/webm'
        ],
        w: '300'
      });
      expect(request.data.site).to.deep.equal({
        content: 'content',
        id: '',
        page: 'prebid.js'
      });
    });
    it('should change request parameters based on options sent', function() {
      const GOOGLE_CONSENT = { consented_providers: ['3', '7', '11', '12', '15', '20', '22', '35', '43', '46', '48', '55', '57', '61', '62', '66', '70', '80', '83', '85', '86', '89', '93', '108', '122', '124', '125', '126', '131', '134', '135', '136', '143', '144', '147', '149', '153', '154', '159', '161', '162', '165', '167', '171', '178', '184', '188', '192', '195', '196', '202', '209', '211', '218', '221', '228', '229', '230', '236', '239', '241', '253', '255', '259', '266', '271', '272', '274', '286', '291', '294', '303', '308', '310', '311', '313', '314', '316', '317', '322', '323', '327', '336', '338', '340', '348', '350', '358', '359', '363', '367', '370', '371', '384', '385', '389', '393', '394', '397', '398', '407', '414', '415', '424', '429', '430', '432', '436', '438', '440', '442', '443', '445', '448', '449', '453', '459', '479', '482', '486', '491', '492', '494', '495', '503', '505', '510', '522', '523', '528', '537', '540', '550', '559', '560', '568', '571', '574', '575', '576', '584', '585', '587', '588', '590', '591', '592', '595', '609', '621', '624', '723', '725', '733', '737', '776', '780', '782', '787', '797', '798', '802', '803', '814', '817', '820', '821', '827', '829', '839', '853', '864', '867', '874', '899', '904', '922', '926', '931', '932', '933', '938', '955', '973', '976', '979', '981', '985', '987', '991', '1003', '1024', '1025', '1027', '1028', '1029', '1033', '1034', '1040', '1047', '1048', '1051', '1052', '1053', '1054', '1062', '1063', '1067', '1072', '1085', '1092', '1095', '1097', '1099', '1100', '1107', '1126', '1127', '1143', '1149', '1152', '1162', '1166', '1167', '1170', '1171', '1172', '1188', '1192', '1199', '1201', '1204', '1205', '1211', '1212', '1215', '1220', '1225', '1226', '1227', '1230', '1232', '1236', '1241', '1248', '1250', '1252', '1268', '1275', '1276', '1284', '1286', '1298', '1301', '1307', '1312', '1313', '1317', '1329', '1336', '1344', '1345', '1356', '1362', '1365', '1375', '1403', '1409', '1411', '1415', '1416', '1419', '1423', '1440', '1442', '1449', '1451', '1455', '1456', '1468', '1496', '1503', '1509', '1512', '1514', '1517', '1520', '1525', '1540', '1547', '1548', '1555', '1558', '1570', '1575', '1577', '1579', '1583', '1584', '1591', '1598', '1603', '1608', '1613', '1616', '1626', '1631', '1633', '1638', '1642', '1648', '1651', '1652', '1653', '1660', '1665', '1667', '1669', '1671', '1674', '1677', '1678', '1682', '1684', '1697', '1703', '1705', '1716', '1720', '1721', '1722', '1725', '1732', '1733', '1735', '1739', '1741', '1745', '1750', '1753', '1760', '1765', '1769', '1776', '1780', '1782', '1786', '1791', '1794', '1799', '1800', '1801', '1810', '1827', '1831', '1832', '1834', '1837', '1840', '1843', '1844', '1845', '1858', '1859', '1863', '1866', '1870', '1872', '1875', '1878', '1880', '1882', '1883', '1889', '1892', '1896', '1898', '1899', '1902', '1905', '1911', '1922', '1928', '1929', '1934', '1942', '1943', '1944', '1945', '1958', '1960', '1962', '1963', '1964', '1967', '1968', '1978', '1985', '1986', '1987', '1998', '2003', '2007', '2012', '2013', '2027', '2035', '2038', '2039', '2044', '2047', '2052', '2056', '2059', '2062', '2064', '2068', '2070', '2072', '2078', '2079', '2084', '2088', '2090', '2095', '2100', '2103', '2107', '2109', '2113', '2115', '2121', '2127', '2130', '2133', '2137', '2140', '2141', '2145', '2147', '2150', '2156', '2166', '2170', '2171', '2176', '2177', '2179', '2183', '2186', '2192', '2198', '2202', '2205', '2214', '2216', '2219', '2220', '2222', '2223', '2224', '2225', '2227', '2228', '2234', '2238', '2247', '2251', '2253', '2262', '2264', '2271', '2276', '2278', '2279', '2282', '2290', '2292', '2295', '2299', '2305', '2306', '2310', '2311', '2312', '2315', '2320', '2325', '2328', '2331', '2334', '2335', '2336', '2337', '2343', '2346', '2354', '2357', '2358', '2359', '2366', '2370', '2373', '2376', '2377', '2380', '2382', '2387', '2389', '2392', '2394', '2400', '2403', '2405', '2406', '2407', '2410', '2411', '2413', '2414', '2415', '2416', '2418', '2422', '2425', '2427', '2435', '2437', '2440', '2441', '2447', '2453', '2459', '2461', '2462', '2464', '2467', '2468', '2472', '2477', '2481', '2484', '2486', '2492', '2493', '2496', '2497', '2498', '2499', '2504', '2506', '2510', '2511', '2512', '2517', '2526', '2527', '2531', '2532', '2534', '2542', '2544', '2552', '2555', '2559', '2563', '2564', '2567', '2568', '2569', '2571', '2572', '2573', '2575', '2577', '2579', '2583', '2584', '2586', '2589', '2595', '2596', '2597', '2601', '2604', '2605', '2609', '2610', '2612', '2614', '2621', '2622', '2624', '2628', '2629', '2632', '2634', '2636', '2639', '2643', '2645', '2646', '2647', '2649', '2650', '2651', '2652', '2656', '2657', '2658', '2660', '2661', '2662', '2663', '2664', '2669', '2670', '2673', '2676', '2677', '2678', '2681', '2682', '2684', '2685', '2686', '2689', '2690', '2691', '2695', '2698', '2699', '2702', '2704', '2705', '2706', '2707', '2709', '2710', '2713', '2714', '2727', '2729', '2739', '2758', '2765', '2766', '2767', '2768', '2770', '2771', '2772', '2776', '2777', '2778', '2779', '2780', '2783', '2784', '2786', '2787', '2791', '2792', '2793', '2797', '2798', '2801', '2802', '2803', '2805', '2808', '2809', '2810', '2811', '2812', '2813', '2814', '2817', '2818', '2824', '2826', '2827', '2829', '2830', '2831', '2832', '2834', '2836', '2838', '2840', '2842', '2843', '2844', '2850', '2851', '2852', '2854', '2858', '2860', '2862', '2864', '2865', '2866', '2867', '2868', '2869', '2871'] };
      var request = spec.buildRequests([bid], bidRequestObj)[0];
      expect(request.data.imp.video.ext).to.deep.equal({
        sdk_name: 'Prebid 1+',
        versionOrtb: '2.3'
      });

      bid.params = {
        channel_id: 54321,
        ad_mute: 1,
        hide_skin: 1,
        ad_volume: 1,
        ad_unit: 'incontent',
        outstream_options: {foo: 'bar'},
        outstream_function: '987',
        custom: {bar: 'foo'},
        price_floor: 123,
        start_delay: true,
        number_of_ads: 2,
        spotx_all_google_consent: 1
      };

      bid.userId = {
        id5id: 'id5id_1'
      };

      bid.crumbs = {
        pubcid: 'pubcid_1'
      };

      bid.schain = {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'indirectseller.com',
            sid: '00001',
            hp: 1
          }
        ]
      }

      request = spec.buildRequests([bid], bidRequestObj)[0];
      expect(request.data.id).to.equal(54321);
      expect(request.data.imp.video.ext).to.deep.equal({
        ad_volume: 1,
        hide_skin: 1,
        ad_unit: 'incontent',
        outstream_options: {foo: 'bar'},
        outstream_function: '987',
        custom: {bar: 'foo'},
        sdk_name: 'Prebid 1+',
        versionOrtb: '2.3'
      });

      expect(request.data.imp.video.startdelay).to.equal(1);
      expect(request.data.imp.bidfloor).to.equal(123);
      expect(request.data.ext).to.deep.equal({
        number_of_ads: 2,
        wrap_response: 1
      });
      expect(request.data.user.ext).to.deep.equal({
        consented_providers_settings: GOOGLE_CONSENT,
        eids: [{
          source: 'id5-sync.com',
          uids: [{
            id: 'id5id_1'
          }]
        }],
        fpc: 'pubcid_1'
      })
      expect(request.data.schain).to.deep.equal({
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'indirectseller.com',
            sid: '00001',
            hp: 1
          }
        ]
      });
    });

    it('should process premarket bids', function() {
      var request;
      sinon.stub(Date, 'now').returns(1000);

      bid.params.pre_market_bids = [{
        vast_url: 'prebid.js',
        deal_id: '123abc',
        price: 12,
        currency: 'USD'
      }];

      request = spec.buildRequests([bid], bidRequestObj)[0];
      expect(request.data.imp.video.ext.pre_market_bids).to.deep.equal([
        {
          'cur': 'USD',
          'ext': {
            'event_log': [
              {}
            ]
          },
          'id': '123abc',
          'seatbid': [
            {
              'bid': [
                {
                  'adm': '<?xml version="1.0" encoding="utf-8"?><VAST version="2.0"><Ad><Wrapper><VASTAdTagURI>prebid.js</VASTAdTagURI></Wrapper></Ad></VAST>',
                  'dealid': '123abc',
                  'impid': 1000,
                  'price': 12,
                }
              ]
            }
          ]
        }
      ]);
      Date.now.restore();
    });

    it('should pass GDPR params', function() {
      var request;

      bidRequestObj.gdprConsent = {
        consentString: 'consent123',
        gdprApplies: true
      };

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.user.ext.consent).to.equal('consent123');
    });
  });

  describe('interpretResponse', function() {
    var serverResponse, bidderRequestObj;

    beforeEach(function() {
      bidderRequestObj = {
        bidRequest: {
          bids: [{
            mediaTypes: {
              video: {
                playerSize: [['400', '300']]
              }
            },
            bidId: 123,
            params: {
              player_width: 400,
              player_height: 300,
              content_page_url: 'prebid.js',
              ad_mute: 1,
              outstream_options: {foo: 'bar'},
              outstream_function: 'function'
            }
          }, {
            mediaTypes: {
              video: {
                playerSize: [['200', '100']]
              }
            },
            bidId: 124,
            params: {
              player_width: 200,
              player_height: 100,
              content_page_url: 'prebid.js',
              ad_mute: 1,
              outstream_options: {foo: 'bar'},
              outstream_function: 'function'
            }
          }]
        }
      };

      serverResponse = {
        body: {
          id: 12345,
          seatbid: [{
            bid: [{
              impid: 123,
              cur: 'USD',
              price: 12,
              crid: 321,
              w: 400,
              h: 300,
              ext: {
                cache_key: 'cache123',
                slot: 'slot123'
              }
            }, {
              impid: 124,
              cur: 'USD',
              price: 13,
              w: 200,
              h: 100,
              ext: {
                cache_key: 'cache124',
                slot: 'slot124'
              }
            }]
          }]
        }
      };
    });

    it('should return an array of bid responses', function() {
      var responses = spec.interpretResponse(serverResponse, bidderRequestObj);
      expect(responses).to.be.an('array').with.length(2);
      expect(responses[0].cache_key).to.equal('cache123');
      expect(responses[0].channel_id).to.equal(12345);
      expect(responses[0].cpm).to.equal(12);
      expect(responses[0].creativeId).to.equal(321);
      expect(responses[0].currency).to.equal('USD');
      expect(responses[0].height).to.equal(300);
      expect(responses[0].mediaType).to.equal('video');
      expect(responses[0].netRevenue).to.equal(true);
      expect(responses[0].requestId).to.equal(123);
      expect(responses[0].ttl).to.equal(360);
      expect(responses[0].vastUrl).to.equal('//search.spotxchange.com/ad/vast.html?key=cache123');
      expect(responses[0].width).to.equal(400);
      expect(responses[1].cache_key).to.equal('cache124');
      expect(responses[1].channel_id).to.equal(12345);
      expect(responses[1].cpm).to.equal(13);
      expect(responses[1].creativeId).to.equal('');
      expect(responses[1].currency).to.equal('USD');
      expect(responses[1].height).to.equal(100);
      expect(responses[1].mediaType).to.equal('video');
      expect(responses[1].netRevenue).to.equal(true);
      expect(responses[1].requestId).to.equal(124);
      expect(responses[1].ttl).to.equal(360);
      expect(responses[1].vastUrl).to.equal('//search.spotxchange.com/ad/vast.html?key=cache124');
      expect(responses[1].width).to.equal(200);
    });
  });

  describe('oustreamRender', function() {
    var serverResponse, bidderRequestObj;

    beforeEach(function() {
      bidderRequestObj = {
        bidRequest: {
          bids: [{
            mediaTypes: {
              video: {
                playerSize: [['400', '300']]
              }
            },
            bidId: 123,
            params: {
              ad_unit: 'outstream',
              player_width: 400,
              player_height: 300,
              content_page_url: 'prebid.js',
              outstream_options: {
                ad_mute: 1,
                foo: 'bar',
                slot: 'slot123',
                playersize_auto_adapt: true,
                custom_override: {
                  digitrust_opt_out: 1,
                  vast_url: 'bad_vast'
                }
              },
            }
          }]
        }
      };

      serverResponse = {
        body: {
          id: 12345,
          seatbid: [{
            bid: [{
              impid: 123,
              cur: 'USD',
              price: 12,
              crid: 321,
              w: 400,
              h: 300,
              ext: {
                cache_key: 'cache123',
                slot: 'slot123'
              }
            }]
          }]
        }
      };
    });

    it('should attempt to insert the EASI script', function() {
      var scriptTag;
      sinon.stub(window.document, 'getElementById').returns({
        appendChild: sinon.stub().callsFake(function(script) { scriptTag = script })
      });
      var responses = spec.interpretResponse(serverResponse, bidderRequestObj);

      responses[0].renderer.render(responses[0]);

      expect(scriptTag.getAttribute('type')).to.equal('text/javascript');
      expect(scriptTag.getAttribute('src')).to.equal('//js.spotx.tv/easi/v1/12345.js');
      expect(scriptTag.getAttribute('data-spotx_channel_id')).to.equal('12345');
      expect(scriptTag.getAttribute('data-spotx_vast_url')).to.equal('//search.spotxchange.com/ad/vast.html?key=cache123');
      expect(scriptTag.getAttribute('data-spotx_ad_unit')).to.equal('incontent');
      expect(scriptTag.getAttribute('data-spotx_collapse')).to.equal('0');
      expect(scriptTag.getAttribute('data-spotx_autoplay')).to.equal('1');
      expect(scriptTag.getAttribute('data-spotx_blocked_autoplay_override_mode')).to.equal('1');
      expect(scriptTag.getAttribute('data-spotx_video_slot_can_autoplay')).to.equal('1');
      expect(scriptTag.getAttribute('data-spotx_digitrust_opt_out')).to.equal('1');
      expect(scriptTag.getAttribute('data-spotx_content_width')).to.equal('400');
      expect(scriptTag.getAttribute('data-spotx_content_height')).to.equal('300');
      window.document.getElementById.restore();
    });

    it('should append into an iframe', function() {
      var scriptTag;
      sinon.stub(window.document, 'getElementById').returns({
        nodeName: 'IFRAME',
        contentDocument: {
          body: {
            appendChild: sinon.stub().callsFake(function(script) { scriptTag = script })
          }
        }
      });

      bidderRequestObj.bidRequest.bids[0].params.outstream_options.in_iframe = 'iframeId';

      var responses = spec.interpretResponse(serverResponse, bidderRequestObj);

      responses[0].renderer.render(responses[0]);

      expect(scriptTag.getAttribute('type')).to.equal('text/javascript');
      expect(scriptTag.getAttribute('src')).to.equal('//js.spotx.tv/easi/v1/12345.js');
      expect(scriptTag.getAttribute('data-spotx_channel_id')).to.equal('12345');
      expect(scriptTag.getAttribute('data-spotx_vast_url')).to.equal('//search.spotxchange.com/ad/vast.html?key=cache123');
      expect(scriptTag.getAttribute('data-spotx_ad_unit')).to.equal('incontent');
      expect(scriptTag.getAttribute('data-spotx_collapse')).to.equal('0');
      expect(scriptTag.getAttribute('data-spotx_autoplay')).to.equal('1');
      expect(scriptTag.getAttribute('data-spotx_blocked_autoplay_override_mode')).to.equal('1');
      expect(scriptTag.getAttribute('data-spotx_video_slot_can_autoplay')).to.equal('1');
      expect(scriptTag.getAttribute('data-spotx_digitrust_opt_out')).to.equal('1');
      expect(scriptTag.getAttribute('data-spotx_content_width')).to.equal('400');
      expect(scriptTag.getAttribute('data-spotx_content_height')).to.equal('300');
      window.document.getElementById.restore();
    });
  });
});
