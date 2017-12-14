// jshint esversion: 6
import {
  expect
} from 'chai';
import adloader from '../../../src/adloader';
import realvuAnalyticsAdapter from '../../../modules/realvuAnalyticsAdapter';
import CONSTANTS from 'src/constants.json';

describe('RealVu Analytics Adapter Test.', () => {
  
  //beforeEach(function() {
    // window.top1.realvu_boost.ads.length = 0;
    // adloaderStub = sinon.stub(adloader, 'loadScript');
    // boostscrStub = sinon.stub(window.top1.realvu_boost,scr);
  //});
  
  //afterEach(function() {
    // window.top1.realvu_boost.scr.restore();
  //});
  
  it('checkIn returns "yes"', () => {
    var ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    var sizes = [[728, 90], [970, 250], [970, 90]];
    var result = realvuAnalyticsAdapter.checkIn('ad1', sizes, '1Y');
    // console.log('a.box='+JSON.stringify(window.top1.realvu_boost.ads[0].box));
    expect(result).to.equal('yes');
    document.body.removeChild(ad_div);
  });

  it('isInView returns "yes"', () => {
    var ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    var sizes = [[728, 90], [970, 250], [970, 90]];
    realvuAnalyticsAdapter.checkIn('ad1', sizes, '1Y');
    var inview = realvuAnalyticsAdapter.isInView('ad1');
    // console.log('a.box='+JSON.stringify(window.top1.realvu_boost.ads[0].box));
    expect(inview).to.equal('yes');
    document.body.removeChild(ad_div);
  });
  
  it('isInView return "NA"', () => {
    var placementCode = '1234';
    var result = realvuAnalyticsAdapter.isInView(placementCode);
    expect(result).to.equal('NA');
  });

  it('test enableAnalytics', () => {
    var boost = window.top1.realvu_boost;
    var config = {
      options: {
        partner_id: '1Y',
        all_in: true,
        unit_ids: ['ad1', 'ad2']
      }
    };
    var hb = $$PREBID_GLOBAL$$;
    var sz = [[728, 90], [970, 250], [970, 90]];
    hb.adUnits = [{code: 'ad1', sizes: sz}, {code: 'ad2', sizes: sz}]; 
    var ad_div1 = document.createElement('div');
    ad_div1.id = 'ad1';
    document.body.appendChild(ad_div1);
    var ad_div2 = document.createElement('div');
    ad_div2.id = 'ad2';
    document.body.appendChild(ad_div2);
    
    realvuAnalyticsAdapter.enableAnalytics(config);
    realvuAnalyticsAdapter.track({eventType: CONSTANTS.EVENTS.AUCTION_INIT, args: null}); 
 
    expect(boost.ads.length).to.equal(2);
    document.body.removeChild(ad_div1);
    document.body.removeChild(ad_div2);
  });

  it('test boost adUnitById', () => {
    var boost = window.top1.realvu_boost;
    var partner_id = '1Y';
    var callback = null;
    var delay = null;
    var ad_div = document.createElement('div');
    ad_div.id = 'ad3';
    document.body.appendChild(ad_div);
    boost.addUnitById(partner_id, 'ad3', callback, delay);
    expect(boost.ads.length).to.equal(3);
    document.body.removeChild(ad_div);
  });

  it('test boost adUnitsByClassName', () => {
    var boost = window.top1.realvu_boost;
    var partner_id = '1Y';
    var callback = null;
    var delay = null;
    var ad_div = document.createElement('div');
    ad_div.id = 'ad4';
    ad_div.className = 'testClass';
    document.body.appendChild(ad_div);
    boost.addUnitsByClassName(partner_id, 'testClass', callback, delay);
    expect(boost.ads.length).to.equal(4);
    document.body.removeChild(ad_div);
  });

  it('test boost adUnit', () => {
    var boost = window.top1.realvu_boost;
    var ad_div = document.createElement('div');
    ad_div.id = 'ad5';
    document.body.appendChild(ad_div);
    var u = {partner_id:'1Y', unit: ad_div};
    boost.addUnit(u);
    expect(boost.ads.length).to.equal(5);
    document.body.removeChild(ad_div);
  });

  it('test boost getViewStatusById', () => {
    var boost = window.top1.realvu_boost;
    var ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    var u = {partner_id:'1Y', unit: ad_div};
    boost.addUnit(u);
    var vst = boost.getViewStatusById('ad1');
    expect(vst).to.equal('yes');
    document.body.removeChild(ad_div);
  });
  
  it('test boost exp', () => {
    var boost = window.top1.realvu_boost;
    var partner_id = '1Y';
    var ad_div = document.createElement('div');
    ad_div.id = 'ad7';
    ad_div.style = 'width:300px; height:250px;';
    document.body.appendChild(ad_div);
    boost.addUnitById(partner_id, 'ad7');
    var a = boost.ads[boost.ads.length-1];
    a.frm = boost.newf(a, 300, 250);
    a.div.appendChild(a.frm);
    boost.exp(a);
    var t = a.frm.tagName;
    expect(t).to.equal('IFRAME');
    document.body.removeChild(ad_div);
  });
  
  /*
  it('test boost brd', () => {
    var ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    var boost = window.top1.realvu_boost;
    var s = ad_div;
    var p = 'Left';
    var f = boost.brd(s, p);
    expect(f).to.be.greaterThan(-1);
    document.body.removeChild(ad_div);
  });
  */
  /*
  it('test track all_in', () => {
    var boost = window.top1.realvu_boost;
    var partner_id = '1Y';
    var callback = null;
    var delay = null;
    var ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    var ad_div2 = document.createElement('div');
    ad_div2.id = 'ad2';
    document.body.appendChild(ad_div2);
    boost.addUnitById(partner_id, 'ad1', callback, delay);
    boost.addUnitById(partner_id, 'ad2', callback, delay);
    var ad_msg_div = document.createElement('div');
    ad_msg_div.id = 'msg_an';
    document.body.appendChild(ad_msg_div);
    var config = {
      options: {
        partner_id: '1Y',
        all_in: true,
        unit_ids: ['ad1', 'ad2']
      }
    };
    realvuAnalyticsAdapter.enableAnalytics(config);
    realvuAnalyticsAdapter.track({
      eventType: 'auctionInit',
      args: null
    });

    document.body.removeChild(ad_div);
    document.body.removeChild(ad_div2);
    document.body.removeChild(ad_msg_div);
  });
  */
});
