import { expect } from 'chai';
import sinon from 'sinon';
import { uBidIdModule } from 'modules/uBidIdAnalyticsAdapter.js';

const code = "div-uBidIdModule"

var adUnit = {
  code,
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250],
      ],
    },
  },
  bids: [
    {
      bidder: "uBidId",
      params: {
        inventoryId: "-1",
        adUnitId: "-3",
      },
    },
  ],
};

describe('uBidIdAnalyticsAdapter', function() {
  // const analyticsAdapter = newBidder(adUnit);
  let sandbox;

  beforeEach(function() {
    // Create a sandbox to stub and mock functions
    sandbox = sinon.createSandbox();
  });

  afterEach(function() {
    // Restore the original state of all stubbed and mocked functions
    sandbox.restore();
  });

  it('should have the correct module name', function() {
    expect(uBidIdModule.name).to.equal('uBidId');
  });

  it('should generate a UUID', function() {
    const uuid = uBidIdModule.generateUUID();
    expect(uuid).to.be.a('string');
    expect(uuid).to.match(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/);
  });

  it('should add UUID to bid on onBidCatch', function() {
    const bids = [{ ortb2Imp: { ext: { data: {} } } }];
    const generateUUIDStub = sandbox.stub(uBidIdModule, 'generateUUID').returns('test-uuid');

    uBidIdModule.onBidCatch(bids);
    expect(bids[0].ortb2Imp.ext.data.creativeUUID).to.equal('test-uuid');
    expect(generateUUIDStub.calledOnce).to.be.true;
  });
});
