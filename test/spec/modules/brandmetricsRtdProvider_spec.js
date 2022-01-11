import * as brandmetricsRTD from '../../../modules/brandmetricsRtdProvider.js';
import { cloneDeep } from 'lodash';

const VALID_CONFIG = {
  name: 'brandmetrics',
  waitForIt: true,
  params: {
    scriptId: '00000000-0000-0000-0000-000000000000',
    bidders: ['ozone']
  }
};

const NO_BIDDERS_CONFIG = {
  name: 'brandmetrics',
  waitForIt: true,
  params: {
    scriptId: '00000000-0000-0000-0000-000000000000'
  }
};

const NO_SCRIPTID_CONFIG = {
  name: 'brandmetrics',
  waitForIt: true
};

const USER_CONSENT = {
  gdpr: {
    vendorData: {
      vendor: {
        consents: {
          422: true
        }
      },
      purpose: {
        consents: {
          1: true,
          7: true
        }
      }
    },
    gdprApplies: true
  }
};

const NO_TCF_CONSENT = {
  gdpr: {
    vendorData: {
      vendor: {
        consents: {
          422: false
        }
      },
      purpose: {
        consents: {
          1: false,
          7: false
        }
      }
    },
    gdprApplies: true
  }
};

const NO_USP_CONSENT = {
  usp: '1NYY'
};

function mockSurveyLoaded(surveyConf) {
  const commands = window._brandmetrics || [];
  commands.forEach(command => {
    if (command.cmd === '_addeventlistener') {
      const conf = command.val;
      if (conf.event === 'surveyloaded') {
        conf.handler(surveyConf);
      }
    }
  });
}

function scriptTagExists(url) {
  const tags = document.getElementsByTagName('script');
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].src === url) {
      return true;
    }
  }
  return false;
}

describe('BrandmetricsRTD module', () => {
  beforeEach(function () {
    const scriptTags = document.getElementsByTagName('script');
    for (let i = 0; i < scriptTags.length; i++) {
      if (scriptTags[i].src.indexOf('brandmetrics') !== -1) {
        scriptTags[i].remove();
      }
    }
  });

  it('should init and return true', () => {
    expect(brandmetricsRTD.brandmetricsSubmodule.init(VALID_CONFIG, USER_CONSENT)).to.equal(true);
    expect(scriptTagExists('https://cdn.brandmetrics.com/survey/script/00000000-0000-0000-0000-000000000000.js')).to.equal(true);
  });

  it('should init and return true even if bidders is not included', () => {
    expect(brandmetricsRTD.brandmetricsSubmodule.init(NO_BIDDERS_CONFIG, USER_CONSENT)).to.equal(true);
    expect(scriptTagExists('https://cdn.brandmetrics.com/survey/script/00000000-0000-0000-0000-000000000000.js')).to.equal(true);
  });

  it('should not add any script- tag when script- id is not defined', () => {
    expect(brandmetricsRTD.brandmetricsSubmodule.init(NO_SCRIPTID_CONFIG, USER_CONSENT)).to.equal(true);
    expect(scriptTagExists('https://cdn.brandmetrics.com/survey/script/undefined.js')).to.equal(false);
    expect(scriptTagExists('https://cdn.brandmetrics.com/survey/script/null.js')).to.equal(false);
    expect(scriptTagExists('https://cdn.brandmetrics.com/survey/script/00000000-0000-0000-0000-000000000000.js')).to.equal(false);
  });

  it('should not add any script- tag when there is no TCF- consent', () => {
    expect(brandmetricsRTD.brandmetricsSubmodule.init(VALID_CONFIG, NO_TCF_CONSENT)).to.equal(true);
    expect(scriptTagExists('https://cdn.brandmetrics.com/survey/script/00000000-0000-0000-0000-000000000000.js')).to.equal(false);
  });

  it('should not add any script- tag when there is no usp- consent', () => {
    expect(brandmetricsRTD.brandmetricsSubmodule.init(VALID_CONFIG, NO_USP_CONSENT)).to.equal(true);
    expect(scriptTagExists('https://cdn.brandmetrics.com/survey/script/00000000-0000-0000-0000-000000000000.js')).to.equal(false);
  });
});

describe('getBidRequestData', () => {
  it('should set targeting keys for specified bidders only', () => {
    const conf = {
      adUnits: [{
        bids: [{
          bidder: 'ozone'
        }]
      }, {
        bids: [{
          bidder: 'unspecified'
        }]
      }]
    };

    brandmetricsRTD.brandmetricsSubmodule.getBidRequestData(conf, () => {
      expect(conf.adUnits[0].bids[0].params.customData[0].targeting.mockTargetKey).to.equal('mockMeasurementId');
      expect(conf.adUnits[1].bids[0].params).to.be.undefined;
    }, VALID_CONFIG);

    mockSurveyLoaded({
      available: true,
      conf: {
        displayOption: {
          type: 'pbjs',
          targetKey: 'mockTargetKey'
        }
      },
      survey: {
        measurementId: 'mockMeasurementId'
      }
    });
  });

  it('should only set targeting keys when the brandmetrics survey- type is "pbjs"', () => {
    const conf = {
      adUnits: [{
        bids: [{
          bidder: 'ozone'
        }]
      }, {
        bids: [{
          bidder: 'unspecified'
        }]
      }]
    };

    brandmetricsRTD.brandmetricsSubmodule.getBidRequestData(conf, () => {
      expect(conf.adUnits[0].bids[0].params).to.be.undefined;
      expect(conf.adUnits[1].bids[0].params).to.be.undefined;
    }, VALID_CONFIG);

    mockSurveyLoaded({
      available: true,
      conf: {
        displayOption: {
          type: 'dfp',
          targetKey: 'mockTargetKey'
        }
      },
      survey: {
        measurementId: 'mockMeasurementId'
      }
    });
  });

  it('should use a default targeting key name if the brandmetrics- configuration does not include one', () => {
    const conf = {
      adUnits: [{
        bids: [{
          bidder: 'ozone'
        }]
      }]
    };

    brandmetricsRTD.brandmetricsSubmodule.getBidRequestData(conf, () => {
      expect(conf.adUnits[0].bids[0].params.customData[0].targeting.brandmetrics_survey).to.equal('mockMeasurementId');
    }, VALID_CONFIG);

    mockSurveyLoaded({
      available: true,
      conf: {
        displayOption: {
          type: 'pbjs'
        }
      },
      survey: {
        measurementId: 'mockMeasurementId'
      }
    });
  });
});
