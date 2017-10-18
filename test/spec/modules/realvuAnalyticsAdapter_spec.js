import {expect} from 'chai';
import bidmanager from '../../../src/bidmanager';
import adloader from '../../../src/adloader';

describe('RealVu Adapter Test.', () => {
  var top1 = window;
  try {
    var wnd = window;
    while ((top != top1) && (typeof (wnd.document) != 'undefined')) {
      top1 = wnd;
      wnd = wnd.parent;
    }
  } catch (e) { };
  top1.realvu_boost = {
    addUnitById: function() {
      return 'yes';
    }
  };
  top1.boost_fifo = top1.boost_fifo || [];

  var realvuAnalyticsAdapter;
  var adloaderStub;

  beforeEach(function() {
    adloaderStub = sinon.stub(adloader, 'loadScript');
  });

  afterEach(function() {
    adloader.loadScript.restore();
  });

  it('Load realvu_boost.js', () => {
    realvuAnalyticsAdapter = require('../../../modules/realvuAnalyticsAdapter');
    expect(adloaderStub.getCall(0).args[0]).to.contain('realvu_boost.js');
  });

  it('inView call', () => {
    var addunitStub = sinon.stub(top1.realvu_boost, 'addUnitById', function() { return 'yes'; });
    realvuAnalyticsAdapter.inView({placementCode: 'unitA', sizes: [[300], [250]] }, '1Y');
    sinon.assert.calledWith(addunitStub, sinon.match({ unit_id: 'unitA', partner_id: '1Y', size: [[300], [250]]}));
    addunitStub.restore();
  });

  it('boost_fifo', () => {
    realvuAnalyticsAdapter.queue(function() { });
    expect(top1.boost_fifo.length).to.equal(1);
  });
});
