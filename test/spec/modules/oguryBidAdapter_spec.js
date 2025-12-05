import { expect } from 'chai';
import sinon from 'sinon';
import { spec, ortbConverterProps } from 'modules/oguryBidAdapter';
import * as utils from 'src/utils.js';
import { server } from '../../mocks/xhr.js';
import {getDevicePixelRatio} from '../../../libraries/devicePixelRatio/devicePixelRatio.js';

const BID_URL = 'https://mweb-hb.presage.io/api/header-bidding-request';
const TIMEOUT_URL = 'https://ms-ads-monitoring-events.presage.io/bid_timeout'

describe('OguryBidAdapter', () => {
  let bidRequests, bidderRequestBase, ortb2;

  const currentLocation = 'https://mwtt.ogury.tech/advanced';

  bidRequests = [
    {
      adUnitCode: 'adUnitCode',
      ortb2Imp: {
        ext: {
          gpid: 'gpid'
        }
      },
      auctionId: 'auctionId',
      bidId: 'bidId',
      bidder: 'ogury',
      params: {
        assetKey: 'OGY-assetkey',
        adUnitId: 'adunitId',
        xMargin: 20,
        yMarging: 20,
        gravity: 'TOP_LEFT',
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      getFloor: ({ size, currency, mediaType }) => {
        const floorResult = {
          currency: 'USD',
          floor: 0
        };

        if (mediaType === 'banner') {
          floorResult.floor = 4;
        } else {
          floorResult.floor = 1000;
        }

        return floorResult;
      },
      transactionId: 'transactionId',
      userId: { pubcid: 'f5debac9-9a8e-4c08-9820-51e96b69f858' }
    },
    {
      adUnitCode: 'adUnitCode2',
      auctionId: 'auctionId',
      bidId: 'bidId2',
      bidder: 'ogury',
      params: {
        assetKey: 'OGY-assetkey',
        adUnitId: 'adunitId2'
      },
      mediaTypes: {
        banner: {
          sizes: [[600, 500]]
        }
      },
      transactionId: 'transactionId2'
    },
  ];

  ortb2 = {
    regs: {
      gpp_sid: [7],
      gpp: 'DBABLA~BAAAAAAAAQA.QA',
      ext: { gdpr: 1 }
    },
    site: {
      domain: 'mwtt.ogury.tech',
      publisher: { domain: 'ogury.tech', id: 'ca06d4199b92bf6808e5ce15b28c6d30' },
      page: currentLocation,
      ref: 'https://google.com'
    },
    user: {
      ext: {
        consent: 'CQJI3tqQJI3tqFzABBENBJFsAP_gAEPgAAqIg1NX_H__bW9r8Xr3aft0eY1P99j77sQxBhfJE-4FyLvW_JwXx2EwNA26tqIKmRIEu3ZBIQFlHJHURVigaogVryHsYkGcgTNKJ6BkgFMRI2dYCF5vmYtj-QKY5_p_d3fx2D-t_dv83dzzz8VHn3e5fmckcKCdQ58tDfn9bRKb-5IO9-78v4v09l_rk2_eTVn_pcvr7B-uft87_XU-9_fAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEQagCzDQqIA-yJCQi0DCKBACIKwgIoEAAAAJA0QEAJAwKdgYBLrCRACBFAAMEAIAAUZAAgAAEgAQiACQAoEAAEAgEAAAAAAgEADAwADgAtBAIAAQHQMUwoAFAsIEiMiIUwIQoEggJbKBBICgQVwgCLDAigERMFAAgCQAVgAAAsVgMASAlYkECWUG0AABAAgFFKFQik6MAQwJmy1U4om0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAACAA.YAAAAAAAAAAA',
        eids: [
          {
            source: 'pubcid.org',
            uids: [{ 'id': 'f5debac9-9a8e-4c08-9820-51e96b69f858', 'atype': 1 }]
          }
        ]
      }
    },
    device: {
      w: 412,
      h: 915,
      dnt: 0,
      ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
      language: 'en',
      ext: { vpw: 412, vph: 915 },
      sua: {
        source: 1,
        platform: { brand: 'Android' },
        browsers: [{ brand: 'Google Chrome', version: ['131'] }],
        mobile: 1
      }
    }
  };

  bidderRequestBase = {
    bids: bidRequests,
    bidderRequestId: 'mock-uuid',
    auctionId: bidRequests[0].auctionId,
    gdprConsent: {consentString: 'myConsentString', vendorData: {}, gdprApplies: true},
    gppConsent: {gppString: 'myGppString', gppData: {}, applicableSections: [7], parsedSections: {}},
    timeout: 1000,
    ortb2
  };

  describe('isBidRequestValid', () => {
    it('should validate correct bid', () => {
      let validBid = utils.deepClone(bidRequests[0]);

      let isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.true;
    });

    it('should not validate when sizes is not defined', () => {
      let invalidBid = utils.deepClone(bidRequests[0]);
      delete invalidBid.sizes;
      delete invalidBid.mediaTypes;

      let isValid = spec.isBidRequestValid(invalidBid);
      expect(isValid).to.be.false;
    });

    it('should not validate bid when adunit is not defined', () => {
      let invalidBid = utils.deepClone(bidRequests[0]);
      delete invalidBid.params.adUnitId;

      let isValid = spec.isBidRequestValid(invalidBid);
      expect(isValid).to.to.be.false;
    });

    it('should not validate bid when assetKey is not defined', () => {
      let invalidBid = utils.deepClone(bidRequests[0]);
      delete invalidBid.params.assetKey;

      let isValid = spec.isBidRequestValid(invalidBid);
      expect(isValid).to.be.false;
    });

    it('should validate the request when only publisherId and adUnitCode is defined', () => {
      const validBid = utils.deepClone(bidRequests[0])
      delete validBid.params.adUnitId
      delete validBid.params.assetKey

      validBid.ortb2 = { site: { publisher: { id: 'publisherId' } } }

      expect(spec.isBidRequestValid(validBid)).to.be.true
    });

    it('should not validate the request when only publisherId is defined', () => {
      const invalidBid = utils.deepClone(bidRequests[0])
      delete invalidBid.params.adUnitId
      delete invalidBid.params.assetKey
      delete invalidBid.adUnitCode

      invalidBid.ortb2 = { site: { publisher: { id: 'publisherId' } } }

      expect(spec.isBidRequestValid(invalidBid)).to.be.false
    });

    it('should not validate the request when only adUnitCode is defined', () => {
      const invalidBid = utils.deepClone(bidRequests[0])
      delete invalidBid.params.adUnitId
      delete invalidBid.params.assetKey

      expect(spec.isBidRequestValid(invalidBid)).to.be.false
    });
  });

  describe('getUserSyncs', () => {
    let syncOptions, gdprConsent, gppConsent;

    beforeEach(() => {
      gdprConsent = {
        gdprApplies: true,
        consentString: 'CPJl4C8PJl4C8OoAAAENAwCMAP_AAH_AAAAAAPgAAAAIAPgAAAAIAAA.IGLtV_T9fb2vj-_Z99_tkeYwf95y3p-wzhheMs-8NyZeH_B4Wv2MyvBX4JiQKGRgksjLBAQdtHGlcTQgBwIlViTLMYk2MjzNKJrJEilsbO2dYGD9Pn8HT3ZCY70-vv__7v3ff_3g'
      };
      gppConsent = {
        gppString: 'DBABLA~BAAAAAAAAQA.QA',
        applicableSections: [7]
      }
    });

    describe('pixel', () => {
      beforeEach(() => {
        syncOptions = { pixelEnabled: true };
      });

      it('should return syncs array with one element of type image', () => {
        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);

        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('image');
        expect(userSyncs[0].url).to.contain('https://ms-cookie-sync.presage.io/user-sync');
      });

      it('should set the source as query param', () => {
        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(new URL(userSyncs[0].url).searchParams.get('source')).to.equal('prebid')
      });

      it('should set the tcString as query param', () => {
        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(new URL(userSyncs[0].url).searchParams.get('gdpr_consent')).to.equal(gdprConsent.consentString)
      });

      it('should set the gppString as query param', () => {
        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(new URL(userSyncs[0].url).searchParams.get('gpp')).to.equal(gppConsent.gppString)
      });

      it('should set the gpp_sid as query param', () => {
        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(new URL(userSyncs[0].url).searchParams.get('gpp_sid')).to.equal(gppConsent.applicableSections.toString())
      });

      it('should return an empty array when pixel is disable', () => {
        syncOptions.pixelEnabled = false;
        expect(spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent)).to.have.lengthOf(0);
      });

      it('should return syncs array with three elements of type image when consentString is undefined', () => {
        gdprConsent = {
          gdprApplies: true,
          consentString: undefined
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('image');
        expect(new URL(userSyncs[0].url).searchParams.get('gdpr_consent')).to.equal('')
      });

      it('should return syncs array with three elements of type image when consentString is null', () => {
        gdprConsent = {
          gdprApplies: true,
          consentString: null
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('image');
        expect(new URL(userSyncs[0].url).searchParams.get('gdpr_consent')).to.equal('')
      });

      it('should return syncs array with three elements of type image when gdprConsent is undefined', () => {
        gdprConsent = undefined;

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('image');
        expect(new URL(userSyncs[0].url).searchParams.get('gdpr_consent')).to.equal('')
      });

      it('should return syncs array with three elements of type image when gdprConsent is null', () => {
        gdprConsent = null;

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('image');
        expect(new URL(userSyncs[0].url).searchParams.get('gdpr_consent')).to.equal('')
      });

      it('should return syncs array with three elements of type image when gdprConsent is null and gdprApplies is false', () => {
        gdprConsent = {
          gdprApplies: false,
          consentString: null
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('image');
        expect(new URL(userSyncs[0].url).searchParams.get('gdpr_consent')).to.equal('')
      });

      it('should return syncs array with three elements of type image when gdprConsent is empty string and gdprApplies is false', () => {
        gdprConsent = {
          gdprApplies: false,
          consentString: ''
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('image');
        expect(new URL(userSyncs[0].url).searchParams.get('gdpr_consent')).to.equal('')
      });

      it('should return syncs array with three elements of type image when gppString is undefined', () => {
        gppConsent = {
          applicableSections: [7],
          gppString: undefined
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('image');

        const firstUrlSync = new URL(userSyncs[0].url).searchParams
        expect(firstUrlSync.get('gpp')).to.equal('')
        expect(firstUrlSync.get('gpp_sid')).to.equal(gppConsent.applicableSections.toString())
      });

      it('should return syncs array with three elements of type image when gppString is null', () => {
        gppConsent = {
          applicableSections: [7, 8],
          gppString: null
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('image');

        const firstUrlSync = new URL(userSyncs[0].url).searchParams
        expect(firstUrlSync.get('gpp')).to.equal('')
        expect(firstUrlSync.get('gpp_sid')).to.equal(gppConsent.applicableSections.toString())
      });

      it('should return syncs array with three elements of type image when gppConsent is undefined', () => {
        gppConsent = undefined;

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('image');

        const firstUrlSync = new URL(userSyncs[0].url).searchParams
        expect(firstUrlSync.get('gpp')).to.equal('')
        expect(firstUrlSync.get('gpp_sid')).to.equal('')
      });

      it('should return syncs array with three elements of type image when gppConsent is null', () => {
        gppConsent = null;

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('image');

        const firstUrlSync = new URL(userSyncs[0].url).searchParams
        expect(firstUrlSync.get('gpp')).to.equal('')
        expect(firstUrlSync.get('gpp_sid')).to.equal('')
      });

      it('should return syncs array with three elements of type image when gppConsent is null and applicableSections is empty', () => {
        gppConsent = {
          applicableSections: [],
          gppString: null
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('image');

        const firstUrlSync = new URL(userSyncs[0].url).searchParams
        expect(firstUrlSync.get('gpp')).to.equal('')
        expect(firstUrlSync.get('gpp_sid')).to.equal('')
      });

      it('should return syncs array with three elements of type image when gppString is empty string and applicableSections is empty', () => {
        gppConsent = {
          applicableSections: [],
          gppString: ''
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('image');

        const firstUrlSync = new URL(userSyncs[0].url).searchParams
        expect(firstUrlSync.get('gpp')).to.equal('')
        expect(firstUrlSync.get('gpp_sid')).to.equal('')
      });
    });

    describe('iframe', () => {
      beforeEach(() => {
        syncOptions = { iframeEnabled: true };
      });

      it('should return syncs array with one element of type iframe', () => {
        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);

        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('iframe');
        expect(userSyncs[0].url).to.contain('https://ms-cookie-sync.presage.io/user-sync.html');
      });

      it('should set the source as query param', () => {
        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(new URL(userSyncs[0].url).searchParams.get('source')).to.equal('prebid');
      });

      it('should set the tcString as query param', () => {
        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(new URL(userSyncs[0].url).searchParams.get('gdpr_consent')).to.equal(gdprConsent.consentString);
      });

      it('should set the gppString as query param', () => {
        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(new URL(userSyncs[0].url).searchParams.get('gpp')).to.equal(gppConsent.gppString);
      });

      it('should return an empty array when iframe is disable', () => {
        syncOptions.iframeEnabled = false;
        expect(spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent)).to.have.lengthOf(0);
      });

      it('should return syncs array with one element of type iframe when consentString is undefined', () => {
        gdprConsent = {
          gdprApplies: true,
          consentString: undefined
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('iframe');
        expect(new URL(userSyncs[0].url).searchParams.get('gdpr_consent')).to.equal('');
      });

      it('should return syncs array with one element of type iframe when consentString is null', () => {
        gdprConsent = {
          gdprApplies: true,
          consentString: null
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('iframe');
        expect(new URL(userSyncs[0].url).searchParams.get('gdpr_consent')).to.equal('');
      });

      it('should return syncs array with one element of type iframe when gdprConsent is undefined', () => {
        gdprConsent = undefined;

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('iframe');
        expect(new URL(userSyncs[0].url).searchParams.get('gdpr_consent')).to.equal('');
      });

      it('should return syncs array with one element of type iframe when gdprConsent is null', () => {
        gdprConsent = null;

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('iframe');
        expect(new URL(userSyncs[0].url).searchParams.get('gdpr_consent')).to.equal('');
      });

      it('should return syncs array with one element of type iframe when gdprConsent is null and gdprApplies is false', () => {
        gdprConsent = {
          gdprApplies: false,
          consentString: null
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('iframe');
        expect(new URL(userSyncs[0].url).searchParams.get('gdpr_consent')).to.equal('');
      });

      it('should return syncs array with one element of type iframe when gdprConsent is empty string and gdprApplies is false', () => {
        gdprConsent = {
          gdprApplies: false,
          consentString: ''
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('iframe');
        expect(new URL(userSyncs[0].url).searchParams.get('gdpr_consent')).to.equal('');
      });

      it('should return syncs array with one element of type iframe when gppConsent is empty string and applicableSections is empty', () => {
        gppConsent = {
          applicableSections: [],
          gppString: ''
        };
        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('iframe');

        const urlParams = new URL(userSyncs[0].url).searchParams
        expect(urlParams.get('gpp')).to.equal('')
        expect(urlParams.get('gpp_sid')).to.equal('')
      });

      it('should return syncs array with one element of type iframe when gppString is undefined', () => {
        gppConsent = {
          applicableSections: [7],
          gppString: undefined
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('iframe');

        const urlParams = new URL(userSyncs[0].url).searchParams
        expect(urlParams.get('gpp')).to.equal('')
        expect(urlParams.get('gpp_sid')).to.equal(gppConsent.applicableSections.toString())
      });

      it('should return syncs array with one element of type iframe when gppString is null', () => {
        gppConsent = {
          applicableSections: [7],
          gppString: null
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('iframe');

        const urlParams = new URL(userSyncs[0].url).searchParams
        expect(urlParams.get('gpp')).to.equal('')
        expect(urlParams.get('gpp_sid')).to.equal(gppConsent.applicableSections.toString())
      });

      it('should return syncs array with one element of type iframe when gppConsent is undefined', () => {
        gppConsent = undefined;

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('iframe');

        const urlParams = new URL(userSyncs[0].url).searchParams
        expect(urlParams.get('gpp')).to.equal('')
        expect(urlParams.get('gpp_sid')).to.equal('')
      });

      it('should return syncs array with one element of type iframe when gppConsent is null', () => {
        gppConsent = null;

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('iframe');

        const urlParams = new URL(userSyncs[0].url).searchParams
        expect(urlParams.get('gpp')).to.equal('')
        expect(urlParams.get('gpp_sid')).to.equal('')
      });

      it('should return syncs array with one element of type iframe when gppConsent is null and applicableSections is empty', () => {
        gppConsent = {
          applicableSections: [],
          gppString: null
        };

        const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent, [], gppConsent);
        expect(userSyncs).to.have.lengthOf(1);
        expect(userSyncs[0].type).to.equal('iframe');

        const urlParams = new URL(userSyncs[0].url).searchParams
        expect(urlParams.get('gpp')).to.equal('')
        expect(urlParams.get('gpp_sid')).to.equal('')
      });
    });
  });

  describe('buildRequests', () => {
    let windowTopStub;
    const stubbedCurrentTime = 1234567890
    const stubbedDevicePixelRatio = 1
    const stubbedCurrentTimeMethod = sinon.stub(document.timeline, 'currentTime').get(function() {
      return stubbedCurrentTime;
    });

    const defaultTimeout = 1000;

    function assertImpObject(ortbBidRequest, bidRequest) {
      expect(ortbBidRequest.secure).to.equal(1);
      expect(ortbBidRequest.id).to.equal(bidRequest.bidId);
      expect(ortbBidRequest.tagid).to.equal(bidRequest.adUnitCode);
      expect(ortbBidRequest.banner).to.deep.equal({
        topframe: 0,
        format: [{
          w: bidRequest.mediaTypes.banner.sizes[0][0],
          h: bidRequest.mediaTypes.banner.sizes[0][1],
        }]
      });

      expect(ortbBidRequest.ext).to.deep.equal({
        ...bidRequest.params,
        gpid: bidRequest.ortb2Imp?.ext.gpid || bidRequest.adUnitCode,
        timeSpentOnPage: stubbedCurrentTime
      });
    }

    function assertRequestObject(dataRequest) {
      expect(dataRequest.id).to.be.a('string');
      expect(dataRequest.tmax).to.equal(defaultTimeout);

      assertImpObject(dataRequest.imp[0], bidRequests[0]);
      assertImpObject(dataRequest.imp[1], bidRequests[1]);

      expect(dataRequest.imp[0].bidfloor).to.equal(4);
      expect(dataRequest.regs).to.deep.equal(ortb2.regs);
      expect(dataRequest.site).to.deep.equal({
        ...ortb2.site,
        page: currentLocation,
        id: bidRequests[0].params.assetKey
      });

      expect(dataRequest.user).to.deep.equal({
        ext: {
          ...ortb2.user.ext
        }
      });

      expect(dataRequest.ext).to.deep.equal({
        prebidversion: '$prebid.version$',
        adapterversion: '2.0.5'
      });

      expect(dataRequest.device).to.deep.equal({
        ...ortb2.device,
        pxratio: stubbedDevicePixelRatio,
      });

      expect(dataRequest.regs.ext.gdpr).to.be.a('number');
      expect(dataRequest.device.pxratio).to.be.a('number');
    }

    beforeEach(() => {
      windowTopStub = sinon.stub(utils, 'getWindowTop');
      windowTopStub.returns({ location: { href: currentLocation }, devicePixelRatio: stubbedDevicePixelRatio});
    });

    afterEach(() => {
      windowTopStub.restore();
    });

    after(() => {
      stubbedCurrentTimeMethod.restore();
    });

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequestBase);
      expect(request.url).to.equal(BID_URL);
      expect(request.method).to.equal('POST');
    });

    it('timeSpentOnpage should be 0 if timeline is undefined', function () {
      const stubbedTimelineMethod = sinon.stub(document, 'timeline').get(function() {
        return undefined;
      });

      const request = spec.buildRequests(bidRequests, bidderRequestBase);
      expect(request.data.imp[0].ext.timeSpentOnPage).to.equal(0);
      stubbedTimelineMethod.restore();
    });

    it('bid request object should be conform', function () {
      const request = spec.buildRequests(bidRequests, bidderRequestBase);
      assertRequestObject(request.data);
    });

    it('should not set site.id when assetKey is not present', () => {
      const bidderRequest = utils.deepClone(bidderRequestBase);
      const validBidRequests = bidderRequest.bids;
      delete validBidRequests[0].params.assetKey;
      delete validBidRequests[1].params.assetKey;

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data.site.id).to.be.an('undefined');
    });

    it('should handle bidFloor undefined', () => {
      const bidderRequest = utils.deepClone(bidderRequestBase);
      const validBidRequests = bidderRequest.bids;
      validBidRequests[0] = {
        ...validBidRequests[0],
        getFloor: undefined
      };

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data.imp[0].bidfloor).to.be.an('undefined');
    });

    it('should handle bidFloor when is not function', () => {
      const bidderRequest = utils.deepClone(bidderRequestBase);
      const validBidRequests = bidderRequest.bids;
      validBidRequests[0] = {
        ...validBidRequests[0],
        getFloor: 'getFloor'
      };

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data.imp[0].bidfloor).to.be.an('undefined');
    });

    it('should handle bidFloor when currency is not USD', () => {
      const bidderRequest = utils.deepClone(bidderRequestBase);
      const validBidRequests = bidderRequest.bids;

      validBidRequests[0] = {
        ...validBidRequests[0],
        getFloor: ({ size, currency, mediaType }) => {
          return {
            currency: 'EUR',
            floor: 4
          }
        }
      };

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data.imp[0].bidfloor).to.be.an('undefined');
    });

    it('should use adUnitCode when gpid from ortb2 is undefined', () => {
      const bidderRequest = utils.deepClone(bidderRequestBase);
      const validBidRequests = bidderRequest.bids;
      delete validBidRequests[0].ortb2Imp.ext.gpid;

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data.imp[0].ext.gpid).to.equal(bidRequests[0].adUnitCode);
    });

    it('should use adUnitCode when gpid is not present in ortb2Imp object', () => {
      const bidderRequest = utils.deepClone(bidderRequestBase);
      const validBidRequests = bidderRequest.bids;
      validBidRequests[0] = {
        ...validBidRequests[0],
        ortb2Imp: {
          ext: {}
        }
      };

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data.imp[0].ext.gpid).to.equal(bidRequests[0].adUnitCode);
    });

    it('should set the actual site location in site.page when the ORTB object contains the referrer instead of the current location', () => {
      const bidderRequest = utils.deepClone(bidderRequestBase);
      bidderRequest.ortb2.site.page = 'https://google.com';

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.site.page).to.equal(currentLocation);
    });
  });

  describe('interpretResponse', function () {
    let openRtbBidResponse = {
      body: {
        id: 'id_of_bid_response',
        seatbid: [{
          bid: [{
            id: 'advertId',
            impid: 'bidId',
            price: 100,
            nurl: 'url',
            adm: `<div><img style="width: 300px; height: 250px;" src="https://assets.afcdn.com/recipe/20190529/93153_w1024h768c1cx2220cy1728cxt0cyt0cxb4441cyb3456.jpg" alt="cookies" /></div>`,
            adomain: ['renault.fr'],
            ext: {
              adcontent: 'sample_creative',
              advertid: '1a278c48-b79a-4bbf-b69f-3824803e7d87',
              campaignid: '31724',
              mediatype: 'image',
              userid: 'ab4aabed-5230-49d9-9f1a-f06280d28366',
              usersync: true,
              advertiserid: '1',
              isomidcompliant: false
            },
            w: 180,
            h: 101
          }, {
            id: 'advertId2',
            impid: 'bidId2',
            price: 150,
            nurl: 'url2',
            adm: `<div><img style="width: 600px; height: 500px;" src="https://assets.afcdn.com/recipe/20190529/93153_w1024h768c1cx2220cy1728cxt0cyt0cxb4441cyb3456.jpg" alt="cookies" /></div>`,
            adomain: ['peugeot.fr'],
            ext: {
              adcontent: 'sample_creative',
              advertid: '2a278c48-b79a-4bbf-b69f-3824803e7d87',
              campaignid: '41724',
              userid: 'bb4aabed-5230-49d9-9f1a-f06280d28366',
              usersync: false,
              advertiserid: '2',
              isomidcompliant: true,
              mediatype: 'image',
              landingpageurl: 'https://ogury.com'
            },
            w: 600,
            h: 500
          }],
        }]
      }
    };

    function assertPrebidBidResponse(prebidBidResponse, ortbResponse) {
      expect(prebidBidResponse.ttl).to.equal(60);
      expect(prebidBidResponse.currency).to.equal('USD');
      expect(prebidBidResponse.netRevenue).to.be.true;
      expect(prebidBidResponse.mediaType).to.equal('banner');
      expect(prebidBidResponse.requestId).to.equal(ortbResponse.impid);
      expect(prebidBidResponse.cpm).to.equal(ortbResponse.price);
      expect(prebidBidResponse.width).to.equal(ortbResponse.w);
      expect(prebidBidResponse.height).to.equal(ortbResponse.h);
      expect(prebidBidResponse.ad).to.contain(ortbResponse.adm);
      expect(prebidBidResponse.meta.advertiserDomains).to.deep.equal(ortbResponse.adomain);
      expect(prebidBidResponse.seatBidId).to.equal(ortbResponse.id);
      expect(prebidBidResponse.nurl).to.equal(ortbResponse.nurl);
    }

    it('should correctly interpret bidResponse', () => {
      const request = spec.buildRequests(bidRequests, bidderRequestBase);
      const result = spec.interpretResponse(utils.deepClone(openRtbBidResponse), request);

      assertPrebidBidResponse(result[0], openRtbBidResponse.body.seatbid[0].bid[0]);
      assertPrebidBidResponse(result[1], openRtbBidResponse.body.seatbid[0].bid[1]);
    });
  });

  describe('ortbConverterProps.bidResponse', () => {
    it('should call buildBidResponse without nurl and return nurl into bidResponse to call it via ajax', () => {
      const bidResponse = { adUnitCode: 'adUnitCode', cpm: 10, adapterCode: 'ogury', width: 1, height: 1 };
      const buildBidResponse = () => bidResponse;
      const buildBidResponseSpy = sinon.spy(buildBidResponse);

      const bid = { nurl: 'http://url.co/win' };

      expect(ortbConverterProps.bidResponse(buildBidResponseSpy, utils.deepClone(bid), {})).to.deep.equal({
        ...bidResponse,
        currency: 'USD',
        nurl: bid.nurl
      });

      sinon.assert.calledWith(buildBidResponseSpy, {}, {});
    });
  });

  describe('onBidWon', function() {
    const nurl = 'https://fakewinurl.test/';
    let requests;

    beforeEach(function() {
      requests = server.requests;
    })

    it('Should not create nurl request if bid is undefined', function() {
      spec.onBidWon()
      expect(requests.length).to.equal(0);
    })

    it('Should not create nurl request if bid does not contains nurl', function() {
      spec.onBidWon({})
      expect(requests.length).to.equal(0);
    })

    it('Should not create nurl request if bid contains undefined nurl', function() {
      spec.onBidWon({ nurl: undefined })
      expect(requests.length).to.equal(0);
    })

    it('Should create nurl request if bid nurl', function() {
      spec.onBidWon({ nurl })
      expect(requests.length).to.equal(1);
      expect(requests[0].url).to.equal(nurl);
      expect(requests[0].method).to.equal('GET')
    })

    it('Should trigger getWindowContext method', function() {
      const bidSample = {
        id: 'advertId',
        impid: 'bidId',
        price: 100,
        nurl: 'url',
        adm: `<html><head><title>test creative</title></head><body style="margin: 0;"><div><img style="width: 300px; height: 250px;" src="https://assets.afcdn.com/recipe/20190529/93153_w1024h768c1cx2220cy1728cxt0cyt0cxb4441cyb3456.jpg" alt="cookies" /></div></body></html>`,
        adomain: ['renault.fr'],
        ext: {
          adcontent: 'sample_creative',
          advertid: '1a278c48-b79a-4bbf-b69f-3824803e7d87',
          campaignid: '31724',
          mediatype: 'image',
          userid: 'ab4aabed-5230-49d9-9f1a-f06280d28366',
          usersync: true,
          advertiserid: '1',
          isomidcompliant: false
        },
        w: 180,
        h: 101
      }
      spec.onBidWon(bidSample)
      expect(window.top.OG_PREBID_BID_OBJECT).to.deep.equal(bidSample)
    })
  })

  describe('getWindowContext', function() {
    it('Should return top window if exist', function() {
      const res = spec.getWindowContext()
      expect(res).to.equal(window.top)
      expect(res).to.not.be.undefined;
    })

    it('Should return self window if getting top window throw an error', function() {
      const stub = sinon.stub(utils, 'getWindowTop')
      stub.throws()
      const res = spec.getWindowContext()
      expect(res).to.equal(window.self)
      utils.getWindowTop.restore()
    })
  })

  describe('onTimeout', function () {
    let requests;

    beforeEach(function() {
      requests = server.requests;
      server.onCreate = (xhr) => {
        requests.push(xhr);
      };
    })

    it('should send on bid timeout notification', function() {
      const bid = {
        ad: '<img style="width: 300px; height: 250px;" src="https://assets.afcdn.com/recipe/20190529/93153_w1024h768c1cx2220cy1728cxt0cyt0cxb4441cyb3456.jpg" alt="cookies" />',
        cpm: 3
      }
      spec.onTimeout(bid);
      expect(requests).to.not.be.undefined;
      expect(requests.length).to.equal(1);
      expect(requests[0].url).to.equal(TIMEOUT_URL);
      expect(requests[0].method).to.equal('POST');
      expect(JSON.parse(requests[0].requestBody).location).to.equal(window.location.href);
    })
  });
});
