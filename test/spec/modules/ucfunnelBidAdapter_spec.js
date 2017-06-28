import { expect } from 'chai';
import Adapter from 'modules/ucfunnelBidAdapter';
import adapterManager from 'src/adaptermanager';
import bidManager from 'src/bidmanager';
import CONSTANTS from 'src/constants.json';

describe('ucfunnel adapter tests', function () {
  let sandbox;
  const adUnit = { // TODO CHANGE
    code: 'ucfunnel',
    sizes: [[300, 250]],
    bids: [{
      bidder: 'ucfunnel',
      params: {
        adid: 'test-ad-83444226E44368D1E32E49EEBE6D29',
        width: 300,
        height: 250
      }
    }]
  };

  const response = {
    ad_id: 'ad-83444226E44368D1E32E49EEBE6D29',
    adm: '<html style="height:100%"><body style="width:300px;height: 100%;padding:0;margin:0 auto;"><div style="width:100%;height:100%;display:table;"><div style="width:100%;height:100%;display:table-cell;text-align:center;vertical-align:middle;"><a href="//www.ucfunnel.com/" target="_blank"><img src="//cdn.aralego.net/ucfad/house/ucf/AdGent-300x250.jpg" width="300px" height="250px" align="middle" style="border:none"></a></div></div></body></html>',
    cpm: 0.01,
    height: 250,
    width: 300
  };

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('ucfunnel callBids validation', () => {
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

    let adapter = adapterManager.bidderRegistry['ucfunnel'];

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
                .to.have.property('bidder', 'ucfunnel');

      expect(bidderRequest).to.have.deep.property('bids[0]')
                .with.property('sizes')
                .that.is.an('array')
                .with.lengthOf(1)
                .that.deep.equals(adUnit.sizes);
      expect(bidderRequest).to.have.deep.property('bids[0]')
                .with.property('params')
                .to.have.property('adid', 'test-ad-83444226E44368D1E32E49EEBE6D29');
      expect(bidderRequest).to.have.deep.property('bids[0]')
                .with.property('params')
                .to.have.property('width', 300);
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
      expect(bids[0].bidderCode).to.equal('ucfunnel');
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].cpm).to.equal(0.01);
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
