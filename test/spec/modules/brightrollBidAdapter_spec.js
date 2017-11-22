import { expect } from 'chai';
import Adapter from 'modules/brightrollBidAdapter';
import adapterManager from 'src/adaptermanager';
import bidManager from 'src/bidmanager';
import CONSTANTS from 'src/constants.json';

describe('brightroll adapter tests', function () {
  let sandbox;
  const adUnit = {
    code: 'brightroll',
    sizes: [[300, 250]],
    bids: [{
      bidder: 'brightroll',
      params: {
        test: true,
        publisher: 'testPub',
        slot: 1
      }
    }]
  };

  const response = {
    requestId: 8119236875707151596,
    cpm: 1.5,
    adm: 'https://pr.ybp.yahoo.com/ab/secure/true/imp/grpThhPoq9w/wp/',
    width: 300,
    height: 250,
    creativeId: '1001',
    currency: 'USD'
  };

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('brightroll callBids validation', () => {
    let bids,
      server;

    beforeEach(() => {
      bids = [];
      server = sinon.fakeServer.create();

      sandbox.stub(bidManager, 'addBidResponse', (elemId, bid) => {
        bids.push(bid);
      });
    });

    afterEach(() => {
      server.restore();
    });

    let adapter = adapterManager.bidderRegistry['brightroll'];

    it('Valid bid-request', () => {
      sandbox.stub(adapter, 'callBids');
      adapterManager.callBids({
        adUnits: [clone(adUnit)]
      });

      let bidderRequest = adapter.callBids.getCall(0).args[0];

      expect(bidderRequest).to.have.property('bids')
        .that.is.an('array')
        .with.lengthOf(1);

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .to.have.property('bidder', 'brightroll');

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .with.property('sizes')
        .that.is.an('array')
        .with.lengthOf(1)
        .that.deep.equals(adUnit.sizes);
      expect(bidderRequest).to.have.deep.property('bids[0]')
        .with.property('params')
        .to.have.property('publisher', 'testPub');
      expect(bidderRequest).to.have.deep.property('bids[0]')
        .with.property('params')
        .to.have.property('slot', 1);
    });

    it('Valid bid-response', () => {
      server.respondWith(JSON.stringify(
        response
      ));
      adapterManager.callBids({
        adUnits: [clone(adUnit)]
      });
      server.respond();

      expect(bids).to.be.lengthOf(1);
      expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(bids[0].bidderCode).to.equal('brightroll');
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].cpm).to.equal(1.5);
    });

    it('No Bid', () => {
      server.respondWith('()');
      adapterManager.callBids({
        adUnits: [clone(adUnit)]
      });
      server.respond();
      expect(bids).to.be.lengthOf(1);
      expect(bids[0].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
    });
  });
});

function clone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return {};
  }
}
