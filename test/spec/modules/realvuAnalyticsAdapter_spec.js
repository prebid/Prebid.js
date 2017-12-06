import {expect} from 'chai';
import bidmanager from '../../../src/bidmanager';
import adloader from '../../../src/adloader';
import realvuAnalyticsAdapter from '../../../modules/realvuAnalyticsAdapter'

describe('RealVu Adapter Test.', () => {
  var adloaderStub;

  beforeEach(function() {
    adloaderStub = sinon.stub(adloader, 'loadScript');
  });

  afterEach(function() {
    adloader.loadScript.restore();
  });

  it('inView returns "yes"', () => {
    var ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    var sizes = [[728, 90], [970, 250], [970, 90]];
    var result = realvuAnalyticsAdapter.checkIn('ad1', sizes, '1Y');
    // console.log('a.box='+JSON.stringify(window.top1.realvu_boost.ads[0].box));
    expect(result).to.equal('yes');
    document.body.removeChild(ad_div);
  });
});
