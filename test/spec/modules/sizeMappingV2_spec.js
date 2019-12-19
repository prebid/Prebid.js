import { expect } from 'chai';
import * as utils from '../../../src/utils';

import { isUsingNewSizeMapping, checkAdUnitSetupHook } from '../../../modules/sizeMappingV2';
// import { validateBannerMediaType } from '../../../src/prebid';

import { adUnitSetupChecks } from '../../../src/prebid';

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

    it('should return "true" if sizeConfig is declared both at the adUnits level and at the bids level', function() {
      let adUnits = utils.deepClone(AD_UNITS);

      const usingNewSizeMappingBool = isUsingNewSizeMapping(adUnits);

      // isUsingNewSizeMapping should return true because sizeConfig object is present both at the Ad Unit level and at the
      // Bids level.
      expect(usingNewSizeMappingBool).to.be.true;
    });
  });

  describe('checkAdUnitSetupHook(adUnits)', function() {
    beforeEach(function() {
      sinon.spy(utils, 'logError');
    });

    afterEach(function() {
      utils.logError.restore();
    });

    it('should filter out adUnit if it does not contain the required property mediaTypes', function() {
      let adUnits = utils.deepClone(AD_UNITS);
      delete adUnits[0].mediaTypes;
      // before checkAdUnitSetupHook is called, the length of adUnits should be '2'
      expect(adUnits.length).to.equal(2);
      adUnits = checkAdUnitSetupHook(adUnits);

      // after checkAdUnitSetupHook is called, the length of adUnits should be '1'
      expect(adUnits.length).to.equal(1);
      expect(adUnits[0].code).to.equal('div-gpt-ad-1460505748561-1');
    });

    it('should filter out adUnit if it has declared property mediaTypes with an empty object', function() {
      let adUnits = utils.deepClone(AD_UNITS);
      adUnits[0].mediaTypes = {};
      // before checkAdUnitSetupHook is called, the length of adUnits should be '2'
      expect(adUnits.length).to.equal(2);
      adUnits = checkAdUnitSetupHook(adUnits);

      // after checkAdUnitSetupHook is called, the length of adUnits should be '1'
      expect(adUnits.length).to.equal(1);
      expect(adUnits[0].code).to.equal('div-gpt-ad-1460505748561-1');
    });

    it('should log an error message if Ad Unit does not contain the required property "mediaTypes"', function() {
      let adUnits = utils.deepClone(AD_UNITS);
      delete adUnits[0].mediaTypes;

      adUnits = checkAdUnitSetupHook(adUnits);
      sinon.assert.callCount(utils.logError, 1);
      sinon.assert.calledWith(utils.logError, 'Detected adUnit.code \'div-gpt-ad-1460505748561-0\' did not have a \'mediaTypes\' object defined. This is a required field for the auction, so this adUnit has been removed.');
    });

    describe('banner mediaTypes checks', function() {
      it('should delete banner mediaType if it does not constain sizes or sizeConfig property', function() {
        let adUnits = utils.deepClone(AD_UNITS);
        delete adUnits[0].mediaTypes.banner.sizeConfig;

        // before checkAdUnitSetupHook is called, adUnits[0].mediaTypes.banner property should exist.
        expect(adUnits[0].mediaTypes).to.have.property('banner');

        adUnits = checkAdUnitSetupHook(adUnits);

        // after checkAdUnitSetupHook is called, adUnits[0].mediaTypes.banner property should not exist.
        expect(adUnits[0].mediaTypes).to.not.have.property('banner');
      });

      it('should log an error message if mediaTypes.banner does not contain "sizes" or "sizeConfig" property', function() {
        let adUnits = utils.deepClone(AD_UNITS);
        // deleteing the sizeConfig property from the first ad unit.
        delete adUnits[0].mediaTypes.banner.sizeConfig;

        adUnits = checkAdUnitSetupHook(adUnits);
        sinon.assert.callCount(utils.logError, 1);
        sinon.assert.calledWith(utils.logError, 'Detected a mediaTypes.banner object did not include required property sizes or sizeConfig. Removing invalid mediaTypes.banner object from Ad Unit.');
      });

      it('should call function "validateBannerMediaType" if mediaTypes.sizes is present', function() {
        const adUnits = utils.deepClone(AD_UNITS);
        const spy = sinon.spy(adUnitSetupChecks, 'validateBannerMediaType');

        checkAdUnitSetupHook(adUnits);

        // since the second Ad Unit in AD_UNITS array uses mediaTypes.sizes, it should get called only once.
        sinon.assert.callCount(spy, 1);
        sinon.assert.calledWith(spy, adUnits[1]);
      });

      it('should delete mediaTypes.banner object if it\'s property sizeConfig is not declared as an array', function() {
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

      it('should log an error message if sizeConfig property in mediaTypes.banner object is not declared as an array', function() {
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

      it('should delete mediaTypes.banner object if it\'s property sizeConfig does not contain the required properties "minViewPort" and "sizes"', function() {
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

      it('should log an error message if sizeConfig property in mediaTypes.banner object does not contain the required properties "minViewPort" and "sizes"', function() {
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

      it('should delete mediaTypes.banner object if it\'s property sizeConfig has declared minViewPort property which is NOT an Array of two integers', function() {
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

      it('should log an error message if sizeConfig has declared property minViewPort which is not an array of two integers', function() {
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

      it('should delete mediaTypes.banner object if it\'s property sizeConfig has declared sizes property which is not in the format, [[vw1, vh1], [vw2, vh2]], where vw is viewport width and vh is viewport height', function() {
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

      it('should log an error message if sizeConfig has declared property sizes which is not in the format, [[vw1, vh1], [vw2, vh2]], where vw is viewport width and vh is viewport height', function() {
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

      it('should convert sizeConfig.sizes to an array of array, i.e., [360, 600] to [[360, 600]]', function() {
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

      it('should allow empty array declaration in sizeConfig.sizes to indicate "No valid sizes for this size bucket", and convert it to an array of array, i.e, [] to [[]]', function() {
        const adUnits = utils.deepClone(AD_UNITS);

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);
        expect(validatedAdUnits[0].mediaTypes.banner.sizeConfig[0].sizes).to.deep.equal([[]]);
      });

      it('should NOT delete mediaTypes.banner object if sizeConfig object is declared correctly', function() {
        const adUnits = utils.deepClone(AD_UNITS);

        // before calling checkAdUnitSetupHook, the mediaTypes.banner object should be present on both the Ad Units.
        expect(adUnits[0].mediaTypes).to.have.property('banner');
        expect(adUnits[1].mediaTypes).to.have.property('banner');

        const validatedAdUnits = checkAdUnitSetupHook(adUnits);

        // after calling checkAdUnitSetupHook, the mediaTypes.banner object should still be present for both the Ad Units.
        expect(adUnits[0].mediaTypes).to.have.property('banner');
        expect(adUnits[1].mediaTypes).to.have.property('banner');
      });
    });

    // describe('video mediaTypes checks', function() {
    //   it('should delete property mediaTypes.video.sizeConfig', function() {

    //   });
    // });
  });
});
