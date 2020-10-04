import { reconciliationSubmodule, track } from 'modules/reconciliationRtdProvider.js';
import { makeSlot } from '../integration/faker/googletag.js';

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
    it('successfully instantiates', function () {
      expect(reconciliationSubmodule.init(conf.dataProviders[0])).to.equal(true);
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
    });

    describe('track events', function() {
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
  });
});
