import {expect} from 'chai';
import Adapter from '../../../modules/realvukitBidAdapter';
//  import {newBidder} from '../../../src/adapters/bidderFactory';
import bidmanager from '../../../src/bidmanager';
import adloader from '../../../src/adloader';

describe('RealVu_Kit Adapter Test', () => {
  let adapter = new Adapter();

  const REQUEST = {
    bidderCode: 'realvukit',
    code: 'ad_container_1',
    sizes: [[300, 250]],
    requestId: '0d67ddab-1502-4897-a7bf-e8078e983405',
    bidderRequestId: '1b5e314fe79b1d',
    bids: [
      {
        bidder: 'realvukit',
        bidId: '1b5e314fe79b1d',
        sizes: [[300, 250]],
        bidderRequestId: '1b5e314fe79b1d',
        mediaType: undefined,
        params: {
          partner_id: '1Y',
          unit_id: '9339508',
        },
        placementCode: 'ad_container_1',
        renderer: undefined,
        transactionId: '0d67ddab-1502-4897-a7bf-e8078e983405'
      }
    ],
    start: 1504628062271,
    statusMessage: 'bids available'
  };

  const RESPONSE_NOBID = {
    bidderCode: 'realvukit',
    statusMessage: 'no bid returned or error'
  };

  const RESPONSE = {
    bidderCode: 'realvukit',
    statusMessage: 'bids available',
    cpm: 2.00
  }

  describe('Test Bid Request', () => {
    let xhr;
    let requests;

    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = request => requests.push(request);
    });

    afterEach(() => xhr.restore());

    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('requires parameters to make request', () => {
      adapter.callBids({});
      expect(requests).to.be.empty;
    });
  }); // endof Describe bid request

  describe('Test Bid Handler', () => {
    let adloaderStub;
    let bidmanagerStub;

    beforeEach(() => {
      adapter = new Adapter();
      bidmanagerStub = sinon.stub(bidmanager, 'addBidResponse').returns(RESPONSE);
      //adloaderStub = sinon.stub(adloader, 'loadScript');
    });

    afterEach(() => {
      bidmanager.addBidResponse.restore();
      //adloader.loadScript.restore();
    });

    it('validate adLoader script', () => {
      adloaderStub = sinon.stub(adloader, 'loadScript');
      adapter.callBids(REQUEST);
      expect(adloaderStub.getCalls()).to.have.lengthOf(1);
      let response = adloaderStub.getCalls();
      expect(response).to.be.an('array');
      expect(response[0], 'Expected #{this} to be an object').to.be.an('object');
      expect(response[0].toString(), 'Expected #{this} to be a #{exp}').to.be.an('string');
      expect(response[0].toString()).to.contain('loadScript(//pr.realvu.net/flip/2/p=9339508_f=unit_s=300x250_js=1_c=1Y?callback=pbjs.rvkit_handler&uid=ad_container_1');
      adloader.loadScript.restore();
    });

    it('Valdate Bid Response', () => {
      //adloader.loadScript.restore();// don't prevent script execution per the beforeEach block
      adapter.callBids(REQUEST);

      sinon.assert.calledOnce(bidmanager.addBidResponse);

      expect(bidmanagerStub.getCalls()).to.not.be.an('undefined');
      /*
      expect(bidmanagerStub.getCalls(), 'Expect #{this} to have length of #{exp}').to.have.lengthOf(1);
      let resp = bidmanagerStub.getCalls();
      expect(resp, 'Expected #{this} to be an array').to.be.an('array');
      expect(resp[0], 'Expected #{this} to be an object').to.be.an('object');
      expect(resp[0].toString(), 'Expected #{this} to be a #{exp}').to.be.an('string');
      expect(resp[0].toString()).to.contain('loadScript(//pr.realvu.net/flip/2/p=9339508_f=unit_s=300x250_js=1_c=1Y?callback=pbjs.rvkit_handler&uid=ad_container_1)');
      */

      //adloaderStub = sinon.stub(adloader, 'loadScript');// ...to avoid error in afterEach block (on successful completion of assertions)

      /*
      expect(response[0]).to.not.be.an('undefined');
      expect(response[0].statusMessage).to.not.be.an('undefined');
      expect(response[0].statusMessage, 'Expected response[0] to have value of #{exp}').to.equal('bids available');
      expect(response[0], 'Expected #{this} to have property "statusMessage"').to.have.property('statusMessage');
      expect(response[0], 'Expected #{this} to have property "bidderCode"').to.have.property('bidderCode');
      expect(response[0], 'Expected #{this} to have property "statusMessage"').to.have.property('statusMessage');
      expect(response[0], 'Expected #{this} to have property "cpm"').to.have.property('cpm');

      expect(response[0].cpm, 'Expect #{this} to equal #{exp}').to.equal(2.0);
      */
    });

    it('register no bid', () => {
      adapter.callBids(REQUEST);
      expect(adloaderStub.getCalls()).to.have.lengthOf(1);
    });
  }); //  endof Describe Bid handler
});
