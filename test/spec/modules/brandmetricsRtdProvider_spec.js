import * as brandmetricsRTD from '../../../modules/brandmetricsRtdProvider.js';
import {config} from 'src/config.js';
import * as events from '../../../src/events';
import * as sinon from 'sinon';

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

const UNDEFINED_USER_CONSENT = {};

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

function mockCreativeInView(creativeInViewConf) {
  const commands = window._brandmetrics || [];
  commands.forEach(command => {
    if (command.cmd === '_addeventlistener') {
      const conf = command.val;
      if (conf.event === 'creative_in_view') {
        conf.handler(creativeInViewConf);
      }
    }
  })
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
  });

  it('should init and return true even if bidders is not included', () => {
    expect(brandmetricsRTD.brandmetricsSubmodule.init(NO_BIDDERS_CONFIG, USER_CONSENT)).to.equal(true);
  });

  it('should init even if script- id is not configured', () => {
    expect(brandmetricsRTD.brandmetricsSubmodule.init(NO_SCRIPTID_CONFIG, USER_CONSENT)).to.equal(true);
  });

  it('should not init when there is no TCF- consent', () => {
    expect(brandmetricsRTD.brandmetricsSubmodule.init(VALID_CONFIG, NO_TCF_CONSENT)).to.equal(false);
  });

  it('should not init when there is no usp- consent', () => {
    expect(brandmetricsRTD.brandmetricsSubmodule.init(VALID_CONFIG, NO_USP_CONSENT)).to.equal(false);
  });

  it('should init if there are no consent- objects defined', () => {
    expect(brandmetricsRTD.brandmetricsSubmodule.init(VALID_CONFIG, UNDEFINED_USER_CONSENT)).to.equal(true);
  });
});

describe('getBidRequestData', () => {
  beforeEach(function () {
    config.resetConfig()
  })

  it('should set targeting keys for specified bidders', () => {
    const bidderOrtb2 = {};
    brandmetricsRTD.brandmetricsSubmodule.getBidRequestData({ortb2Fragments: {bidder: bidderOrtb2}}, () => {
      const expected = VALID_CONFIG.params.bidders

      expected.forEach(exp => {
        expect(bidderOrtb2[exp].user.ext.data.mockTargetKey).to.equal('mockMeasurementId')
      })
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

    const bidderOrtb2 = {};
    brandmetricsRTD.brandmetricsSubmodule.getBidRequestData({ortb2Fragments: {bidder: bidderOrtb2}}, () => {}, VALID_CONFIG);
    expect(Object.keys(bidderOrtb2).length).to.equal(0)
  });

  it('should use a default targeting key name if the brandmetrics- configuration does not include one', () => {
    mockSurveyLoaded({
      available: true,
      conf: {
        displayOption: {
          type: 'pbjs',
        }
      },
      survey: {
        measurementId: 'mockMeasurementId'
      }
    });

    const bidderOrtb2 = {};
    brandmetricsRTD.brandmetricsSubmodule.getBidRequestData({ortb2Fragments: {bidder: bidderOrtb2}}, () => {}, VALID_CONFIG);

    const expected = VALID_CONFIG.params.bidders

    expected.forEach(exp => {
      expect(bidderOrtb2[exp].user.ext.data.brandmetrics_survey).to.equal('mockMeasurementId')
    })
  });

  describe('billable events', () => {
    let sandbox;
    let eventsEmitSpy;

    before(() => {
      sandbox = sinon.sandbox.create();
      eventsEmitSpy = sandbox.spy(events, ['emit']);
    });

    beforeEach(() => {
      eventsEmitSpy.resetHistory();
    })

    afterEach(() => {
      sandbox.restore();
    });

    it('should emit billable event from prebid events', () => {
      const expectedEvent = {
        vendor: 'brandmetrics',
        type: 'creative_in_view',
        measurementId: 'mockMeasurementId',
        auctionId: 'mockAuctionId',
        transactionId: 'mockTransactionId'
      };

      mockCreativeInView({
        mid: expectedEvent.measurementId,
        source: {
          type: 'pbj',
          data: {
            auctionId: expectedEvent.auctionId,
            transactionId: expectedEvent.transactionId
          },
        }
      });

      expect(eventsEmitSpy.callCount).to.equal(1);

      const event = eventsEmitSpy.getCalls()[0].args[1];
      delete event['billingId'];

      expect(event).to.deep.equal(expectedEvent);
    });

    it('should not emit billable event from non prebid- sources', () => {
      mockCreativeInView({
        mid: 'mockMeasurementId',
        source: {
          type: 'gpt',
          data: {},
        }
      });

      expect(eventsEmitSpy.callCount).to.equal(0);
    });
  });
});
