import { expect } from 'chai';
import { spec } from 'modules/big-richmediaBidAdapter.js';
import { auctionManager } from 'src/auctionManager.js';
import * as bidderFactory from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import { deepClone } from 'src/utils.js';

describe('bigRichMediaAdapterTests', function () {
  before(function () {
    config.setConfig({
      bigRichmedia: {
        publisherId: '123ABC'
      }
    });
  });

  after(function () {
    config.resetConfig();
  });

  describe('bidRequestValidity', function () {
    const bid = {
      'bidder': 'bigRichmedia',
      'params': {
        'placementId': '10433394'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('bidRequest with zoneId and deliveryUrl params', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('bidRequest with no params is not valid', function () {
      const localBid = Object.assign({}, bid);
      localBid.params = {};
      expect(spec.isBidRequestValid(localBid)).to.equal(false);
    });
  });

  describe('bidRequest', function () {
    let getAdUnitsStub;
    const bidRequests = [
      {
        'bidder': 'bigRichmedia',
        'params': {
          'placementId': '10433394'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[300, 250], [300, 600], [1800, 1000]]
          }
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600], [1800, 1000]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'transactionId': '04f2659e-c005-4eb1-a57c-fa93145e3843'
      }
    ];

    beforeEach(function() {
      getAdUnitsStub = sinon.stub(auctionManager, 'getAdUnits').callsFake(function() {
        return [];
      });
    });

    afterEach(function() {
      getAdUnitsStub.restore();
    });

    it('should have skin size', function () {
      const bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            placementId: '10433394',
            format: 'skin'
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].sizes).to.exist;
      expect(payload.tags[0].sizes).to.have.lengthOf(3);
    });

    it('should build video bid request', function() {
      const bidRequest = deepClone(bidRequests[0]);
      bidRequest.params = {
        placementId: '1234235',
        video: {
          skippable: true,
          playback_method: ['auto_play_sound_off', 'auto_play_sound_unknown'],
          context: 'outstream',
          format: 'sticky-top'
        }
      };
      bidRequest.mediaTypes = {
        video: {
          playerSize: [640, 480],
          context: 'outstream',
          mimes: ['video/mp4'],
          skip: 0,
          minduration: 5,
          api: [1, 5, 6],
          playbackmethod: [2, 4]
        }
      };

      const request = spec.buildRequests([bidRequest]);
      const payload = JSON.parse(request.data);

      expect(payload.tags[0].video).to.deep.equal({
        minduration: 5,
        playback_method: 2,
        skippable: true,
        context: 4
      });
      expect(payload.tags[0].video_frameworks).to.deep.equal([1, 4])
    });
  });

  describe('interpretResponse', function () {
    let bfStub;

    before(function() {
      bfStub = sinon.stub(bidderFactory, 'getIabSubCategory');
    });

    after(function() {
      bfStub.restore();
    });

    const response = {
      'version': '3.0.0',
      'tags': [
        {
          'uuid': '3db3773286ee59',
          'tag_id': 10433394,
          'auction_id': '4534722592064951574',
          'nobid': false,
          'no_ad_url': 'https://lax1-ib.adnxs.com/no-ad',
          'timeout_ms': 10000,
          'ad_profile_id': 27079,
          'ads': [
            {
              'content_source': 'rtb',
              'ad_type': 'banner',
              'buyer_member_id': 958,
              'creative_id': 29681110,
              'media_type_id': 1,
              'media_subtype_id': 1,
              'cpm': 0.5,
              'cpm_publisher_currency': 0.5,
              'publisher_currency_code': '$',
              'client_initiated_ad_counting': true,
              'viewability': {
                'config': '<script type=\'text/javascript\' async=\'true\' src=\'https://cdn.adnxs.com/v/s/152/trk.js#v;vk=appnexus.com-omid;tv=native1-18h;dom_id=%native_dom_id%;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232354;cb=https%3A%2F%2Fams1-ib.adnxs.com%2Fvevent%3Freferrer%3Dhttps253A%252F%252Ftestpages-pmahe.tp.adnxs.net%252F01_basic_single%26e%3DwqT_3QLNB6DNAwAAAwDWAAUBCLfl_-MFEMStk8u3lPTjRxih88aF0fq_2QsqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlCDy74uWJzxW2AAaM26dXjzjwWAAQGKAQNVU0SSAQEG8FCYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NTE4ODkwNzkpO3VmKCdyJywgOTc0OTQ0MDM2HgDwjZIC8QEha0RXaXBnajgtTHdLRUlQTHZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWU1rR2FBQndMSGlrTDRBQlVvZ0JwQy1RQVFHWUFRR2dBUUdvQVFPd0FRQzVBZk90YXFRQUFDUkF3UUh6cldxa0FBQWtRTWtCbWo4dDA1ZU84VF9aQVFBQUEBAyRQQV80QUVBOVFFAQ4sQW1BSUFvQUlBdFFJBRAAdg0IeHdBSUF5QUlBNEFJQTZBSUEtQUlBZ0FNQm1BTUJxQVAFzIh1Z01KUVUxVE1UbzBNekl3NEFPVENBLi6aAmEhUXcxdGNRagUoEfQkblBGYklBUW9BRAl8AEEBqAREbzJEABRRSk1JU1EBGwRBQQGsAFURDAxBQUFXHQzwWNgCAOACrZhI6gIzaHR0cDovL3Rlc3RwYWdlcy1wbWFoZS50cC5hZG54cy5uZXQvMDFfYmFzaWNfc2luZ2xl8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAPExFQUZfTkFNRRIA8gIeCho2HQAIQVNUAT7wnElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgD8ao-4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECjEwLjIuMTIuMzioBIqpB7IEDggAEAEYACAAKAAwADgCuAQAwAQAyAQA0gQOOTMyNSNBTVMxOjQzMjDaBAIIAeAEAfAEg8u-LogFAZgFAKAF______8BAxgBwAUAyQUABQEU8D_SBQkJBQt8AAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYBmAYAuAYAwQYBITAAAPA_yAYA2gYWChAAOgEAGBAAGADgBgw.%26s%3D971dce9d49b6bee447c8a58774fb30b40fe98171;ts=1551889079;cet=0;cecb=\'></script>'
              },
              'rtb': {
                'banner': {
                  'content': '<!-- Creative -->',
                  'width': 300,
                  'height': 250
                },
                'trackers': [
                  {
                    'impression_urls': [
                      'https://lax1-ib.adnxs.com/impression',
                      'https://www.test.com/tracker'
                    ],
                    'video_events': {}
                  }
                ]
              }
            }
          ]
        }
      ]
    };

    it('should get correct bid response', function () {
      const expectedResponse = [
        {
          'requestId': '3db3773286ee59',
          'cpm': 0.5,
          'creativeId': 29681110,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<!-- Creative -->',
          'mediaType': 'banner',
          'currency': 'USD',
          'ttl': 300,
          'netRevenue': true,
          'adUnitCode': 'code',
          'appnexus': {
            'buyerMemberId': 958
          },
          'meta': {
            'dchain': {
              'ver': '1.0',
              'complete': 0,
              'nodes': [{
                'bsid': '958'
              }]
            }
          }
        }
      ];
      const bidderRequest = {
        bids: [{
          bidId: '3db3773286ee59',
          adUnitCode: 'code'
        }]
      };
      const result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles outstream video responses', function () {
      const response = {
        'tags': [{
          'uuid': '84ab500420319d',
          'ads': [{
            'ad_type': 'video',
            'cpm': 0.500000,
            'notify_url': 'imptracker.com',
            'rtb': {
              'video': {
                'content': '<!-- VAST Creative -->'
              }
            },
            'javascriptTrackers': '<script type=\'text/javascript\' async=\'true\' src=\'https://cdn.adnxs.com/v/s/152/trk.js#v;vk=appnexus.com-omid;tv=native1-18h;dom_id=%native_dom_id%;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232354;cb=https%3A%2F%2Fams1-ib.adnxs.com%2Fvevent%3Freferrer%3Dhttps253A%252F%252Ftestpages-pmahe.tp.adnxs.net%252F01_basic_single%26e%3DwqT_3QLNB6DNAwAAAwDWAAUBCLfl_-MFEMStk8u3lPTjRxih88aF0fq_2QsqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlCDy74uWJzxW2AAaM26dXjzjwWAAQGKAQNVU0SSAQEG8FCYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NTE4ODkwNzkpO3VmKCdyJywgOTc0OTQ0MDM2HgDwjZIC8QEha0RXaXBnajgtTHdLRUlQTHZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWU1rR2FBQndMSGlrTDRBQlVvZ0JwQy1RQVFHWUFRR2dBUUdvQVFPd0FRQzVBZk90YXFRQUFDUkF3UUh6cldxa0FBQWtRTWtCbWo4dDA1ZU84VF9aQVFBQUEBAyRQQV80QUVBOVFFAQ4sQW1BSUFvQUlBdFFJBRAAdg0IeHdBSUF5QUlBNEFJQTZBSUEtQUlBZ0FNQm1BTUJxQVAFzIh1Z01KUVUxVE1UbzBNekl3NEFPVENBLi6aAmEhUXcxdGNRagUoEfQkblBGYklBUW9BRAl8AEEBqAREbzJEABRRSk1JU1EBGwRBQQGsAFURDAxBQUFXHQzwWNgCAOACrZhI6gIzaHR0cDovL3Rlc3RwYWdlcy1wbWFoZS50cC5hZG54cy5uZXQvMDFfYmFzaWNfc2luZ2xl8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAPExFQUZfTkFNRRIA8gIeCho2HQAIQVNUAT7wnElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgD8ao-4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECjEwLjIuMTIuMzioBIqpB7IEDggAEAEYACAAKAAwADgCuAQAwAQAyAQA0gQOOTMyNSNBTVMxOjQzMjDaBAIIAeAEAfAEg8u-LogFAZgFAKAF______8BAxgBwAUAyQUABQEU8D_SBQkJBQt8AAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYBmAYAuAYAwQYBITAAAPA_yAYA2gYWChAAOgEAGBAAGADgBgw.%26s%3D971dce9d49b6bee447c8a58774fb30b40fe98171;ts=1551889079;cet=0;cecb=\'></script>'
          }]
        }]
      };
      const bidderRequest = {
        bids: [{
          bidId: '84ab500420319d',
          adUnitCode: 'code',
          mediaTypes: {
            video: {
              context: 'outstream'
            }
          }
        }]
      }

      const result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(result[0]).not.to.have.property('vastXml');
      expect(result[0]).not.to.have.property('vastUrl');
      expect(result[0]).to.have.property('width', 1);
      expect(result[0]).to.have.property('height', 1);
      expect(result[0]).to.have.property('mediaType', 'banner');
    });
  });

  describe('getUserSyncs', function() {
    const syncOptions = {
      syncEnabled: false
    };

    it('should not return sync', function() {
      const serverResponse = [{ body: '' }];
      const result = spec.getUserSyncs(syncOptions, serverResponse);
      expect(result).to.be.undefined;
    });
  });

  describe('transformBidParams', function() {
    it('cast placementId to number', function() {
      const adUnit = {
        code: 'adunit-code',
        params: {
          placementId: '456'
        }
      };
      const bid = {
        params: {
          placementId: '456'
        },
        sizes: [[300, 250]],
        mediaTypes: {
          banner: { sizes: [[300, 250]] }
        }
      };

      const params = spec.transformBidParams({ placementId: '456' }, true, adUnit, [{ bidderCode: 'bigRichmedia', auctionId: bid.auctionId, bids: [bid] }]);

      expect(params.placement_id).to.exist;
      expect(params.placement_id).to.be.a('number');
    });
  });

  describe('onBidWon', function() {
    it('Should not have any error', function() {
      const result = spec.onBidWon({});
      expect(true).to.be.true;
    });
  });
});
