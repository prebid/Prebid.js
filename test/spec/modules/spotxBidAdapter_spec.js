import {expect} from 'chai';
import {config} from 'src/config.js';
import {spec, GOOGLE_CONSENT} from 'modules/spotxBidAdapter.js';

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
      bidRequestObj = {
        refererInfo: {
          page: 'prebid.js'
        }
      };
    });

    it('should build a very basic request', function() {
      var request = spec.buildRequests([bid], bidRequestObj)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://search.spotxchange.com/openrtb/2.3/dados/12345?src_sys=prebid');
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
        start_delay: true,
        number_of_ads: 2,
        spotx_all_google_consent: 1,
        min_duration: 5,
        max_duration: 10,
        placement_type: 1,
        position: 1
      };

      bid.userId = {
        id5id: { uid: 'id5id_1' },
        tdid: 'tdid_1'
      };

      bid.crumbs = {
        pubcid: 'pubcid_1'
      };

      bid.schain = {
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
      expect(request.data.imp.video).to.contain({
        minduration: 5,
        maxduration: 10
      })
      expect(request.data.imp.video.ext).to.deep.equal({
        ad_volume: 1,
        hide_skin: 1,
        ad_unit: 'incontent',
        outstream_options: {foo: 'bar'},
        outstream_function: '987',
        custom: {bar: 'foo'},
        sdk_name: 'Prebid 1+',
        versionOrtb: '2.3',
        placement: 1,
        pos: 1
      });

      expect(request.data.imp.video.startdelay).to.equal(1);
      expect(request.data.ext).to.deep.equal({
        number_of_ads: 2,
        wrap_response: 1
      });
      expect(request.data.user.ext).to.deep.equal({
        consented_providers_settings: GOOGLE_CONSENT,
        eids: [{
          source: 'id5-sync.com',
          uids: [{
            id: 'id5id_1',
            ext: {}
          }]
        },
        {
          source: 'adserver.org',
          uids: [{
            id: 'tdid_1',
            ext: {
              rtiPartner: 'TDID'
            }
          }]
        }],
        fpc: 'pubcid_1'
      })

      expect(request.data.source).to.deep.equal({
        ext: {
          schain: {
            complete: 1,
            nodes: [
              {
                asi: 'indirectseller.com',
                sid: '00001',
                hp: 1
              }
            ]
          }
        }
      })
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

    it('should pass CCPA us_privacy string', function() {
      var request;

      bidRequestObj.uspConsent = '1YYY'

      request = spec.buildRequests([bid], bidRequestObj)[0];
      expect(request.data.regs.ext.us_privacy).to.equal('1YYY');
    });

    it('should pass both GDPR params and CCPA us_privacy', function() {
      var request;

      bidRequestObj.gdprConsent = {
        consentString: 'consent123',
        gdprApplies: true
      };
      bidRequestObj.uspConsent = '1YYY'

      request = spec.buildRequests([bid], bidRequestObj)[0];
      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.user.ext.consent).to.equal('consent123');
      expect(request.data.regs.ext.us_privacy).to.equal('1YYY');
    });

    it('should pass min and max duration params', function() {
      var request;

      bid.params.min_duration = 3
      bid.params.max_duration = 15

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.imp.video.minduration).to.equal(3);
      expect(request.data.imp.video.maxduration).to.equal(15);
    });

    it('should pass placement_type and position params', function() {
      var request;

      bid.params.placement_type = 2
      bid.params.position = 5

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.imp.video.ext.placement).to.equal(2);
      expect(request.data.imp.video.ext.pos).to.equal(5);
    });

    it('should pass page param and override refererInfo.referer', function() {
      var request;

      bid.params.page = 'https://example.com';

      var origGetConfig = config.getConfig;
      sinon.stub(config, 'getConfig').callsFake(function (key) {
        if (key === 'pageUrl') {
          return 'https://www.spotx.tv';
        }
        return origGetConfig.apply(config, arguments);
      });

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.site.page).to.equal('https://example.com');
      config.getConfig.restore();
    });

    it('should use refererInfo.referer if no page is passed', function() {
      var request;

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.site.page).to.equal('prebid.js');
    });

    it('should set ext.wrap_response to 0 when cache url is set and ignoreBidderCacheKey is true', function() {
      var request;

      var origGetConfig = config.getConfig;
      sinon.stub(config, 'getConfig').callsFake(function (key) {
        if (key === 'cache') {
          return {
            url: 'prebidCacheLocation',
            ignoreBidderCacheKey: true
          };
        }
        if (key === 'cache.url') {
          return 'prebidCacheLocation';
        }
        if (key === 'cache.ignoreBidderCacheKey') {
          return true;
        }
        return origGetConfig.apply(config, arguments);
      });

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.ext.wrap_response).to.equal(0);
      config.getConfig.restore();
    });

    it('should pass price floor in USD from the floors module if available', function () {
      var request;

      bid.getFloor = function () {
        return { currency: 'USD', floor: 3 };
      }

      bid.params.price_floor = 2;

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.imp.bidfloor).to.equal(3);
    });

    it('should not pass price floor if price floors module gives a non-USD currency', function () {
      var request;

      bid.getFloor = function () {
        return { currency: 'EUR', floor: 3 };
      }

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.imp.bidfloor).to.be.undefined;
    });

    it('if floors module is not available, should pass price floor from price_floor param if available', function () {
      var request;

      bid.params.price_floor = 2;

      request = spec.buildRequests([bid], bidRequestObj)[0];

      expect(request.data.imp.bidfloor).to.equal(2);
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
              adomain: ['abc.com'],
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
              adomain: ['def.com'],
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
      expect(responses[0].meta.advertiserDomains[0]).to.equal('abc.com');
      expect(responses[0].cpm).to.equal(12);
      expect(responses[0].creativeId).to.equal(321);
      expect(responses[0].currency).to.equal('USD');
      expect(responses[0].height).to.equal(300);
      expect(responses[0].mediaType).to.equal('video');
      expect(responses[0].netRevenue).to.equal(true);
      expect(responses[0].requestId).to.equal(123);
      expect(responses[0].ttl).to.equal(360);
      expect(responses[0].vastUrl).to.equal('https://search.spotxchange.com/ad/vast.html?key=cache123');
      expect(responses[0].videoCacheKey).to.equal('cache123');
      expect(responses[0].width).to.equal(400);
      expect(responses[1].cache_key).to.equal('cache124');
      expect(responses[1].channel_id).to.equal(12345);
      expect(responses[1].cpm).to.equal(13);
      expect(responses[1].meta.advertiserDomains[0]).to.equal('def.com');
      expect(responses[1].creativeId).to.equal('');
      expect(responses[1].currency).to.equal('USD');
      expect(responses[1].height).to.equal(100);
      expect(responses[1].mediaType).to.equal('video');
      expect(responses[1].netRevenue).to.equal(true);
      expect(responses[1].requestId).to.equal(124);
      expect(responses[1].ttl).to.equal(360);
      expect(responses[1].vastUrl).to.equal('https://search.spotxchange.com/ad/vast.html?key=cache124');
      expect(responses[1].videoCacheKey).to.equal('cache124');
      expect(responses[1].width).to.equal(200);
    });
  });

  describe('outstreamRender', function() {
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
        appendChild: sinon.stub().callsFake(function(script) { scriptTag = script; })
      });
      var responses = spec.interpretResponse(serverResponse, bidderRequestObj);

      responses[0].renderer.render(responses[0]);

      expect(scriptTag.getAttribute('type')).to.equal('text/javascript');
      expect(scriptTag.getAttribute('src')).to.equal('https://js.spotx.tv/easi/v1/12345.js');
      expect(scriptTag.getAttribute('data-spotx_channel_id')).to.equal('12345');
      expect(scriptTag.getAttribute('data-spotx_vast_url')).to.equal('https://search.spotxchange.com/ad/vast.html?key=cache123');
      expect(scriptTag.getAttribute('data-spotx_ad_unit')).to.equal('incontent');
      expect(scriptTag.getAttribute('data-spotx_collapse')).to.equal('0');
      expect(scriptTag.getAttribute('data-spotx_autoplay')).to.equal('1');
      expect(scriptTag.getAttribute('data-spotx_blocked_autoplay_override_mode')).to.equal('1');
      expect(scriptTag.getAttribute('data-spotx_video_slot_can_autoplay')).to.equal('1');
      expect(scriptTag.getAttribute('data-spotx_digitrust_opt_out')).to.equal('1');
      expect(scriptTag.getAttribute('data-spotx_content_width')).to.equal('400');
      expect(scriptTag.getAttribute('data-spotx_content_height')).to.equal('300');
      expect(scriptTag.getAttribute('data-spotx_ad_mute')).to.equal('1');
      window.document.getElementById.restore();
    });

    it('should append into an iframe', function() {
      var scriptTag;
      sinon.stub(window.document, 'getElementById').returns({
        nodeName: 'IFRAME',
        contentDocument: {
          body: {
            appendChild: sinon.stub().callsFake(function(script) { scriptTag = script; })
          }
        }
      });

      bidderRequestObj.bidRequest.bids[0].params.outstream_options.in_iframe = 'iframeId';

      var responses = spec.interpretResponse(serverResponse, bidderRequestObj);

      responses[0].renderer.render(responses[0]);

      expect(scriptTag.getAttribute('type')).to.equal('text/javascript');
      expect(scriptTag.getAttribute('src')).to.equal('https://js.spotx.tv/easi/v1/12345.js');
      expect(scriptTag.getAttribute('data-spotx_channel_id')).to.equal('12345');
      expect(scriptTag.getAttribute('data-spotx_vast_url')).to.equal('https://search.spotxchange.com/ad/vast.html?key=cache123');
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

    it('should adjust width and height to match slot clientWidth if playersize_auto_adapt is used', function() {
      var scriptTag;
      sinon.stub(window.document, 'getElementById').returns({
        clientWidth: 200,
        appendChild: sinon.stub().callsFake(function(script) { scriptTag = script; })
      });
      var responses = spec.interpretResponse(serverResponse, bidderRequestObj);

      responses[0].renderer.render(responses[0]);

      expect(scriptTag.getAttribute('type')).to.equal('text/javascript');
      expect(scriptTag.getAttribute('src')).to.equal('https://js.spotx.tv/easi/v1/12345.js');
      expect(scriptTag.getAttribute('data-spotx_content_width')).to.equal('200');
      expect(scriptTag.getAttribute('data-spotx_content_height')).to.equal('150');
      window.document.getElementById.restore();
    });

    it('should use a default 4/3 ratio if playersize_auto_adapt is used and response does not contain width or height', function() {
      delete serverResponse.body.seatbid[0].bid[0].w;
      delete serverResponse.body.seatbid[0].bid[0].h;

      var scriptTag;
      sinon.stub(window.document, 'getElementById').returns({
        clientWidth: 200,
        appendChild: sinon.stub().callsFake(function(script) { scriptTag = script; })
      });
      var responses = spec.interpretResponse(serverResponse, bidderRequestObj);

      responses[0].renderer.render(responses[0]);

      expect(scriptTag.getAttribute('type')).to.equal('text/javascript');
      expect(scriptTag.getAttribute('src')).to.equal('https://js.spotx.tv/easi/v1/12345.js');
      expect(scriptTag.getAttribute('data-spotx_content_width')).to.equal('200');
      expect(scriptTag.getAttribute('data-spotx_content_height')).to.equal('150');
      window.document.getElementById.restore();
    });
  });
});
