import { expect } from 'chai';
import sinon from 'sinon';
import * as events from 'src/events.js';
import * as utils from 'src/utils.js';
import { gamPredictionReport } from '../../../libraries/intentIqUtils/gamPredictionReport.js';

describe('gamPredictionReport', function () {
  let getEventsStub;
  let logErrorStub;

  beforeEach(() => {
    getEventsStub = sinon.stub(events, 'getEvents').returns([]);
    logErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(() => {
    getEventsStub.restore();
    logErrorStub.restore();
  });

  function runWithSlot(slot, sendData) {
    let handler;
    const gamObjectReference = {
      cmd: [],
      pubads: () => ({
        addEventListener: (eventName, callback) => {
          handler = callback;
        }
      })
    };

    gamPredictionReport(gamObjectReference, sendData);
    gamObjectReference.cmd.forEach((fn) => fn());
    handler({ isEmpty: false, slot });
  }

  it('reads targeting from slot.getConfig targeting wrapper', () => {
    const sendData = sinon.spy();
    const slot = {
      getConfig: sinon.stub().withArgs('targeting').returns({ targeting: { hb_bidder: ['test'] } }),
      getTargetingKeys: sinon.stub().throws(new Error('deprecated')),
      getTargeting: sinon.stub().throws(new Error('deprecated')),
      getSlotElementId: () => 'div-1',
      getAdUnitPath: () => '/123'
    };

    runWithSlot(slot, sendData);

    expect(sendData.calledOnce).to.equal(true);
    expect(sendData.firstCall.args[0].bidderCode).to.equal('test');
  });

  it('reads targeting from slot.getConfig flat object', () => {
    const sendData = sinon.spy();
    const slot = {
      getConfig: sinon.stub().withArgs('targeting').returns({ hb_bidder: ['flat'] }),
      getSlotElementId: () => 'div-2',
      getAdUnitPath: () => '/456'
    };

    runWithSlot(slot, sendData);

    expect(sendData.calledOnce).to.equal(true);
    expect(sendData.firstCall.args[0].bidderCode).to.equal('flat');
  });

  it('reads targeting from legacy slot.getTargeting APIs when getConfig is missing', () => {
    const sendData = sinon.spy();
    const slot = {
      getTargetingKeys: sinon.stub().returns(['hb_bidder']),
      getTargeting: sinon.stub().withArgs('hb_bidder').returns(['legacy']),
      getSlotElementId: () => 'div-3',
      getAdUnitPath: () => '/789'
    };

    runWithSlot(slot, sendData);

    expect(sendData.calledOnce).to.equal(true);
    expect(sendData.firstCall.args[0].bidderCode).to.equal('legacy');
    expect(slot.getTargetingKeys.calledOnce).to.equal(true);
    expect(slot.getTargeting.calledOnce).to.equal(true);
  });

  it('coerces non-array targeting values to string arrays', () => {
    const sendData = sinon.spy();
    const slot = {
      getConfig: sinon.stub().withArgs('targeting').returns({ targeting: { hb_bidder: 42 } }),
      getSlotElementId: () => 'div-4',
      getAdUnitPath: () => '/101'
    };

    runWithSlot(slot, sendData);

    expect(sendData.calledOnce).to.equal(true);
    expect(sendData.firstCall.args[0].bidderCode).to.equal('42');
  });

  it('logs and recovers when legacy targeting APIs throw', () => {
    const sendData = sinon.spy();
    const slot = {
      getTargetingKeys: sinon.stub().throws(new Error('legacy broken')),
      getTargeting: sinon.stub(),
      getSlotElementId: () => 'div-5',
      getAdUnitPath: () => '/202'
    };

    runWithSlot(slot, sendData);

    expect(sendData.calledOnce).to.equal(true);
    expect(sendData.firstCall.args[0].bidderCode).to.equal(null);
    expect(logErrorStub.called).to.equal(true);
    expect(logErrorStub.firstCall.args[0]).to.match(/Failed to get slot targeting/);
  });
});
