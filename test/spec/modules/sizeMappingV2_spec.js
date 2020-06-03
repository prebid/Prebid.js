import { expect } from 'chai';
import * as utils from '../../../src/utils.js';

import {
  isUsingNewSizeMapping,
  checkAdUnitSetupHook,
  checkBidderSizeConfigFormat,
  isLabelActivated,
  isSizeConfigActivated,
  getActiveSizeBucket,
  getRelevantMediaTypesForBidder,
  sizeMappingInternalStore,
  getAdUnitDetail,
  getFilteredMediaTypes,
  getBids,
  internal
} from '../../../modules/sizeMappingV2.js';

import { adUnitSetupChecks } from '../../../src/prebid.js';

const AD_UNITS = [{
  code: 'div-gpt-ad-1460505748561-0',
  mediaTypes: {
    banner: {
      sizeConfig: [
        { minViewPort: [0, 0], sizes: [] },		// remove if < 750px
        { minViewPort: [750, 0], sizes: [[300, 250], [300, 600]] },		// between 750px and 1199px
        { minViewPort: [1200, 0], sizes: [[970, 90], [728, 90], [300, 250]] }, // between 1200px and 1599px
        { minViewPort: [1600, 0], sizes: [[1000, 300], [970, 90], [728, 90], [300, 250]] } // greater than 1600px
      ]
    },
    video: {
      context: 'instream',
      sizeConfig: [
        { minViewPort: [0, 0], playerSize: [] },
        { minViewPort: [800, 0], playerSize: [[640, 400]] },
        { minViewPort: [1200, 0], playerSize: [] }
      ]
    },
    native: {
      image: {
        required: true,
        sizes: [150, 50]
      },
      title: {
        required: true,
        len: 80
      },
      sponsoredBy: {
        required: true
      },
      clickUrl: {
        required: true
      },
      privacyLink: {
        required: false
      },
      body: {
        required: true
      },
      icon: {
        required: true,
        sizes: [50, 50]
      },
      sizeConfig: [
        { minViewPort: [0, 0], active: false },
        { minViewPort: [600, 0], active: true },
        { minViewPort: [1000, 0], active: false }
      ]
    }
  },
  bids: [{
    bidder: 'appnexus',
    params: {
      placementId: 13144370
    }
  }]
}, {
  code: 'div-gpt-ad-1460505748561-1',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]]
    },
    video: {
      context: 'instream',
      playerSize: [300, 460]
    }
  },
  bids: [{
    bidder: 'appnexus',
    params: {
      placementId: 13144370
    }
  }, {
    bidder: 'rubicon',
    params: {
      accountId: 14062,
      siteId: 70608,
      zoneId: 498816
    },
    sizeConfig: [
      { minViewPort: [0, 0], relevantMediaTypes: ['none'] },
      { minViewPort: [800, 0], relevantMediaTypes: ['banner'] },
      { minViewPort: [1600, 0], relevantMediaTypes: ['none'] }
    ]
  }]
}];

// deletes the sizeConfig property from the adUnits either at the Ad Unit level or at the Bids level or at both.
function deleteSizeConfig(adUnits, config) {
  const { adUnitLevel, bidsLevel } = config;
  adUnits.forEach(adUnit => {
    const mediaTypes = adUnit.mediaTypes;
    if (adUnitLevel) {
      Object.keys(mediaTypes).forEach(mediaType => {
        if (mediaTypes[mediaType].sizeConfig) {
          delete adUnit.mediaTypes[mediaType].sizeConfig;
          if (mediaType === 'banner') {
            adUnit.mediaTypes[mediaType].sizes = [[300, 600], [300, 200]];
          } else if (mediaType === 'video') {
            adUnit.mediaTypes[mediaType].playerSize = [[640, 400]];
          }
        }
      });
    }

    if (bidsLevel) {
      adUnit.bids.forEach(bid => {
        if (bid.sizeConfig) {
          delete bid.sizeConfig;
        }
      });
    }
  });
  return adUnits;
}

