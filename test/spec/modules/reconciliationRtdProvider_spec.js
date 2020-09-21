import { reconciliationSubmodule, track } from 'modules/reconciliationRtdProvider.js';
import { config } from 'src/config.js';
import { makeSlot } from '../integration/faker/googletag.js';

describe('reconciliationRtdProvider', function () {
  let trackPostStub;

  beforeEach(function () {
    trackPostStub = sinon.stub(track, 'trackPost');
  });

  afterEach(function () {
    trackPostStub.restore();
  });

  describe('reconciliationSubmodule', function () {
    it('successfully instantiates', function () {
      expect(reconciliationSubmodule.init()).to.equal(true);
    });

    describe('getData', function () {
      it('should return data in proper format', function (done) {
        const adUnit1 = {
          code: '/adunit1',
          transactionId: 'transactionId1'
        };
        const adUnit2 = {
          code: '/adunit1',
          transactionId: 'transactionId2'
        };

        const expectedData = {
          [adUnit1.code]: {
            RSDK_AUID: adUnit1.code,
            RSDK_ADID: adUnit1.transactionId
          },
          [adUnit2.code]: {
            RSDK_AUID: adUnit2.code,
            RSDK_ADID: adUnit2.transactionId
          }
        };

        reconciliationSubmodule.getData([adUnit1, adUnit2], onDone);

        function onDone(data) {
          expect(data).to.eql(expectedData);
          done();
        }
      });

      it('should generate deliveryId if transactionId is empty', function (done) {
        const adUnit = {
          code: '/adunit'
        };

        reconciliationSubmodule.getData([adUnit], onDone);

        function onDone(data) {
          expect(data[adUnit.code].RSDK_AUID).to.eql(adUnit.code);
          expect(data[adUnit.code].RSDK_ADID).to.be.a('string');
          done();
        }
      });

      it('should return unit path as adUnitId', function (done) {
        const adUnitCode = '/adunit1';
        const adUnitId = 'ad1';
        const adUnit = {
          code: adUnitId,
          transactionId: 'transactionId1'
        };
        const slot = makeSlot({ code: adUnitCode, divId: adUnitId });
        window.googletag.pubads().setSlots([slot]);
        const expectedData = {
          [adUnit.code]: {
            RSDK_AUID: adUnitCode,
            RSDK_ADID: adUnit.transactionId
          }
        };

        reconciliationSubmodule.getData([adUnit], onDone);
        function onDone(data) {
          expect(data).to.eql(expectedData);
          done();
        }
      });
    });

    describe('track events', function() {
      const conf = {
        'realTimeData': {
          'dataProviders': [{
            'name': 'reconciliation',
            'params': {
              'publisherMemberId': 'test_prebid_publisher'
            },
          }]
        }
      };

      beforeEach(function () {
        config.setConfig(conf);
      });

      after(function () {
        config.resetConfig();
      });

      it('should track init event with data', function () {
        const adUnit1 = {
          code: '/adunit1',
          transactionId: 'transactionId1'
        };
        const expectedData = {
          adUnits: [
            {
              adUnitId: '/adunit1',
              adDeliveryId: 'transactionId1'
            }
          ],
          publisherMemberId: 'test_prebid_publisher'
        };
        const onDone = sinon.spy();

        reconciliationSubmodule.getData([adUnit1], onDone);

        expect(onDone.calledOnce).to.be.true;
        expect(trackPostStub.calledOnce).to.be.true;
        expect(trackPostStub.getCalls()[0].args[0]).to.eql('https://confirm.fiduciadlt.com/init');
        expect(trackPostStub.getCalls()[0].args[1].adUnits).to.eql(expectedData.adUnits);
        expect(trackPostStub.getCalls()[0].args[1].publisherMemberId).to.eql('test_prebid_publisher');
      });
    });
  });
});
