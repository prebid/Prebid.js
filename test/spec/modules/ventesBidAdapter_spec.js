import { expect } from 'chai';
import * as utils from 'src/utils.js';
import { spec } from 'modules/ventesBidAdapter.js';

const BIDDER_URL = 'http://13.234.201.146:8088/va/ad';

describe('Ventes Adapter', function () {
  const examples = {
    adUnit_banner: {
      adUnitCode: 'ad_unit_banner',
      bidder: 'ventes',
      bidderRequestId: 'bid_request_id',
      bidId: 'bid_id',
      params: {},
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      }
    },

    serverRequest_banner: {
      method: 'POST',
      url: 'http://13.234.201.146:8088/va/ad',
      data: {
        id: 'bid_request_id',
        imp: [
          {
            id: 'imp_id_banner',
            banner: {
              format: [{
                w: 300,
                h: 200
              }]
            }
          }
        ],
        site: {
          page: 'https://ventesavenues.in',
          domain: 'ventesavenues.in',
          name: 'ventesavenues.in'
        },
        device: {
          ua: '',
          ip: '123.145.167.189',
          ifa: 'AEBE52E7-03EE-455A-B3C4-E57283966239',
        },
        user: null,
        regs: null,
        at: 1
      }
    },
    serverResponse_banner: {
      body: {
        cur: 'USD',
        seatbid: [
          {
            seat: '4',
            bid: [
              {
                id: 'id',
                impid: 'imp_id_banner',
                cid: 'campaign_id',
                crid: 'creative_id',
                adm: '<html>..</html>',
                price: 1.5,
              }
            ]
          }
        ]
      }
    }
  };

  describe('isBidRequestValid', function () {
    describe('General', function () {
      it('should return false when not given an ad unit', function () {
        const adUnit = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an invalid ad unit', function () {
        const adUnit = 'bad_bid';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit without bidder code', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.bidder = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with a bad bidder code', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.bidder = 'unknownBidder';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit without ad unit code', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.adUnitCode = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid ad unit code', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.adUnitCode = {};

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit without bid request identifier', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.bidderRequestId = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid bid request identifier', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.bidderRequestId = {};

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit without impression identifier', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.bidId = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid impression identifier', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.bidId = {};

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit without media types', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with empty media types', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes = {};

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with invalid media types', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes = 'bad_media_types';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });
    });

    describe('Banner', function () {
      it('should return true when given a valid ad unit', function () {
        const adUnit = examples.adUnit_banner;

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return true when given a valid ad unit without bidder parameters', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.params = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return true when given a valid ad unit with invalid publisher id', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.params = {};
        adUnit.params.publisherId = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return true when given a valid ad unit without placement id', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.params = {};
        adUnit.params.publisherId = 'agltb3B1Yi1pbmNyDAsSA0FwcBiJkfTUCV';

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return true when given a valid ad unit with invalid placement id', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.params = {};
        adUnit.params.publisherId = 'agltb3B1Yi1pbmNyDAsSA0FwcBiJkfTUCV';
        adUnit.params.placementId = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(true);
      });

      it('should return false when given an ad unit without size', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = undefined;

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid size', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = 'bad_banner_size';

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an empty size', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = [];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid size value', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = ['bad_banner_size_value'];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with a size value with less than 2 dimensions', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = [[300]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with a size value with more than 2 dimensions', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = [[300, 250, 30]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with a negative width value', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = [[-300, 250]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with a negative height value', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = [[300, -250]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid width value', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = [[false, 250]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });

      it('should return false when given an ad unit with an invalid height value', function () {
        const adUnit = utils.deepClone(examples.adUnit_banner);
        adUnit.mediaTypes.banner.sizes = [[300, {}]];

        expect(spec.isBidRequestValid(adUnit)).to.equal(false);
      });
    });
  });

  describe('buildRequests', function () {
    describe('ServerRequest', function () {
      it('should return a server request when given a valid ad unit and a valid ad unit context', function () {
        const adUnits = [examples.adUnit_banner];
        const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);
        expect(serverRequests).to.be.an('array').and.to.have.length(1);
        expect(serverRequests[0].method).to.exist.and.to.be.a('string').and.to.equal('POST');
        expect(serverRequests[0].url).to.exist.and.to.be.a('string').and.to.equal(BIDDER_URL);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
      });

      it('should return an empty server request list when given an empty ad unit list and a valid ad unit context', function () {
        const adUnits = [];
        const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);
        expect(serverRequests).to.be.an('array').and.to.have.length(0);
      });

      it('should not return a server request when given no ad unit and a valid ad unit context', function () {
        const serverRequests = spec.buildRequests(null, examples.adUnitContext);
        expect(serverRequests).to.equal(null);
      });

      it('should not return a server request when given a valid ad unit and no ad unit context', function () {
        const adUnits = [examples.adUnit_banner];
        const serverRequests = spec.buildRequests(adUnits, null);
        expect(serverRequests).to.be.an('array').and.to.have.length(1);
      });

      it('should not return a server request when given a valid ad unit and an invalid ad unit context', function () {
        const adUnits = [examples.adUnit_banner];
        const serverRequests = spec.buildRequests(adUnits, {});
        expect(serverRequests).to.be.an('array').and.to.have.length(1);
      });
    });

    describe('BidRequest', function () {
      it('should return a valid server request when given a valid ad unit', function () {
        const adUnits = [examples.adUnit_banner];
        const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);
        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data.id).to.exist.and.to.be.a('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.at).to.exist.and.to.be.a('number').and.to.equal(1);
        expect(serverRequests[0].data.ext).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.ext.adot).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.ext.adot.adapter_version).to.exist.and.to.be.a('string').and.to.equal('v1.0.0');
      });

      it('should return one server request when given one valid ad unit', function () {
        const adUnits = [examples.adUnit_banner];
        const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);
        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data.id).to.exist.and.to.be.a('string').and.to.equal(adUnits[0].bidderRequestId);
      });
    });

    describe('Impression', function () {
      describe('Banner', function () {
        it('should return a server request with one impression when given a valid ad unit', function () {
          const adUnits = [examples.adUnit_banner];

          const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

          expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);

          expect(serverRequests[0].data).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0]).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].id).to.exist.and.to.be.a('string').and.to.equal(`${adUnits[0].bidId}_0_0`);
          expect(serverRequests[0].data.imp[0].banner).to.exist.and.to.be.an('object');
          expect(serverRequests[0].data.imp[0].banner.w).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.banner.sizes[0][0]);
          expect(serverRequests[0].data.imp[0].banner.h).to.exist.and.to.be.a('number').and.to.equal(adUnits[0].mediaTypes.banner.sizes[0][1]);
          expect(serverRequests[0].data.imp[0].banner.format).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
          expect(serverRequests[0].data.imp[0].banner.format[0]).to.exist.and.to.be.an('object').and.to.deep.equal({
            w: adUnits[0].mediaTypes.banner.sizes[0][0],
            h: adUnits[0].mediaTypes.banner.sizes[0][1]
          });
        });
      });
    });

    describe('Site', function () {
      it('should return a server request with site information when given a valid ad unit and a valid ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = examples.adUnitContext;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.site).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.site.page).to.exist.and.to.be.an('string').and.to.equal(adUnitContext.refererInfo.referer);
        expect(serverRequests[0].data.site.id).to.equal(undefined);
        expect(serverRequests[0].data.site.domain).to.exist.and.to.be.an('string').and.to.equal('we-are-adot.com');
        expect(serverRequests[0].data.site.name).to.exist.and.to.be.an('string').and.to.equal('we-are-adot.com');
      });

      it('should return a server request without site information when not given an ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = undefined;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.site).to.equal(null);
      });

      it('should return a server request without site information when given an ad unit context without referer information', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.refererInfo = undefined;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.site).to.equal(null);
      });

      it('should return a server request without site information when given an ad unit context with invalid referer information', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.refererInfo = 'bad_referer_information';

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.site).to.equal(null);
      });

      it('should return a server request without site information when given an ad unit context without referer', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.refererInfo.referer = undefined;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.site).to.equal(null);
      });

      it('should return a server request without site information when given an ad unit context with an invalid referer', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.refererInfo.referer = {};

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.site).to.equal(null);
      });

      it('should return a server request without site information when given an ad unit context with a misformatted referer', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.refererInfo.referer = 'we-are-adot';

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.site).to.equal(null);
      });
    });

    describe('Device', function () {
      it('should return a server request with device information when given a valid ad unit and a valid ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const serverRequests = spec.buildRequests(adUnits, examples.adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.device).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.device.ua).to.exist.and.to.be.a('string');
        expect(serverRequests[0].data.device.language).to.exist.and.to.be.a('string');
      });
    });

    describe('Regs', function () {
      it('should return a server request with regulations information when given a valid ad unit and a valid ad unit context with GDPR applying', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = examples.adUnitContext;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.regs).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.regs.ext).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.regs.ext.gdpr).to.exist.and.to.be.a('boolean').and.to.equal(adUnitContext.gdprConsent.gdprApplies);
      });

      it('should return a server request with regulations information when given a valid ad unit and a valid ad unit context with GDPR not applying', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.gdprConsent.gdprApplies = false;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.regs).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.regs.ext).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.regs.ext.gdpr).to.exist.and.to.be.a('boolean').and.to.equal(adUnitContext.gdprConsent.gdprApplies);
      });

      it('should return a server request without regulations information when not given an ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = undefined;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.regs).to.equal(null);
      });

      it('should return a server request without regulations information when given an ad unit context without GDPR information', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.gdprConsent = undefined;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.regs).to.equal(null);
      });

      it('should return a server request without regulations information when given an ad unit context with invalid GDPR information', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.gdprConsent = 'bad_gdpr_consent';

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.regs).to.equal(null);
      });

      it('should return a server request without regulations information when given an ad unit context with invalid GDPR application information', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.gdprConsent.gdprApplies = 'bad_gdpr_applies';

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.regs).to.equal(null);
      });
    });

    describe('User', function () {
      it('should return a server request with user information when given a valid ad unit and a valid ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = examples.adUnitContext;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.user).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.user.ext).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.user.ext.consent).to.exist.and.to.be.a('string').and.to.equal(adUnitContext.gdprConsent.consentString);
      });

      it('should return a server request without user information when not given an ad unit context', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = undefined;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.user).to.equal(null);
      });

      it('should return a server request without user information when given an ad unit context without GDPR information', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.gdprConsent = undefined;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.user).to.equal(null);
      });

      it('should return a server request without user information when given an ad unit context with invalid GDPR information', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.gdprConsent = 'bad_gdpr_consent';

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.user).to.equal(null);
      });

      it('should return a server request without user information when given an ad unit context with an invalid consent string', function () {
        const adUnits = [examples.adUnit_banner];

        const adUnitContext = utils.deepClone(examples.adUnitContext);
        adUnitContext.gdprConsent.consentString = true;

        const serverRequests = spec.buildRequests(adUnits, adUnitContext);

        expect(serverRequests).to.be.an('array').and.to.have.lengthOf(1);
        expect(serverRequests[0].data).to.exist.and.to.be.an('object');
        expect(serverRequests[0].data.id).to.exist.and.to.be.an('string').and.to.equal(adUnits[0].bidderRequestId);
        expect(serverRequests[0].data.user).to.equal(null);
      });
    });
  });

  describe('interpretResponse', function () {
    describe('General', function () {
      it('should return an ad when given a valid server response with one bid with USD currency', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.cur = 'USD';

        const ads = spec.interpretResponse(serverResponse, serverRequest);
        const admWithAuctionPriceReplaced = utils.replaceAuctionPrice(serverResponse.body.seatbid[0].bid[0].adm, serverResponse.body.seatbid[0].bid[0].price);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.have.string(admWithAuctionPriceReplaced);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].h);
        expect(ads[0].width).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('banner');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return no ad when not given a server response', function () {
        const ads = spec.interpretResponse(null);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when not given a server response body', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given an invalid server response body', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body = 'invalid_body';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response without seat bids', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with invalid seat bids', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid = 'invalid_seat_bids';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with an empty seat bids array', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid = [];

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with an invalid seat bid', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid = 'invalid_bids';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with an empty bids array', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid = [];

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with an invalid bid', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid = ['invalid_bid'];

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without currency', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.cur = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid currency', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.cur = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without impression identifier', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].impid = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid impression identifier', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].impid = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without creative identifier', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].crid = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid creative identifier', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].crid = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without ad markup and ad serving URL', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].adm = undefined;
        serverResponse.body.seatbid[0].bid[0].nurl = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid ad markup', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].adm = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an ad markup without auction price macro', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].adm = 'creative_data';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid ad serving URL', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].nurl = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an ad serving URL without auction price macro', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].nurl = 'win_notice_url';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without bid price', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].price = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid bid price', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].price = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without extension', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].ext = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid extension', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].ext = 'bad_ext';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without adot extension', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].ext.adot = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid adot extension', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].ext.adot = 'bad_adot_ext';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without media type', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].ext.adot.media_type = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid media type', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].ext.adot.media_type = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an unknown media type', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].ext.adot.media_type = 'unknown_media_type';

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and no server request', function () {
        const serverRequest = undefined;

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and an invalid server request', function () {
        const serverRequest = 'bad_server_request';

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request without bid request', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest.data = undefined;

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request with an invalid bid request', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest.data = 'bad_bid_request';

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request without impression', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest.data.imp = undefined;

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request with an invalid impression field', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest.data.imp = 'invalid_impressions';

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request without matching impression', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest.data.imp[0].id = 'unknown_imp_id';

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });
    });

    describe('Banner', function () {
      it('should return an ad when given a valid server response with one bid', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = examples.serverResponse_banner;

        const ads = spec.interpretResponse(serverResponse, serverRequest);
        const admWithAuctionPriceReplaced = utils.replaceAuctionPrice(serverResponse.body.seatbid[0].bid[0].adm, serverResponse.body.seatbid[0].bid[0].price);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].ad).to.exist.and.to.be.a('string').and.to.have.string(admWithAuctionPriceReplaced);
        expect(ads[0].adUrl).to.equal(null);
        expect(ads[0].vastXml).to.equal(null);
        expect(ads[0].vastUrl).to.equal(null);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].h);
        expect(ads[0].width).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('banner');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return an ad when given a valid server response with one bid using an ad serving URL', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].adm = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);
        const nurlWithAuctionPriceReplaced = utils.replaceAuctionPrice(serverResponse.body.seatbid[0].bid[0].nurl, serverResponse.body.seatbid[0].bid[0].price);

        expect(ads).to.be.an('array').and.to.have.length(1);
        expect(ads[0].ad).to.equal(null);
        expect(ads[0].adUrl).to.exist.and.to.be.a('string').and.to.equal(nurlWithAuctionPriceReplaced);
        expect(ads[0].creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].crid);
        expect(ads[0].cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
        expect(ads[0].currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.cur);
        expect(ads[0].netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(true);
        expect(ads[0].ttl).to.exist.and.to.be.a('number').and.to.equal(10);
        expect(ads[0].height).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].h);
        expect(ads[0].width).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].w);
        expect(ads[0].mediaType).to.exist.and.to.be.a('string').and.to.equal('banner');
        expect(ads[0].renderer).to.equal(null);
      });

      it('should return no ad when given a server response with a bid without height', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].h = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid height', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].h = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid without width', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].w = undefined;

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a server response with a bid with an invalid width', function () {
        const serverRequest = examples.serverRequest_banner;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);
        serverResponse.body.seatbid[0].bid[0].w = {};

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });

      it('should return no ad when given a valid server response and a server request without banner impression', function () {
        const serverRequest = utils.deepClone(examples.serverRequest_banner);
        serverRequest.data.imp[0].banner = undefined;

        const serverResponse = utils.deepClone(examples.serverResponse_banner);

        const ads = spec.interpretResponse(serverResponse, serverRequest);

        expect(ads).to.be.an('array').and.to.have.length(0);
      });
    });
  });
});