describe('sizeMappingV2', function () {
  describe('isUsingNewSizeMaping(adUntis, auctionId)', function () {
    it('should return "false" if sizeConfig is not declared both at the adUnits level and the bids level', function () {
      let adUnits = utils.deepClone(AD_UNITS);

      // delete the sizeConfig property from AD_UNITS object at the Ad Unit and the Bids level both.
      adUnits = deleteSizeConfig(adUnits, { adUnitLevel: true, bidsLevel: true });
      const usingNewSizeMappingBool = isUsingNewSizeMapping(adUnits);

      // isUsingNewSizeMapping should return false because sizeConfig object is not present both at the Ad Units and the Bids level
      // for all the adUnits that are checked.
      expect(usingNewSizeMappingBool).to.be.false;
    });

    it('should return "true" if sizeConfig is declared at the adUnits level but not at the bids level', function () {
      let adUnits = utils.deepClone(AD_UNITS);

      // delete the sizeConfig property from AD_UNITS object at the Bids level but not at the Ad Unit level.
      adUnits = deleteSizeConfig(adUnits, { adUnitLevel: false, bidsLevel: true });
      const usingNewSizeMappingBool = isUsingNewSizeMapping(adUnits);

      // isUsingNewSizeMapping should return true because sizeConfig object is present at the Ad Units level but not at the
      // Bids level.
      expect(usingNewSizeMappingBool).to.be.true;
    });

    it('should return "true" if sizeConfig is declared at the bids level but not at the adUnits level', function () {
      let adUnits = utils.deepClone(AD_UNITS);

      // delete the sizeConfig property from AD_UNITS object at the Ad Unit level but not at the Bids level.
      adUnits = deleteSizeConfig(adUnits, { adUnitLevel: true, bidsLevel: false });
      const usingNewSizeMappingBool = isUsingNewSizeMapping(adUnits);

      // isUsingNewSizeMapping should return true because sizeConfig object is present at the Bids level but not at the
      // Ad Unit level.
      expect(usingNewSizeMappingBool).to.be.true;
    });

    it('should return "true" if sizeConfig is declared both at the adUnits level and at the bids level', function () {
      let adUnits = utils.deepClone(AD_UNITS);

      const usingNewSizeMappingBool = isUsingNewSizeMapping(adUnits);

      // isUsingNewSizeMapping should return true because sizeConfig object is present both at the Ad Unit level and at the
      // Bids level.
      expect(usingNewSizeMappingBool).to.be.true;
    });
  });

  describe('checkAdUnitSetupHook(adUnits)', function () {
    beforeEach(function () {
      sinon.spy(utils, 'logError');
    });

    afterEach(function () {
      utils.logError.restore();
    });

    it('should filter out adUnit if it does not contain the required property mediaTypes', function () {
      let adUnits = utils.deepClone(AD_UNITS);
      delete adUnits[0].mediaTypes;
      // before checkAdUnitSetupHook is called, the length of adUnits should be '2'
      expect(adUnits.length).to.equal(2);
      adUnits = checkAdUnitSetupHook(adUnits);

      // after checkAdUnitSetupHook is called, the length of adUnits should be '1'
      expect(adUnits.length).to.equal(1);
      expect(adUnits[0].code).to.equal('div-gpt-ad-1460505748561-1');
    });

    it('should filter out adUnit if it has declared property mediaTypes with an empty object', function () {
      let adUnits = utils.deepClone(AD_UNITS);
      adUnits[0].mediaTypes = {};
      // before checkAdUnitSetupHook is called, the length of adUnits should be '2'
      expect(adUnits.length).to.equal(2);
      adUnits = checkAdUnitSetupHook(adUnits);

      // after checkAdUnitSetupHook is called, the length of adUnits should be '1'
      expect(adUnits.length).to.equal(1);
      expect(adUnits[0].code).to.equal('div-gpt-ad-1460505748561-1');
    });

    it('should log an error message if Ad Unit does not contain the required property "mediaTypes"', function () {
      let adUnits = utils.deepClone(AD_UNITS);
      delete adUnits[0].mediaTypes;

      checkAdUnitSetupHook(adUnits);
      sinon.assert.callCount(utils.logError, 1);
      sinon.assert.calledWith(utils.logError, 'Detected adUnit.code \'div-gpt-ad-1460505748561-0\' did not have a \'mediaTypes\' object defined. This is a required field for the auction, so this adUnit has been removed.');
    });

    describe('banner mediaTypes checks', function () {
      beforeEach(function () {
        sinon.spy(adUnitSetupChecks, 'validateBannerMediaType');
      });

      afterEach(function () {
        adUnitSetupChecks.validateBannerMediaType.restore();
      });

      it('should delete banner mediaType if it does not constain sizes or sizeConfig property', function () {
        let adUnits = utils.deepClone(AD_UNITS);
        delete adUnits[0].mediaTypes.banner.sizeConfig;

        // before checkAdUnitSetupHook is called, adUnits[0].mediaTypes.banner property should exist.
        expect(adUnits[0].mediaTypes).to.have.property('banner');

        adUnits = checkAdUnitSetupHook(adUnits);

        // after checkAdUnitSetupHook is called, adUnits[0].mediaTypes.banner property should not exist.
        expect(adUnits[0].mediaTypes).to.not.have.property('banner');
      });

      it('should log an error message if mediaTypes.banner does not contain "sizes" or "sizeConfig" property', function () {
        let adUnits = utils.deepClone(AD_UNITS);
        // deleteing the sizeConfig property from the first ad unit.
        delete adUnits[0].mediaTypes.banner.sizeConfig;

        checkAdUnitSetupHook(adUnits);
        sinon.assert.callCount(utils.logError, 1);
        sinon.assert.calledWith(utils.logError, 'Detected a mediaTypes.banner object did not include required property sizes or sizeConfig. Removing invalid mediaTypes.banner object from Ad Unit.');
      });

      it('should call function "validateBannerMediaType" if mediaTypes.sizes is present', function () {
        const adUnits = utils.deepClone(AD_UNITS);
        checkAdUnitSetupHook(adUnits);

        // since the second Ad Unit in AD_UNITS array uses mediaTypes.sizes, it should get called only once.
        sinon.assert.callCount(adUnitSetupChecks.validateBannerMediaType, 1);
        sinon.assert.calledWith(adUnitSetupChecks.validateBannerMediaType, adUnits[1]);
      });

      it('should delete mediaTypes.banner object if it\'s property sizeConfig is not declared as an array', function () {
        const adUnits = utils.deepClone(AD_UNITS);
        const badSizeConfig = {
          minViewPort: [0, 0], sizes: [300, 400]
        };
        adUnits[0].mediaTypes.banner.sizeConfig = badSizeConfig;

        // before calling checkAdUnitSetupHook(adUnits), mediaTypes.banner should be defined
        expect(adUnits[0].mediaTypes).to.have.property('banner');

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);

        // after calling checkAdUnitSetupHook(adUnits), mediaTypes.banner property should be deleted
        expect(validatedAdUnits.length).to.not.have.property('banner');
      });

      it('should log an error message if sizeConfig property in mediaTypes.banner object is not declared as an array', function () {
        const adUnits = utils.deepClone(AD_UNITS);
        // badSizeConfig is NOT defined as an Array
        const badSizeConfig = {
          minViewPort: [0, 0], sizes: [300, 400]
        };
        adUnits[0].mediaTypes.banner.sizeConfig = badSizeConfig;

        checkAdUnitSetupHook(adUnits);
        sinon.assert.callCount(utils.logError, 1);
        sinon.assert.calledWith(utils.logError, `Ad Unit: div-gpt-ad-1460505748561-0: mediaTypes.banner.sizeConfig is NOT an Array. Removing the invalid object mediaTypes.banner from Ad Unit.`);
      });

      it('should delete mediaTypes.banner object if it\'s property sizeConfig does not contain the required properties "minViewPort" and "sizes"', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // badSizeConfig[2] does not contain the required "sizes" property
        const badSizeConfig = [
          { minViewPort: [0, 0], sizes: [] },
          { minViewPort: [700, 0], sizes: [[300, 250], [300, 600]] },
          { minViewPort: [1200, 0] }
        ];
        adUnits[0].mediaTypes.banner.sizeConfig = badSizeConfig;

        // before calling checkAdUnitSetupHook(adUnits), mediaTypes.banner should be defined
        expect(adUnits[0].mediaTypes).to.have.property('banner');

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);

        // after calling checkAdUnitSetupHook(adUnits), mediaTypes.banner property should be deleted
        expect(validatedAdUnits.length).to.not.have.property('banner');
      });

      it('should log an error message if sizeConfig property in mediaTypes.banner object does not contain the required properties "minViewPort" and "sizes"', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // badSizeConfig[2] does not contain the required "sizes" property
        const badSizeConfig = [
          { minViewPort: [0, 0], sizes: [] },
          { minViewPort: [700, 0], sizes: [[300, 250], [300, 600]] },
          { minViewPort: [1200, 0] }
        ];
        adUnits[0].mediaTypes.banner.sizeConfig = badSizeConfig;

        checkAdUnitSetupHook(adUnits);
        sinon.assert.callCount(utils.logError, 1);
        sinon.assert.calledWith(utils.logError, `Ad Unit: div-gpt-ad-1460505748561-0: mediaTypes.banner.sizeConfig[2] is missing required property minViewPort or sizes or both.`);
      });

      it('should delete mediaTypes.banner object if it\'s property sizeConfig has declared minViewPort property which is NOT an Array of two integers', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // badSizeConfig[0].minViewPort is an Array of ONE inteter. It should be an array of two integers to be valid, like [0, 0]
        const badSizeConfig = [
          { minViewPort: [0], sizes: [] },
          { minViewPort: [700, 0], sizes: [[300, 250], [300, 600]] },
          { minViewPort: [1200, 0], sizes: [[900, 700], [1000, 1200]] }
        ];
        adUnits[0].mediaTypes.banner.sizeConfig = badSizeConfig;

        // before calling checkAdUnitSetupHook(adUnits), mediaTypes.banner should be defined
        expect(adUnits[0].mediaTypes).to.have.property('banner');

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);

        // after calling checkAdUnitSetupHook(adUnits), mediaTypes.banner property should be deleted
        expect(validatedAdUnits.length).to.not.have.property('banner');
      });

      it('should log an error message if sizeConfig has declared property minViewPort which is not an array of two integers', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // badSizeConfig[0].minViewPort is an Array of ONE inteter. It should be an array of two integers to be valid, like [0, 0]
        const badSizeConfig = [
          { minViewPort: [0], sizes: [] },
          { minViewPort: [700, 0], sizes: [[300, 250], [300, 600]] },
          { minViewPort: [1200, 0], sizes: [[900, 700], [1000, 1200]] }
        ];
        adUnits[0].mediaTypes.banner.sizeConfig = badSizeConfig;

        checkAdUnitSetupHook(adUnits);
        sinon.assert.callCount(utils.logError, 1);
        sinon.assert.calledWith(utils.logError, `Ad Unit: div-gpt-ad-1460505748561-0: mediaTypes.banner.sizeConfig[0] has property minViewPort decalared with invalid value. Please ensure minViewPort is an Array and is listed like: [700, 0]. Declaring an empty array is not allowed, instead use: [0, 0].`);
      });

      it('should delete mediaTypes.banner object if it\'s property sizeConfig has declared sizes property which is not in the format, [[vw1, vh1], [vw2, vh2]], where vw is viewport width and vh is viewport height', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // badSizeConfig[1].sizes is not declared in the correct format. It should be an Array of TWO integers.
        const badSizeConfig = [
          { minViewPort: [0, 0], sizes: [] },
          { minViewPort: [700, 0], sizes: [300] },
          { minViewPort: [1200, 0], sizes: [[900, 700], [1000, 1200]] }
        ];
        adUnits[0].mediaTypes.banner.sizeConfig = badSizeConfig;

        // before calling checkAdUnitSetupHook(adUnits), mediaTypes.banner should be defined
        expect(adUnits[0].mediaTypes).to.have.property('banner');

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);

        // after calling checkAdUnitSetupHook(adUnits), mediaTypes.banner property should be deleted
        expect(validatedAdUnits.length).to.not.have.property('banner');
      });

      it('should log an error message if sizeConfig has declared property sizes which is not in the format, [[vw1, vh1], [vw2, vh2]], where vw is viewport width and vh is viewport height', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // badSizeConfig[1].sizes is not declared in the correct format. It should be an Array of TWO integers.
        const badSizeConfig = [
          { minViewPort: [0, 0], sizes: [] },
          { minViewPort: [700, 0], sizes: [300] },
          { minViewPort: [1200, 0], sizes: [[900, 700], [1000, 1200]] }
        ];
        adUnits[0].mediaTypes.banner.sizeConfig = badSizeConfig;

        checkAdUnitSetupHook(adUnits);
        sinon.assert.callCount(utils.logError, 1);
        sinon.assert.calledWith(utils.logError, `Ad Unit: div-gpt-ad-1460505748561-0: mediaTypes.banner.sizeConfig[1] has propery sizes declared with invalid value. Please ensure the sizes are listed like: [[300, 250], ...] or like: [] if no sizes are present for that size bucket.`);
      });

      it('should convert sizeConfig.sizes to an array of array, i.e., [360, 600] to [[360, 600]]', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // badSizeConfig[1].sizes is declared as a Array of integers. Correct way to declare is to have it as an Array of Array of Integers, like, [[300, 250]]
        // Although, the system won't throw error, it'll internall convert it to the format, [[300, 250]]
        const badSizeConfig = [
          { minViewPort: [0, 0], sizes: [] },
          { minViewPort: [700, 0], sizes: [300, 600] },
          { minViewPort: [1200, 0], sizes: [[900, 700], [1000, 1200]] }
        ];
        adUnits[0].mediaTypes.banner.sizeConfig = badSizeConfig;

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);
        expect(validatedAdUnits[0].mediaTypes.banner.sizeConfig[1].sizes).to.deep.equal([[300, 600]]);
      });

      it('should allow empty array declaration in sizeConfig.sizes to indicate "No valid sizes for this size bucket", and convert it to an array of array, i.e, [] to [[]]', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);
        expect(validatedAdUnits[0].mediaTypes.banner.sizeConfig[0].sizes).to.deep.equal([[]]);
      });

      it('should NOT delete mediaTypes.banner object if sizeConfig object is declared correctly', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // before calling checkAdUnitSetupHook, the mediaTypes.banner object should be present on both the Ad Units.
        expect(adUnits[0].mediaTypes).to.have.property('banner');
        expect(adUnits[1].mediaTypes).to.have.property('banner');

        checkAdUnitSetupHook(adUnits);

        // after calling checkAdUnitSetupHook, the mediaTypes.banner object should still be present for both the Ad Units.
        expect(adUnits[0].mediaTypes).to.have.property('banner');
        expect(adUnits[1].mediaTypes).to.have.property('banner');
      });
    });

    describe('video mediaTypes checks', function () {
      beforeEach(function () {
        sinon.spy(adUnitSetupChecks, 'validateVideoMediaType');
      });

      afterEach(function () {
        adUnitSetupChecks.validateVideoMediaType.restore();
      });

      it('should call function "validateVideoMediaType" if mediaTypes.video.playerSize is present in the Ad Unit', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        checkAdUnitSetupHook(adUnits);

        // since adUntis[1].mediaTypes.video has defined property "playserSize", it should call function "validateVideoMediaType" only once
        sinon.assert.callCount(adUnitSetupChecks.validateVideoMediaType, 1);
        sinon.assert.calledWith(adUnitSetupChecks.validateVideoMediaType, adUnits[1]);
      });

      it('should delete mediaTypes.video.sizeConfig property if sizeConfig is not declared as an array', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // badSizeConfig is declared as an object, it should have been an Array.
        const badSizeConfig = {
          minViewPort: [0, 0], playerSize: [640, 400]
        };
        adUnits[0].mediaTypes.video.sizeConfig = badSizeConfig;

        // before calling checkAdUnitSetupHook, mediaTypes.video.sizeConfig property should be defined.
        expect(adUnits[0].mediaTypes.video).to.have.property('sizeConfig');

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);

        // after calling checkAdUnitSetupHook, mediaTypes.video.sizeConfig property should be deleted.
        expect(validatedAdUnits[0].mediaTypes.video).to.not.have.property('sizeConfig');

        // check if correct logError is written to the console.
        sinon.assert.callCount(utils.logError, 1);
        sinon.assert.calledWith(utils.logError, `Ad Unit: div-gpt-ad-1460505748561-0: mediaTypes.video.sizeConfig is NOT an Array. Removing the invalid property mediaTypes.video.sizeConfig from Ad Unit.`);
      });

      it('should delete mediaTypes.video.sizeConfig property if sizeConfig does not contain the required properties "minViewPort" and "playerSize"', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // badSizeConfig[0] doest not contain the required property "playerSize".
        const badSizeConfig = [
          { minViewPort: [0, 0] },
          { minViewPort: [1200, 0], playerSize: [640, 400] }
        ];
        adUnits[0].mediaTypes.video.sizeConfig = badSizeConfig;

        // before calling checkAdUnitSetupHook, mediaTypes.video.sizeConfig property should be defined.
        expect(adUnits[0].mediaTypes.video).to.have.property('sizeConfig');

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);

        // after calling checkAdUnitSetupHook, mediaTypes.video.sizeConfig property should be deleted.
        expect(validatedAdUnits[0].mediaTypes.video).to.not.have.property('sizeConfig');

        // check if correct logError is written to the console.
        sinon.assert.callCount(utils.logError, 1);
        sinon.assert.calledWith(utils.logError, `Ad Unit: div-gpt-ad-1460505748561-0: mediaTypes.video.sizeConfig[0] is missing required property minViewPort or playerSize or both. Removing the invalid property mediaTypes.video.sizeConfig from Ad Unit.`);
      });

      it('should delete mediaTypes.video.sizeConfig property if sizeConfig has declared minViewPort property which is NOT an Array of two integers', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // badSizeConfig[1].minViewPort is an Array of Integers. It should have been an Array of Array of Integers.
        const badSizeConfig = [
          { minViewPort: [0, 0], playerSize: [] },
          { minViewPort: [1200], playerSize: [640, 400] }
        ];
        adUnits[0].mediaTypes.video.sizeConfig = badSizeConfig;

        // before calling checkAdUnitSetupHook, mediaTypes.video.sizeConfig property should be defined.
        expect(adUnits[0].mediaTypes.video).to.have.property('sizeConfig');

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);

        // after calling checkAdUnitSetupHook, mediaTypes.video.sizeConfig property should be deleted.
        expect(validatedAdUnits[0].mediaTypes.video).to.not.have.property('sizeConfig');

        // check if correct logError is written to the console.
        sinon.assert.callCount(utils.logError, 1);
        sinon.assert.calledWith(utils.logError, `Ad Unit: div-gpt-ad-1460505748561-0: mediaTypes.video.sizeConfig[1] has property minViewPort decalared with invalid value. Please ensure minViewPort is an Array and is listed like: [700, 0]. Declaring an empty array is not allowed, instead use: [0, 0].`);
      });

      it('should delete mediaTypes.video.sizeConfig property if sizeConfig has declared "playerSize" property which is not in the format, [[vw1, vh1]], where vw is viewport width and vh is viewport height', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // badSizeConfig[0].playerSize property is declared incorrectly.
        const badSizeConfig = [
          { minViewPort: [0, 0], playerSize: [600, 400, 500] },
          { minViewPort: [1200, 0], playerSize: [640, 400] }
        ];
        adUnits[0].mediaTypes.video.sizeConfig = badSizeConfig;

        // before calling checkAdUnitSetupHook, mediaTypes.video.sizeConfig property should be defined.
        expect(adUnits[0].mediaTypes.video).to.have.property('sizeConfig');

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);

        // after calling checkAdUnitSetupHook, mediaTypes.video.sizeConfig property should be deleted.
        expect(validatedAdUnits[0].mediaTypes.video).to.not.have.property('sizeConfig');

        // check if correct logError is written to the console.
        sinon.assert.callCount(utils.logError, 1);
        sinon.assert.calledWith(utils.logError, `Ad Unit: div-gpt-ad-1460505748561-0: mediaTypes.video.sizeConfig[0] has propery playerSize declared with invalid value. Please ensure the playerSize is listed like: [640, 480] or like: [] if no playerSize is present for that size bucket.`);
      });

      it('should convert sizeConfig.playerSize to an array of array, i.e., [360, 600] to [[360, 600]]', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // badSizeConfig[] has declared "playerSize" as an Array of Intergers. It should be an Array of Array of Integers, like [[640, 400]].
        // Although, it won't throw an error if you declare it like this, but internally, the system will convert it to the format listed above.
        const badSizeConfig = [
          { minViewPort: [0, 0], playerSize: [] },
          { minViewPort: [1200, 0], playerSize: [360, 600] }
        ];
        adUnits[0].mediaTypes.video.sizeConfig = badSizeConfig;

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);

        expect(validatedAdUnits[0].mediaTypes.video.sizeConfig[0].playerSize).to.deep.equal([[]]);
        expect(validatedAdUnits[0].mediaTypes.video.sizeConfig[1].playerSize).to.deep.equal([[360, 600]]);
      });

      it('should convert mediaTypes.video.playerSize to an array of array, i.e., [360, 600] to [[360, 600]]', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);

        expect(validatedAdUnits[1].mediaTypes.video.playerSize).to.deep.equal([[300, 460]]);
      });

      it('should NOT delete mediaTypes.video.sizeConfig property if sizeConfig property is declared correctly', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // before checkAdUnitSetupHook is called
        expect(adUnits[0].mediaTypes.video).to.have.property('sizeConfig');

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);

        // after checkAdUnitSetupHook is called
        expect(validatedAdUnits[0].mediaTypes.video).to.have.property('sizeConfig');
      });
    });

    describe('native mediaTypes checks', function () {
      beforeEach(function () {
        sinon.spy(adUnitSetupChecks, 'validateNativeMediaType');
      });

      afterEach(function () {
        adUnitSetupChecks.validateNativeMediaType.restore();
      });

      it('should call function "validateNativeMediaTypes" if mediaTypes.native is defined', function () {
        const adUnits = utils.deepClone(AD_UNITS);
        checkAdUnitSetupHook(adUnits);
        sinon.assert.callCount(adUnitSetupChecks.validateNativeMediaType, 1);
      });

      it('should delete mediaTypes.native.sizeConfig property if sizeConfig does not contain the required properties "minViewPort" and "active"', function () {
        const adUnits = utils.deepClone(AD_UNITS);
        // badSizeConfig[1] doesn't include required property "active"
        const badSizeConfig = [
          { minViewPort: [0, 0], active: false },
          { minViewPort: [1200, 0] }
        ];
        adUnits[0].mediaTypes.native.sizeConfig = badSizeConfig;
        expect(adUnits[0].mediaTypes.native).to.have.property('sizeConfig');

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);
        expect(validatedAdUnits[0].mediaTypes.native).to.not.have.property('sizeConfig');
        sinon.assert.callCount(utils.logError, 1);
        sinon.assert.calledWith(utils.logError, `Ad Unit: div-gpt-ad-1460505748561-0: mediaTypes.native.sizeConfig is missing required property minViewPort or active or both. Removing the invalid property mediaTypes.native.sizeConfig from Ad Unit.`);
      });

      it('should delete mediaTypes.native.sizeConfig property if sizeConfig[].minViewPort is NOT an array of TWO integers', function () {
        const adUnits = utils.deepClone(AD_UNITS);
        // badSizeConfig[0].minViewPort is an array of three integers. It should ideally be two integers.
        const badSizeConfig = [
          { minViewPort: [0, 0, 0], active: false },
          { minViewPort: [1200, 0], active: true }
        ];
        adUnits[0].mediaTypes.native.sizeConfig = badSizeConfig;
        expect(adUnits[0].mediaTypes.native).to.have.property('sizeConfig');

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);
        expect(validatedAdUnits[0].mediaTypes.native).to.not.have.property('sizeConfig');
        sinon.assert.callCount(utils.logError, 1);
        sinon.assert.calledWith(utils.logError, `Ad Unit: div-gpt-ad-1460505748561-0: mediaTypes.native.sizeConfig has properties minViewPort or active decalared with invalid values. Removing the invalid property mediaTypes.native.sizeConfig from Ad Unit.`);
      });

      it('should delete mediaTypes.native.sizeConfig property if sizeConfig[].active is NOT a Boolean', function () {
        const adUnits = utils.deepClone(AD_UNITS);

        // badSizeCofnig[0].active is a String value, it should have been a boolean to be valid.
        const badSizeConfig = [
          { minViewPort: [0, 0], active: 'false' },
          { minViewPort: [1200, 0], active: true }
        ];
        adUnits[0].mediaTypes.native.sizeConfig = badSizeConfig;
        expect(adUnits[0].mediaTypes.native).to.have.property('sizeConfig');

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);
        expect(validatedAdUnits[0].mediaTypes.native).to.not.have.property('sizeConfig');
        sinon.assert.callCount(utils.logError, 1);
        sinon.assert.calledWith(utils.logError, `Ad Unit: div-gpt-ad-1460505748561-0: mediaTypes.native.sizeConfig has properties minViewPort or active decalared with invalid values. Removing the invalid property mediaTypes.native.sizeConfig from Ad Unit.`);
      });

      it('should NOT delete mediaTypes.native.sizeConfig property if sizeConfig property is declared correctly', function () {
        const adUnits = utils.deepClone(AD_UNITS);
        expect(adUnits[0].mediaTypes.native).to.have.property('sizeConfig');
        const validatedAdUnits = checkAdUnitSetupHook(adUnits);
        expect(validatedAdUnits[0].mediaTypes.native).to.have.property('sizeConfig');
      });
    });
  });

  describe('checkBidderSizeConfig(sizeConfig)', function () {
    it('should return "false" if sizeConfig is NOT declared as an Array at the Bidder level', function () {
      const sizeConfig = {
        minViewPort: [600, 0], relevantMediaTypes: ['banner']
      };
      expect(checkBidderSizeConfigFormat(sizeConfig)).to.equal(false);
    });

    it('should return "false" if sizeConfig is declared as an empty Array at the Bidder level', function () {
      const sizeConfig = [];
      expect(checkBidderSizeConfigFormat(sizeConfig)).to.equal(false);
    });

    it('should return "false" if any of the objects in sizeConfig array has not declared the required properties "minViewPort" and/or "relevantMediaTypes"', function () {
      const sizeConfig_1 = [
        { minViewPort: [0, 0], relevantMediaTypes: ['none'] },
        { minViewPort: [800, 0] }
      ];
      const sizeConfig_2 = [
        { minViewPort: [0, 0], relevantMediaTypes: ['none'] },
        { relevantMediaTypes: ['banner', 'native'] }
      ];
      expect(checkBidderSizeConfigFormat(sizeConfig_1)).to.equal(false);
      expect(checkBidderSizeConfigFormat(sizeConfig_2)).to.equal(false);
    });

    it('should return "false" if minViewPort is not declared as an array of two integers', function () {
      const sizeConfig_1 = [
        { minViewPort: [], relevantMediaTypes: ['none'] }
      ];
      const sizeConfig_2 = [
        { minViewPort: [300, 0, 0], relevantMediaTypes: ['banner'] }
      ];
      expect(checkBidderSizeConfigFormat(sizeConfig_1)).to.equal(false);
      expect(checkBidderSizeConfigFormat(sizeConfig_2)).to.equal(false);
    });

    it('should return "false" if relevantMediaTypes is NOT an Array of one or more of these values, "none", "banner", "video", "native"', function () {
      // declaration of relevantMediaTypes as an empty array is not allowed
      const sizeConfig_1 = [
        { minViewPort: [0, 0], relevantMediaTypes: [] }
      ];
      // relevantMediaTypes can't be an object. It MUST be declared as an array.
      const sizeConfig_2 = [
        { minViewPort: [0, 0], relevantMediaTypes: ['none'] },
        { minViewPort: [1200, 0], relevantMediaTypes: {} }
      ];
      // 'none' and 'banner' can't be together. It should either be only 'none' or 'banner'
      const sizeConfig_3 = [
        { minViewPort: [0, 0], relevantMediaTypes: ['none', 'banner'] },
        { minViewPort: [1200, 0], relevantMediaTypes: ['banner'] }
      ];
      // relevantMediaTypes can only be an array of ['banner', 'video', 'native'] or any one of them
      const sizeConfig_4 = [
        { minViewPort: [1200, 0], relevantMediaTypes: ['banner'] },
        { minViewPort: [0, 0], relevantMediaTypes: ['video', 'somethingRandom'] },
        { minViewPort: [1600, 0], relevantMediaTypes: ['native', 'video'] }

      ];
      // relevantMediaTypes can only include one or more of these values: 'none', 'banner', 'video', 'native'
      const sizeConfig_5 = [
        { minViewPort: [0, 0], relevantMediaTypes: ['wrong'] }
      ]
      expect(checkBidderSizeConfigFormat(sizeConfig_1)).to.equal(false);
      expect(checkBidderSizeConfigFormat(sizeConfig_2)).to.equal(false);
      expect(checkBidderSizeConfigFormat(sizeConfig_3)).to.equal(false);
      expect(checkBidderSizeConfigFormat(sizeConfig_4)).to.equal(false);
      expect(checkBidderSizeConfigFormat(sizeConfig_5)).to.equal(false);
    });

    it('should return "true" if the sizeConfig object is being configured properly at the Bidder level', function () {
      const sizeConfig = [
        { minViewPort: [0, 0], relevantMediaTypes: ['none'] },
        { minViewPort: [600, 0], relevantMediaTypes: ['banner'] },
        { minViewPort: [1200, 0], relevantMediaTypes: ['banner', 'video'] }
      ];
      expect(checkBidderSizeConfigFormat(sizeConfig)).to.equal(true);
    });
  });

  describe('isLabelActivated(bidOrAdUnit, activeLabels, adUnitCode, adUnitInstance)', function () {
    const labelAny = ['mobile', 'tablet'];
    const labelAll = ['mobile', 'tablet', 'desktop', 'HD-Tv'];
    const activeLabels = ['mobile', 'tablet', 'desktop'];
    const adUnitCode = 'div-gpt-ad-1460505748561-0';
    const adUnitInstance = 1;

    beforeEach(function () {
      sinon.spy(utils, 'logWarn');
    });

    afterEach(function () {
      utils.logWarn.restore();
    });

    it('should throw a warning message if both the label operator, "labelAny"/"labelAll" are configured for an Ad Unit', function () {
      const [adUnits] = utils.deepClone(AD_UNITS);
      adUnits.labelAny = labelAny;
      adUnits.labelAll = labelAll;

      isLabelActivated(adUnits, activeLabels, adUnitCode, adUnitInstance);

      sinon.assert.callCount(utils.logWarn, 1);
      sinon.assert.calledWith(utils.logWarn, `Size Mapping V2:: Ad Unit: div-gpt-ad-1460505748561-0(1) => Ad unit has multiple label operators. Using the first declared operator: labelAny`);
    });

    it('should throw a warning message if both the label operator, "labelAny"/"labelAll" are configured for an Bidder', function () {
      const [adUnits] = utils.deepClone(AD_UNITS);

      adUnits.bids[0].labelAny = labelAny;
      adUnits.bids[0].labelAll = labelAll;

      isLabelActivated(adUnits.bids[0], activeLabels, adUnitCode, adUnitInstance);

      sinon.assert.callCount(utils.logWarn, 1);
      sinon.assert.calledWith(utils.logWarn, `Size Mapping V2:: Ad Unit: div-gpt-ad-1460505748561-0(1), Bidder: appnexus => Bidder has multiple label operators. Using the first declared operator: labelAny`);
    });

    it('should give priority to the label operator declared first incase two label operators are found on the same Ad Unit or Bidder', function () {
      const [adUnits] = utils.deepClone(AD_UNITS);
      adUnits.labelAll = labelAll;
      adUnits.labelAny = labelAny;

      // activeAdUnit should be "false"
      // 'labelAll' -> ['mobile', 'tablet', 'desktop', 'HD-Tv'] will be given priority since it's declared before 'labelAny'
      // since, activeLabels -> ['mobile', 'tablet', 'desktop'], doesn't include 'HD-Tv', 'isLabelActivated' function should return "false"
      const activeAdUnit = isLabelActivated(adUnits, activeLabels, adUnitCode, adUnitInstance);
      expect(activeAdUnit).to.equal(false);

      // bidder level check
      adUnits.bids[0].labelAny = labelAny;
      adUnits.bids[0].labelAll = labelAll;

      // activeBidder should be "true"
      // 'labelAny' -> ['mobile', 'tablet'] will be given priority since it's declared before 'labelAll'
      // since, activeLabels -> ['mobile', 'tablet', 'desktop'] and matches atleast one element in labelAny array, so, it'll return true
      const activeBidder = isLabelActivated(adUnits.bids[0], activeLabels, adUnitCode, adUnitInstance);
      expect(activeBidder).to.equal(true);
    });

    it('should throw a warning log message if "labelAll" operator is declared as an empty array', function () {
      const [adUnit] = utils.deepClone(AD_UNITS);
      adUnit.labelAll = [];

      // adUnit level check
      isLabelActivated(adUnit, activeLabels, adUnitCode, adUnitInstance);

      sinon.assert.callCount(utils.logWarn, 1);
      sinon.assert.calledWith(utils.logWarn, `Size Mapping V2:: Ad Unit: div-gpt-ad-1460505748561-0(1) => Ad unit has declared property 'labelAll' with an empty array.`);

      // bidder level check
      isLabelActivated(adUnit.bids[0], activeLabels, adUnitCode, adUnitInstance);

      sinon.assert.callCount(utils.logWarn, 1);
      sinon.assert.calledWith(utils.logWarn, `Size Mapping V2:: Ad Unit: div-gpt-ad-1460505748561-0(1) => Ad unit has declared property 'labelAll' with an empty array.`);
    });

    it('should throw a warning log message if "labelAny" operator is declared as an empty array', function () {
      const [adUnit] = utils.deepClone(AD_UNITS);
      adUnit.labelAny = [];

      // adUnit level check
      isLabelActivated(adUnit, activeLabels, adUnitCode, adUnitInstance);

      sinon.assert.callCount(utils.logWarn, 1);
      sinon.assert.calledWith(utils.logWarn, `Size Mapping V2:: Ad Unit: div-gpt-ad-1460505748561-0(1) => Ad unit has declared property 'labelAny' with an empty array.`);

      // bidder level check
      isLabelActivated(adUnit.bids[0], activeLabels, adUnitCode, adUnitInstance);
      sinon.assert.callCount(utils.logWarn, 1);
      sinon.assert.calledWith(utils.logWarn, `Size Mapping V2:: Ad Unit: div-gpt-ad-1460505748561-0(1) => Ad unit has declared property 'labelAny' with an empty array.`);
    });

    it('should return "true" if label operators are not present on the Ad Unit or Bidder', function () {
      const [adUnit] = utils.deepClone(AD_UNITS);

      // adUnit level check
      const activeAdUnit = isLabelActivated(adUnit, activeLabels, adUnitCode, adUnitInstance);
      expect(activeAdUnit).to.equal(true);

      // bidder level check
      const activeBidder = isLabelActivated(adUnit.bids[0], activeLabels, adUnitCode, adUnitInstance);
      expect(activeBidder).to.equal(true);
    });

    it('should filter out the values correctly for the label operators "labelAll"', function () {
      const [adUnit] = utils.deepClone(AD_UNITS);

      // adUnit level checks
      adUnit.labelAll = labelAll;

      // const labelAll = ['mobile', 'tablet', 'desktop', 'HD-Tv'];
      // const activeLabels = ['mobile', 'tablet', 'desktop'];

      const activeAdUnit = isLabelActivated(adUnit, activeLabels, adUnitCode, adUnitInstance);
      expect(activeAdUnit).to.equal(false)

      // bidder level checks
      adUnit.bids[0].labelAll = labelAll;

      const activeBidder = isLabelActivated(adUnit.bids[0], activeLabels, adUnitCode, adUnitInstance);
      expect(activeBidder).to.equal(false);
    });

    it('should filter out the values correctly for the label operators "labelAny"', function () {
      const [adUnit] = utils.deepClone(AD_UNITS);

      // adUnit level checks
      adUnit.labelAny = labelAny;

      // const labelAny = ['mobile', 'tablet'];
      // const activeLabels = ['mobile', 'tablet', 'desktop'];

      const activeAdUnit = isLabelActivated(adUnit, activeLabels, adUnitCode, adUnitInstance);
      expect(activeAdUnit).to.equal(true)

      // bidder level checks
      adUnit.bids[0].labelAny = labelAny;

      const activeBidder = isLabelActivated(adUnit.bids[0], activeLabels, adUnitCode, adUnitInstance);
      expect(activeBidder).to.equal(true);
    });

    it('should throw a warning message if labelAny/labelAll operator found on adunit/bidder when "label" is not passed to pbjs.requestBids', function() {
      const adUnit = {
        code: 'ad-unit-1',
        mediaTypes: {
          banner: {
            sizeConfig: [{ minViewPort: [0, 0], sizes: [[300, 300], [400, 400]] }]
          }
        },
        labelAny: ['mobile'],
        bids: [{
          bidder: 'appnexus',
          params: 27,
          labelAll: ['tablet', 'desktop']
        }]
      }
      const labels = undefined;

      // adUnit level check
      isLabelActivated(adUnit, labels, adUnit.code, adUnitInstance);

      sinon.assert.callCount(utils.logWarn, 1);
      sinon.assert.calledWith(utils.logWarn, `Size Mapping V2:: Ad Unit: ad-unit-1(1) => Found 'labelAny' on ad unit, but 'labels' is not set. Did you pass 'labels' to pbjs.requestBids() ?`);
      utils.logWarn.restore();

      sinon.spy(utils, 'logWarn');

      // bidder level check
      isLabelActivated(adUnit.bids[0], labels, adUnit.code, adUnitInstance);
      sinon.assert.callCount(utils.logWarn, 1);
      sinon.assert.calledWith(utils.logWarn, `Size Mapping V2:: Ad Unit: ad-unit-1(1), Bidder: appnexus => Found 'labelAll' on bidder, but 'labels' is not set. Did you pass 'labels' to pbjs.requestBids() ?`);
    });
  });

  describe('isSizeConfigActivated(mediaType, sizeConfig)', function () {
    it('should return "false" for the scenarios where sizeConfig should should not get activated', function () {
      // banner test
      const sizeConfigBanner = { minViewPort: [0, 0], sizes: [] };
      const bannerActive = isSizeConfigActivated('banner', sizeConfigBanner);
      expect(bannerActive).to.equal(false);

      // video test
      const sizeConfigVideo = { minViewPort: [0, 0], playerSize: [] };
      const videoActive = isSizeConfigActivated('video', sizeConfigVideo);
      expect(videoActive).to.equal(false);

      // native test
      const sizeConfigNative = { minViewPort: [0, 0], active: false };
      const nativeActive = isSizeConfigActivated('native', sizeConfigNative);
      expect(nativeActive).to.equal(false);
    });

    it('should return "true" for the scenarios where sizeConfig should get activated', function () {
      // banner test
      const sizeConfigBanner = { minViewPort: [0, 0], sizes: [[300, 600], [970, 1200]] };
      const bannerActive = isSizeConfigActivated('banner', sizeConfigBanner);
      expect(bannerActive).to.equal(true);

      // video test
      const sizeConfigVideo = { minViewPort: [0, 0], playerSize: [[640, 400]] };
      const videoActive = isSizeConfigActivated('video', sizeConfigVideo);
      expect(videoActive).to.equal(true);

      // native test
      const sizeConfigNative = { minViewPort: [0, 0], active: true };
      const nativeActive = isSizeConfigActivated('native', sizeConfigNative);
      expect(nativeActive).to.equal(true);
    });

    it('should return "false" if mediaType does not match "banner", "video" or "native"', function () {
      const sizeConfig = { minViewPort: [0, 0], sizes: [[300, 600], [970, 1200]] };
      const active = isSizeConfigActivated('unknownMediaType', sizeConfig);
      expect(active).to.equal(false);
    });
  });

  describe('getActiveSizeBucket(sizeConfig, activeViewport)', function () {
    it('should return the correct value of size bucket that is active (based on current viewport size) from a given set of size buckets defined in sizeConfig', function () {
      const sizeConfig = [
        { minViewPort: [0, 0], sizes: [] },
        { minViewPort: [720, 500], sizes: [[300, 200], [300, 400]] },
        { minViewPort: [1200, 900], sizes: [[720, 400], [1000, 700]] }
      ];

      // test scenario 1
      const activeViewportA = [1000, 800];
      const activeSizeBucketA = getActiveSizeBucket(sizeConfig, activeViewportA);
      expect(activeSizeBucketA).to.deep.equal([720, 500]);

      // test scenario 2
      const activeViewportB = [1300, 600];
      const activeSizeBucketB = getActiveSizeBucket(sizeConfig, activeViewportB);
      expect(activeSizeBucketB).to.deep.equal([]);
    });
  });

  describe('getRelevantMediaTypesForBidder(sizeConfig, activeViewport)', function () {
    beforeEach(function () {
      sinon.spy(internal, 'checkBidderSizeConfigFormat');
      sinon.spy(internal, 'getActiveSizeBucket');
    });

    afterEach(function () {
      internal.checkBidderSizeConfigFormat.restore();
      internal.getActiveSizeBucket.restore();
    });
    it('should return an empty array if the bidder sizeConfig object is not formatted correctly', function () {
      const sizeConfig = [
        { minViewPort: [], relevantMediaTypes: ['none'] },
        { minViewPort: [700, 0], relevantMediaTypes: ['banner', 'video'] }
      ];
      const activeViewport = [720, 600];
      const relevantMediaTypes = getRelevantMediaTypesForBidder(sizeConfig, activeViewport);
      expect(relevantMediaTypes).to.deep.equal([]);
    });

    it('should call function checkBidderSizeConfigFormat() once', function () {
      const sizeConfig = [
        { minViewPort: [], relevantMediaTypes: ['none'] },
        { minViewPort: [700, 0], relevantMediaTypes: ['banner', 'video'] }
      ];
      const activeViewport = [720, 600];
      getRelevantMediaTypesForBidder(sizeConfig, activeViewport);

      sinon.assert.callCount(internal.checkBidderSizeConfigFormat, 1);
      sinon.assert.calledWith(internal.checkBidderSizeConfigFormat, sizeConfig);
    });

    it('should call function getActiveSizeBucket() once', function () {
      const sizeConfig = [
        { minViewPort: [0, 0], relevantMediaTypes: ['none'] },
        { minViewPort: [700, 0], relevantMediaTypes: ['banner', 'video'] }
      ];
      const activeViewport = [720, 600];
      getRelevantMediaTypesForBidder(sizeConfig, activeViewport);

      sinon.assert.callCount(internal.getActiveSizeBucket, 1);
      sinon.assert.calledWith(internal.getActiveSizeBucket, sizeConfig, activeViewport);
    });

    it('should return the array contained in "relevantMediaTypes" property whose sizeBucket matches with the current viewport', function () {
      const sizeConfig = [
        { minViewPort: [0, 0], relevantMediaTypes: ['none'] },
        { minViewPort: [700, 0], relevantMediaTypes: ['banner', 'video'] }
      ];
      const activeVewport = [720, 600];
      const relevantMediaTypes = getRelevantMediaTypesForBidder(sizeConfig, activeVewport);
      expect(relevantMediaTypes).to.deep.equal(['banner', 'video']);
    });
  });

  describe('getAdUnitDetail(auctionId, adUnit, labels)', function () {
    const adUnitDetailFixture_1 = {
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      mediaTypes: {
        banner: {
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [] },		// remove if < 750px
            { minViewPort: [750, 0], sizes: [[300, 250], [300, 600]] },		// between 750px and 1199px
            { minViewPort: [1200, 0], sizes: [[970, 90], [728, 90], [300, 250]] }, // between 1200px and 1599px
            { minViewPort: [1600, 0], sizes: [[1000, 300], [970, 90], [728, 90], [300, 250]] } // greater than 1600px
          ]
        },
        video: {
          context: 'instream',
          sizeConfig: [
            { minViewPort: [0, 0], playerSize: [] },
            { minViewPort: [800, 0], playerSize: [[640, 400]] },
            { minViewPort: [1200, 0], playerSize: [] }
          ]
        },
        native: {
          image: {
            required: true,
            sizes: [150, 50]
          },
          title: {
            required: true,
            len: 80
          },
          sponsoredBy: {
            required: true
          },
          clickUrl: {
            required: true
          },
          privacyLink: {
            required: false
          },
          body: {
            required: true
          },
          icon: {
            required: true,
            sizes: [50, 50]
          },
          sizeConfig: [
            { minViewPort: [0, 0], active: false },
            { minViewPort: [600, 0], active: true },
            { minViewPort: [1000, 0], active: false }
          ]
        }
      },
      sizeBucketToSizeMap: {},
      activeViewport: {},
      transformedMediaTypes: {},
      cacheHits: 0,
      instance: 1,
      isLabelActivated: true,
    };
    const adUnitDetailFixture_2 = {
      adUnitCode: 'div-gpt-ad-1460505748561-1',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        },
        video: {
          context: 'instream',
          playerSize: [300, 460]
        }
      },
      sizeBucketToSizeMap: {},
      activeViewport: {},
      cacheHits: 0,
      instance: 1,
      isLabelActivated: true,
      transformedMediaTypes: { banner: {}, video: {} }
    }
    // adunit with same code at adUnitDetailFixture_1 but differnet mediaTypes object
    const adUnitDetailFixture_3 = {
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      mediaTypes: {
        banner: {
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [] },
            { minViewPort: [1000, 0], sizes: [[1000, 300], [1000, 90], [970, 250], [970, 90], [728, 90]] }
          ]
        }
      },
      sizeBucketToSizeMap: {},
      activeViewport: {},
      transformedMediaTypes: {},
      cacheHits: 0,
      instance: 1,
      isLabelActivated: true,
    }
    const labels = ['mobile'];
    beforeEach(function () {
      sinon
        .stub(sizeMappingInternalStore, 'getAuctionDetail')
        .withArgs('a1b2c3')
        .returns({
          usingSizeMappingV2: true,
          adUnits: [adUnitDetailFixture_1]
        });

      sinon
        .stub(sizeMappingInternalStore, 'setAuctionDetail')
        .withArgs('a1b2c3', adUnitDetailFixture_2);

      const getFilteredMediaTypesStub = sinon.stub(internal, 'getFilteredMediaTypes');

      getFilteredMediaTypesStub
        .withArgs(AD_UNITS[1].mediaTypes)
        .returns(adUnitDetailFixture_2);

      getFilteredMediaTypesStub
        .withArgs(adUnitDetailFixture_3.mediaTypes)
        .returns(adUnitDetailFixture_3);

      sinon.spy(utils, 'logInfo');
      sinon.spy(utils, 'deepEqual');
    });

    afterEach(function () {
      sizeMappingInternalStore.getAuctionDetail.restore();
      sizeMappingInternalStore.setAuctionDetail.restore();
      internal.getFilteredMediaTypes.restore();
      utils.logInfo.restore();
      utils.deepEqual.restore();
    });

    it('should return adUnit detail object from "sizeMappingInternalStore" if adUnit is already present in the store', function () {
      const [adUnit] = utils.deepClone(AD_UNITS);
      const adUnitDetail = getAdUnitDetail('a1b2c3', adUnit, labels);
      sinon.assert.callCount(sizeMappingInternalStore.getAuctionDetail, 1);
      sinon.assert.callCount(utils.deepEqual, 1);
      sinon.assert.callCount(internal.getFilteredMediaTypes, 0);
      expect(adUnitDetail.cacheHits).to.equal(1);
      expect(adUnitDetail).to.deep.equal(adUnitDetailFixture_1);
    });

    it('should NOT return adunit detail object from "sizeMappingInternalStore" if adUnit with the SAME CODE BUT DIFFERENT MEDIATYPES OBJECT is present in the store', function () {
      const [adUnit] = utils.deepClone(AD_UNITS);
      adUnit.mediaTypes = {
        banner: {
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [] },
            { minViewPort: [1000, 0], sizes: [[1000, 300], [1000, 90], [970, 250], [970, 90], [728, 90]] }
          ]
        }
      };
      const adUnitDetail = getAdUnitDetail('a1b2c3', adUnit, labels);
      sinon.assert.callCount(sizeMappingInternalStore.getAuctionDetail, 1);
      sinon.assert.callCount(utils.deepEqual, 1);
      expect(adUnitDetail).to.not.deep.equal(adUnitDetailFixture_1);
      sinon.assert.callCount(internal.getFilteredMediaTypes, 1);
    });

    it('should store value in "sizeMappingInterStore" object if adUnit is NOT preset in this object', function () {
      const [, adUnit] = utils.deepClone(AD_UNITS);
      const adUnitDetail = getAdUnitDetail('a1b2c3', adUnit, labels);
      sinon.assert.callCount(sizeMappingInternalStore.setAuctionDetail, 1);
      sinon.assert.callCount(internal.getFilteredMediaTypes, 1);
      expect(adUnitDetail).to.deep.equal(adUnitDetailFixture_2);
    });

    it('should log info message to show the details for activeSizeBucket', function () {
      const [, adUnit] = utils.deepClone(AD_UNITS);
      getAdUnitDetail('a1b2c3', adUnit, labels);
      sinon.assert.callCount(utils.logInfo, 1);
      sinon.assert.calledWith(utils.logInfo, `Size Mapping V2:: Ad Unit: div-gpt-ad-1460505748561-1(1) => Active size buckets after filtration: `, adUnitDetailFixture_2.sizeBucketToSizeMap);
    });

    it('should increment "instance" count if presence of "Identical ad units" is detected', function() {
      const adUnit = {
        code: 'div-gpt-ad-1460505748561-0',
        mediaTypes: {
          banner: {
            sizeConfig: [{ minViewPort: [0, 0], sizes: [[300, 300]] }]
          }
        },
        bids: [{
          bidder: 'appnexus',
          params: 12
        }]
      };

      internal.getFilteredMediaTypes.restore();

      sinon.stub(internal, 'getFilteredMediaTypes')
        .withArgs(adUnit.mediaTypes)
        .returns({ mediaTypes: {}, sizeBucketToSizeMap: {}, activeViewPort: [], transformedMediaTypes: {} });

      const adUnitDetail = getAdUnitDetail('a1b2c3', adUnit, labels);
      sinon.assert.callCount(sizeMappingInternalStore.setAuctionDetail, 1);
      sinon.assert.callCount(internal.getFilteredMediaTypes, 1);
      expect(adUnitDetail.instance).to.equal(2);
    });

    it('should not execute "getFilteredMediaTypes" function if label is not activated on the ad unit', function() {
      const [adUnit] = utils.deepClone(AD_UNITS);
      adUnit.labelAny = ['tablet'];
      getAdUnitDetail('a1b2c3', adUnit, labels);

      // assertions
      sinon.assert.callCount(internal.getFilteredMediaTypes, 0);
      sinon.assert.callCount(utils.logInfo, 0);
    });
  });

  describe('getFilteredMediaTypes(mediaTypes)', function () {
    beforeEach(function () {
      sinon
        .stub(utils, 'getWindowTop')
        .returns({
          innerWidth: 1680,
          innerHeight: 269
        });

      sinon.spy(utils, 'logWarn');
    });
    afterEach(function () {
      utils.getWindowTop.restore();
      utils.logWarn.restore();
    });
    it('should return filteredMediaTypes object with all four properties (mediaTypes, transformedMediaTypes, activeViewport, sizeBucketToSizeMap) evaluated correctly', function () {
      const [adUnit] = utils.deepClone(AD_UNITS);
      const expectedMediaTypes = {
        banner: {
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [] },		// remove if < 750px
            { minViewPort: [750, 0], sizes: [[300, 250], [300, 600]] },		// between 750px and 1199px
            { minViewPort: [1200, 0], sizes: [[970, 90], [728, 90], [300, 250]] }, // between 1200px and 1599px
            { minViewPort: [1600, 0], sizes: [[1000, 300], [970, 90], [728, 90], [300, 250]] } // greater than 1600px
          ]
        },
        video: {
          context: 'instream',
          sizeConfig: [
            { minViewPort: [0, 0], playerSize: [] },
            { minViewPort: [800, 0], playerSize: [[640, 400]] },
            { minViewPort: [1200, 0], playerSize: [] }
          ]
        },
        native: {
          image: {
            required: true,
            sizes: [150, 50]
          },
          title: {
            required: true,
            len: 80
          },
          sponsoredBy: {
            required: true
          },
          clickUrl: {
            required: true
          },
          privacyLink: {
            required: false
          },
          body: {
            required: true
          },
          icon: {
            required: true,
            sizes: [50, 50]
          },
          sizeConfig: [
            { minViewPort: [0, 0], active: false },
            { minViewPort: [600, 0], active: true },
            { minViewPort: [1000, 0], active: false }
          ]
        }
      };
      const expectedSizeBucketToSizeMap = {
        banner: {
          activeSizeBucket: [1600, 0],
          activeSizeDimensions: [[1000, 300], [970, 90], [728, 90], [300, 250]]
        },
        video: {
          activeSizeBucket: [1200, 0],
          activeSizeDimensions: []
        },
        native: {
          activeSizeBucket: [1000, 0],
          activeSizeDimensions: 'NA'
        }
      };
      const expectedActiveViewport = [1680, 269];
      const expectedTransformedMediaTypes = {
        banner: {
          filteredSizeConfig: [
            {
              minViewPort: [1600, 0], sizes: [[1000, 300], [970, 90], [728, 90], [300, 250]]
            }
          ],
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [] },
            { minViewPort: [750, 0], sizes: [[300, 250], [300, 600]] },
            { minViewPort: [1200, 0], sizes: [[970, 90], [728, 90], [300, 250]] },
            { minViewPort: [1600, 0], sizes: [[1000, 300], [970, 90], [728, 90], [300, 250]] }
          ],
          sizes: [[1000, 300], [970, 90], [728, 90], [300, 250]
          ]
        }
      };
      const { mediaTypes, sizeBucketToSizeMap, activeViewport, transformedMediaTypes } = getFilteredMediaTypes(adUnit.mediaTypes);
      expect(mediaTypes).to.deep.equal(expectedMediaTypes);
      expect(activeViewport).to.deep.equal(expectedActiveViewport);
      expect(sizeBucketToSizeMap).to.deep.equal(expectedSizeBucketToSizeMap);
      expect(transformedMediaTypes).to.deep.equal(expectedTransformedMediaTypes);
    });

    it('should throw a warning message if Iframe blocks viewport size to be evaluated correctly', function () {
      const [adUnit] = utils.deepClone(AD_UNITS);
      utils.getWindowTop.restore();
      sinon
        .stub(utils, 'getWindowTop')
        .throws();
      getFilteredMediaTypes(adUnit.mediaTypes);
      sinon.assert.callCount(utils.logWarn, 1);
      sinon.assert.calledWith(utils.logWarn, `SizeMappingv2:: Unfriendly iframe blocks viewport size to be evaluated correctly`);
    });
  });

  describe('getBids({ bidderCode, auctionId, bidderRequestId, adUnits, labels, src })', function () {
    const basic_AdUnit = [{
      code: 'adUnit1',
      mediaTypes: {
        banner: {
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [] },
            { minViewPort: [500, 0], sizes: [[300, 200], [400, 600]] }
          ]
        }
      },
      bids: [{
        bidder: 'appnexus',
        params: {
          placementId: 13144370
        }
      }, {
        bidder: 'rubicon',
        params: {
          accountId: 14062,
          siteId: 70608,
          zoneId: 498816
        },
        sizeConfig: [
          { minViewPort: [0, 0], relevantMediaTypes: ['none'] },
          { minViewPort: [700, 0], relevantMediaTypes: ['banner'] }
        ]
      }],
      transactionId: '123456'
    }];
    const adUnitDetailFixture = {
      adUnitCode: 'adUnit1',
      transactionId: '123456',
      sizes: [[300, 200], [400, 600]],
      mediaTypes: {
        banner: {
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [] },
            { minViewPort: [600, 0], sizes: [[300, 200], [400, 600]] }
          ]
        }
      },
      sizeBucketToSizeMap: {
        banner: {
          activeSizeBucket: [[500, 0]],
          activeSizeDimensions: [[300, 200], [400, 600]]
        }
      },
      activeViewport: [560, 260],
      transformedMediaTypes: {
        banner: {
          filteredSizeConfig: [
            { minViewPort: [500, 0], sizes: [[300, 200], [400, 600]] }
          ],
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [[]] },
            { minViewPort: [500, 0], sizes: [[300, 200], [400, 600]] }
          ],
          sizes: [[300, 200], [400, 600]]
        }
      },
      isLabelActivated: true,
      instance: 1,
      cacheHits: 0
    };
    beforeEach(function () {
      sinon
        .stub(internal, 'getAdUnitDetail')
        .withArgs('6d51e2d7-1447-4242-b6af-aaa5525a2c6e', basic_AdUnit[0], [])
        .returns(adUnitDetailFixture);

      sinon.spy(internal, 'getRelevantMediaTypesForBidder');

      sinon.spy(utils, 'logInfo');
      sinon.spy(utils, 'logError');
      sinon.spy(utils, 'logWarn');
    });

    afterEach(function () {
      internal.getAdUnitDetail.restore();
      internal.getRelevantMediaTypesForBidder.restore();
      utils.logInfo.restore();
      utils.logError.restore();
      utils.logWarn.restore();
    });

    it('should return an array of bids specific to the bidder', function () {
      const expectedMediaTypes = {
        banner: {
          filteredSizeConfig: [
            { minViewPort: [500, 0], sizes: [[300, 200], [400, 600]] }
          ],
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [[]] },
            { minViewPort: [500, 0], sizes: [[300, 200], [400, 600]] }
          ],
          sizes: [[300, 200], [400, 600]]
        }
      };

      const bidRequests_1 = getBids({
        bidderCode: 'appnexus',
        auctionId: '6d51e2d7-1447-4242-b6af-aaa5525a2c6e',
        bidderRequestId: '393a43193a0ac',
        adUnits: basic_AdUnit,
        labels: [],
        src: 'client'
      });
      expect(bidRequests_1[0].mediaTypes).to.deep.equal(expectedMediaTypes);
      expect(bidRequests_1[0].bidder).to.equal('appnexus');

      const bidRequests_2 = getBids({
        bidderCode: 'rubicon',
        auctionId: '6d51e2d7-1447-4242-b6af-aaa5525a2c6e',
        bidderRequestId: '393a43193a0aa',
        adUnits: basic_AdUnit,
        labels: [],
        src: 'client'
      });
      expect(bidRequests_2[0]).to.be.undefined;
      sinon.assert.callCount(internal.getRelevantMediaTypesForBidder, 1);
    });

    it('should log an error message if ad unit is disabled because there are no active media types left after size config filtration', function () {
      internal.getAdUnitDetail.restore();

      const adUnit = utils.deepClone(basic_AdUnit);
      adUnit[0].mediaTypes.banner.sizeConfig = [
        { minViewPort: [0, 0], sizes: [] },
        { minViewPort: [600, 0], sizes: [[300, 200], [400, 600]] }
      ];

      const adUnitDetailFixture = {
        adUnitCode: 'adUnit1',
        mediaTypes: {
          banner: {
            sizeConfig: [
              { minViewPort: [0, 0], sizes: [] },
              { minViewPort: [600, 0], sizes: [[300, 200], [400, 600]] }
            ]
          }
        },
        sizeBucketToSizeMap: {
          banner: {
            activeSizeBucket: [0, 0],
            activeSizeDimensions: [[]]
          }
        },
        activeViewport: [560, 260],
        transformedMediaTypes: {},
        isLabelActivated: true,
        instance: 1,
        cacheHits: 0
      };

      sinon
        .stub(internal, 'getAdUnitDetail')
        .withArgs('6d51e2d7-1447-4242-b6af-aaa5525a2c6e', adUnit[0])
        .returns(adUnitDetailFixture);

      const bidRequests = getBids({
        bidderCode: 'appnexus',
        auctionId: '6d51e2d7-1447-4242-b6af-aaa5525a2c6e',
        bidderRequestId: '393a43193a0ac',
        adUnits: adUnit,
        labels: [],
        src: 'client'
      });
      expect(bidRequests[0]).to.be.undefined;
      sinon.assert.callCount(utils.logInfo, 1);
      sinon.assert.calledWith(utils.logInfo, `Size Mapping V2:: Ad Unit: adUnit1(1) => Ad unit disabled since there are no active media types after sizeConfig filtration.`);
    });

    it('should throw an error if bidder level sizeConfig is not configured properly', function () {
      internal.getAdUnitDetail.restore();

      const adUnit = utils.deepClone(basic_AdUnit);
      adUnit[0].bids[1].sizeConfig = [
        { minViewPort: [], relevantMediaTypes: ['none'] },
        { minViewPort: [700, 0], relevantMediaTypes: ['banner'] }
      ];

      sinon
        .stub(internal, 'getAdUnitDetail')
        .withArgs('6d51e2d7-1447-4242-b6af-aaa5525a2c6e', adUnit[0])
        .returns(adUnitDetailFixture);

      const bidRequests = getBids({
        bidderCode: 'rubicon',
        auctionId: '6d51e2d7-1447-4242-b6af-aaa5525a2c6e',
        bidderRequestId: '393a43193a0ac',
        adUnits: adUnit,
        labels: [],
        src: 'client'
      });

      expect(bidRequests[0]).to.not.be.undefined;
      sinon.assert.callCount(utils.logError, 1);
      sinon.assert.calledWith(utils.logError, `Size Mapping V2:: Ad Unit: adUnit1(1), Bidder: rubicon => 'sizeConfig' is not configured properly. This bidder won't be eligible for sizeConfig checks and will remail active.`);
    });

    it('should ensure bidder relevantMediaTypes is a subset of active media types at the ad unit level', function () {
      internal.getAdUnitDetail.restore();

      const adUnit = utils.deepClone(basic_AdUnit);
      adUnit[0].bids[1].sizeConfig = [
        { minViewPort: [0, 0], relevantMediaTypes: ['none'] },
        { minViewPort: [400, 0], relevantMediaTypes: ['banner'] }
      ];

      sinon
        .stub(internal, 'getAdUnitDetail')
        .withArgs('6d51e2d7-1447-4242-b6af-aaa5525a2c6e', adUnit[0])
        .returns(adUnitDetailFixture);

      const bidRequests = getBids({
        bidderCode: 'rubicon',
        auctionId: '6d51e2d7-1447-4242-b6af-aaa5525a2c6e',
        bidderRequestId: '393a43193a0ac',
        adUnits: adUnit,
        labels: [],
        src: 'client'
      });
      expect(bidRequests[0]).to.not.be.undefined;
      expect(bidRequests[0].mediaTypes.banner).to.not.be.undefined;
      expect(bidRequests[0].mediaTypes.banner.sizes).to.deep.equal([[300, 200], [400, 600]]);
    });

    it('should logInfo if bidder relevantMediaTypes contains media type that is not active at the ad unit level', function () {
      internal.getAdUnitDetail.restore();

      const adUnit = utils.deepClone(basic_AdUnit);
      adUnit[0].mediaTypes = {
        banner: {
          sizeConfig: [
            { minViewPort: [0, 0], sizes: [] },
            { minViewPort: [700, 0], sizes: [[300, 200], [400, 600]] }
          ]
        },
        native: {
          sizeConfig: [
            { minViewPort: [0, 0], active: false },
            { minViewPort: [400, 0], active: true }
          ]
        }
      };

      adUnit[0].bids[1].sizeConfig = [
        { minViewPort: [0, 0], relevantMediaTypes: ['none'] },
        { minViewPort: [200, 0], relevantMediaTypes: ['banner'] }
      ];

      const adUnitDetailFixture = {
        adUnitCode: 'adUnit1',
        mediaTypes: {
          banner: {
            sizeConfig: [
              { minViewPort: [0, 0], sizes: [] },
              { minViewPort: [700, 0], sizes: [[300, 200], [400, 600]] }
            ]
          },
          native: {
            sizeConfig: [
              { minViewPort: [0, 0], active: false },
              { minViewPort: [400, 0], active: true }
            ]
          }
        },
        sizeBucketToSizeMap: {
          banner: {
            activeSizeBucket: [0, 0],
            activeSizeDimensions: [[]]
          },
          native: {
            activeSizeBucket: [400, 0],
            activeSizeDimensions: 'NA'
          }
        },
        activeViewport: [560, 260],
        transformedMediaTypes: {
          native: {}
        },
        isLabelActivated: true,
        instance: 1,
        cacheHits: 0
      };

      sinon
        .stub(internal, 'getAdUnitDetail')
        .withArgs('6d51e2d7-1447-4242-b6af-aaa5525a2c6e', adUnit[0], [])
        .returns(adUnitDetailFixture);

      const bidRequests = getBids({
        bidderCode: 'rubicon',
        auctionId: '6d51e2d7-1447-4242-b6af-aaa5525a2c6e',
        bidderRequestId: '393a43193a0ac',
        adUnits: adUnit,
        labels: [],
        src: 'client'
      });
      expect(bidRequests[0]).to.be.undefined;
      sinon.assert.callCount(utils.logInfo, 1);
      sinon.assert.calledWith(utils.logInfo, `Size Mapping V2:: Ad Unit: adUnit1(1), Bidder: rubicon => 'relevantMediaTypes' does not match with any of the active mediaTypes at the Ad Unit level. This bidder is disabled.`);
    });

    it('should throw a warning if mediaTypes object is not correctly formatted', function () {
      sinon
        .stub(utils, 'isValidMediaTypes')
        .returns(false);

      getBids({
        bidderCode: 'appnexus',
        auctionId: '6d51e2d7-1447-4242-b6af-aaa5525a2c6e',
        bidderRequestId: '393a43193a0ac',
        adUnits: basic_AdUnit,
        labels: [],
        src: 'client'
      });
      sinon.assert.callCount(utils.logWarn, 1);
      sinon.assert.calledWith(utils.logWarn, `Size Mapping V2:: Ad Unit: adUnit1 => Ad unit has declared invalid 'mediaTypes' or has not declared a 'mediaTypes' property`);

      utils.isValidMediaTypes.restore();
    });

    it('should log a message if ad unit is disabled due to a failing label check', function () {
      internal.getAdUnitDetail.restore();
      const adUnitDetail = Object.assign({}, adUnitDetailFixture);
      adUnitDetail.isLabelActivated = false;
      sinon
        .stub(internal, 'getAdUnitDetail')
        .withArgs('6d51e2d7-1447-4242-b6af-aaa5525a2c6e', basic_AdUnit[0], [])
        .returns(adUnitDetail);

      getBids({
        bidderCode: 'appnexus',
        auctionId: '6d51e2d7-1447-4242-b6af-aaa5525a2c6e',
        bidderRequestId: '393a43193a0ac',
        adUnits: basic_AdUnit,
        labels: [],
        src: 'client'
      });

      sinon.assert.callCount(utils.logInfo, 1);
      sinon.assert.calledWith(utils.logInfo, `Size Mapping V2:: Ad Unit: adUnit1(1) => Ad unit is disabled due to failing label check.`);
    });

    it('should log a message if bidder is disabled due to a failing label check', function () {
      const stub = sinon.stub(internal, 'isLabelActivated').returns(false);

      getBids({
        bidderCode: 'appnexus',
        auctionId: '6d51e2d7-1447-4242-b6af-aaa5525a2c6e',
        bidderRequestId: '393a43193a0ac',
        adUnits: basic_AdUnit,
        labels: [],
        src: 'client'
      });

      sinon.assert.callCount(utils.logInfo, 1);
      sinon.assert.calledWith(utils.logInfo, `Size Mapping V2:: Ad Unit: adUnit1(1), Bidder: appnexus => Label check for this bidder has failed. This bidder is disabled.`);

      internal.isLabelActivated.restore();
    })
  });
});
