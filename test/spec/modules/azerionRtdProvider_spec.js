import {config} from 'src/config.js';
import * as azerionRTD from 'modules/azerionRtdProvider.js';
import {loadExternalScript} from '../../../src/adloader.js';

describe('Azerion RTD submodule', function () {
  const STORAGE_KEY = 'ht-pa-v1-a';
  const USER_AUDIENCES = [{id: '1', visits: 123}, {id: '2', visits: 456}];

  const key = 'publisher123';
  const bidders = ['appnexus', 'improvedigital'];
  const process = {key: 'value'};
  const dataProvider = { name: 'azerion', waitForIt: true };

  let reqBidsConfigObj;
  let storageStub;

  beforeEach(function () {
    config.resetConfig();
    reqBidsConfigObj = {ortb2Fragments: {bidder: {}}};
    window.azerionPublisherAudiences = sinon.spy();
    storageStub = sinon.stub(azerionRTD.storage, 'getDataFromLocalStorage');
  });

  afterEach(function () {
    delete window.azerionPublisherAudiences;
    storageStub.restore();
  });

  describe('initialisation', function () {
    let returned;

    beforeEach(function() {
      returned = azerionRTD.azerionSubmodule.init(dataProvider);
    });

    it('should return true', function () {
      expect(returned).to.equal(true);
    });

    it('should load external script', function() {
      expect(loadExternalScript.called).to.be.true;
    });

    it('should load external script with default versioned url', function() {
      const expected = 'https://edge.hyth.io/js/v1/azerion-edge.min.js';
      expect(loadExternalScript.args[0][0]).to.deep.equal(expected);
    });

    it('should call azerionPublisherAudiencesStub with empty configuration', function() {
      expect(window.azerionPublisherAudiences.args[0][0]).to.deep.equal({});
    });

    describe('with key', function() {
      beforeEach(function() {
        window.azerionPublisherAudiences.resetHistory();
        loadExternalScript.resetHistory();
        returned = azerionRTD.azerionSubmodule.init({...dataProvider, params: {key}});
      })

      it('should return true', function () {
        expect(returned).to.equal(true);
      });

      it('should load external script with publisher id url', function() {
        const expected = `https://edge.hyth.io/js/v1/${key}/azerion-edge.min.js`;
        expect(loadExternalScript.args[0][0]).to.deep.equal(expected);
      });
    });

    describe('with process configuration', function() {
      beforeEach(function() {
        window.azerionPublisherAudiences.resetHistory();
        loadExternalScript.resetHistory();
        returned = azerionRTD.azerionSubmodule.init({...dataProvider, params: {process}});
      })

      it('should return true', function () {
        expect(returned).to.equal(true);
      });

      it('should call azerionPublisherAudiencesStub with process configuration', function() {
        expect(window.azerionPublisherAudiences.args[0][0]).to.deep.equal(process);
      });
    });
  });

  describe('gets audiences', function () {
    let callbackStub;

    beforeEach(function() {
      callbackStub = sinon.mock();
    })

    describe('with empty storage', function() {
      beforeEach(function() {
        azerionRTD.azerionSubmodule.getBidRequestData(reqBidsConfigObj, callbackStub, dataProvider);
      });

      it('does not run apply audiences to bidders', function() {
        expect(reqBidsConfigObj.ortb2Fragments.bidder).to.deep.equal({});
      });

      it('calls callback anyway', function() {
        expect(callbackStub.called).to.be.true;
      });
    });

    describe('with populate storage', function() {
      beforeEach(function() {
        storageStub.withArgs(STORAGE_KEY).returns(JSON.stringify(USER_AUDIENCES));
        azerionRTD.azerionSubmodule.getBidRequestData(reqBidsConfigObj, callbackStub, dataProvider);
      });

      it('does apply audiences to bidder', function() {
        const segments = reqBidsConfigObj.ortb2Fragments.bidder['improvedigital'].user.data[0].segment;
        expect(segments).to.deep.equal([{id: '1'}, {id: '2'}]);
      });

      it('calls callback always', function() {
        expect(callbackStub.called).to.be.true;
      });
    })
  });

  describe('sets audiences in bidder', function () {
    const audiences = USER_AUDIENCES.map(({id}) => id);
    const expected = {
      'user': {
        'data': [
          {
            'ext': { 'segtax': 4 },
            'name': 'azerion',
            'segment': [ { 'id': '1' }, { 'id': '2' } ],
          },
        ],
      },
    };

    it('for improvedigital by default', function () {
      azerionRTD.setAudiencesToBidders(reqBidsConfigObj, dataProvider, audiences);
      expect(reqBidsConfigObj.ortb2Fragments.bidder['improvedigital']).to.deep.equal(expected);
    });

    bidders.forEach((bidder) => {
      it(`for ${bidder}`, function () {
        const config = {...dataProvider, params: { bidders }};
        azerionRTD.setAudiencesToBidders(reqBidsConfigObj, config, audiences);
        expect(reqBidsConfigObj.ortb2Fragments.bidder[bidder]).to.deep.equal(expected);
      });
    });
  });
});
