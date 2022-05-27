import {
  reconciliationSubmodule,
  track,
  getTopIFrameWin,
  getSlotByWin
} from 'modules/reconciliationRtdProvider.js';
import { makeSlot } from '../integration/faker/googletag.js';
import * as utils from 'src/utils.js';

describe('Reconciliation Real time data submodule', function () {
  const conf = {
    dataProviders: [{
      'name': 'reconciliation',
      'params': {
        'publisherMemberId': 'test_prebid_publisher'
      },
    }]
  };

  let trackPostStub;

  beforeEach(function () {
    trackPostStub = sinon.stub(track, 'trackPost');
  });

  afterEach(function () {
    trackPostStub.restore();
  });

  describe('reconciliationSubmodule', function () {
    describe('initialization', function () {
      let utilsLogErrorSpy;

      before(function () {
        utilsLogErrorSpy = sinon.spy(utils, 'logError');
      });

      after(function () {
        utils.logError.restore();
      });

      it('successfully instantiates', function () {
        expect(reconciliationSubmodule.init(conf.dataProviders[0])).to.equal(true);
      });

      it('should log error if initializied without parameters', function () {
        expect(reconciliationSubmodule.init({'name': 'reconciliation', 'params': {}})).to.equal(true);
        expect(utilsLogErrorSpy.calledOnce).to.be.true;
      });
    });

    describe('getData', function () {
      it('should return data in proper format', function () {
        makeSlot({code: '/reconciliationAdunit1', divId: 'reconciliationAd1'});

        const targetingData = reconciliationSubmodule.getTargetingData(['/reconciliationAdunit1']);
        expect(targetingData['/reconciliationAdunit1'].RSDK_AUID).to.eql('/reconciliationAdunit1');
        expect(targetingData['/reconciliationAdunit1'].RSDK_ADID).to.be.a('string');
      });

      it('should return unit path if called with divId', function () {
        makeSlot({code: '/reconciliationAdunit2', divId: 'reconciliationAd2'});

        const targetingData = reconciliationSubmodule.getTargetingData(['reconciliationAd2']);
        expect(targetingData['reconciliationAd2'].RSDK_AUID).to.eql('/reconciliationAdunit2');
        expect(targetingData['reconciliationAd2'].RSDK_ADID).to.be.a('string');
      });

      it('should skip empty adUnit id', function () {
        makeSlot({code: '/reconciliationAdunit3', divId: 'reconciliationAd3'});

        const targetingData = reconciliationSubmodule.getTargetingData(['reconciliationAd3', '']);
        expect(targetingData).to.have.all.keys('reconciliationAd3');
      });
    });

    describe('track events', function () {
      it('should track init event with data', function () {
        const adUnit = {
          code: '/adunit'
        };

        reconciliationSubmodule.getTargetingData([adUnit.code]);

        expect(trackPostStub.calledOnce).to.be.true;
        expect(trackPostStub.getCalls()[0].args[0]).to.eql('https://confirm.fiduciadlt.com/init');
        expect(trackPostStub.getCalls()[0].args[1].adUnits[0].adUnitId).to.eql(adUnit.code);
        expect(trackPostStub.getCalls()[0].args[1].adUnits[0].adDeliveryId).be.a('string');
        expect(trackPostStub.getCalls()[0].args[1].publisherMemberId).to.eql('test_prebid_publisher');
      });
    });

    describe('get topmost iframe', function () {
      /**
       * - top
       * -- iframe.window  <-- top iframe window
       * --- iframe.window
       * ---- iframe.window <-- win
       */
      const mockFrameWin = (topWin, parentWin) => {
        return {
          top: topWin,
          parent: parentWin
        }
      }

      it('should return null if called with null', function() {
        expect(getTopIFrameWin(null)).to.be.null;
      });

      it('should return null if there is an error in frames chain', function() {
        const topWin = {};
        const iframe1Win = mockFrameWin(topWin, null); // break chain
        const iframe2Win = mockFrameWin(topWin, iframe1Win);

        expect(getTopIFrameWin(iframe1Win, topWin)).to.be.null;
      });

      it('should get the topmost iframe', function () {
        const topWin = {};
        const iframe1Win = mockFrameWin(topWin, topWin);
        const iframe2Win = mockFrameWin(topWin, iframe1Win);

        expect(getTopIFrameWin(iframe2Win, topWin)).to.eql(iframe1Win);
      });
    });

    describe('get slot by nested iframe window', function () {
      it('should return the slot', function () {
        const adSlotElement = document.createElement('div');
        const adSlotIframe = document.createElement('iframe');

        adSlotElement.id = 'reconciliationAd';
        adSlotElement.appendChild(adSlotIframe);
        document.body.appendChild(adSlotElement);

        const adSlot = makeSlot({code: '/reconciliationAdunit', divId: adSlotElement.id});

        expect(getSlotByWin(adSlotIframe.contentWindow)).to.eql(adSlot);
      });

      it('should return null if the slot is not found', function () {
        const adSlotElement = document.createElement('div');
        const adSlotIframe = document.createElement('iframe');

        adSlotElement.id = 'reconciliationAd';
        document.body.appendChild(adSlotElement);
        document.body.appendChild(adSlotIframe); // iframe is not in ad slot

        const adSlot = makeSlot({code: '/reconciliationAdunit', divId: adSlotElement.id});

        expect(getSlotByWin(adSlotIframe.contentWindow)).to.be.null;
      });
    });

    describe('handle postMessage from Reconciliation Tag in ad iframe', function () {
      it('should track impression pixel with parameters', function (done) {
        const adSlotElement = document.createElement('div');
        const adSlotIframe = document.createElement('iframe');

        adSlotElement.id = 'reconciliationAdMessage';
        adSlotElement.appendChild(adSlotIframe);
        document.body.appendChild(adSlotElement);

        const adSlot = makeSlot({code: '/reconciliationAdunit', divId: adSlotElement.id});
        // Fix targeting methods
        adSlot.targeting = {};
        adSlot.setTargeting = function(key, value) {
          this.targeting[key] = [value];
        };
        adSlot.getTargeting = function(key) {
          return this.targeting[key];
        };

        adSlot.setTargeting('RSDK_AUID', '/reconciliationAdunit');
        adSlot.setTargeting('RSDK_ADID', '12345');
        adSlotIframe.contentDocument.open();
        adSlotIframe.contentDocument.write(`<script>
          window.parent.postMessage(JSON.stringify({
            type: 'rsdk:impression:req',
            args: {
              tagOwnerMemberId: "test_member_id",
              dataSources: [
                {
                  memberId: "member_test",
                  dataFeedName: "12345",
                  impressionId: "54321",
                  impressionIdDataField: "imp_id",
                  allowedRecipientTypes: 41
                }
              ],
              dataRecipients: [
                {
                  type: 1,
                  memberId: "test_publisher_recipient"
                },
                {
                  type: 16,
                  memberId: "test_agency_recipient"
                }
              ]
            }
          }), '*');
        </script>`);
        adSlotIframe.contentDocument.close();

        setTimeout(() => {
          expect(trackPostStub.calledOnce).to.be.true;
          expect(trackPostStub.getCalls()[0].args[0]).to.eql('https://confirm.fiduciadlt.com/pimp');
          expect(trackPostStub.getCalls()[0].args[1].adUnitId).to.eql('/reconciliationAdunit');
          expect(trackPostStub.getCalls()[0].args[1].adDeliveryId).to.eql('12345');
          expect(trackPostStub.getCalls()[0].args[1].tagOwnerMemberId).to.eql('test_member_id'); ;
          expect(trackPostStub.getCalls()[0].args[1].dataSources.length).to.eql(1);
          expect(trackPostStub.getCalls()[0].args[1].dataRecipients.length).to.eql(2);
          expect(trackPostStub.getCalls()[0].args[1].publisherMemberId).to.eql('test_prebid_publisher');
          done();
        }, 100);
      });
    });
  });
});
