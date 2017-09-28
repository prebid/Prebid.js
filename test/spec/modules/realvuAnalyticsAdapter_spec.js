import {expect} from 'chai';
import bidmanager from '../../../src/bidmanager';
import adloader from '../../../src/adloader';
describe('RealVu Analytics Adapter Test', () => {
  var bidResponseStub = sinon.stub(bidmanager, 'addBidResponse');
  var adloaderStub = sinon.stub(adloader, 'loadScript');
  var realvuAnalyticsAdapter;

  describe('load realvu_boost', () => {
    realvuAnalyticsAdapter = require('../../../modules/realvuAnalyticsAdapter');
    expect(adloaderStub.getCall(0).args[0]).to.contain('realvu_boost.js');
  });
  describe('inView', () => {
    var div1 = document.createElement('DIV');
    div1.id = 'rvaa_test_div';
    div1.style.width = '300px';
    div1.style.height = '250px';
    document.body.appendChild(div1);
    realvuAnalyticsAdapter.queue(function() {
      expect(realvuAnalyticsAdapter.inView({placementCode: 'rvaa_test_div', sizes: [300, 250]}, '1Y')).to.equal('yes');
    });
  });
});
