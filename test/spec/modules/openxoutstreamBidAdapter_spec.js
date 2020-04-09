import {expect} from 'chai';
import {spec} from 'modules/openxoutstreamBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

describe('OpenXOutstreamAdapter', function () {
  const adapter = newBidder(spec);
  const URLBASE = '/v/1.0/avjp';
  const BIDDER = 'openxoutstream';
  const div = document.createElement('div');
  const PLACEMENT_ID = '1986307928000988495';
  const YM_SCRIPT = `!function(e,t){if(void 0===t._ym){var a=Math.round(5*Math.random()/3)+'';t._ym='';var m=e.createElement('script');m.type='text/javascript',m.async=!0,m.src='//static.yieldmo.com/ym.'+a+'.js',(e.getElementsByTagName('head')[0]||e.getElementsByTagName('body')[0]).appendChild(m)}else t._ym instanceof String||void 0===t._ym.chkPls||t._ym.chkPls()}(document,window);`;
  const PUBLISHER_ID = '1986307525700126029';
  const CR_ID = '2052941939925262540';
  const AD_ID = '1991358644725162800';

  describe('isBidRequestValid', function () {
    describe('when request is for a banner ad', function () {
      let bannerBid;
      beforeEach(function () {
        bannerBid = {
          bidder: BIDDER,
          params: {},
          adUnitCode: 'adunit-code',
          mediaTypes: {banner: {}},
          sizes: [[300, 250], [300, 600]],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475'
        };
      });
      it('should return false when there is no delivery domain', function () {
        bannerBid.params = {'unit': '12345678'};
        expect(spec.isBidRequestValid(bannerBid)).to.equal(false);
      });

      describe('when there is a delivery domain', function () {
        beforeEach(function () {
          bannerBid.params = {delDomain: 'test-delivery-domain'}
        });

        it('should return false if there is no adunit id and sizes are defined', function () {
          bannerBid.mediaTypes.banner.sizes = [720, 90];
          expect(spec.isBidRequestValid(bannerBid)).to.equal(false);
        });

        it('should return true if there is delivery domain and unit', function () {
          bannerBid.params.unit = '12345678';
          expect(spec.isBidRequestValid(bannerBid)).to.equal(true);
        });
        it('should return false if there is unit but no delivery domain', function () {
          bannerBid.params = {unit: '12345678'};
          expect(spec.isBidRequestValid(bannerBid)).to.equal(false);
        });
        it('shoud return false if there is no delivery domain and no unit', function () {
          bannerBid.params = {};
          expect(spec.isBidRequestValid(bannerBid)).to.equal(false);
        })
      });
    });
  });

  describe('buildRequests for banner ads', function () {
    const bidRequestsWithMediaType = [{
      'bidder': BIDDER,
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain'
      },
      'adUnitCode': 'adunit-code',
      'mediaType': 'banner',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    }];

    const mockBidderRequest = {refererInfo: {}};

    it('should send bid request to openx url via GET, with mediaType specified as banner', function () {
      const request = spec.buildRequests(bidRequestsWithMediaType, mockBidderRequest);
      const params = bidRequestsWithMediaType[0].params;
      expect(request[0].url).to.equal(`https://` + params.delDomain + URLBASE);
      expect(request[0].method).to.equal('GET');
    });

    it('should send ad unit ids, height, and width when any are defined', function () {
      const bidRequestsWithUnitIds = [{
        'bidder': BIDDER,
        'params': {
          'unit': '540141567',
          'height': '200',
          'width': '250',
          'delDomain': 'test-del-domain'
        },
        'adUnitCode': 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[728, 90]]
          }
        },
        'bidId': 'test-bid-id-2',
        'bidderRequestId': 'test-bid-request-2',
        'auctionId': 'test-auction-2'
      }, {
        'bidder': BIDDER,
        'params': {
          'delDomain': 'test-del-domain'
        },
        'adUnitCode': 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        'bidId': 'test-bid-id-1',
        'bidderRequestId': 'test-bid-request-1',
        'auctionId': 'test-auction-1'
      }];
      const request = spec.buildRequests(bidRequestsWithUnitIds, mockBidderRequest);
      expect(request[0].data.auid).to.equal(`${bidRequestsWithUnitIds[0].params.unit}`);
      expect(request[0].data.vht).to.not.equal(`${bidRequestsWithUnitIds[0].params.height}`);
      expect(request[0].data.vwd).to.not.equal(`${bidRequestsWithUnitIds[0].params.width}`);
      expect(request[0].data.vht).to.equal('184');
      expect(request[0].data.vwd).to.equal('414');
      expect(request[0].data.aus).to.equal('304x184%7C412x184%7C375x184%7C414x184');
    });

    describe('interpretResponse', function () {
      let serverResponse;
      let serverRequest;

      beforeEach(function () {
        serverResponse = {
          body: {
            width: 300,
            height: 250,
            pub_rev: 3000,
            bidderCode: 'openxoutstream',
            vastUrl: 'test.vast.url',
            mediaType: 'banner',
            adid: '9874652394875'
          },
          header: 'header?',
        };
        serverRequest = {
          payload: {
            bid: {
              bidId: '2d36ac90d654af',
            },
          }
        };
      });

      it('should correctly reorder the server response', function () {
        const newResponse = spec.interpretResponse(serverResponse, serverRequest);
        const openHtmlTag = '<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body>';
        const closeHtmlTag = '</body></html>';
        const sdkScript = createSdkScript().outerHTML;
        const placementDiv = createPlacementDiv();
        placementDiv.dataset.pId = PUBLISHER_ID;
        const placementDivString = placementDiv.outerHTML;
        const adResponse = getTemplateAdResponse(serverResponse.body.vastUrl, PLACEMENT_ID);
        const adResponseString = JSON.stringify(adResponse);
        const ymAdsScript = '<script type="text/javascript"> window.__ymAds =' + adResponseString + '</script>';
        expect(newResponse.length).to.be.equal(1);
        expect(newResponse[0]).to.deep.equal({
          requestId: '2d36ac90d654af',
          bidderCode: 'openxoutstream',
          vastUrl: 'test.vast.url',
          mediaType: 'banner',
          cpm: 3,
          width: 300,
          height: 250,
          creativeId: '9874652394875',
          currency: 'USD',
          netRevenue: true,
          ttl: 300,
          ad: openHtmlTag + placementDivString + ymAdsScript + sdkScript + closeHtmlTag
        });
      });

      it('should not add responses if the cpm is 0 or null', function () {
        serverResponse.body.pub_rev = 0;
        let response = spec.interpretResponse(serverResponse, serverRequest);
        expect(response).to.deep.equal([]);

        serverResponse.body.pub_rev = null;
        response = spec.interpretResponse(serverResponse, serverRequest);
        expect(response).to.deep.equal([])
      });
    });
  })

  function createSdkScript() {
    const script = document.createElement('script');
    script.innerHTML = YM_SCRIPT;
    return script;
  }
  function createPlacementDiv() {
    div.id = `ym_${PLACEMENT_ID}`;
    div.classList.add('ym');
    div.dataset.lfId = CR_ID;
    return div
  }
  const getTemplateAdResponse = (vastUrl) => {
    return {
      loader: 'openxoutstream',
      availability_zone: '',
      data: [
        {
          ads: [
            {
              actions: {},
              adv_id: AD_ID,
              configurables: {
                cta_button_copy: 'Learn More',
                vast_click_tracking: 'true',
                vast_url: vastUrl,
              },
              cr_id: CR_ID,
            }
          ],
          column_count: 1,
          configs: {
            allowable_height: '248',
            header_copy: 'You May Like',
            ping: 'true',
          },
          creative_format_id: 40,
          css: '',
          placement_id: PLACEMENT_ID,
        }
      ],
      nc: 0,
    };
  };
});
