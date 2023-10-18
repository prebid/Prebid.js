import assert from 'assert';
import { config } from 'src/config';
import {
  mygaruSubmodule
} from 'modules/mygaruRtdProvider';
import { deepClone } from '../../../src/utils.js';

describe('mygaruRtdProvider', () => {
  // Fake server config
  let fakeServer;
  const fakeResponseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  const fakeResponse = {
    iuid: '123'
  };

  // Bid request config
  const reqBidsConfigObj = {
    adUnits: [{
      bids: [
        { bidder: 'appnexus' }
      ]
    }]
  };

  before(() => {
    config.resetConfig();
  })

  after(() => {
  })

  beforeEach(() => {
    fakeServer = sinon.createFakeServer();
    fakeServer.respondWith('GET', '*', [200, fakeResponseHeaders, JSON.stringify(fakeResponse)]);
    fakeServer.respondImmediately = true;
    fakeServer.autoRespond = true;
  })

  describe('mygaruSubmodule', () => {
    it('init is successfull', () => {
      const initResult = mygaruSubmodule.init();
      expect(initResult).to.be.true;
    })

    it('callback is called after getBidRequestData with modified data', () => {
      const callbackSpy = sinon.spy();
      mygaruSubmodule.getBidRequestData(reqBidsConfigObj, callbackSpy);
      setTimeout(() => {
        expect(callbackSpy.calledOnce).to.be.true
        expect(callbackSpy.calledWith().adUnits[0].bids[0].userId.mygaruId).to.be.equal('123')
        expect(callbackSpy.calledWith().adUnits[0].bids[0].userEids).to.be.deep.equal([{ source: 'mygaru.com', uids: [{ id: '123', atype: 1 }] }])
      }, 100)
    })
  })
})
