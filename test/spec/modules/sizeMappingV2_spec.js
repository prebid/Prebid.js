import { expect } from 'chai';
import { deepClone } from '../../../src/utils';

import { isUsingNewSizeMapping } from '../../../modules/sizeMappingV2';

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

describe.only('sizeMappingV2', function () {
  describe('isUsingNewSizeMaping(adUntis, auctionId)', function () {
    it('should return "false" if sizeConfig is not declared both at the adUnits level and the bids level', function () {
      let adUnits = deepClone(AD_UNITS);

      // delete the sizeConfig property from AD_UNITS object at the Ad Unit and the Bids level both.
      adUnits = deleteSizeConfig(adUnits, { adUnitLevel: true, bidsLevel: true });
      const usingNewSizeMappingBool = isUsingNewSizeMapping(adUnits);

      // isUsingNewSizeMapping should return false because sizeConfig object is not present both at the Ad Units and the Bids level
      // for all the adUnits that are checked.
      expect(usingNewSizeMappingBool).to.be.false;
    });

    it('should return "true" if sizeConfig is declared at the adUnits level but not at the bids level', function () {
      let adUnits = deepClone(AD_UNITS);

      // delete the sizeConfig property from AD_UNITS object at the Bids level but not at the Ad Unit level.
      adUnits = deleteSizeConfig(adUnits, { adUnitLevel: false, bidsLevel: true });
      const usingNewSizeMappingBool = isUsingNewSizeMapping(adUnits);

      // isUsingNewSizeMapping should return true because sizeConfig object is present at the Ad Units level but not at the
      // Bids level.
      expect(usingNewSizeMappingBool).to.be.true;
    });

    it('should return "true" if sizeConfig is declared at the bids level but not at the adUnits level', function () {
      let adUnits = deepClone(AD_UNITS);

      // delete the sizeConfig property from AD_UNITS object at the Ad Unit level but not at the Bids level.
      adUnits = deleteSizeConfig(adUnits, { adUnitLevel: true, bidsLevel: false });
      const usingNewSizeMappingBool = isUsingNewSizeMapping(adUnits);

      // isUsingNewSizeMapping should return true because sizeConfig object is present at the Bids level but not at the
      // Ad Unit level.
      expect(usingNewSizeMappingBool).to.be.true;
    });

    it('should return "true" if sizeConfig is declared both at the adUnits level and at the bids level', function() {
      let adUnits = deepClone(AD_UNITS);

      const usingNewSizeMappingBool = isUsingNewSizeMapping(adUnits);

      // isUsingNewSizeMapping should return true because sizeConfig object is present both at the Ad Unit level and at the
      // Bids level.
      expect(usingNewSizeMappingBool).to.be.true;
    });
  });
});
