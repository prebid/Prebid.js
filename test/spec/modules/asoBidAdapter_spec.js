import {expect} from 'chai';
import {spec} from 'modules/asoBidAdapter.js';
import {BANNER, VIDEO, NATIVE} from 'src/mediaTypes.js';
import {OUTSTREAM} from 'src/video.js';
import {syncAddFPDToBidderRequest} from '../../helpers/fpd';
import {parseUrl} from '../../../src/utils';

import 'modules/priceFloors.js';
import 'modules/consentManagement.js';
import 'modules/consentManagementUsp.js';

describe('Adserver.Online bidding adapter', function () {
  const bannerRequest = {
    bidder: 'aso',
    params: {
      zone: 1
    },
    adUnitCode: 'adunit-banner',
    bidId: 'bid-banner',
    mediaTypes: {
      [BANNER]: {
        sizes: [
          [300, 250],
          [240, 400],
        ]
      }
    },
    userIdAsEids: [{
      source: 'src1',
      uids: [
        {
          id: 'id123...'
        }
      ]
    }]
  };

  const videoRequest = {
    bidder: 'aso',
    params: {
      zone: 2
    },
    adUnitCode: 'adunit-video',
    bidId: 'bid-video',
    mediaTypes: {
      [VIDEO]: {
        context: OUTSTREAM,
        playerSize: [[640, 480]],
        protocols: [1, 2],
        mimes: ['video/mp4'],
      }
    }
  };

  const nativeOrtbRequest = {
    assets: [
      {
        id: 0,
        required: 1,
        title: {
          len: 140
        }
      },
      {
        id: 1,
        required: 1,
        img: {
          type: 3,
          w: 300,
          h: 600
        }
      }]
  };

  const nativeRequest = {
    bidder: 'aso',
    params: {
      zone: 3
    },
    adUnitCode: 'adunit-native',
    bidId: 'bid-native',
    mediaTypes: {
      [NATIVE]: {
        ortb: {
          ...nativeOrtbRequest
        }
      }
    },
    nativeOrtbRequest
  };

  const bidderRequest = {
    refererInfo: {
      page: 'https://example.com/page.html',
      topmostLocation: 'https://example.com/page.html',
      reachedTop: true,
      numIframes: 1,
      stack: [
        'https://example.com/page.html',
        'https://example.com/iframe1.html'
      ]
    }
  };

  const gdprConsent = {
    gdprApplies: true,
    consentString: 'consentString',
    vendorData: {
      purpose: {
        consents: {
          1: true,
          2: true,
          3: false
        }
      }
    }
  };

  const gdprNotApplies = {
    gdprApplies: false,
    consentString: '',
    vendorData: {
      purpose: {}
    }
  };

  const uspConsent = 'usp_consent';

  describe('isBidRequestValid', function () {
    it('should return true when required params found in bidVideo', function () {
      expect(spec.isBidRequestValid(videoRequest)).to.be.true
    });

    it('should return true when required params found in bidBanner', function () {
      expect(spec.isBidRequestValid(bannerRequest)).to.be.true
    });

    it('should return false when required params not found', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
    });

    it('should return false when required params are not passed', function () {
      const bid = Object.assign({}, bannerRequest);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.be.false
    });

    it('should return false when required zone param not found', function () {
      const bid = JSON.parse(JSON.stringify(videoRequest));
      delete bid.params.zone;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('requests builder', function () {
    it('should add bid floor', function () {
      const bidRequest = Object.assign({}, bannerRequest);

      bidRequest.getFloor = () => {
        return {
          currency: 'USD',
          floor: 0.5
        }
      };

      const payload = spec.buildRequests([bidRequest], bidderRequest)[0].data;

      expect(payload.imp[0].bidfloor).to.equal(0.5);
      expect(payload.imp[0].bidfloorcur).to.equal('USD');
    });

    it('endpoint is valid', function () {
      const requests = spec.buildRequests([bannerRequest], bidderRequest);
      expect(requests).to.have.lengthOf(1);
      const request = requests[0];

      expect(request).to.exist;
      expect(request.method).to.equal('POST');
      const parsedUrl = parseUrl(request.url);
      expect(parsedUrl.hostname).to.equal('srv.aso1.net');
      expect(parsedUrl.pathname).to.equal('/prebid/bidder');

      const query = parsedUrl.search;
      expect(query.pbjs).to.contain('$prebid.version$');
      expect(query.zid).to.equal('1');
    });

    it('creates a valid banner request', function () {
      const requests = spec.buildRequests([bannerRequest], syncAddFPDToBidderRequest(bidderRequest));
      expect(requests).to.have.lengthOf(1);
      const request = requests[0];

      expect(request).to.exist;
      expect(request.data).to.exist;

      const payload = request.data;

      expect(payload.site).to.exist;
      expect(payload.site.page).to.equal('https://example.com/page.html');

      expect(payload.device).to.exist;
      expect(payload.device.w).to.equal(window.innerWidth);
      expect(payload.device.h).to.equal(window.innerHeight);

      expect(payload.imp).to.have.lengthOf(1);

      expect(payload.imp[0].tagid).to.equal('adunit-banner');
      expect(payload.imp[0].banner).to.not.null;
      expect(payload.imp[0].banner.format).to.have.lengthOf(2);
      expect(payload.imp[0].banner.format[0].w).to.equal(300);
      expect(payload.imp[0].banner.format[0].h).to.equal(250);
      expect(payload.imp[0].banner.format[1].w).to.equal(240);
      expect(payload.imp[0].banner.format[1].h).to.equal(400);
    });

    if (FEATURES.VIDEO) {
      it('creates a valid video request', function () {
        const requests = spec.buildRequests([videoRequest], syncAddFPDToBidderRequest(bidderRequest));
        expect(requests).to.have.lengthOf(1);
        const request = requests[0];

        expect(request).to.exist;
        expect(request.data).to.not.be.empty;

        const payload = request.data;

        expect(payload.site).to.exist;
        expect(payload.site.page).to.equal('https://example.com/page.html');

        expect(payload.device).to.exist;
        expect(payload.device.w).to.equal(window.innerWidth);
        expect(payload.device.h).to.equal(window.innerHeight);

        expect(payload.imp).to.have.lengthOf(1);

        expect(payload.imp[0].tagid).to.equal('adunit-video');
        expect(payload.imp[0].video).to.exist;

        expect(payload.imp[0].video.w).to.equal(640);
        expect(payload.imp[0].video.h).to.equal(480);
        expect(payload.imp[0].banner).to.not.exist;
      });
    }

    if (FEATURES.NATIVE) {
      it('creates a valid native request', function () {
        const requests = spec.buildRequests([nativeRequest], syncAddFPDToBidderRequest(bidderRequest));
        expect(requests).to.have.lengthOf(1);
        const request = requests[0];

        expect(request).to.exist;
        expect(request.data).to.not.be.empty;

        const payload = request.data;

        expect(payload.site).to.exist;
        expect(payload.site.page).to.equal('https://example.com/page.html');

        expect(payload.device).to.exist;
        expect(payload.device.w).to.equal(window.innerWidth);
        expect(payload.device.h).to.equal(window.innerHeight);

        expect(payload.imp).to.have.lengthOf(1);

        expect(payload.imp[0].tagid).to.equal('adunit-native');
        expect(payload.imp[0].native).to.exist;
        expect(payload.imp[0].native.request).to.exist;
      });
    }
  });

  describe('GDPR/USP compliance', function () {
    it('should send GDPR/USP consent data if it applies', function () {
      bidderRequest.gdprConsent = gdprConsent;
      bidderRequest.uspConsent = uspConsent;

      const requests = spec.buildRequests([bannerRequest], syncAddFPDToBidderRequest(bidderRequest));
      expect(requests).to.have.lengthOf(1);
      const request = requests[0];

      expect(request.data).to.not.be.empty;

      const payload = request.data;

      expect(payload.user.ext.consent).to.equal('consentString');
      expect(payload.regs.ext.us_privacy).to.equal(uspConsent);
      expect(payload.regs.ext.gdpr).to.equal(1);
    });

    it('should not send GDPR/USP consent data if it does not apply', function () {
      bidderRequest.gdprConsent = null;
      bidderRequest.uspConsent = null;

      const requests = spec.buildRequests([bannerRequest], syncAddFPDToBidderRequest(bidderRequest));
      expect(requests).to.have.lengthOf(1);
      const request = requests[0];

      expect(request.data).to.not.be.empty;

      const payload = request.data;

      expect(payload).to.not.have.nested.property('regs.ext.gdpr');
      expect(payload).to.not.have.nested.property('user.ext.consent');
      expect(payload).to.not.have.nested.property('regs.ext.us_privacy');
    });
  });

  describe('response handler', function () {
    const bannerResponse = {
      body: {
        seatbid: [{
          bid: [
            {
              impid: 'bid-banner',
              price: 0.3,
              crid: 321,
              adm: '<!-- HTML/JS -->',
              w: 300,
              h: 250,
              adomain: ['example.com'],
              ext: {
                prebid: {
                  type: 'banner'
                }
              }
            }
          ]
        }],
        cur: 'USD',
        ext: {
          user_syncs: [
            {
              url: 'sync_url',
              type: 'iframe'
            }
          ]
        }
      },
    };

    const videoResponse = {
      body: {
        seatbid: [{
          bid: [
            {
              impid: 'bid-video',
              price: 0.5,
              crid: 123,
              adm: '<!-- VAST XML -->',
              adomain: ['example.com'],
              w: 640,
              h: 480,
              ext: {
                prebid: {
                  type: 'video'
                }
              }
            }
          ]
        }],
        cur: 'USD'
      },
    };

    const nativeResponse = {
      body: {
        seatbid: [{
          bid: [
            {
              impid: 'bid-native',
              price: 0.5,
              crid: 123,
              adm: JSON.stringify({
                assets: [
                  {id: 0, title: {text: 'Title'}},
                  {id: 1, img: {type: 3, url: 'https://img'}},
                ],
              }),
              adomain: ['example.com'],
              ext: {
                prebid: {
                  type: 'native'
                }
              }
            }
          ]
        }],
        cur: 'USD'
      },
    };

    it('handles banner responses', function () {
      const request = spec.buildRequests([bannerRequest], bidderRequest)[0];
      const bids = spec.interpretResponse(bannerResponse, request);

      expect(bids).to.have.lengthOf(1);

      expect(bids[0]).to.exist;
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[0].creativeId).to.equal(321);
      expect(bids[0].cpm).to.be.within(0.1, 0.5);
      expect(bids[0].ad).to.equal('<!-- HTML/JS -->');
      expect(bids[0].currency).to.equal('USD');
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].ttl).to.equal(300);
      expect(bids[0].dealId).to.not.exist;
      expect(bids[0].meta.advertiserDomains[0]).to.equal('example.com');
    });

    if (FEATURES.VIDEO) {
      it('handles video responses', function () {
        const request = spec.buildRequests([videoRequest], bidderRequest)[0];
        const bids = spec.interpretResponse(videoResponse, request);
        expect(bids).to.have.lengthOf(1);

        expect(bids[0].width).to.equal(640);
        expect(bids[0].height).to.equal(480);
        expect(bids[0].mediaType).to.equal(VIDEO);
        expect(bids[0].creativeId).to.equal(123);
        expect(bids[0].cpm).to.equal(0.5);
        expect(bids[0].vastXml).to.equal('<!-- VAST XML -->');
        expect(bids[0].currency).to.equal('USD');
        expect(bids[0].netRevenue).to.equal(true);
        expect(bids[0].ttl).to.equal(300);
      });
    }

    if (FEATURES.NATIVE) {
      it('handles native responses', function () {
        const request = spec.buildRequests([nativeRequest], bidderRequest)[0];
        const bids = spec.interpretResponse(nativeResponse, request);
        expect(bids).to.have.lengthOf(1);

        expect(bids[0].mediaType).to.equal(NATIVE);
        expect(bids[0].creativeId).to.equal(123);
        expect(bids[0].cpm).to.equal(0.5);
        expect(bids[0].currency).to.equal('USD');
        expect(bids[0].netRevenue).to.equal(true);
        expect(bids[0].ttl).to.equal(300);

        expect(bids[0].native.ortb.assets).to.have.lengthOf(2);
      });
    }

    it('handles empty responses', function () {
      const response = [];
      const bidderRequest = {};

      const result = spec.interpretResponse(response, bidderRequest);
      expect(result.length).to.equal(0);
    });

    describe('getUserSyncs', function () {
      const syncOptions = {
        iframeEnabled: true
      };

      it('should return iframe sync option', function () {
        const syncs = spec.getUserSyncs(syncOptions, [bannerResponse], gdprConsent, uspConsent);
        expect(syncs).to.have.lengthOf(1);
        expect(syncs[0].type).to.equal('iframe');
        expect(syncs[0].url).to.equal(
          'sync_url?gdpr=1&consents_str=consentString&consents=1%2C2&us_privacy=usp_consent'
        );
      });

      it('should return iframe sync option - gdpr not applies', function () {
        const syncs = spec.getUserSyncs(syncOptions, [bannerResponse], gdprNotApplies, uspConsent);
        expect(syncs).to.have.lengthOf(1);

        expect(syncs[0].url).to.equal(
          'sync_url?us_privacy=usp_consent'
        );
      });

      it('should return no sync option', function () {
        const syncs = spec.getUserSyncs(syncOptions, [videoResponse], gdprNotApplies, uspConsent);
        expect(syncs).to.have.lengthOf(0);
      });
    });
  });
});
